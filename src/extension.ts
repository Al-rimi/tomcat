import * as vscode from 'vscode';
import { startTomcat } from './commands/start';
import { stopTomcat } from './commands/stop';
import { cleanTomcat } from './commands/clean';
import { deployTomcat } from './commands/deploy';
import { showHelp } from './commands/help';
import { registerAutoDeploy } from './utils/autoDeploy';

let statusBarItem: vscode.StatusBarItem;

export function createStatusBarItem(): vscode.StatusBarItem {
    if (!statusBarItem) {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        statusBarItem.show();
    }
    return statusBarItem;
}

export function updateStatusBarItem(isRunning: boolean): void {
    if (!statusBarItem) {
        statusBarItem = createStatusBarItem();
    }
    statusBarItem.text = isRunning ? '$(sync~spin) Tomcat' : '$(circle-slash) Tomcat';
    statusBarItem.show();
}

export function activate(context: vscode.ExtensionContext) {
    statusBarItem = createStatusBarItem();
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(
        vscode.commands.registerCommand('tomcat.start', startTomcat),
        vscode.commands.registerCommand('tomcat.stop', stopTomcat),
        vscode.commands.registerCommand('tomcat.clean', cleanTomcat),
        vscode.commands.registerCommand('tomcat.deploy', deployTomcat),
        vscode.commands.registerCommand('tomcat.help', showHelp)
    );

    registerAutoDeploy(context);
}

export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}