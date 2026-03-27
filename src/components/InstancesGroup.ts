import * as vscode from 'vscode';

/**
 * Instances root group for active Tomcat instances.
 *
 * Input: group label
 * Output: Expanded group item holding instance entries.
 */
export class InstancesGroup extends vscode.TreeItem {
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.contextValue = 'tomcatInstancesGroup';
        this.iconPath = new vscode.ThemeIcon('server-environment');
    }
}
