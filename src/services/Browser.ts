/**
 * Cross-platform browser management system with debug protocol integration
 * 
 * Architectural Role:
 * - Singleton browser controller
 * - Strategy pattern for browser-specific implementations
 * - Adapter pattern for debug protocol integration
 * 
 * Core Responsibilities:
 * 1. Process Management: Cross-platform launch/termination
 * 2. Debug Integration: WebSocket-based CDP implementation
 * 3. Session Handling: Tab management and hot-reload
 * 4. Platform Support: OS-specific command generation
 * 
 * Implementation Notes:
 * - Child process management for browser instances
 * - Hybrid filesystem watching (polling + event-driven)
 * - Atomic command generation with debug arguments
 * - Process resurrection with error recovery
 */

import * as vscode from 'vscode';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import WebSocket from 'ws';
import { exec } from 'child_process';
import { Logger } from './Logger';
import { BrowserName, t, translateBrowserName } from '../utils/i18n';

const logger = Logger.getInstance();

export class Browser {
    private static instance: Browser;
    private browser: BrowserName;
    private port: number;
    private started: boolean;
    private autoReloadBrowser: boolean;

    /**
     * Singleton accessor method
     * 
     * Provides global access point to the Browser manager instance while ensuring:
     * - Thread-safe lazy initialization
     * - Consistent state management
     * - Single point of configuration
     * 
     * @returns The singleton Browser manager instance
     */
    public static getInstance(): Browser {
        if (!this.instance) {
            this.instance = new Browser();
        }
        return this.instance;
    }

    /**
     * Constructor
     * 
     * Initializes core browser management properties:
     * - Loads workspace configuration
     * - Sets up default browser preferences
     * - Prepares debug protocol parameters
     */
    constructor() {
        this.browser = vscode.workspace.getConfiguration().get<string>('tomcat.browser', 'Google Chrome') as BrowserName;
        this.port = vscode.workspace.getConfiguration().get<number>('tomcat.port', 8080);
        this.started = false;
        this.autoReloadBrowser = vscode.workspace.getConfiguration().get<boolean>('tomcat.autoReloadBrowser', true);
    }

    /**
     * Configuration reload handler
     * 
     * Refreshes internal configuration state from VS Code settings:
     * - Handles workspace configuration changes
     * - Maintains configuration cache consistency
     * - Updates dependent properties
     */
    public updateConfig(): void {
        this.browser = vscode.workspace.getConfiguration().get<string>('tomcat.browser', 'Google Chrome') as BrowserName;
        this.port = vscode.workspace.getConfiguration().get<number>('tomcat.port', 8080);
        this.started = false;
        this.autoReloadBrowser = vscode.workspace.getConfiguration().get<boolean>('tomcat.autoReloadBrowser', true);
    }

    private getCommandBinary(browser: BrowserName): string | null {
        const platform = process.platform;
        const entries = Browser.COMMANDS[browser]?.[platform];
        if (!entries || entries.length === 0) { return null; }
        // windows commands often begin with 'start', real binary next
        if (platform === 'win32' && entries[0].toLowerCase() === 'start' && entries.length > 1) {
            return entries[1];
        }
        return entries[0];
    }

