import * as vscode from 'vscode';
import { t } from '../utils/i18n';

/**
 * Generic option item for auto-deploy and log level.
 *
 * Input: choice, isCurrent, command, context
 * Output: command-enabled tree item.
 */
export class OptionItem extends vscode.TreeItem {
    constructor(public readonly choice: string, public readonly isCurrent: boolean, commandId: string, context: string) {
        const buildTypeMap: Record<string, string> = {
            'Local': 'buildType.local',
            'Maven': 'buildType.maven',
            'Gradle': 'buildType.gradle'
        };
        const logLevelMap: Record<string, string> = {
            'DEBUG': 'logLevel.DEBUG',
            'INFO': 'logLevel.INFO',
            'SUCCESS': 'logLevel.SUCCESS',
            'HTTP': 'logLevel.HTTP',
            'APP': 'logLevel.APP',
            'WARN': 'logLevel.WARN',
            'ERROR': 'logLevel.ERROR'
        };
        const display = buildTypeMap[choice]
            ? t(buildTypeMap[choice] as any)
            : (logLevelMap[choice] ? t(logLevelMap[choice] as any) : choice);
        super(display, vscode.TreeItemCollapsibleState.None);
        this.contextValue = context;
        this.iconPath = new vscode.ThemeIcon(isCurrent ? 'check' : 'circle-large-outline');
        this.command = {
            command: commandId,
            title: t('action.select'),
            arguments: [choice]
        };
        this.description = isCurrent ? t('instance.activeLabel') : undefined;
    }
}
