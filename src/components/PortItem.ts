import * as vscode from 'vscode';
import { t } from '../utils/i18n';

/**
 * Individual port selection entry for TreeView.
 *
 * Input: port number and active flag
 * Output: clickable setPort command TreeItem.
 */
export class PortItem extends vscode.TreeItem {
    constructor(public readonly port: number, public readonly isCurrent: boolean) {
        super(String(port), vscode.TreeItemCollapsibleState.None);
        this.contextValue = isCurrent ? 'tomcatPortEntryActive' : 'tomcatPortEntry';
        this.iconPath = new vscode.ThemeIcon(isCurrent ? 'check' : 'circle-large-outline');
        this.command = {
            command: 'tomcat.instances.setPort',
            title: t('instance.useThisPort'),
            arguments: [String(port)]
        };
        this.description = isCurrent ? t('instance.activeLabel') : undefined;
        this.tooltip = t('instance.portTooltip', { port: String(port), status: isCurrent ? t('instance.activeLabel') : t('app.status.stopped') });
    }
}
