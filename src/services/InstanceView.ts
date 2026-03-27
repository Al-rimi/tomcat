import * as vscode from 'vscode';
import * as path from 'path';
import { Tomcat } from './Tomcat';
import { Browser } from './Browser';
import { Logger } from './Logger';
import { Builder } from './Builder';
import { t, translateBrowserName } from '../utils/i18n';

type InstanceSource = 'managed' | 'external';

export interface InstanceInfo {
    pid: number;
    port?: number;
    app?: string;
    workspace?: string;
    command?: string;
    home?: string;
    version?: string;
    source: InstanceSource;
}

class InstanceItem extends vscode.TreeItem {
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

class PlaceholderItem extends vscode.TreeItem {
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('circle-slash');
        this.contextValue = 'tomcatEmpty';
    }
}

class ConfigItem extends vscode.TreeItem {
    constructor(public readonly field: 'home' | 'java' | 'port' | 'browser', label: string, value: string, icon: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.description = value;
        this.contextValue = 'tomcatConfig';
        this.iconPath = new vscode.ThemeIcon(icon);
        this.command = {
            command: 'tomcat.instances.configureField',
            title: t('action.configure'),
            arguments: [field]
        };
    }
}

class SettingsGroup extends vscode.TreeItem {
    constructor() {
        super(t('group.settings'), vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'tomcatSettingsGroup';
        this.iconPath = new vscode.ThemeIcon('settings-gear');
    }
}

class InstancesGroup extends vscode.TreeItem {
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.contextValue = 'tomcatInstancesGroup';
        this.iconPath = new vscode.ThemeIcon('server-environment');
    }
}

class ActionItem extends vscode.TreeItem {
    constructor(label: string, commandId: string, icon: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'tomcatAction';
        this.iconPath = new vscode.ThemeIcon(icon);
        this.command = {
            command: commandId,
            title: label
        };
    }
}

