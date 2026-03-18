/**
 * Lightweight AI client for log explanations.
 *
 * Design goals:
 * - Provider-agnostic HTTP POST (OpenAI-style JSON payload)
 * - Respect user settings: provider, endpoint, model, tokens, timeout
 * - Opt-in auto explain for WARN/ERROR logs
 */

import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { spawn } from 'child_process';
type LogSink = (message: string) => void;

export class AI {
    private static instance: AI;
    private provider: string;
    private endpoint: string;
    private model: string;
    private maxTokens: number;
    private timeoutMs: number;
    private autoExplain: boolean;
    private apiKey?: string;
    private inFlight = false;
    private logSink?: LogSink;
    private autoStartLocal: boolean;
    private localStartCommand: string;
    private startAttempted = false;
    private debug: boolean;
    private onStart?: () => void;
    private onDone?: () => void;
    private readonly MAX_PROMPT_CHARS = 1500;
    private readonly MAX_RESPONSE_LINES = 8;

    private constructor() {
        this.provider = vscode.workspace.getConfiguration().get('tomcat.ai.provider', 'none');
        this.endpoint = vscode.workspace.getConfiguration().get('tomcat.ai.endpoint', '');
        this.model = vscode.workspace.getConfiguration().get('tomcat.ai.model', '');
        this.maxTokens = vscode.workspace.getConfiguration().get('tomcat.ai.maxTokens', 128);
        this.timeoutMs = vscode.workspace.getConfiguration().get('tomcat.ai.timeoutMs', 45000);
        // Always enable auto explain by default
        this.autoExplain = true;
        this.apiKey = vscode.workspace.getConfiguration().get('tomcat.ai.apiKey', '') || undefined;
        this.autoStartLocal = vscode.workspace.getConfiguration().get('tomcat.ai.autoStartLocal', true);
        this.localStartCommand = vscode.workspace.getConfiguration().get('tomcat.ai.localStartCommand', 'ollama serve');
        this.debug = vscode.workspace.getConfiguration().get('tomcat.ai.debug', false);
    }

    public static getInstance(): AI {
        if (!AI.instance) {
            AI.instance = new AI();
        }
        return AI.instance;
    }

    public updateConfig(): void {
        const cfg = vscode.workspace.getConfiguration();
        this.provider = cfg.get('tomcat.ai.provider', 'none');
        this.endpoint = cfg.get('tomcat.ai.endpoint', '');
        this.model = cfg.get('tomcat.ai.model', '');
        this.maxTokens = cfg.get('tomcat.ai.maxTokens', 128);
        this.timeoutMs = cfg.get('tomcat.ai.timeoutMs', 45000);
        // Force auto explain on
        this.autoExplain = true;
        this.apiKey = cfg.get('tomcat.ai.apiKey', '') || undefined;
        this.autoStartLocal = cfg.get('tomcat.ai.autoStartLocal', true);
        this.localStartCommand = cfg.get('tomcat.ai.localStartCommand', 'ollama serve');
        this.debug = cfg.get('tomcat.ai.debug', false);
    }

    public setLoggerSink(sink: LogSink): void {
        this.logSink = sink;
    }

    public setStatusHooks(onStart: () => void, onDone: () => void): void {
        this.onStart = onStart;
        this.onDone = onDone;
    }

    /**
     * Optionally explain a log line if autoExplain is enabled and provider is configured.
     */
    public async maybeExplain(level: string, message: string): Promise<void> {
        if (!this.autoExplain) return;
        const sev = level.toUpperCase();
        if (sev !== 'WARN' && sev !== 'ERROR') return;
        if (!this.endpoint || this.provider === 'none') return;
        if (this.inFlight) return; // avoid flooding

        this.inFlight = true;
        this.onStart?.();
        try {
            this.debugLog(`explain start: level=${sev}`);
            const ready = await this.ensureReady();
            if (!ready) {
                this.logSink?.('AI endpoint not reachable; skipped explanation.');
                return;
            }
            const clipped = message.length > this.MAX_PROMPT_CHARS
                ? `${message.slice(0, this.MAX_PROMPT_CHARS)}... (truncated)`
                : message;
            const prompt = this.buildPrompt(level, clipped);
            this.debugLog(`sending to ${this.endpoint} (tokens=${this.maxTokens}, timeout=${this.timeoutMs}ms, promptLen=${JSON.stringify(prompt).length})`);
            let streamed = false;
            try {
                streamed = await this.streamAI(prompt);
            } catch (streamErr) {
                this.debugLog(`stream failed: ${streamErr}`);
            }

            if (!streamed) {
                const response = await this.callAI(prompt);
                if (response) {
                    this.logSink?.(`${this.formatResponse(response)}`);
                } else {
                    this.logSink?.('AI returned no content');
                }
            }
        } catch (err) {
            this.logSink?.(`AI explanation failed: ${err}`);
            this.debugLog(`exception: ${err}`);
        } finally {
            this.inFlight = false;
            this.onDone?.();
        }
    }

