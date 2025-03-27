import * as vscode from 'vscode';
import { startTomcat } from './commands/start';
import { stopTomcat } from './commands/stop';
import { cleanTomcat } from './commands/clean';
import { deployTomcat } from './commands/deploy';
import { showHelpPanel } from './commands/help';
import { registerAutoDeploy, isJavaEEProject } from './utils/deploy';
import { PortManager } from './utils/PortManager';
import { info, error } from './utils/logger';

let statusBarItem: vscode.StatusBarItem;

export function defaultStatusBar(): void {
    if (statusBarItem) {
        let setting = vscode.workspace.getConfiguration().get<string>('tomcat.defaultDeployMode', 'On Save');
        if (setting === 'On Shortcut') {
            setting = process.platform === 'darwin' ? 'Cmd+S' : 'Ctrl+S';
        }
        statusBarItem.text = `${setting === 'On Save' ? '$(sync~spin)' : '$(server)'} Tomcat deploy: ${setting}`;
        statusBarItem.tooltip = 'Click to change deploy mode';
    }
}

export function updateStatusBar(value: String): void {
    if (statusBarItem) {
        statusBarItem.text = `$(sync~spin) ${value}`;
        statusBarItem.tooltip = `${value} Loading...`;
    }
}

export function activate(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration();
    context.globalState.update('tomcatPort', config.get('tomcat.port', 8080));

    context.subscriptions.push(
        vscode.commands.registerCommand('tomcat.start', startTomcat),
        vscode.commands.registerCommand('tomcat.stop', stopTomcat),
        vscode.commands.registerCommand('tomcat.clean', cleanTomcat),
        vscode.commands.registerCommand('tomcat.deploy', deployTomcat),
        vscode.commands.registerCommand('tomcat.help', () => showHelpPanel(context)),
        vscode.commands.registerCommand('tomcat.toggleDeploySetting', toggleTomcatDeploySetting),
        vscode.workspace.onDidChangeConfiguration(async e => {
            if (e.affectsConfiguration('tomcat.port')) {
                const newPort = vscode.workspace.getConfiguration().get('tomcat.port', 8080);
                const oldPort = context.globalState.get('tomcatPort', 8080);

                if (oldPort === newPort) {
                    return;
                }
    
                try {
                    await PortManager.updateTomcatPort(newPort);    
                    context.globalState.update('tomcatPort', newPort);
                } catch (err) {
                    error(`Port update failed: ${err as Error} Reverted to ${oldPort}`);
                    await config.update('tomcat.port', oldPort, true);
                }
            }
        })
    );

    context.subscriptions.push(
    );

    

    if (isJavaEEProject()) {
        statusBarItem = createStatusBar();
        defaultStatusBar();
        context.subscriptions.push(statusBarItem);
        vscode.commands.executeCommand('setContext', 'tomcat.showdeployButton', true);
        registerAutoDeploy(context);
    } else {
        const deployOnShortcutCommand = vscode.commands.registerCommand('tomcat.deployOnShortcut', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                await editor.document.save();
            }
        });
        context.subscriptions.push(deployOnShortcutCommand);
    }
}

export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}

function createStatusBar(): vscode.StatusBarItem {
    if (!statusBarItem) {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        statusBarItem.command = 'tomcat.toggleDeploySetting';
        statusBarItem.show();
    }
    return statusBarItem;
}

async function toggleTomcatDeploySetting() {
    const config = vscode.workspace.getConfiguration();
    let setting = config.get<string>('tomcat.defaultDeployMode', 'On Save');

    switch (setting) {
        case 'Disabled':
            setting = 'On Shortcut';
            break;
        case 'On Shortcut':
            setting = 'On Save';
            break;
        case 'On Save':
        default:
            setting = 'Disabled';
            break;
    }

    await config.update('tomcat.defaultDeployMode', setting, vscode.ConfigurationTarget.Global);
    defaultStatusBar();
}