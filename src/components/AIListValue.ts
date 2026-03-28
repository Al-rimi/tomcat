import * as vscode from 'vscode';

export class AIListValue extends vscode.TreeItem {
    constructor(public readonly setting: string, public readonly value: string, selected = false) {
        super(value, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'tomcatAIListValue';
        this.description = undefined;
        this.iconPath = new vscode.ThemeIcon(selected ? 'check' : 'circle-large-outline');
        this.command = {
            command: 'tomcat.ai.updateSetting',
            title: 'Select AI setting value',
            arguments: [{ setting, action: 'select', value }]
        };
    }
}
