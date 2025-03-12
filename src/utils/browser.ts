import { exec } from 'child_process';
import { info, error , warn } from './logger';
import WebSocket from 'ws';
import * as vscode from 'vscode';
import { defaultStatusBar, updateStatusBar } from '../extension';
import * as http from 'http';
import * as https from 'https';

function getBrowserCommand(browser: string): string | null {
    switch (browser) {
        case 'Firefox':
            return process.platform === 'win32' 
                ? 'start firefox.exe' 
                : process.platform === 'darwin' 
                    ? '"/Applications/Firefox.app/Contents/MacOS/firefox"' 
                    : 'firefox';
        case 'Microsoft Edge':
            return process.platform === 'win32' 
                ? 'start msedge.exe' 
                : process.platform === 'darwin' 
                    ? '"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"' 
                    : 'msedge';
        case 'Brave':
            return process.platform === 'win32' 
                ? 'start brave.exe' 
                : process.platform === 'darwin' 
                    ? '"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"' 
                    : 'brave-browser';
        case 'Opera':
            return process.platform === 'win32' 
                ? 'start opera.exe' 
                : process.platform === 'darwin' 
                    ? '"/Applications/Opera.app/Contents/MacOS/Opera"' 
                    : 'opera';
        case 'Safari':
            return process.platform === 'darwin' 
                ? 'open -a "Safari"' 
                : null;
        default: // Chrome
            return process.platform === 'win32' 
                ? 'start chrome.exe' 
                : process.platform === 'darwin' 
                    ? '"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"' 
                    : 'google-chrome';
    }
}

async function httpGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
}

export async function runBrowser(appName: string): Promise<void> {
    const browser = vscode.workspace.getConfiguration('tomcat').get<string>('defaultBrowser') || 'chrome';
    const debugPort = 9222;
    const appUrl = `http://localhost:${vscode.workspace.getConfiguration().get('tomcat.port', 8080)}/${appName}`;
    const debugUrl = `http://localhost:${debugPort}/json`;
    const debugCommand = browser === 'Firefox' 
        ? `--start-debugger-server=${debugPort}` 
        : `--remote-debugging-port=${debugPort}`;
    const browserCommand = getBrowserCommand(browser);
    if (!browserCommand) { 
        warn(`${browser} is not supported on this platform`);
        return; 
    }

    updateStatusBar(browser);

    try {
        const response = await httpGet(debugUrl);
        const sessions = JSON.parse(response);
        const target = sessions.find((session: any) => {
            return session.url && session.url.includes(appUrl);
        });
        
        if (target && target.webSocketDebuggerUrl) {
            const ws = new WebSocket(target.webSocketDebuggerUrl);
            ws.on('open', () => {
                ws.send(JSON.stringify({ id: 1, method: 'Page.reload', params: {} }));
                ws.send(JSON.stringify({ id: 2, method: 'Target.activateTarget', params: { targetId: target.id } }));
                ws.send(JSON.stringify({ id: 3, method: 'Page.bringToFront', params: {} })); 
                ws.close();
                info(`${browser} reloaded`);
                defaultStatusBar();
            });
            ws.on('error', (err) => {
                error(`WebSocket Error: ${err}`);
                exec(`${browserCommand} ${debugCommand} ${appUrl}`);
                defaultStatusBar();
            });
        } else {
            info(`No active sessions, opening a new ${browser} window`);
            exec(`${browserCommand} ${debugCommand} ${appUrl}`);
            defaultStatusBar();
        }
    } catch (err) {
        async function isBrowserRunning(browser: string): Promise<boolean> {
            if (browser === 'Firefox' || browser === 'Safari') { return false; }
            return new Promise((resolve) => {
                const command = process.platform === 'win32'
                    ? `tasklist | findstr /i "${browser}"`
                    : `ps aux | grep -i "${browser}" | grep -v "grep"`;

                exec(command, (_, stdout) => {
                    resolve(stdout.trim() !== '');
                });
            });
        }

        if (await isBrowserRunning(browser)) {
            const userResponse = await vscode.window.showInformationMessage(
                `${browser} is not in debug mode. Reopen in debug mode?`,
                'Yes', 'No'
            );

            if (userResponse === 'Yes') {
                const killCommand = process.platform === 'win32'
                    ? browser === 'Microsoft Edge'
                        ? `(taskkill /IM msedge.exe /IM msedgewebview2.exe /F /T 2>NUL) || ver >NUL`
                        : browser === 'Google Chrome' 
                            ? `(taskkill /IM chrome.exe /F /T 2>NUL) || ver >NUL` 
                            : `(taskkill /IM ${browser.toLowerCase()}.exe /F /T 2>NUL) || ver >NUL`
                    : browser === 'Microsoft Edge' 
                        ?  `pkill -f "msedge" 2>/dev/null || true`
                        : browser === 'Google Chrome' 
                            ? `pkill -f "chrome" 2>/dev/null || true` 
                            : `pkill -f "${browser.toLowerCase()}" 2>/dev/null || true`;

                exec(killCommand, (killErr) => {
                    if (killErr) {
                        error(`Error closing ${browser}: ${killErr}`);
                    } else {
                        exec(`${browserCommand} ${debugCommand} ${appUrl}`);
                    }
                    defaultStatusBar();
                });
            } else {
                info(`User chose not to reopen ${browser}`);
                defaultStatusBar();
            }
        } else {
            info(`No active sessions, opening a new ${browser} window`);
            exec(`${browserCommand} ${debugCommand} ${appUrl}`);
            defaultStatusBar();
        }
    }
}