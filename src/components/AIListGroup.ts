import * as vscode from 'vscode';

export class AIListGroup extends vscode.TreeItem {
    constructor(public readonly setting: string, label: string, selectedValue?: string) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);

        let contextValue = 'tomcatAIListGroup';
        if (setting === 'logEncoding') {
            contextValue = 'tomcatLogEncodingGroup';
        } else if (setting === 'base') {
            contextValue = 'tomcatBaseGroup';
        }
        this.contextValue = contextValue;

        this.description = selectedValue || '';

        const iconMap: Record<string, string> = {
            endpoint: 'link',
            model: 'symbol-key',
            apiKey: 'key',
            localStartCommand: 'terminal',
            maxTokens: 'number',
            provider: 'globe',
            logEncoding: 'file-code',
            base: 'root-folder'
        };

        this.iconPath = new vscode.ThemeIcon(iconMap[setting] || 'list-unordered');
    }
}
