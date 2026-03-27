import * as vscode from 'vscode';

/**
 * Action item for performing commands (start, stop, etc.).
 *
 * Input: label, commandId, icon
 * Output: clickable tree item bound to extension command.
 */
export class ActionItem extends vscode.TreeItem {
    constructor(label: string, commandId: string, icon: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'tomcatAction';
        this.iconPath = new vscode.ThemeIcon(icon);
        this.command = {
            command: commandId,
            title: label
        };
    }
}
