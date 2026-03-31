import * as vscode from 'vscode';
import { t } from '../utils/i18n';

export class AIListValue extends vscode.TreeItem {
    constructor(public readonly setting: string, public readonly value: string, selected = false) {
        super(value, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'tomcatAIListValue';
        this.description = undefined;
        this.iconPath = new vscode.ThemeIcon(selected ? 'check' : 'circle-large-outline');
        this.command = {
            command: 'tomcat.ai.updateSetting',
            title: t('ai.selectSettingValue'),
            arguments: [{ setting, action: 'select', value }]
        };
        const descKeyAi = `config.ai.${setting}.description` as const;
        const descKey = `config.${setting}.description` as const;
        const descAi = t(descKeyAi as any);
        const descFallback = descAi !== descKeyAi ? descAi : t(descKey as any);
        this.tooltip = descFallback && descFallback !== descKey ? descFallback : t('ai.listValueTooltip', { setting, value });
    }
}
