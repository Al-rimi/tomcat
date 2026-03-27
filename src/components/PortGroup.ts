import * as vscode from 'vscode';
import { t } from '../utils/i18n';

/**
 * Group node for port list.
 *
 * Input: current port number
 * Output: collapsed port group in tree view.
 */
export class PortGroup extends vscode.TreeItem {
    constructor(current: number) {
        super(t('group.port'), vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'tomcatPortGroup';
        this.iconPath = new vscode.ThemeIcon('plug');
        this.description = String(current);
    }
}
