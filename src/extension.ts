import * as vscode from 'vscode';
import { startTomcat } from './commands/start';
import { stopTomcat } from './commands/stop';
import { cleanTomcat } from './commands/clean';
import { deployTomcat } from './commands/deploy';
import { showHelpPanel } from './commands/help';
import { registerAutoDeploy, isJavaEEProject } from './utils/deploy';

let statusBarItem: vscode.StatusBarItem;

export function defaultStatusBar(): void {
    if (statusBarItem) {
        let setting = vscode.workspace.getConfiguration().get<string>('tomcat.defaultDeployMood', 'On Save');
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
    context.subscriptions.push(
        vscode.commands.registerCommand('tomcat.start', startTomcat),
        vscode.commands.registerCommand('tomcat.stop', stopTomcat),
        vscode.commands.registerCommand('tomcat.clean', cleanTomcat),
        vscode.commands.registerCommand('tomcat.deploy', deployTomcat),
        vscode.commands.registerCommand('tomcat.help', showHelpPanel),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tomcat.toggleDeploySetting', toggleTomcatDeploySetting)
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
    let setting = config.get<string>('tomcat.defaultDeployMood', 'On Save');

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

    await config.update('tomcat.defaultDeployMood', setting, vscode.ConfigurationTarget.Global);
    defaultStatusBar();
}