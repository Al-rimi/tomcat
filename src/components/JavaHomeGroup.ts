import * as vscode from 'vscode';
import { t } from '../utils/i18n';

/**
 * Group node for listing Java homes.
 *
 * Input: label suffix
 * Output: collapsed Java home group.
 */
export class JavaHomeGroup extends vscode.TreeItem {
    constructor(labelSuffix: string) {
        super(t('group.javaHome'), vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'tomcatJavaHomeGroup';
        this.iconPath = new vscode.ThemeIcon('tools');
        this.description = labelSuffix;
    }
}
