import { exec } from 'child_process';
import { info, error } from './logger';
import WebSocket from 'ws';
import * as vscode from 'vscode';

function getBrowserCommand(): string {
    const browser = vscode.workspace.getConfiguration('tomcat').get<string>('defaultBrowser') || 'chrome';

    switch (browser) {
        case 'Firefox':
            return process.platform === 'win32' ? 'start firefox' : 'firefox';
        case 'Microsoft Edge':
            return process.platform === 'win32' ? 'start msedge' : 'msedge';
        case 'Safari':
            return process.platform === 'darwin' ? 'open -a "Safari"' : '';
        case 'Brave':
            return process.platform === 'win32' ? 'start brave' : process.platform === 'darwin' ? 'open -a "Brave Browser"' : 'brave-browser';
        case 'Opera':
            return process.platform === 'win32' ? 'start opera' : process.platform === 'darwin' ? 'open -a "Opera"' : 'opera';
        default:
            return process.platform === 'win32' ? 'start chrome' : process.platform === 'darwin' ? 'open -a "Google Chrome"' : 'google-chrome';
    }
}

export async function runBrowser(appName: string): Promise<void> {
    const browser = vscode.workspace.getConfiguration('tomcat').get<string>('defaultBrowser') || 'chrome';
    const targetPort = browser === 'firefox' ? 6000 : 9222;
    const appUrl = `http://localhost:${vscode.workspace.getConfiguration().get('tomcat.port', 8080)}/${appName}`;
    const debugUrl = `http://localhost:${targetPort}/json`;
    const browserCommand = getBrowserCommand();

    exec(`curl ${debugUrl}`, async (err, stdout) => {
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
                });
                ws.on('error', (err) => {
                    error(`WebSocket Error: ${err}`);
                    exec(`${browserCommand} --remote-debugging-port=${targetPort} ${appUrl}`);
                });
            } else {
                info(`No active sessions, opening a new ${browser} window`);
                exec(`${browserCommand} --remote-debugging-port=${targetPort} ${appUrl}`);
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
                            exec(`${browserCommand} --remote-debugging-port=${targetPort} ${appUrl}`);
                        }
                    });
                } else {
                    info(`User chose not to reopen ${browser}`);
                }
            } else {
                info(`No active sessions, opening a new ${browser} window`);
                exec(`${browserCommand} --remote-debugging-port=${targetPort} ${appUrl}`);
            }
        }
    });
}