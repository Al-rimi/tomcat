import * as vscode from 'vscode';
import { t } from '../utils/i18n';

/**
 * AI settings group for the tree view.
 */
export class AIGroup extends vscode.TreeItem {
    constructor(provider?: string, model?: string) {
        super(t('group.ai'), vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'tomcatAIGroup';
        this.iconPath = new vscode.ThemeIcon('sparkle');
        this.tooltip = t('group.aiTooltip');

        const parts: string[] = [];
        if (provider) {
            parts.push(provider);
        }
        if (model) {
            parts.push(model);
        }

        this.description = parts.length ? parts.join(' • ') : undefined;
    }
}
