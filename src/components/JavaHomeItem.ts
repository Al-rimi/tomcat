import * as vscode from 'vscode';
import * as path from 'path';
import { t } from '../utils/i18n';

/**
 * Option item for selecting a Java home.
 *
 * Input: java home path and active flag
 * Output: tree item with setActiveJavaHome command.
 */
export class JavaHomeItem extends vscode.TreeItem {
    constructor(public readonly home: string, public readonly active: boolean) {
        super(path.basename(home), vscode.TreeItemCollapsibleState.None);
        this.description = active ? t('instance.activeLabel') : undefined;
        this.contextValue = 'tomcatJavaHomeEntry';
        this.iconPath = new vscode.ThemeIcon(active ? 'check' : 'circle-large-outline');
        this.command = {
            command: 'tomcat.instances.setActiveJavaHome',
            title: t('instance.useThisJava'),
            arguments: [home]
        };
        this.tooltip = `${home}${active ? '\n' + t('label.current') : ''}`;
    }
}
