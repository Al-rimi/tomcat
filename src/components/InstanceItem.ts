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
            info.port ? `${t('label.port')} ${info.port}` : '',
            info.app || info.workspace || ''
        ].filter(Boolean);

        const tooltipLines = [
            `${t('label.pid')}: ${info.pid}`,
            info.port ? `${t('label.port')}: ${info.port}` : undefined,
            info.version ? `${t('label.version')}: ${info.version}` : undefined,
            info.home ? `${t('group.home')}: ${info.home}` : undefined,
            info.workspace ? `${t('label.workspace')}: ${info.workspace}` : undefined,
            info.command ? `${t('label.command')}: ${info.command}` : undefined
        ].filter(Boolean);

        this.description = descriptionParts.join(' · ');
        this.tooltip = tooltipLines.join('\n');
        this.contextValue = 'tomcatInstance';
        this.iconPath = new vscode.ThemeIcon(info.source === 'managed' ? 'server' : 'server-process');
        this.command = {
            command: 'tomcat.instances.openInBrowser',
            title: t('instance.openInBrowser'),
            arguments: [info]
        };
    }
}