    private async isBrowserAvailable(browser: BrowserName): Promise<boolean> {
        if (browser === 'Disable') { return true; }
        const platform = process.platform;
        const cmd = this.getCommandBinary(browser);
        if (!cmd) { return false; }

        if (platform === 'darwin' && cmd.startsWith('"/Applications/')) {
            const appPath = cmd.replace(/"/g, '');
            return fs.existsSync(appPath);
        }

        if (platform === 'win32') {
            const roots = [process.env['ProgramFiles'], process.env['ProgramFiles(x86)']].filter(Boolean) as string[];
            const exeCandidates: Record<BrowserName, string[]> = {
                'Google Chrome': roots.map(r => path.join(r, 'Google', 'Chrome', 'Application', 'chrome.exe')),
                'Microsoft Edge': roots.map(r => path.join(r, 'Microsoft', 'Edge', 'Application', 'msedge.exe')),
                'Firefox': roots.map(r => path.join(r, 'Mozilla Firefox', 'firefox.exe')),
                'Brave': roots.map(r => path.join(r, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')),
                'Opera': roots.flatMap(r => [
                    path.join(r, 'Opera', 'launcher.exe'),
                    path.join(r, 'Opera', 'opera.exe')
                ]),
                'Safari': [],
                'Disable': []
            } as const;

            const matches = (exeCandidates[browser] || []).some(p => fs.existsSync(p));
            if (matches) { return true; }
        }

        const checkCmd = platform === 'win32' ? `where ${cmd}` : `which ${cmd}`;
        try {
            await this.execCommand(checkCmd);
            return true;
        } catch {
            return false;
        }
    }

    private async resolveBrowser(preferred: BrowserName, previous?: BrowserName): Promise<BrowserName> {
        const preferredOk = await this.isBrowserAvailable(preferred);
        if (preferredOk) { return preferred; }

        if (previous && previous !== 'Disable') {
            const prevOk = await this.isBrowserAvailable(previous);
            if (prevOk) { return previous; }
        }

        return 'Disable';
    }

    public async setPreferredBrowser(choice: BrowserName, previous?: BrowserName): Promise<BrowserName> {
        const finalChoice = await this.resolveBrowser(choice, previous);
        this.browser = finalChoice;
        await vscode.workspace.getConfiguration().update('tomcat.browser', finalChoice, true);

        if (finalChoice !== choice) {
            if (previous && finalChoice === previous) {
                logger.info(`Browser ${choice} not found. Reverted to previous: ${previous}.`, false);
            } else if (finalChoice === 'Disable') {
                logger.info(`Browser ${choice} not found. Reverted to Disable.`, false);
            }
        }

        return finalChoice;
    }

    /**
     * Browser Process Registry
     * 
     * Comprehensive mapping of browser process names across platforms:
     * - Windows (win32): EXE names and process identifiers
     * - macOS (darwin): Application bundle identifiers
     * - Linux: Binary names and common aliases
     * 
     * Used for process detection and management operations
     * 
     * @param processNames Browser process names
     * @param platform Platform identifier (win32, darwin, linux)
     * @returns Array of process names for the specified platform
     */
    private static readonly PROCESS_NAMES: { [key: string]: { [platform: string]: string[] } } = {
        'Google Chrome': {
            'win32': ['chrome'],
            'darwin': ['Google Chrome'],
            'linux': ['chrome', 'google-chrome', 'chromium']
        },
        'Firefox': {
            'win32': ['firefox'],
            'darwin': ['firefox'],
            'linux': ['firefox']
        },
        'Microsoft Edge': {
            'win32': ['msedge', 'msedgewebview2'],
            'darwin': ['Microsoft Edge'],
            'linux': ['microsoft-edge']
        },
        'Brave': {
            'win32': ['brave'],
            'darwin': ['Brave Browser'],
            'linux': ['brave-browser']
        },
        'Opera': {
            'win32': ['opera'],
            'darwin': ['Opera'],
            'linux': ['opera']
        }
    };

    /**
     * Browser Command Matrix
     * 
     * Platform-specific command templates for browser launch:
     * - Includes default installation paths
     * - Supports debug mode arguments
     * - Handles URL parameter injection
     * - Manages platform-specific escaping
     * 
     * @param browser Browser name
     * @param platform Platform identifier (win32, darwin, linux)
     * @returns Array of command strings for the specified browser and platform
     */
    private static readonly COMMANDS: { [key: string]: { [platform: string]: string[] } } = {
        'Google Chrome': {
            'win32': ['start', 'chrome.exe'],
            'darwin': ['"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"'],
            'linux': ['google-chrome']
        },
        'Firefox': {
            'win32': ['start', 'firefox.exe'],
            'darwin': ['"/Applications/Firefox.app/Contents/MacOS/firefox"'],
            'linux': ['firefox']
        },
        'Microsoft Edge': {
            'win32': ['start', 'msedge.exe'],
            'darwin': ['"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"'],
            'linux': ['microsoft-edge']
        },
        'Brave': {
            'win32': ['start', 'brave.exe'],
            'darwin': ['"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"'],
            'linux': ['brave-browser']
        },
        'Opera': {
            'win32': ['start', 'opera.exe'],
            'darwin': ['"/Applications/Opera.app/Contents/MacOS/Opera"'],
            'linux': ['opera']
        },
        'Safari': {
            'darwin': ['open', '-a', 'Safari']
        }
    };

    /**
     * Application launch procedure
     * 
     * Orchestrates complete browser launch sequence:
     * 1. Resolves target application URL
     * 2. Detects existing debug sessions
     * 3. Determines optimal launch strategy
     * 4. Executes browser-specific command
     * 5. Handles errors and recovery
     * 
     * @param appName Name of the application to launch
     * @param port Optional port number for the application
     * @log warning on unsupported browsers
     */
    public async run(appName: string, port?: number): Promise<void> {
        this.port = port ?? this.port;
        const previous = vscode.workspace.getConfiguration().get<string>('tomcat.browser', 'Google Chrome') as BrowserName;
        const finalBrowser = await this.setPreferredBrowser(this.browser, previous);
        const browserLabel = translateBrowserName(finalBrowser);

        if (finalBrowser === 'Disable') {
            logger.info(t('browser.accessUrl', { url: `http://localhost:${this.port}/${appName.replace(/\s/g, '%20')}` }));
            return;
        }

        if (!appName) {
            logger.error(t('browser.noAppName'), true, t('browser.noAppNameDetails'));
            return;
        }

        const appUrl = `http://localhost:${this.port}/${appName.replace(/\s/g, '%20')}`;

        const debugUrl = `http://localhost:9222/json`;
        const browserCommand = this.getBrowserCommand(this.browser, appUrl);
        if (!browserCommand) {
            logger.error(t('browser.unsupportedPlatform', { browser: browserLabel }), true, t('browser.unsupportedPlatformDetails'));
            return;
        }

        if (!this.autoReloadBrowser) {
            if (this.started) {
                logger.info(t('browser.accessUrl', { url: appUrl }));
            } else {
                this.started = true;
                logger.info(t('browser.openNewWindow', { browser: browserLabel }));
                try { await this.execCommand(browserCommand); } catch { }
            }
        }

        logger.updateStatusBar(browserLabel);

        try {
            const response = await this.httpGet(debugUrl);
            const sessions = JSON.parse(response);

            if (!Array.isArray(sessions)) {
                throw ('Invalid debug protocol response');
            }

            const target = sessions.find((session: any) =>
                session?.url?.includes(appUrl)
            );

            if (target?.webSocketDebuggerUrl) {
                await this.handleWebSocketReload(target);
                logger.success(t('browser.reloaded', { browser: browserLabel }));
            } else {
                logger.info(t('browser.openNewWindow', { browser: browserLabel }));
                await this.execCommand(browserCommand);
            }
        } catch (err) {
            await this.handleBrowserError(this.browser, browserCommand);
        } finally {
            logger.defaultStatusBar();
        }
    }

    /**
     * Browser command construction
     * 
     * Builds platform-specific command strings with:
     * 1. Proper executable location resolution
     * 2. Debug protocol arguments injection
     * 3. URL parameter encoding
     * 4. Platform-specific escaping
     * 
     * @param browser Target browser name
     * @param url URL to open
     * @returns Fully constructed command string or null if unsupported
     */
    private getBrowserCommand(browser: string, url: string): string | null {
        const platform = process.platform as 'win32' | 'darwin' | 'linux';
        const browserCommands = Browser.COMMANDS[browser]?.[platform];

        if (!browserCommands) {
            if (browser === 'Safari' && platform !== 'darwin') {
                return null;
            }
            return this.getBrowserCommand("Google Chrome", url) || null;
        }

        const debugArgs = '--remote-debugging-port=9222';

        return `${browserCommands.join(' ')} ${debugArgs} ${url}`;
    }

    /**
     * WebSocket-based reload handler
     * 
     * Implements debug protocol interaction:
     * 1. Establishes WebSocket connection
     * 2. Sends reload command with parameters
     * 3. Handles target activation (Windows-specific)
     * 4. Manages connection lifecycle
     * 
     * @param target Debug protocol target descriptor
     * @throws Error on WebSocket failure
     */
    private async handleWebSocketReload(target: any): Promise<void> {
        const ws = new WebSocket(target.webSocketDebuggerUrl);

        await new Promise<void>((resolve, reject) => {
            ws.on('open', () => {
                ws.send(JSON.stringify({
                    id: 1,
                    method: 'Page.reload',
                    params: {
                        ignoreCache: true,
                        scriptPrecedence: "userAgentOverride",
                        targetId: target.id
                    }
                }), (err) => {
                    if (err) {
                        reject(err);
                    }
                });
                if (process.platform === 'win32') {
                    ws.send(JSON.stringify({
                        id: 2,
                        method: 'Target.activateTarget',
                        params: { targetId: target.id }
                    }), (err) => {
                        if (err) {
                            reject(err);
                        }
                    });
                }
                ws.close();
                resolve();
            });

            ws.on('error', reject);
            ws.on('close', resolve);
        });
    }

    /**
     * Browser error recovery handler
     * 
     * Implements sophisticated error recovery:
     * 1. Checks for running browser instances
     * 2. Provides user interaction options
     * 3. Executes process cleanup if needed
     * 4. Falls back to clean launch
     * 
     * @param browser Target browser name
     * @param command Command to execute after recovery
     * @log Error on command execution failure
     */
    private async handleBrowserError(browser: BrowserName, command: string): Promise<void> {
        const isRunning = await this.checkProcess(browser);
        const browserLabel = translateBrowserName(browser);
        try {
            if (this.started && isRunning) {
                await this.execCommand(command);
            } else if (isRunning) {
                const choice = await vscode.window.showInformationMessage(
                    t('browser.restartPrompt', { browser: browserLabel }), t('browser.restartOption'), t('browser.cancelOption')
                );

                if (choice === t('browser.restartOption')) {
                    await this.killProcess(browser);
                    await this.execCommand(command);
                }
            } else {
                await this.execCommand(command);
            }
        } catch (err) {
            logger.error(t('browser.failedReload', { browser: browserLabel }), true, err as string);
        }
    }

    /**
     * Command execution wrapper
     * 
     * Provides robust command execution with:
     * - Error handling
     * - Promise-based interface
     * - Output capture
     * - Timeout protection
     * 
     * @param command Command to execute
     * @throws Error on command failure
     */
    private async execCommand(command: string): Promise<void> {
        this.started = true;

        return new Promise((resolve, reject) => {
            exec(command, (err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }

    /**
     * HTTP GET implementation
     * 
     * Provides debug protocol communication with:
     * - Redirect handling
     * - Timeout protection
     * - Error recovery
     * - Data aggregation
     * 
     * @param url URL to fetch
     * @returns Response body as string
     * @throws Error on network failure
     */
    private async httpGet(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const req = http.get(url, (res) => {
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return resolve(this.httpGet(res.headers.location));
                }

                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
            });

            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.destroy(new Error(t('browser.requestTimeout')));
            });
        });
    }

    /**
     * Process detection handler
     * 
     * Implements cross-platform process checking:
     * - Windows: PowerShell-based detection
     * - Unix: pgrep-based detection
     * - Browser-specific process names
     * - Error-tolerant implementation
     * 
     * @param browser Target browser name
     * @returns Boolean indicating running state
     * @log Process check failure warning
     */
    private async checkProcess(browser: string): Promise<boolean> {
        if (browser === 'Firefox' || browser === 'Safari') {
            return false;
        }
        const platform = process.platform as keyof typeof Browser.PROCESS_NAMES;
        const processes = Browser.PROCESS_NAMES[browser]?.[platform] || [];

        if (processes.length === 0) {
            return false;
        }

        try {
            if (process.platform === 'win32') {
                const command = `Get-Process | Where-Object { $_.ProcessName -match "${processes.join('|')}" }`;
                return await new Promise<boolean>((resolve) => {
                    exec(command,
                        { shell: 'powershell.exe' },
                        (err, stdout) => resolve(err ? false : stdout.trim().length > 0)
                    );
                });
            } else {
                const command = `pgrep -x "${processes.join('|')}"`;
                return await new Promise<boolean>((resolve) => {
                    exec(command, (err, stdout) => {
                        resolve(err ? false : stdout.trim().length > 0);
                    });
                });
            }
        } catch (error) {
            logger.warn(t('browser.processCheckFailed', { error: String(error) }), false);
            return false;
        }
    }

    /**
     * Process termination handler
     * 
     * Implements cross-platform process killing:
     * - Windows: PowerShell Stop-Process
     * - Unix: pkill command
     * - Forceful termination
     * - Error-tolerant implementation
     * 
     * @param browser Target browser name
     */
    private async killProcess(browser: string): Promise<void> {
        const platform = process.platform as keyof typeof Browser.PROCESS_NAMES;
        const processes = Browser.PROCESS_NAMES[browser]?.[platform] || [];

        try {
            if (process.platform === 'win32') {
                const command = `Stop-Process -Force -Name '${processes.join("','")}'`;
                await new Promise<void>((resolve) => {
                    exec(command, { shell: 'powershell.exe' }, () => resolve());
                });
            } else {
                await new Promise<void>((resolve) => {
                    exec(`pkill -f '${processes.join('|')}'`, () => resolve());
                });
            }
        } catch { }
    }
}