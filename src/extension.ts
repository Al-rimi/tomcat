import * as vscode from 'vscode';
import { showHelpPanel } from './help';
import { Builder } from './utils/Builder';
import { Tomcat } from './utils/Tomcat';
import { Logger } from './utils/Logger';
import { Browser } from './utils/Browser';

export function activate(context: vscode.ExtensionContext) {
    const builder = Builder.getInstance();
    const tomcat = Tomcat.getInstance();
    
    context.subscriptions.push(
        vscode.commands.registerCommand('tomcat.start', () => tomcat.start()),
        vscode.commands.registerCommand('tomcat.stop', () => tomcat.stop()),
        vscode.commands.registerCommand('tomcat.clean', () => tomcat.clean()),
        vscode.commands.registerCommand('tomcat.deploy', () => builder.deploy('Choice')),
        vscode.commands.registerCommand('tomcat.help', () => showHelpPanel(context)),
        vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (event.affectsConfiguration('tomcat')) {
                updateSettings(event);
            }
        })
    );

    if (Builder.isJavaEEProject()) {
        Logger.getInstance().initStatusBar(context);
        vscode.commands.executeCommand('setContext', 'tomcat.showdeployButton', true);
        context.subscriptions.push(
            vscode.workspace.onWillSaveTextDocument((e) => {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders) {
                    const selectedProjectPath = workspaceFolders[0].uri.fsPath;
                    if (e.document.uri.fsPath.startsWith(selectedProjectPath)) {
                        builder.autoDeploy(e.reason);
                    }
                }
            })
        );
    }
}

function updateSettings(event: vscode.ConfigurationChangeEvent) {
    const config = vscode.workspace.getConfiguration('tomcat');

    if (event.affectsConfiguration('tomcat.home')) {
        const tomcatHome = Tomcat.getInstance().findTomcatHome();
        config.update('home', tomcatHome || '');
        Tomcat.getInstance().updatePort();
        Builder.getInstance().updateConfig();
        Browser.getInstance().updateConfig();
    } else if (event.affectsConfiguration('tomcat.javaHome')) {
        const javaHome = Tomcat.getInstance().findJavaHome();
        config.update('javaHome', javaHome || '');
    } else if (event.affectsConfiguration('tomcat.port')) {
        Tomcat.getInstance().updatePort();
    } else if (event.affectsConfiguration('tomcat.defaultDeployMode') || event.affectsConfiguration('tomcat.defaultBuildType')) {
        Builder.getInstance().updateConfig();
    } else if (event.affectsConfiguration('tomcat.defaultBrowser')) {
        Browser.getInstance().updateConfig();
    } else if (event.affectsConfiguration('tomcat.loggingLevel')) {
        Logger.getInstance().updateConfig();
    }
}

export function deactivate() {
    Tomcat.getInstance().deactivate();
    Logger.getInstance().deactivate();
}