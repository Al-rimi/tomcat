import * as vscode from 'vscode';
import { t } from '../utils/i18n';

/**
 * Single AI setting row in the tree view.
 */
export class AISettingItem extends vscode.TreeItem {
    constructor(setting: string, title: string, value: string, icon: string, _active?: boolean, action: string = 'edit', valueArg?: string) {
        super(title, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'tomcatAISetting';
        this.description = value;
        this.tooltip = `${title}: ${value}`;

        // For boolean status fields, use check/circle icons to indicate on/off.
        if (_active === true || _active === false) {
            this.iconPath = new vscode.ThemeIcon(_active ? 'check' : 'circle-large-outline');
        } else {
            this.iconPath = new vscode.ThemeIcon(icon);
        }

        this.command = {
            command: 'tomcat.ai.updateSetting',
            title: t('action.configure'),
            arguments: [{ setting, action, value: valueArg }]
        };
    }
}
