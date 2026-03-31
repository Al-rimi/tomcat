import * as vscode from 'vscode';
import { t } from '../utils/i18n';

export class AIOptionItem extends vscode.TreeItem {
    constructor(public readonly setting: string, public readonly value: string, public readonly icon: string) {
        const labels: Record<string, string> = {
            provider: t('ai.provider'),
            endpoint: t('ai.endpoint'),
            model: t('ai.model'),
            apiKey: t('ai.apiKey'),
            localStartCommand: t('ai.localStartCommand'),
            maxTokens: t('ai.maxTokens'),
            timeoutMs: t('ai.timeoutMs'),
            autoStartLocal: t('ai.autoStartLocal'),
            debug: t('ai.debug')
        };
        const label = labels[setting] || setting;

        super(`${label}: ${String(value)}`, vscode.TreeItemCollapsibleState.None);
        this.description = String(value);
        this.contextValue = 'tomcatAIOption';
        this.iconPath = new vscode.ThemeIcon(icon);
        const descriptionKey = `config.ai.${setting}.description` as const;
        this.tooltip = t(descriptionKey as any) || t('ai.optionSettingTooltip', { title: label, value: String(value) });
        this.command = {
            command: 'tomcat.ai.updateSetting',
            title: t('action.configure'),
            arguments: [setting]
        };
    }
}
