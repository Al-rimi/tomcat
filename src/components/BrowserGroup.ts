import * as vscode from 'vscode';
import { t } from '../utils/i18n';

/**
 * Browser selection group for tree view.
 *
 * Input: current browser name
 * Output: collapsed browser group item in tree.
 */
export class BrowserGroup extends vscode.TreeItem {
    constructor(current: string) {
        super(t('group.browser'), vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'tomcatBrowserGroup';
        this.iconPath = new vscode.ThemeIcon('globe');
        this.description = current;
    }
}
