import * as vscode from 'vscode';
import { t } from '../utils/i18n';

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
        const descKeyAi = `config.ai.${setting}.description` as const;
        const descKey = `config.${setting}.description` as const;
        const descAi = t(descKeyAi as any);
        const descFallback = descAi !== descKeyAi ? descAi : t(descKey as any);
        this.tooltip = descFallback && descFallback !== descKey ? descFallback : t('ai.listGroupTooltip', { setting });

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
