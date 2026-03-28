import * as vscode from 'vscode';
import { t } from '../utils/i18n';

export class AdditionalGroup extends vscode.TreeItem {
    constructor() {
        super(t('group.additional'), vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'tomcatAdditionalGroup';
        this.iconPath = new vscode.ThemeIcon('settings-gear');
    }
}
