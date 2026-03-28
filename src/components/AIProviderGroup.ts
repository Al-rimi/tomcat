import * as vscode from 'vscode';
import { t } from '../utils/i18n';

/**
 * AI provider selection subgroup
 */
export class AIProviderGroup extends vscode.TreeItem {
    constructor(label?: string, selected?: string) {
        super(label || t('ai.provider'), vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'tomcatAIProviderGroup';
        this.iconPath = new vscode.ThemeIcon('globe');
        if (selected) {
            this.description = selected;
        }
    }
}
