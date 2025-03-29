import * as vscode from 'vscode';
import { showHelpPanel } from './help';
import { Builder } from './utils/Builder';
import { Tomcat } from './utils/Tomcat';
import { Logger } from './utils/Logger';
import { Browser } from './utils/Browser';

export function activate(context: vscode.ExtensionContext) {
    const logger = Logger.getInstance();
    const tomcat = Tomcat.getInstance();
    const builder = Builder.getInstance();
    
    logger.activate(context);

    context.subscriptions.push(
        vscode.commands.registerCommand('tomcat.start', () => tomcat.start()),
        vscode.commands.registerCommand('tomcat.stop', () => tomcat.stop()),
        vscode.commands.registerCommand('tomcat.clean', () => tomcat.clean()),
        vscode.commands.registerCommand('tomcat.deploy', () => builder.deploy('Choice')),
        vscode.commands.registerCommand('tomcat.help', () => showHelpPanel(context)),
        vscode.commands.registerCommand('tomcat.toggleDeploySetting', toggleTomcatDeploySetting),
        vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (event.affectsConfiguration('tomcat')) {
                updateSettings(event);
            }
        })
    );

    if (Builder.isJavaEEProject()) {
        logger.initStatusBar(context);
        logger.defaultStatusBar();
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

async function toggleTomcatDeploySetting() {
    const config = vscode.workspace.getConfiguration();
    const logger = Logger.getInstance();
    let setting = config.get<string>('tomcat.defaultDeployMode', 'On Save');

    switch (setting) {
        case 'Disabled': setting = 'On Shortcut'; break;
        case 'On Shortcut': setting = 'On Save'; break;
        case 'On Save': setting = 'Disabled'; break;
    }

    await config.update('tomcat.defaultDeployMode', setting, vscode.ConfigurationTarget.Global);
    logger.defaultStatusBar();
}

export function deactivate() {
    Logger.getInstance().deactivate();
    Tomcat.getInstance().deactivate();
}