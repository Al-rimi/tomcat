import * as vscode from 'vscode';
import { t } from '../utils/i18n';

/**
 * Settings root group for the TreeView.
 *
 * Input: none
 * Output: Collapsed settings group item in the tree.
 */
export class SettingsGroup extends vscode.TreeItem {
    constructor() {
        super(t('group.settings'), vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'tomcatSettingsGroup';
        this.iconPath = new vscode.ThemeIcon('settings-gear');
        this.tooltip = t('group.settingsTooltip');
    }
}