class HomeItem extends vscode.TreeItem {
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

class HomeGroup extends vscode.TreeItem {
    constructor(labelSuffix: string) {
        super(t('group.home'), vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'tomcatHomeGroup';
        this.iconPath = new vscode.ThemeIcon('home');
        this.description = labelSuffix;
    }
}

class BrowserGroup extends vscode.TreeItem {
    constructor(current: string) {
        super(t('group.browser'), vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'tomcatBrowserGroup';
        this.iconPath = new vscode.ThemeIcon('globe');
        this.description = current;
    }
}

class BrowserOptionItem extends vscode.TreeItem {
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

class JavaHomeItem extends vscode.TreeItem {
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

class JavaHomeGroup extends vscode.TreeItem {
    constructor(labelSuffix: string) {
        super(t('group.javaHome'), vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'tomcatJavaHomeGroup';
        this.iconPath = new vscode.ThemeIcon('tools');
        this.description = labelSuffix;
    }
}

class OptionItem extends vscode.TreeItem {
    constructor(public readonly choice: string, public readonly isCurrent: boolean, commandId: string, context: string) {
        // For some well-known internal choices, show localized label while keeping the internal choice as argument
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

class PortGroup extends vscode.TreeItem {
    constructor(current: number) {
        super(t('group.port'), vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'tomcatPortGroup';
        this.iconPath = new vscode.ThemeIcon('plug');
        this.description = String(current);
    }
}

class PortItem extends vscode.TreeItem {
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
    }
}

export class InstanceView implements vscode.TreeDataProvider<InstanceItem | PlaceholderItem | ConfigItem | SettingsGroup | InstancesGroup | ActionItem | HomeItem | HomeGroup | BrowserGroup | BrowserOptionItem | JavaHomeItem | JavaHomeGroup | OptionItem | PortGroup | PortItem> {
    private readonly tomcat = Tomcat.getInstance();
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor() { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: InstanceItem | PlaceholderItem | ConfigItem | SettingsGroup | InstancesGroup | ActionItem | HomeItem | HomeGroup | BrowserGroup | BrowserOptionItem | JavaHomeItem | JavaHomeGroup | OptionItem | PortGroup | PortItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: InstanceItem | PlaceholderItem | ConfigItem | SettingsGroup | InstancesGroup | ActionItem | HomeItem | HomeGroup | BrowserGroup | BrowserOptionItem | JavaHomeItem | JavaHomeGroup | OptionItem | PortGroup | PortItem): Promise<Array<InstanceItem | PlaceholderItem | ConfigItem | SettingsGroup | InstancesGroup | ActionItem | HomeItem | HomeGroup | BrowserGroup | BrowserOptionItem | JavaHomeItem | JavaHomeGroup | OptionItem | PortGroup | PortItem>> {
        const config = vscode.workspace.getConfiguration('tomcat');
        const activeHome = config.get<string>('home', '') || '';
        const homes = config.get<string[]>('homes', []) || [];
        const mergedHomes = Array.from(new Set([...homes, activeHome].filter(Boolean)));

        const activeJavaHome = config.get<string>('javaHome', '') || '';
        const javaHomes = config.get<string[]>('javaHomes', []) || [];
        const mergedJavaHomes = Array.from(new Set([...javaHomes, activeJavaHome].filter(Boolean)));

        // ensure migration: persist merged list
        await config.update('homes', mergedHomes, true);
        await config.update('javaHomes', mergedJavaHomes, true);

        const activeVersion = activeHome ? await this.tomcat.getTomcatVersion(activeHome) : undefined;
        const configItems: ConfigItem[] = [];

        const homeItems: HomeItem[] = [];
        for (const home of mergedHomes) {
            const version = await this.tomcat.getTomcatVersion(home);
            homeItems.push(new HomeItem(home, version, home === activeHome));
        }
        const javaHomeItems: JavaHomeItem[] = mergedJavaHomes.map((home) => new JavaHomeItem(home, home === activeJavaHome));
        const browserOptions = ['Disable', 'Google Chrome', 'Microsoft Edge', 'Firefox', 'Safari', 'Brave', 'Opera'];
        const currentBrowser = config.get<string>('browser', 'Google Chrome');
        const browserItems = browserOptions.map((choice) => new BrowserOptionItem(choice, choice === currentBrowser));

        const autoDeployOptions = ['Local', 'Maven', 'Gradle'];
        const currentAutoDeploy = config.get<string>('buildType', 'Local');
        const autoDeployItems = autoDeployOptions.map((choice) => new OptionItem(choice, choice === currentAutoDeploy, 'tomcat.instances.setBuildType', 'tomcatAutoDeployOption'));

        const logLevelOptions = ['DEBUG', 'INFO', 'SUCCESS', 'HTTP', 'APP', 'WARN', 'ERROR'];
        const currentLogLevel = config.get<string>('logLevel', 'INFO');
        const logLevelItems = logLevelOptions.map((choice) => new OptionItem(choice, choice === currentLogLevel, 'tomcat.instances.setLogLevel', 'tomcatLogLevelOption'));

        const currentPort = config.get<number>('port', 8080);
        const portGroup = new PortGroup(currentPort);
        const savedPorts = config.get<number[]>('ports', []) || [];
        const mergedPorts = Array.from(new Set([...savedPorts, currentPort])).sort((a, b) => a - b);
        await config.update('ports', mergedPorts, true);
        const portItems = mergedPorts.map((port) => new PortItem(port, port === currentPort));

        if (element instanceof SettingsGroup) {
            const homeLabel = mergedHomes.length === 0 ? t('instance.noTomcatHomes') : activeVersion ? `v${activeVersion}` : t('instance.tomcatHomeNotSet');
            const homeGroup = new HomeGroup(homeLabel);
            const javaHomeLabel = mergedJavaHomes.length === 0 ? t('instance.noJavaHomes') : activeJavaHome ? path.basename(activeJavaHome) : t('instance.javaHomeNotSet');
            const javaHomeGroup = new JavaHomeGroup(javaHomeLabel);
            const browserGroup = new BrowserGroup(currentBrowser);
            const autoDeployGroup = new vscode.TreeItem(t('group.buildType'), vscode.TreeItemCollapsibleState.Collapsed);
            autoDeployGroup.contextValue = 'tomcatAutoDeployGroup';
            autoDeployGroup.iconPath = new vscode.ThemeIcon('cloud-upload');
            autoDeployGroup.description = currentAutoDeploy;

            const logLevelGroup = new vscode.TreeItem(t('group.logLevel'), vscode.TreeItemCollapsibleState.Collapsed);
            logLevelGroup.contextValue = 'tomcatLogLevelGroup';
            logLevelGroup.iconPath = new vscode.ThemeIcon('megaphone');
            logLevelGroup.description = currentLogLevel;

            return [homeGroup, javaHomeGroup, browserGroup, autoDeployGroup, logLevelGroup, portGroup, ...configItems];
        }

        if (element instanceof HomeGroup) {
            return homeItems.length ? homeItems : [new PlaceholderItem(t('instance.noTomcatHomes'))];
        }

        if (element instanceof JavaHomeGroup) {
            return javaHomeItems.length ? javaHomeItems : [new PlaceholderItem(t('instance.noJavaHomes'))];
        }

        if (element instanceof BrowserGroup) {
            return browserItems;
        }

        if (element?.contextValue === 'tomcatAutoDeployGroup') {
            return autoDeployItems;
        }

        if (element?.contextValue === 'tomcatLogLevelGroup') {
            return logLevelItems;
        }

        if (element instanceof PortGroup) {
            return portItems;
        }

        if (element instanceof InstancesGroup) {
            const instances = await this.tomcat.getInstanceSnapshot();
            const instanceItems = instances
                .sort((a, b) => a.pid - b.pid)
                .map((info) => new InstanceItem(info));
            if (instanceItems.length === 0) {
                return [new PlaceholderItem(t('instance.noTomcatInstances'))];
            }
            return instanceItems;
        }

        if (!element) {
            const instances = await this.tomcat.getInstanceSnapshot();
            const label = t('instance.runningInstances', { count: instances.length });
            const instancesGroup = new InstancesGroup(label);
            const settingsGroup = new SettingsGroup();
            return [instancesGroup, settingsGroup];
        }

        return [];
    }

    async stopInstance(item: InstanceItem, force: boolean = false): Promise<void> {
        await this.tomcat.stopInstanceByPid(item.info.pid, force);
        this.refresh();
    }

    async openInstance(info: InstanceInfo): Promise<void> {
        const port = info.port ?? vscode.workspace.getConfiguration('tomcat').get<number>('port', 8080);
        const appName = info.app;
        if(appName){
            await Browser.getInstance().run(appName, port);
        }
    }

    async startNew(): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        const homes = config.get<string[]>('homes', []) || [];
        const activeHome = config.get<string>('home', '') || '';
        const candidates = Array.from(new Set([activeHome, ...homes].filter(Boolean)));

        const chosenHome = candidates[0];

        if (chosenHome) {
            await config.update('home', chosenHome, true);
            this.tomcat.updateConfig();
            await this.tomcat.startWithHome(chosenHome, true);
        } else {
            await this.tomcat.start(true);
        }
        this.refresh();
    }

    async configureField(field: string): Promise<void> {
        switch (field) {
            case 'java':
                await this.configureSpecific(field as 'java' | 'port');
                break;
            default:
                break;
        }
    }

    private async configureSpecific(field: 'java' | 'port'): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        switch (field) {
            case 'java': {
                const selected = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, openLabel: t('instance.selectJavaHome') });
                const folder = selected?.[0]?.fsPath;
                if (folder) {
                    await config.update('javaHome', folder, true);
                    this.tomcat.updateConfig();
                    Logger.getInstance().info(t('instance.javaHomeSet', { path: folder }), false);
                }
                break;
            }
            default:
                break;
        }
        this.refresh();
    }

