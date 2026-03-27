import * as vscode from 'vscode';
import { t } from '../utils/i18n';

/**
 * Group node for listing Tomcat homes.
 *
 * Input: label suffix (e.g., active version or status)
 * Output: collapsed Home group in tree.
 */
export class HomeGroup extends vscode.TreeItem {
    constructor(labelSuffix: string) {
        super(t('group.home'), vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'tomcatHomeGroup';
        this.iconPath = new vscode.ThemeIcon('home');
        this.description = labelSuffix;
    }
}
