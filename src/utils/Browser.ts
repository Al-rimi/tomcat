import * as vscode from 'vscode';
import * as http from 'http';
import WebSocket from 'ws';
import { exec } from 'child_process';
import { Logger } from './Logger';

const logger = Logger.getInstance();

export class Browser {
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

    public static getInstance(): Browser {
        if (!this.instance) {
            this.instance = new Browser();
        }
        return this.instance;
    }

    constructor() {
        this.config = vscode.workspace.getConfiguration('tomcat');
    }

    public updateConfig(): void {
        this.config = vscode.workspace.getConfiguration('tomcat');
    }

    public async run(appName: string): Promise<void> {
        const browser = this.config.get<string>('defaultBrowser') || 'Google Chrome';
        const port = this.config.get<number>('port', 8080);
        const appUrl = `http://localhost:${port}/${appName.replace(/\s/g, '%20')}`;
        const debugUrl = `http://localhost:9222/json`;

        const browserCommand = this.getBrowserCommand(browser, appUrl);
        if (!browserCommand) {
            logger.warn(`${browser} is not supported on this platform`);
            return;
        }

        logger.updateStatusBar(browser);

        try {
            const response = await this.httpGet(debugUrl);
            const sessions = JSON.parse(response);
            
            if (!Array.isArray(sessions)) {
                throw new Error('Invalid debug protocol response');
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

    private getBrowserCommand(browser: string, url: string): string | null {
        const platform = process.platform as 'win32' | 'darwin' | 'linux';
        const browserCommands = Browser.COMMANDS[browser]?.[platform];
        
        if (!browserCommands) {
            if (browser === 'Safari' && platform !== 'darwin') {return null;}
            return this.getBrowserCommand("Google Chrome", url) || null;
        }

        const debugArgs = browser === 'Firefox' 
            ? '--start-debugger-server'
            : '--remote-debugging-port=9222';
            
        return `${browserCommands.join(' ')} ${debugArgs} ${url}`;
    }

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
                    if (err) {reject(err);}
                });
                if (process.platform === 'win32') {
                    ws.send(JSON.stringify({ 
                        id: 2, 
                        method: 'Target.activateTarget', 
                        params: { targetId: target.id }
                    }), (err) => {
                        if (err) {reject(err);}
                    });
                }
                ws.close();
                resolve();
            });

            ws.on('error', reject);
            ws.on('close', resolve);
        });
    }

    private async handleBrowserError(browser: string, command: string): Promise<void> {
        const isRunning = await this.checkProcess(browser);
        
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
    }

    private async execCommand(command: string): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(command, (err) => {
                if (err){
                    logger.error(`command failed: ${command}`, err);
                    reject(err);
                }
                resolve();
            });
        });
    }

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

    private async checkProcess(browser: string): Promise<boolean> {
        if (browser === 'Firefox' || browser === 'Safari') {return false;}
        const platform = process.platform as keyof typeof Browser.PROCESS_NAMES;
        const processes = Browser.PROCESS_NAMES[browser]?.[platform] || [];
        
        if (processes.length === 0) {return false;}

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
            logger.warn(`Process check failed: ${error}`);
            return false;
        }
    }

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