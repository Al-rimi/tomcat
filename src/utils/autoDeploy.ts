import * as vscode from 'vscode';
import { deploy } from './deploy';
import { info } from './logger';

let autoDeployDisposables: vscode.Disposable[] = [];

async function isJavaEEProject(): Promise<boolean> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return false;
    }

    for (const folder of workspaceFolders) {
        const javaEEConfigFile = vscode.Uri.joinPath(folder.uri, 'WEB-INF', 'web.xml');
        try {
            await vscode.workspace.fs.stat(javaEEConfigFile);
            return true;
        } catch {
            return false;
        }
    }
    return false;
}

export function registerAutoDeploy(context: vscode.ExtensionContext): void {
    if (!isJavaEEProject()) {
        info('Project does not meet JavaEE standards. Auto Deploy will not be registered.');
        return;
    }

    let config = vscode.workspace.getConfiguration('tomcat');
    let autoDeploy = config.get<string>('autoDeploy', 'disabled');
    let autoDeployType = config.get<string>('autoDeployType', 'Fast');

    function updateAutoDeploy(): void {
        if (!isJavaEEProject()) {
            info('Project does not meet JavaEE standards. Auto Deploy will not be registered.');
            return;
        }

        config = vscode.workspace.getConfiguration('tomcat');
        autoDeploy = config.get<string>('autoDeploy', 'disabled');
        autoDeployType = config.get<string>('autoDeployType', 'Fast');

        autoDeployDisposables.forEach(disposable => disposable.dispose());
        autoDeployDisposables = [];

        if (autoDeploy === 'On Save') {
            const saveDisposable = vscode.workspace.onDidSaveTextDocument(async (document) => {
                info(`File saved: ${document.fileName}`);
                const filesConfig = vscode.workspace.getConfiguration('files');
                const autoSave = filesConfig.get<string>('autoSave', 'off');

                if (autoSave === 'afterDelay') {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

                deploy(autoDeployType as 'Fast' | 'Maven');
            });
            autoDeployDisposables.push(saveDisposable);
            context.subscriptions.push(saveDisposable);
            info('Auto Deploy On Save Registered');
        }

        const ctrlSDisposable = vscode.commands.registerCommand('tomcat.deployOnCtrlS', async () => {
            if (autoDeploy === 'On Ctrl+S') {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    await editor.document.save();
                    deploy(autoDeployType as 'Fast' | 'Maven');
                    info('Auto Deploy on Ctrl+S Triggered');
                }
            }
        });

        autoDeployDisposables.push(ctrlSDisposable);
        context.subscriptions.push(ctrlSDisposable);
        info('Auto Deploy On Ctrl+S Registered');
    }

    updateAutoDeploy();

    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('tomcat.autoDeploy') || event.affectsConfiguration('tomcat.autoDeployType')) {
            info('Configuration changed, reloading Auto Deploy settings');
            updateAutoDeploy();
        }
    });
}