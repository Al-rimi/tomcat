import * as vscode from 'vscode';

/**
 * Placeholder tree item when no instances or entries are available.
 *
 * Input: label string
 * Output: VS Code TreeItem with circle-slash icon
 */
export class PlaceholderItem extends vscode.TreeItem {
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('circle-slash');
        this.contextValue = 'tomcatEmpty';
    }
}
