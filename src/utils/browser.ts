import { exec, execFile } from 'child_process';
import { info, error, warn } from './logger';
import WebSocket from 'ws';
import * as vscode from 'vscode';
import { defaultStatusBar, updateStatusBar } from '../extension';
import * as http from 'http';
import * as https from 'https';

const BROWSER_PROCESS_NAMES: { [key: string]: { [platform: string]: string[] } } = {
    'Google Chrome': {
        'win32': ['chrome'],
        'darwin': ['Google Chrome'],
        'linux': ['chrome', 'google-chrome', 'chromium']
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

function getBrowserCommand(browser: string): string[] | null {
    const commands: { [key: string]: { [platform: string]: string[] } } = {
        'Microsoft Edge': {
            'win32': ['start', 'msedge.exe'],
            'darwin': ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
            'linux': ['microsoft-edge']
        },
        'Brave': {
            'win32': ['start', 'brave.exe'],
            'darwin': ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'],
            'linux': ['brave-browser']
        },
        'Opera': {
            'win32': ['start', 'opera.exe'],
            'darwin': ['/Applications/Opera.app/Contents/MacOS/Opera'],
            'linux': ['opera']
        },
        'Safari': {
            'darwin': ['open', '-a', 'Safari']
        },
        'Google Chrome': {
            'win32': ['start', 'chrome.exe'],
            'darwin': ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
            'linux': ['google-chrome']
        }
    };

    const platform = process.platform as 'win32' | 'darwin' | 'linux';
    const browserCommands = commands[browser]?.[platform];
    
    if (!browserCommands) {
        if (browser === 'Safari' && platform !== 'darwin') return null;
        return commands['Google Chrome'][platform] || null;
    }
    
    return browserCommands;
}

async function httpGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(httpGet(res.headers.location));
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

export async function runBrowser(appName: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('tomcat');
    const browser = config.get<string>('defaultBrowser') || 'Google Chrome';
    const debugPort = 9222;
    const appUrl = `http://localhost:${config.get('port', 8080)}/${appName}`;
    const debugUrl = `http://localhost:${debugPort}/json`;

    const browserCommand = getBrowserCommand(browser);
    if (!browserCommand) {
        warn(`${browser} is not supported on this platform`);
        return;
    }

    const debugArgs = '--remote-debugging-port';
    
    const fullArgs = [
        ...`${debugArgs}=${debugPort}`,
        appUrl
    ];

    updateStatusBar(browser);

    try {
        const response = await httpGet(debugUrl);
        const sessions = JSON.parse(response);
        
        if (!Array.isArray(sessions)) {
            throw new Error('Invalid debug protocol response');
        }

        const target = sessions.find((session: any) => 
            session?.url?.includes(appUrl)
        );

        if (target?.webSocketDebuggerUrl) {
            const ws = new WebSocket(target.webSocketDebuggerUrl);
            
            await new Promise<void>((resolve, reject) => {
                ws.on('open', () => {
                    ws.send(JSON.stringify({ id: 1, method: 'Page.reload', params: { targetId: target.id } }), (err) => {
                        if (err) reject(err);
                    });
                    ws.send(JSON.stringify({ id: 2, method: 'Target.activateTarget', params: { targetId: target.id } }), (err) => {
                        ws.close();
                        if (err) reject(err);
                        resolve();
                    });
                });

                ws.on('error', reject);
                ws.on('close', resolve);
            });

            info(`${browser} reloaded`);
        } else {
            info(`Opening new ${browser} window`);
            execFile(browserCommand[0], [...browserCommand.slice(1), ...fullArgs], { shell: true });
        }
    } catch (err) {
        const isRunning = await checkBrowserProcess(browser);
        
        if (isRunning) {
            const choice = await vscode.window.showInformationMessage(
                `${browser} needs restart in debug mode`, 'Restart', 'Cancel'
            );
            
            if (choice === 'Restart') {
                await killBrowserProcess(browser);
                execFile(browserCommand[0], [...browserCommand.slice(1), ...fullArgs], { shell: true });
            }
        } else {
            execFile(browserCommand[0], [...browserCommand.slice(1), ...fullArgs], { shell: true });
        }
    } finally {
        defaultStatusBar();
    }
}

async function checkBrowserProcess(browser: string): Promise<boolean> {
    if (browser === 'Safari') return false;
    const platform = process.platform as keyof typeof BROWSER_PROCESS_NAMES;
    const processes = BROWSER_PROCESS_NAMES[browser]?.[platform] || [];
    
    if (processes.length === 0) return false;

    try {
        if (process.platform === 'win32') {
            const command = `Get-Process | Where-Object { $_.ProcessName -match "${processes.join('|')}" }`;
            const result = await new Promise<boolean>((resolve) => {
                exec(command, 
                    { shell: 'powershell.exe' },
                    (err, stdout) => {
                        resolve(err ? false : stdout.trim().length > 0);
                    }
                );
            });
            return result;
        } else {
            const command = `pgrep -x "${processes.join('|')}"`;
            const result = await new Promise<boolean>((resolve) => {
                exec(command, (err, stdout) => {
                    resolve(err ? false : stdout.trim().length > 0);
                });
            });
            return result;
        }
    } catch (error) {
        warn(`Process check failed: ${error}`);
        return false;
    }
}

async function killBrowserProcess(browser: string): Promise<void> {
    const platform = process.platform as keyof typeof BROWSER_PROCESS_NAMES;
    const processes = BROWSER_PROCESS_NAMES[browser]?.[platform] || [];
    
    if (process.platform === 'win32') {
        const command = `Stop-Process -Force -Name '${processes.join("','")}'`;
        await new Promise<void>((resolve) => {
            exec(`powershell -Command "${command}"`, () => resolve());
        });
    } else {
        await new Promise<void>((resolve) => {
            exec(`pkill -f '${processes.join('|')}'`, () => resolve());
        });
    }
}