import * as vscode from 'vscode';
import * as path from 'path';
import { t } from '../utils/i18n';

/**
 * Representation of a Tomcat home option in the tree.
 *
 * Input: home path, version, active state
 * Output: tree item with setActiveHome command.
 */
export class HomeItem extends vscode.TreeItem {
    constructor(public readonly home: string, public readonly version: string, public readonly active: boolean) {
        super(path.basename(home), vscode.TreeItemCollapsibleState.None);
        this.description = active ? `${t('instance.activeLabel')} · ${version}` : version;
        this.contextValue = 'tomcatHomeEntry';
        this.iconPath = new vscode.ThemeIcon(active ? 'check' : 'circle-large-outline');
        this.command = {
            command: 'tomcat.instances.setActiveHome',
            title: t('instance.useThisTomcat'),
            arguments: [home]
        };
        this.tooltip = `${home}\nVersion: ${version}${active ? '\n(Current)' : ''}`;
    }
}
