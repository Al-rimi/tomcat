import * as vscode from 'vscode';
import { t } from '../utils/i18n';

/**
 * AI toggles subgroup (On/Off values) for settings like autoStartLocal, debug.
 */
export class AIToggleGroup extends vscode.TreeItem {
    constructor() {
        super(t('ai.toggles'), vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'tomcatAIToggleGroup';
        this.iconPath = new vscode.ThemeIcon('switch-camera');
    }
}
