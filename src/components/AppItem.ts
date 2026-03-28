import * as vscode from 'vscode';
import * as path from 'path';
import { t } from '../utils/i18n';

export class AppItem extends vscode.TreeItem {
    constructor(
        public readonly appPath: string,
        public readonly isRunning: boolean,
        public readonly port?: number,
        public readonly isDeploying: boolean = false
    ) {
        const label = path.basename(appPath);

        super(label, vscode.TreeItemCollapsibleState.None);

        // No status text in the tree view; icon indicates running state.
        const portHint = port ? `${t('label.port')} ${port}` : '';
        this.description = portHint;
        this.tooltip = `${t('app.tooltip')}: ${appPath}`;

        if (isDeploying) {
            this.contextValue = 'tomcatApp.deploying';
            this.iconPath = new vscode.ThemeIcon('sync~spin');
            this.command = undefined;
            return;
        }

        this.contextValue = isRunning ? 'tomcatApp.running' : 'tomcatApp.stopped';
        this.iconPath = new vscode.ThemeIcon(isRunning ? 'play-circle' : 'circle-outline');

        if (isRunning) {
            // click on running app item opens in browser
            this.command = {
                command: 'tomcat.apps.openInBrowser',
                title: t('app.openInBrowser'),
                arguments: [{ appPath: this.appPath, port: this.port }]
            };
        } else {
            // click on stopped app item deploys it
            this.command = {
                command: 'tomcat.apps.deploy',
                title: t('app.deploy'),
                arguments: [{ appPath: this.appPath }]
            };
        }
    }

}

