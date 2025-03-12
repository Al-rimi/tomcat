import { exec } from 'child_process';
import { info, error } from './logger';
import WebSocket from 'ws';
import * as vscode from 'vscode';
import { defaultStatusBar, updateStatusBar } from '../extension';

function getBrowserCommand(browser: string): string | null{
    switch (browser) {
        case 'Firefox':
            return process.platform === 'win32' ? 'start firefox' : process.platform === 'darwin' ? '/Applications/Firefox.app/Contents/MacOS/firefox' : 'firefox';
        case 'Microsoft Edge':
            return process.platform === 'win32' ? 'start msedge' : process.platform === 'darwin' ? '/Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge' : 'msedge';
        case 'Brave':
            return process.platform === 'win32' ? 'start brave' : process.platform === 'darwin' ? '/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser' : 'brave-browser';
        case 'Opera':
            return process.platform === 'win32' ? 'start opera' : process.platform === 'darwin' ? '/Applications/Opera.app/Contents/MacOS/Opera' : 'opera';
        case 'Safari':
            return process.platform === 'darwin' ? 'open -a "Safari"' : null;
        default:
            return process.platform === 'win32' ? 'start chrome' : process.platform === 'darwin' ? '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome' : 'google-chrome';
    }
}

export async function runBrowser(appName: string): Promise<void> {
    const browser = vscode.workspace.getConfiguration('tomcat').get<string>('defaultBrowser') || 'chrome';
    const debugPort = 9222;
    const appUrl = `http://localhost:${vscode.workspace.getConfiguration().get('tomcat.port', 8080)}/${appName}`;
    const debugUrl = `http://localhost:${debugPort}/json`;
    const debugCommand = browser === 'Firefox' ? `--start-debugger-server=${debugPort}` : `--remote-debugging-port=${debugPort}`;
    const browserCommand = getBrowserCommand(browser);
    if(!browserCommand) { return; }

    updateStatusBar(browser);

    exec(`curl ${debugUrl}`, async (_, stdout) => {
        try {
            const sessions = JSON.parse(stdout);
            const target = sessions.find((session: any) => session.url.includes(appUrl));

            if (target && target.webSocketDebuggerUrl) {
                const ws = new WebSocket(target.webSocketDebuggerUrl);
                ws.on('open', () => {
                    ws.send(JSON.stringify({ id: 1, method: 'Page.reload', params: {} }));
                    ws.send(JSON.stringify({ id: 2, method: 'Target.activateTarget', params: { targetId: target.id } }));
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
                return;
            }
        } catch (parseErr) {
            async function isBrowserRunning(browser: string): Promise<boolean> {
                return new Promise((resolve) => {
                    const command = process.platform === 'win32'
                        ? `tasklist | findstr /i "${browser}"`
                        : `ps aux | grep -i "${browser}" | grep -v "grep"`;

                    exec(command, (_, stdout) => {
                        resolve(stdout !== '');
                    });
                });
            }

            if (await isBrowserRunning(browser)) {
                const userResponse = await vscode.window.showInformationMessage(
                    `${browser} is not in debug mode. Do you want to reopen it in debug mode?`,
                    'Yes', 'No'
                );

                if (userResponse === 'Yes') {
                    exec('taskkill /IM chrome.exe /F', (killErr) => {
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
                defaultStatusBar();
                exec(`${browserCommand} ${debugCommand} ${appUrl}`);
            }
        }
    });
}