    async addHome(): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        const selected = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, openLabel: t('instance.addTomcatHome') });
        const folder = selected?.[0]?.fsPath;
        if (!folder) { return; }

        if (!await this.tomcat.validateTomcatHome(folder)) {
            Logger.getInstance().warn(t('instance.invalidTomcatHome'), true);
            return;
        }

        const existing = config.get<string[]>('homes', []) || [];
        const next = Array.from(new Set([...existing, folder]));
        await config.update('homes', next, true);
        await config.update('home', folder, true);
        await config.update('home', folder, true);
        this.tomcat.updateConfig();
        const version = await this.tomcat.getTomcatVersion(folder);
        Logger.getInstance().info(t('instance.tomcatHomeSet', { path: folder, version }), false);
        this.refresh();
    }

    async addJavaHome(): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        const selected = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, openLabel: t('instance.addJavaHome') });
        const folder = selected?.[0]?.fsPath;
        if (!folder) { return; }

        if (!await this.tomcat.validateJavaHome(folder)) {
            Logger.getInstance().warn(t('instance.invalidJavaHome'), true);
        }

        const existing = config.get<string[]>('javaHomes', []) || [];
        const next = Array.from(new Set([...existing, folder]));
        await config.update('javaHomes', next, true);
        await config.update('javaHome', folder, true);
        this.tomcat.updateConfig();
        Builder.getInstance().updateConfig();
        Logger.getInstance().info(t('instance.javaHomeSet', { path: folder }), false);
        this.refresh();
    }

    async removeHome(target?: string | HomeItem): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        const existing = config.get<string[]>('homes', []) || [];
        const active = config.get<string>('home', '') || '';

        const home = typeof target === 'string' ? target : target instanceof HomeItem ? target.home : undefined;
        if (!home) {
            Logger.getInstance().info(t('instance.selectTomcatHomeToRemove'), false);
            return;
        }

        if (!existing.includes(home)) {
            Logger.getInstance().info(t('instance.tomcatHomeNotFound'), false);
            return;
        }

        const filtered = existing.filter(h => h !== home);
        await config.update('homes', filtered, true);
        let nextActive = active;
        if (home === active) {
            nextActive = filtered[0] ?? '';
            await config.update('home', nextActive, true);
            await config.update('home', nextActive, true);
            this.tomcat.updateConfig();
        }
        Logger.getInstance().info(t('instance.removedTomcatHome', { path: home }), false);
        this.refresh();
    }

    async removeJavaHome(target?: string | JavaHomeItem): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        const existing = config.get<string[]>('javaHomes', []) || [];
        const active = config.get<string>('javaHome', '') || '';

        const home = typeof target === 'string' ? target : target instanceof JavaHomeItem ? target.home : undefined;
        if (!home) {
            Logger.getInstance().info(t('instance.selectJavaHomeToRemove'), false);
            return;
        }

        if (!existing.includes(home)) {
            Logger.getInstance().info(t('instance.javaHomeNotFound'), false);
            return;
        }

        const filtered = existing.filter(h => h !== home);
        await config.update('javaHomes', filtered, true);
        let nextActive = active;
        if (home === active) {
            nextActive = filtered[0] ?? '';
            await config.update('javaHome', nextActive, true);
            this.tomcat.updateConfig();
            Builder.getInstance().updateConfig();
        }
        Logger.getInstance().info(t('instance.removedJavaHome', { path: home }), false);
        this.refresh();
    }

    async refreshVersions(): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        const homes = config.get<string[]>('homes', []) || [];
        for (const home of homes) {
            await this.tomcat.getTomcatVersion(home); // refresh cache
        }
        this.refresh();
    }

    async setActiveHome(home?: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        const homes = config.get<string[]>('homes', []) || [];
        const target = home?.trim();

        let chosen = target;
        if (!chosen) {
            if (homes.length === 0) {
                Logger.getInstance().info(t('instance.noTomcatHomesAddOne'), false);
                return;
            }
            const quickItems = await Promise.all(homes.map(async (h) => ({ label: h, description: await this.tomcat.getTomcatVersion(h) })));
            const pick = await vscode.window.showQuickPick(quickItems, { placeHolder: t('instance.selectTomcatHomeToSetActive') });
            chosen = pick?.label;
        }

        if (!chosen) { return; }

        const merged = Array.from(new Set([...homes, chosen]));
        await config.update('homes', merged, true);
        await config.update('home', chosen, true);
        this.tomcat.updateConfig();
        const version = await this.tomcat.getTomcatVersion(chosen);
        Logger.getInstance().info(t('instance.tomcatHomeSet', { path: chosen, version }), false);
        this.refresh();
    }

    async setActiveJavaHome(home?: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        const javaHomes = config.get<string[]>('javaHomes', []) || [];
        const target = home?.trim();

        let chosen = target;
        if (!chosen) {
            if (javaHomes.length === 0) {
                Logger.getInstance().info(t('instance.noJavaHomesAddOne'), false);
                return;
            }
            const pick = await vscode.window.showQuickPick(javaHomes.map((h) => ({ label: h })), { placeHolder: t('instance.selectJavaHomeToSetActive') });
            chosen = pick?.label;
        }

        if (!chosen) { return; }

        const merged = Array.from(new Set([...javaHomes, chosen]));
        await config.update('javaHomes', merged, true);
        await config.update('javaHome', chosen, true);
        this.tomcat.updateConfig();
        Builder.getInstance().updateConfig();
        Logger.getInstance().info(t('instance.javaHomeSet', { path: chosen }), false);
        this.refresh();
    }

    async setBrowser(choice: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        const previous = config.get<string>('browser', 'Google Chrome');
        const finalChoice = await Browser.getInstance().setPreferredBrowser(choice as any, previous as any);
        Browser.getInstance().updateConfig();
        Logger.getInstance().info(t('instance.browserSet', { name: finalChoice }), false);
        this.refresh();
    }

    async setPort(choice: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        const num = Number(choice);
        if (!Number.isInteger(num) || num < 1024 || num > 49151) {
            Logger.getInstance().warn(t('instance.portRangeError'), true);
            return;
        }
        const ports = config.get<number[]>('ports', []) || [];
        const merged = Array.from(new Set([...ports, num])).sort((a, b) => a - b);
        await config.update('ports', merged, true);
        await config.update('port', num, true);
        Logger.getInstance().info(t('instance.portSet', { port: num }), false);
        this.refresh();
    }

    async addPort(): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        const current = config.get<number>('port', 8080);
        const input = await vscode.window.showInputBox({
            prompt: t('instance.addPort.prompt'),
            value: String(current),
            validateInput: (val) => {
                const num = Number(val);
                if (!Number.isInteger(num) || num < 1024 || num > 49151) {
                    return t('instance.addPort.validation');
                }
                return null;
            }
        });
        if (!input) { return; }
        await this.setPort(input);
    }

    async removePort(port: number): Promise<void> {
        if (typeof port !== 'number') { return; }
        const config = vscode.workspace.getConfiguration('tomcat');
        const currentPort = config.get<number>('port', 8080);
        if (port === currentPort) {
            Logger.getInstance().warn(t('instance.removeActivePortWarn'), true);
            return;
        }
        const ports = (config.get<number[]>('ports', []) || []).filter((p) => p !== port);
        await config.update('ports', ports, true);
        Logger.getInstance().info(t('instance.removedPort', { port }), false);
        this.refresh();
    }

    async setBuildType(choice: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        await config.update('buildType', choice, true);
        Builder.getInstance().updateConfig();
        Logger.getInstance().info(t('instance.buildTypeSet', { type: choice }), false);
        this.refresh();
    }

    async setLogLevel(choice: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        await config.update('logLevel', choice, true);
        Logger.getInstance().updateConfig();
        Logger.getInstance().info(t('instance.logLevelSet', { level: choice }), false);
        this.refresh();
    }
}