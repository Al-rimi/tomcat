import { exec } from 'child_process';
import { info, error } from './logger';
import WebSocket from 'ws';
import * as vscode from 'vscode';

function getBrowserCommand(): string {
    const browser = vscode.workspace.getConfiguration('tomcat').get<string>('defaultBrowser');

    switch (browser) {
        case 'Firefox':
            // TODO: Add support for Firefox doesn't use chrome devtools protocol
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

export async function runBrowser(appName: string) {

    const browser = vscode.workspace.getConfiguration('tomcat').get<string>('defaultBrowser');
    const targetPort = browser === 'firefox' ? 6000 : 9222;
    const appUrl = `http://localhost:8080/${appName}`;
    const debugUrl = `http://localhost:${targetPort}/json`;
    const browserCommand = getBrowserCommand();

    exec(`curl ${debugUrl}`, (err, stdout) => {
        if (err || !stdout.trim()) {
            info(`No active sessions, opening a new ${browserCommand} window...`);
            exec(`${browserCommand} --remote-debugging-port=${targetPort} ${appUrl}`);
            return;
        }

        try {
            const sessions = JSON.parse(stdout);
            const target = sessions.find((session: any) => session.url.includes(appUrl));

            if (target && target.webSocketDebuggerUrl) {
                const ws = new WebSocket(target.webSocketDebuggerUrl);
                ws.on('open', () => {
                    ws.send(JSON.stringify({ id: 1, method: 'Page.reload', params: {} }));
                    ws.send(JSON.stringify({ id: 2, method: 'Target.activateTarget', params: { targetId: target.id } }));
                    ws.close();
                    info('Browser reloaded');
                });
                ws.on('error', (err) => {
                    error(`WebSocket Error: ${err}`);
                    exec(`${browserCommand} --remote-debugging-port=${targetPort} ${appUrl}`);
                });
            } else {
                info(`No matching session, opening a new ${browserCommand} window...`);
                exec(`${browserCommand} --remote-debugging-port=${targetPort} ${appUrl}`);
            }
        } catch (parseErr) {
            error(`JSON Parsing Error: ${parseErr}`);
            exec(`${browserCommand} --remote-debugging-port=${targetPort} ${appUrl}`);
        }
    });
}
