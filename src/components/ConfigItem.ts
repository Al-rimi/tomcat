import * as vscode from 'vscode';
import { t } from '../utils/i18n';

/**
 * Configuration option tree item (home/java/port/browser).
 *
 * Input: field key, label, value, icon
 * Output: VS Code TreeItem with configure command argument
 */
export class ConfigItem extends vscode.TreeItem {
    constructor(public readonly field: 'home' | 'java' | 'port' | 'browser', label: string, value: string, icon: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.description = value;
        this.contextValue = 'tomcatConfig';
        this.iconPath = new vscode.ThemeIcon(icon);
        this.command = {
            command: 'tomcat.instances.configureField',
            title: t('action.configure'),
            arguments: [field]
        };
        const descKey = `config.${field}.description` as const;
        this.tooltip = t(descKey as any) || t('config.itemTooltip', { label, value });
    }
}
