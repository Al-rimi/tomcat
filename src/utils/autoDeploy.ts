import * as vscode from 'vscode';
import { deploy } from './deploy';
import { info } from './logger';

let autoDeployDisposables: vscode.Disposable[] = [];

export function registerAutoDeploy(context: vscode.ExtensionContext) {
    let config = vscode.workspace.getConfiguration('tomcat');
    let autoDeploy = config.get<string>('autoDeploy', 'disabled');
    let autoDeployType = config.get<string>('autoDeployType', 'Fast');

    function updateAutoDeploy() {
        config = vscode.workspace.getConfiguration('tomcat');
        autoDeploy = config.get<string>('autoDeploy', 'disabled');
        autoDeployType = config.get<string>('autoDeployType', 'Fast');

        autoDeployDisposables.forEach(disposable => disposable.dispose());
        autoDeployDisposables = [];

        if (autoDeploy === 'On Save') {
            const saveDisposable = vscode.workspace.onDidSaveTextDocument(async (document) => {
                info(`File saved: ${document.fileName}`);
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
