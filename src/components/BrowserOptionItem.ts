import * as vscode from 'vscode';
import { translateBrowserName, t } from '../utils/i18n';

/**
 * Option item for selecting a browser.
 *
 * Input: choice string and active state
 * Output: selectable tree item with setBrowser command.
 */
export class BrowserOptionItem extends vscode.TreeItem {
    constructor(public readonly choice: string, public readonly isCurrent: boolean) {
        const display = translateBrowserName(choice as any);
        super(display, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'tomcatBrowserOption';
        this.iconPath = new vscode.ThemeIcon(isCurrent ? 'check' : 'circle-large-outline');
        this.command = {
            command: 'tomcat.instances.setBrowser',
            title: t('instance.setBrowser'),
            arguments: [choice]
        };
        this.description = isCurrent ? t('instance.activeLabel') : undefined;
    }
}