    private async ensureReady(): Promise<boolean> {
        if (await this.pingEndpoint()) return true;

        if (this.provider !== 'local') return false;
        const endpointUrl = this.parseEndpointUrl();
        if (!endpointUrl || !this.isLocalEndpoint(endpointUrl)) return false;
        if (!this.autoStartLocal || this.startAttempted) return false;

        this.startAttempted = true;
        try {
            this.spawnLocalService();
            const attempts = [500, 1000, 1500];
            for (const delay of attempts) {
                await new Promise(res => setTimeout(res, delay));
                if (await this.pingEndpoint()) return true;
            }
        } catch (err) {
            this.logSink?.(`[AI] failed to start local AI: ${err}`);
            this.debugLog(`spawn failed: ${err}`);
        }
        return false;
    }

    private parseEndpointUrl(): URL | null {
        try {
            return new URL(this.endpoint);
        } catch (err) {
            return null;
        }
    }

    private isLocalEndpoint(url: URL): boolean {
        const host = (url.hostname || '').toLowerCase();
        return host === 'localhost' || host === '127.0.0.1' || host === '::1';
    }

    private spawnLocalService(): void {
        const cmd = this.localStartCommand;
        if (!cmd.trim()) return;

        // Prefer no-shell spawn to avoid any popup window; fall back to shell only if parsing fails.
        const parts = cmd.match(/"[^"]+"|\S+/g)?.map(p => p.replace(/^"|"$/g, '')) || [];
        const executable = parts.shift();
        if (!executable) return;

        this.debugLog(`spawning local AI: ${cmd}`);
        try {
            spawn(executable, parts, {
                shell: false,
                detached: true,
                stdio: 'ignore',
                windowsHide: true
            }).unref();
        } catch (err) {
            this.debugLog(`non-shell spawn failed, retrying with shell: ${err}`);
            spawn(cmd, {
                shell: true,
                detached: true,
                stdio: 'ignore',
                windowsHide: true
            }).unref();
        }
    }

    private pingEndpoint(): Promise<boolean> {
        return new Promise((resolve) => {
            let url: URL;
            try {
                url = new URL(this.endpoint);
            } catch (err) {
                resolve(false);
                return;
            }

            // Use a lightweight reachability path; for Ollama /api/chat, prefer /api/tags to avoid 405s.
            const pingPath = url.pathname.includes('/api/chat') ? '/api/tags' : (url.pathname + url.search);

            const options: https.RequestOptions = {
                method: 'GET',
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: pingPath,
                timeout: 1500
            };

            const client = url.protocol === 'https:' ? https : http;
            const req = client.request(options, (res) => {
                res.resume();
                // Treat 2xx/3xx/4xx (including 401/404/405) as reachable; only fail on 5xx or no code.
                if (!res.statusCode) {
                    resolve(false);
                    return;
                }
                resolve(res.statusCode < 500);
            });

            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            req.end();
        });
    }

