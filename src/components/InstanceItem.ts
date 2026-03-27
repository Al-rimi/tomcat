import * as vscode from 'vscode';
import { InstanceInfo } from '../types/InstanceInfo';
import { t } from '../utils/i18n';

/**
 * Tree item representing a single Tomcat instance.
 *
 * Input: InstanceInfo object
 * Output: VS Code TreeItem UI representation with command wiring
 */
export class InstanceItem extends vscode.TreeItem {
    constructor(public readonly info: InstanceInfo) {
        const label = `${t('label.pid')} ${info.pid}`;
        super(label, vscode.TreeItemCollapsibleState.None);
        const descriptionParts = [
            info.version ? `v${info.version}` : '',
            `${t('label.port')} ${info.port ?? t('label.na')}`,
            info.app ?? info.workspace ?? t('label.na')
        ].filter(Boolean);

        const tooltipLines = [
            `${t('label.pid')}: ${info.pid}`,
            `${t('label.port')}: ${info.port ?? t('label.na')}`,
            info.version ? `${t('label.version')}: ${info.version}` : undefined,
            `${t('group.home')}: ${info.home ?? t('label.na')}`,
            `${t('label.workspace')}: ${info.workspace ?? t('label.na')}`,
            `${t('label.command')}: ${info.command ?? t('label.na')}`
        ].filter(Boolean);

        this.description = descriptionParts.join(' · ');
        this.tooltip = tooltipLines.join('\n');
        this.contextValue = 'tomcatInstance';
        this.iconPath = new vscode.ThemeIcon(info.source === 'managed' ? 'server-process' : 'plug');
        this.command = {
            command: 'tomcat.instances.openInBrowser',
            title: t('instance.openInBrowser'),
            arguments: [info]
        };
    }
}
