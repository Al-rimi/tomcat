import * as vscode from 'vscode';

/**
 * Apps root group for discovered Java EE applications.
 */
export class AppsGroup extends vscode.TreeItem {
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.contextValue = 'tomcatAppsGroup';
        this.iconPath = new vscode.ThemeIcon('package');
    }
}
