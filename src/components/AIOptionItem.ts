import * as vscode from 'vscode';
import { t } from '../utils/i18n';

export class AIOptionItem extends vscode.TreeItem {
    constructor(public readonly setting: string, public readonly value: string, public readonly icon: string) {
        const labels: Record<string, string> = {
            provider: 'Provider',
            endpoint: 'Endpoint',
            model: 'Model',
            apiKey: 'API Key',
            localStartCommand: 'Local Start Command',
            maxTokens: 'Max Tokens',
            timeoutMs: 'Timeout ms',
            autoStartLocal: 'Auto Start Local',
            debug: 'Debug'
        };
        const label = labels[setting] || setting;

        super(`${label}: ${String(value)}`, vscode.TreeItemCollapsibleState.None);
        this.description = String(value);
        this.contextValue = 'tomcatAIOption';
        this.iconPath = new vscode.ThemeIcon(icon);
        this.command = {
            command: 'tomcat.ai.updateSetting',
            title: t('action.configure'),
            arguments: [setting]
        };
    }
}