    private buildPrompt(level: string, message: string): { messages: any[]; max_tokens: number; model?: string; } {
        const system = 'You are a concise Tomcat build/server log assistant. Explain the probable cause and a short fix in under 120 words. If the log is incomplete, say what to check next.';
        const user = `Log level: ${level}\nLog: ${message}`;
        return {
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user }
            ],
            max_tokens: this.maxTokens,
            model: this.model || undefined
        };
    }

    private callAI(body: any): Promise<string | null> {
        return new Promise((resolve, reject) => {
            let url: URL;
            try {
                url = new URL(this.endpoint);
            } catch (err) {
                reject('Invalid AI endpoint');
                return;
            }

            const payload = JSON.stringify({
                model: body.model,
                messages: body.messages,
                max_tokens: body.max_tokens,
                stream: false,
                temperature: 0.2
            });

            const options: https.RequestOptions = {
                method: 'POST',
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                },
                timeout: this.timeoutMs
            };

            if (this.apiKey) {
                (options.headers as any)['Authorization'] = `Bearer ${this.apiKey}`;
            }

            const client = url.protocol === 'https:' ? https : http;
            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        // Support OpenAI-style and Ollama chat shapes.
                        const text = parsed?.choices?.[0]?.message?.content
                            || parsed?.message?.content
                            || parsed?.text
                            || null;
                        if (this.debug) {
                            const snippet = data.slice(0, 300);
                            this.debugLog(`resp status=${res.statusCode} len=${data.length} text=${text ? text.slice(0, 120) : '<null>'} body=${snippet}`);
                        }
                        resolve(text);
                    } catch (err) {
                        this.debugLog(`resp parse fail status=${res.statusCode} len=${data.length} err=${err} body=${data.slice(0, 300)}`);
                        resolve(null);
                    }
                });
            });

            req.on('error', (err) => reject(err.message || err.toString()));
            req.on('timeout', () => {
                req.destroy();
                reject('Request timed out');
            });

            req.write(payload);
            req.end();
        });
    }

    private streamAI(body: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let url: URL;
            try {
                url = new URL(this.endpoint);
            } catch (err) {
                reject('Invalid AI endpoint');
                return;
            }

            const payload = JSON.stringify({
                model: body.model,
                messages: body.messages,
                max_tokens: body.max_tokens,
                stream: true,
                temperature: 0.2
            });

            const options: https.RequestOptions = {
                method: 'POST',
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                },
                timeout: this.timeoutMs
            };

            if (this.apiKey) {
                (options.headers as any)['Authorization'] = `Bearer ${this.apiKey}`;
            }

            const client = url.protocol === 'https:' ? https : http;
            const req = client.request(options, (res) => {
                this.logSink?.('AI_STREAM_START:');
                let buffer = '';
                let gotChunk = false;

                const flushLines = (raw: string) => {
                    const lines = raw.split(/\n/);
                    buffer = lines.pop() || '';
                    for (const lineRaw of lines) {
                        const line = lineRaw.trim();
                        if (!line) continue;
                        const content = this.extractStreamContent(line);
                        if (content) {
                            this.logSink?.(`AI_STREAM_CHUNK:${content}`);
                            gotChunk = true;
                        }
                    }
                };

                res.on('data', (chunk) => {
                    buffer += chunk.toString();
                    flushLines(buffer);
                });

                res.on('end', () => {
                    if (buffer.trim()) {
                        const content = this.extractStreamContent(buffer.trim());
                        if (content) {
                            this.logSink?.(`AI_STREAM_CHUNK:${content}`);
                            gotChunk = true;
                        }
                    }
                    this.logSink?.('AI_STREAM_END');
                    resolve(gotChunk);
                });

                res.on('error', (err) => {
                    this.logSink?.('AI_STREAM_END');
                    reject(err.message || err.toString());
                });
            });

            req.on('error', (err) => {
                reject(err.message || err.toString());
            });
            req.on('timeout', () => {
                req.destroy();
                reject('Request timed out');
            });

            req.write(payload);
            req.end();
        });
    }

    private extractStreamContent(line: string): string | null {
        if (!line) return null;
        if (line === '[DONE]' || line === 'data: [DONE]') return null;

        const trimmed = line.startsWith('data:') ? line.slice(5).trim() : line.trim();
        try {
            const parsed = JSON.parse(trimmed);
            const piece = parsed?.choices?.[0]?.delta?.content
                || parsed?.choices?.[0]?.message?.content
                || parsed?.message?.content
                || parsed?.response
                || parsed?.text
                || '';
            if (piece) return piece;
            return null;
        } catch (err) {
            return null;
        }
    }

    private debugLog(message: string): void {
        if (this.debug) {
            this.logSink?.(`AI_DEBUG: ${message}`);
        }
    }

    private formatResponse(text: string): string {
        const trimmed = (text || '').trim();
        if (!trimmed) return 'no content';
        const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0);
        const limited = lines.slice(0, this.MAX_RESPONSE_LINES);
        const suffix = lines.length > this.MAX_RESPONSE_LINES
            ? `\n... (+${lines.length - this.MAX_RESPONSE_LINES} more lines)`
            : '';
        return `${limited.join('\n')}${suffix}`;
    }
}
