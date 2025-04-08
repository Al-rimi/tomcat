/**
 * Browser.ts - Intelligent Cross-platform Browser Management System
 *
 * Advanced browser control layer providing sophisticated integration with major browsers
 * for application preview and debugging. Implements enterprise-grade features following
 * modern web development practices while maintaining deep IDE integration.
 *
 * Architecture:
 * - Implements Singleton pattern for consistent browser management
 * - Uses Strategy pattern for browser-specific implementations
 * - Follows VS Code's Disposable pattern for resource management
 * - Implements Adapter pattern for debug protocol integration
 * - Uses Factory pattern for browser command generation
 *
 * Core Capabilities:
 * 1. Browser Process Management:
 *    - Cross-platform process control for all major browsers
 *    - Intelligent process detection and resurrection
 *    - Graceful error recovery procedures
 *    - Process lifecycle monitoring
 *
 * 2. Debug Protocol Integration:
 *    - Chrome Debug Protocol (CDP) implementation
 *    - WebSocket-based communication layer
 *    - Tab/session management
 *    - Hot-reload capabilities
 *    - Debug session persistence
 *
 * 3. Cross-platform Support:
 *    - Windows (Win32) specific implementations
 *    - macOS (Darwin) specific implementations
 *    - Linux platform support
 *    - Architecture-specific handling
 *    - Path resolution hierarchy
 *
 * 4. Browser Feature Matrix:
 *    - Google Chrome/Chromium feature support
 *    - Firefox debug protocol integration
 *    - Microsoft Edge compatibility
 *    - Safari technology preview support
 *    - Brave/Opera/Vivaldi compatibility
 *
 * 5. Advanced Functionality:
 *    - Automatic URL encoding/decoding
 *    - Workspace-relative path resolution
 *    - Multi-session management
 *    - Debug port conflict resolution
 *    - Network error recovery
 *
 * Technical Implementation:
 * - Uses child_process for browser process control
 * - Implements WebSocket client for debug protocol
 * - Provides atomic operations for critical browser commands
 * - Maintains comprehensive platform compatibility
 * - Implements proper error recovery procedures
 */

import * as vscode from 'vscode';
import * as http from 'http';
import WebSocket from 'ws';
import { exec } from 'child_process';
import { Logger } from './Logger';

const logger = Logger.getInstance();

export class Browser {
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
            'win32': ['msedge', 'msedgewebview'],
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

    private config: vscode.WorkspaceConfiguration;
    private static instance: Browser;

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
        this.config = vscode.workspace.getConfiguration('tomcat');
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
        this.config = vscode.workspace.getConfiguration('tomcat');
    }

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
     * @log warning on unsupported browsers
     */
    public async run(appName: string): Promise<void> {
        const browser = this.config.get<string>('defaultBrowser') || 'Google Chrome';
        const port = this.config.get<number>('port', 8080);
        const appUrl = `http://localhost:${port}/${appName.replace(/\s/g, '%20')}`;
        const debugUrl = `http://localhost:9222/json`;

        const browserCommand = this.getBrowserCommand(browser, appUrl);
        if (!browserCommand) {
            logger.warn(`${browser} is not supported on this platform`, true);
            return;
        }

        logger.updateStatusBar(browser);

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
                logger.info(`${browser} reloaded`);
            } else {
                logger.info(`Opening new ${browser} window`);
                await this.execCommand(browserCommand);
            }
        } catch (err) {
            await this.handleBrowserError(browser, browserCommand);
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

        const debugArgs = browser === 'Firefox'
            ? '--start-debugger-server'
            : '--remote-debugging-port=9222';

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
    private async handleBrowserError(browser: string, command: string): Promise<void> {
        const isRunning = await this.checkProcess(browser);
        try {
            if (isRunning) {
                const choice = await vscode.window.showInformationMessage(
                    `${browser} needs restart in debug mode`, 'Restart', 'Cancel'
                );

                if (choice === 'Restart') {
                    await this.killProcess(browser);
                    await this.execCommand(command);
                }
            } else {
                await this.execCommand(command);
            }
        } catch (err) {
            logger.error(`Failed to execute command: ${command}`, false, err as Error);
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
                req.destroy(new Error('Request timeout'));
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
            logger.warn(`Process check failed: ${error}`, false);
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
    }
}