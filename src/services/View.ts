import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Tomcat } from './Tomcat';
import { Browser } from './Browser';
import { Logger } from './Logger';
import { Builder } from './Builder';
import { AI } from './AI';
import { t } from '../utils/i18n';
import { getAppTemplates, getTemplateById } from '../data/appTemplates';
import { InstanceInfo } from '../types/InstanceInfo';
import { InstanceItem } from '../components/InstanceItem';
import { PlaceholderItem } from '../components/PlaceholderItem';
import { ConfigItem } from '../components/ConfigItem';
import { SettingsGroup } from '../components/SettingsGroup';
import { AIGroup } from '../components/AIGroup';
import { AISettingItem } from '../components/AISettingItem';
import { AIProviderGroup } from '../components/AIProviderGroup';
import { AIListGroup } from '../components/AIListGroup';
import { AIListValue } from '../components/AIListValue';
import { AdditionalGroup } from '../components/AdditionalGroup';
import { InstancesGroup } from '../components/InstancesGroup';
import { AppsGroup } from '../components/AppsGroup';
import { AppItem } from '../components/AppItem';
import { ActionItem } from '../components/ActionItem';
import { HomeItem } from '../components/HomeItem';
import { HomeGroup } from '../components/HomeGroup';
import { BrowserGroup } from '../components/BrowserGroup';
import { BrowserOptionItem } from '../components/BrowserOptionItem';
import { JavaHomeItem } from '../components/JavaHomeItem';
import { JavaHomeGroup } from '../components/JavaHomeGroup';
import { OptionItem } from '../components/OptionItem';
import { PortGroup } from '../components/PortGroup';
import { PortItem } from '../components/PortItem';

export class View implements vscode.TreeDataProvider<
    InstanceItem | PlaceholderItem | ConfigItem | SettingsGroup | AIGroup | AIListGroup | AIListValue | AISettingItem | InstancesGroup | AppsGroup | ActionItem | HomeItem | HomeGroup | BrowserGroup | BrowserOptionItem | JavaHomeItem | JavaHomeGroup | OptionItem | PortGroup | PortItem | AppItem
> {
    private readonly tomcat = Tomcat.getInstance();
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor() {
        Builder.getInstance().onStateChange(() => {
            this.refresh();
        });
    }

    async refresh(): Promise<void> {
        await this.tomcat.cleanupStaleManagedInstances();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: InstanceItem | PlaceholderItem | ConfigItem | SettingsGroup | AIGroup | AIListGroup | AIListValue | AISettingItem | InstancesGroup | AppsGroup | ActionItem | HomeItem | HomeGroup | BrowserGroup | BrowserOptionItem | JavaHomeItem | JavaHomeGroup | OptionItem | PortGroup | PortItem | AppItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: InstanceItem | PlaceholderItem | ConfigItem | SettingsGroup | AIGroup | AIListGroup | AIListValue | AISettingItem | InstancesGroup | AppsGroup | ActionItem | HomeItem | HomeGroup | BrowserGroup | BrowserOptionItem | JavaHomeItem | JavaHomeGroup | OptionItem | PortGroup | PortItem | AppItem): Promise<Array<InstanceItem | PlaceholderItem | ConfigItem | SettingsGroup | AIGroup | AIListGroup | AIListValue | AISettingItem | InstancesGroup | AppsGroup | ActionItem | HomeItem | HomeGroup | BrowserGroup | BrowserOptionItem | JavaHomeItem | JavaHomeGroup | OptionItem | PortGroup | PortItem | AppItem>> {
        const config = vscode.workspace.getConfiguration('tomcat');
        const activeHome = config.get<string>('home', '') || '';
        const homes = config.get<string[]>('homes', []) || [];
        const mergedHomes = Array.from(new Set([...homes, activeHome].filter(Boolean)));

        const activeJavaHome = config.get<string>('javaHome', '') || '';
        const javaHomes = config.get<string[]>('javaHomes', []) || [];
        const mergedJavaHomes = Array.from(new Set([...javaHomes, activeJavaHome].filter(Boolean)));

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

            const provider = config.get<string>('ai.provider', 'none');
            const model = config.get<string>('ai.model', '');
            const aiGroup = new AIGroup(provider === 'none' ? '' : provider, model);
            const additionalGroup = new AdditionalGroup();

            return [autoDeployGroup, browserGroup, portGroup, homeGroup, javaHomeGroup, logLevelGroup, aiGroup, additionalGroup, ...configItems];
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

        if (element instanceof AIGroup) {
            const provider = config.get<string>('ai.provider', 'none');
            const endpoint = config.get<string>('ai.endpoint', '');
            const model = config.get<string>('ai.model', '');
            const apiKey = config.get<string>('ai.apiKey', '');
            const localStartCommand = config.get<string>('ai.localStartCommand', 'ollama serve');
            const maxTokens = config.get<number>('ai.maxTokens', 128);
            const timeoutMs = config.get<number>('ai.timeoutMs', 45000);
            const autoStartLocal = config.get<boolean>('ai.autoStartLocal', true);

            return [
                new AIProviderGroup(t('ai.provider'), provider),
                new AIListGroup('endpoint', t('ai.endpoint'), endpoint),
                new AIListGroup('model', t('ai.model'), model),
                new AIListGroup('apiKey', t('ai.apiKey'), apiKey ? '***' : ''),
                new AIListGroup('localStartCommand', t('ai.localStartCommand'), localStartCommand),
                new AISettingItem('maxTokens', t('ai.maxTokens'), String(maxTokens), 'symbol-numeric'),
                new AISettingItem('timeoutMs', t('ai.timeoutMs'), String(timeoutMs), 'clock'),
                new AISettingItem('autoStartLocal', t('ai.autoStartLocal'), autoStartLocal ? 'On' : 'Off', 'check', autoStartLocal)
            ];
        }

        if (element instanceof AIProviderGroup) {
            const activeProvider = config.get<string>('ai.provider', 'none');
            const providerOptions = ['none', 'local', 'aliyun-dashscope', 'baichuan', 'zhipu', 'deepseek', 'custom'];
            return providerOptions.map((option) => new AIListValue('provider', option, option === activeProvider));
        }

        if (element instanceof AdditionalGroup) {
            const logEncoding = config.get<string>('logEncoding', 'utf8');
            const showTimestamp = config.get<boolean>('showTimestamp', true);
            const autoReloadBrowser = config.get<boolean>('autoReloadBrowser', true);
            const base = config.get<string>('base', '');

            return [
                new AIListGroup('base', t('config.base'), base),
                new AIListGroup('logEncoding', t('config.logEncoding'), logEncoding),
                new AISettingItem('showTimestamp', t('config.showTimestamp'), showTimestamp ? 'On' : 'Off', 'clock', showTimestamp),
                new AISettingItem('autoReloadBrowser', t('config.autoReloadBrowser'), autoReloadBrowser ? 'On' : 'Off', 'sync', autoReloadBrowser)
            ];
        }

        if (element instanceof AIListGroup) {
            const groupSetting = element.setting;
            const isAIListGroup = ['endpoint', 'model', 'apiKey', 'localStartCommand'].includes(groupSetting);
            const isLogEncodingGroup = groupSetting === 'logEncoding';

            const listKey = isAIListGroup ? `ai.${groupSetting}s` : `${groupSetting}s`;
            const settingKey = isAIListGroup ? `ai.${groupSetting}` : groupSetting;
            const activeValue = config.get<string>(settingKey, '');

            let listValues: string[];
            if (isLogEncodingGroup) {
                listValues = ['utf8', 'utf-8', 'utf16le', 'utf-16le', 'ascii', 'latin1', 'binary', 'base64', 'base64url', 'hex', 'ucs2', 'ucs-2'];
            } else {
                listValues = config.get<string[]>(listKey, []) || [];
                if (activeValue && !listValues.includes(activeValue)) {
                    listValues = [activeValue, ...listValues];
                }
                if (groupSetting === 'model' && listValues.length === 0 && activeValue) {
                    listValues = [activeValue];
                }
            }

            const items: Array<AIListValue> = listValues.map((value) => new AIListValue(groupSetting, value, value === activeValue));
            return items;
        }

        if (element instanceof AppsGroup) {
            const apps = await Builder.findJavaEEProjects();
            const instances = await this.tomcat.getInstanceSnapshot();

            element.label = `${t('group.apps')} (${apps.length})`;

            const appItems = apps.map((appPath) => {
                const appName = path.basename(appPath);
                const instance = instances.find((info) => info.app === appName);
                const isDeploying = Builder.getInstance().isDeployingInProgress(appName);
                return new AppItem(appPath, Boolean(instance), instance?.port, isDeploying || false);
            });

            return appItems.length > 0 ? appItems : [new PlaceholderItem(t('app.noAppsFound'))];
        }

        if (!element) {
            const instances = await this.tomcat.getInstanceSnapshot();
            const apps = await Builder.findJavaEEProjects();

            const label = `${t('group.instances')} (${instances.length})`;
            const instancesGroup = new InstancesGroup(label);
            const appsGroup = new AppsGroup(`${t('group.apps')} (${apps.length})`);
            const settingsGroup = new SettingsGroup();
            return [instancesGroup, appsGroup, settingsGroup];
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
        if (appName) {
            await Browser.getInstance().run(appName, port);
        }
    }

    async deployApp(payload: any): Promise<void> {
        let projectPath: string | undefined;
        if (typeof payload === 'string') {
            projectPath = payload;
        } else if (payload?.appPath) {
            projectPath = payload.appPath;
        } else if (payload?.label) {
            projectPath = payload.label;
        }

        if (!projectPath) { return; }

        const builder = Builder.getInstance();
        await builder.deploy(builder.getBuildType(), projectPath);
        this.refresh();
    }

    async openApp(payload: any, port?: number): Promise<void> {
        let appName: string | undefined;
        if (typeof payload === 'string') {
            appName = payload;
        } else if (payload?.appPath) {
            appName = path.basename(payload.appPath);
        } else if (payload?.label) {
            appName = payload.label;
        }

        if (!appName) { return; }

        await Browser.getInstance().run(appName, port);
    }

    async undeployApp(payload: any): Promise<void> {
        let appName: string | undefined;
        if (typeof payload === 'string') {
            appName = payload;
        } else if (payload?.appPath) {
            appName = path.basename(payload.appPath);
        } else if (payload?.label) {
            appName = payload.label;
        }

        if (!appName) { return; }

        await Tomcat.getInstance().undeployApp(appName);
        this.refresh();
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

    async createApp(): Promise<void> {
        const templates = getAppTemplates();
        const items = templates.map((template) => ({
            label: t(template.labelKey as any),
            description: t(template.descriptionKey as any),
            id: template.id
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: t('app.create.selectType')
        });
        if (!selected) { return; }

        const template = getTemplateById(selected.id);
        if (!template) { return; }

        const frontendOptions = [
            { id: 'jsp', label: t('app.create.frontend.jsp') },
            { id: 'thymeleaf', label: t('app.create.frontend.thymeleaf') },
            { id: 'react', label: t('app.create.frontend.react') },
            { id: 'vue', label: t('app.create.frontend.vue') },
            { id: 'angular', label: t('app.create.frontend.angular') },
            { id: 'none', label: t('app.create.frontend.none') }
        ];

        const frontendChoice = await vscode.window.showQuickPick(frontendOptions, {
            placeHolder: t('app.create.selectFrontend')
        });
        if (!frontendChoice) { return; }

        const appName = await vscode.window.showInputBox({
            prompt: t('app.create.enterName'),
            validateInput: (value) => value && value.trim().length > 0 ? undefined : t('app.create.nameRequired')
        });
        if (!appName) { return; }

        let defaultFolder = undefined;
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            defaultFolder = vscode.workspace.workspaceFolders[0].uri;
        } else {
            const root = path.parse(process.cwd()).root;
            defaultFolder = vscode.Uri.file(root);
        }

        const locationUri = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            defaultUri: defaultFolder,
            openLabel: t('app.create.selectLocation')
        });
        if (!locationUri?.length) { return; }

        const targetPath = path.join(locationUri[0].fsPath, appName);
        if (fs.existsSync(targetPath)) {
            vscode.window.showErrorMessage(t('app.create.pathExists', { path: targetPath }));
            return;
        }

        const currentJavaHome = vscode.workspace.getConfiguration('tomcat').get<string>('javaHome', '');
        const currentTomcatHome = vscode.workspace.getConfiguration('tomcat').get<string>('home', '');

        if (!currentJavaHome || !await this.tomcat.validateJavaHome(currentJavaHome)) {
            Logger.getInstance().warn(t('app.create.noValidJdk'), true);
        }

        if (!currentTomcatHome || !await this.tomcat.validateTomcatHome(currentTomcatHome)) {
            Logger.getInstance().warn(t('app.create.noValidTomcat'), true);
        }

        const javaVersion = await this.getJavaVersion(currentJavaHome);
        const tomcatVersion = currentTomcatHome ? await this.tomcat.getTomcatVersion(currentTomcatHome) : 'unknown';
        const nodeVersion = await this.getNodeVersion();
        const npmVersion = await this.getNpmVersion();

        fs.mkdirSync(targetPath, { recursive: true });
        fs.mkdirSync(path.join(targetPath, 'src', 'main', 'java'), { recursive: true });
        fs.mkdirSync(path.join(targetPath, 'src', 'main', 'webapp', 'WEB-INF'), { recursive: true });

        const pom = template.pomFragment
            .replace(/{{appName}}/g, appName)
            .replace(/{{tomcatVersion}}/g, tomcatVersion)
            .replace(/{{osName}}/g, process.platform);
        fs.writeFileSync(path.join(targetPath, 'pom.xml'), pom);

        for (const artifact of template.artifacts) {
            const artifactPath = path.join(targetPath, artifact.path);
            fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
            fs.writeFileSync(artifactPath, artifact.content.replace(/{{appName}}/g, appName));
        }

        if (frontendChoice.id !== 'none') {
            const frontendDir = path.join(targetPath, 'frontend');
            fs.mkdirSync(frontendDir, { recursive: true });
            const frontendPackage = {
                name: appName,
                version: '1.0.0',
                private: true,
                scripts: {
                    start: frontendChoice.id === 'react' ? 'react-scripts start' : frontendChoice.id === 'vue' ? 'vue-cli-service serve' : frontendChoice.id === 'angular' ? 'ng serve' : 'echo "No frontend"',
                    build: frontendChoice.id === 'react' ? 'react-scripts build' : frontendChoice.id === 'vue' ? 'vue-cli-service build' : frontendChoice.id === 'angular' ? 'ng build' : 'echo "No frontend"'
                },
                dependencies: {},
                devDependencies: {}
            };

            if (frontendChoice.id === 'react') {
                frontendPackage.dependencies = { react: '^17.0.0', 'react-dom': '^17.0.0' };
                frontendPackage.devDependencies = { 'react-scripts': '^4.0.0' };
                fs.mkdirSync(path.join(frontendDir, 'src'), { recursive: true });
                fs.mkdirSync(path.join(frontendDir, 'public'), { recursive: true });
                fs.writeFileSync(path.join(frontendDir, 'src', 'index.js'), `import React from 'react';\nimport ReactDOM from 'react-dom';\n\nReactDOM.render(\n  <h1>${appName} React App</h1>,\n  document.getElementById('root')\n);\n`);
                fs.writeFileSync(path.join(frontendDir, 'public', 'index.html'), `<html><body><div id="root"></div></body></html>`);
            } else if (frontendChoice.id === 'vue') {
                frontendPackage.dependencies = { vue: '^3.0.0' };
                fs.mkdirSync(path.join(frontendDir, 'src'), { recursive: true });
                fs.mkdirSync(path.join(frontendDir, 'public'), { recursive: true });
                fs.writeFileSync(path.join(frontendDir, 'src', 'main.js'), `import { createApp } from 'vue';\ncreateApp({ template: '<h1>${appName} Vue App</h1>' }).mount('#app');\n`);
                fs.writeFileSync(path.join(frontendDir, 'public', 'index.html'), `<html><body><div id="app"></div><script src="../dist/main.js"></script></body></html>`);
            } else if (frontendChoice.id === 'angular') {
                frontendPackage.dependencies = { '@angular/core': '~12.0.0', '@angular/cli': '~12.0.0' };
                fs.mkdirSync(path.join(frontendDir, 'src'), { recursive: true });
                fs.writeFileSync(path.join(frontendDir, 'src', 'main.ts'), `console.log('Angular starter');`);
            } else if (frontendChoice.id === 'thymeleaf') {
                // no extra frontend bundle; server-side template in Java app
            } else if (frontendChoice.id === 'jsp') {
                // already covered by JavaEE template
            }

            fs.writeFileSync(path.join(frontendDir, 'package.json'), JSON.stringify(frontendPackage, null, 2));
        }

        const readme = `# ${appName}\n\n` +
            `## ${t('app.create.projectOverview')}\n` +
            `- ${t('app.create.templateLabel')}: ${t(template.labelKey as any)}\n` +
            `- ${t('app.create.frontendLabel')}: ${frontendChoice.label}\n` +
            `- ${t('app.create.javaVersion')}: ${javaVersion || 'unknown'}\n` +
            `- ${t('app.create.tomcatVersion')}: ${tomcatVersion}\n` +
            `- ${t('app.create.nodeVersion')}: ${nodeVersion || 'not installed'}\n` +
            `- ${t('app.create.npmVersion')}: ${npmVersion || 'not installed'}\n` +
            `- ${t('app.create.platform')}: ${process.platform}\n\n` +
            `## ${t('app.create.quickStart')}\n` +
            `1. ${t('app.create.quickStep1')}\n` +
            `2. ${t('app.create.quickStep2')}\n` +
            `3. ${t('app.create.quickStep3')}\n\n` +
            `## ${t('app.create.layout')}\n` +
            `- backend: src/main/java, src/main/resources\n` +
            `- web: src/main/webapp\n` +
            `- frontend: frontend/\n\n` +
            `## ${t('app.create.moreInfo')}\n` +
            `${t('app.create.informationLine1')}\n`;
        fs.writeFileSync(path.join(targetPath, 'README.md'), readme);

        fs.writeFileSync(path.join(targetPath, 'LICENSE'), `MIT License\n\nCopyright (c) ${new Date().getFullYear()}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software ...\n`);

        Logger.getInstance().info(t('app.create.success', { name: appName, path: targetPath }));
        this.refresh();
    }

    private async runCommandVersion(command: string): Promise<string | null> {
        const execAsync = promisify(exec);
        try {
            const { stdout } = await execAsync(command);
            return stdout.trim().split('\n')[0];
        } catch {
            return null;
        }
    }

    private async getJavaVersion(javaHome: string): Promise<string | null> {
        if (!javaHome) { return null; }
        const javaExe = path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
        try {
            const { stdout, stderr } = await promisify(exec)(`"${javaExe}" -version`);
            const versionLine = stderr.split('\n')[0] || stdout.split('\n')[0];
            return versionLine;
        } catch {
            return null;
        }
    }

    private async getNodeVersion(): Promise<string | null> {
        return this.runCommandVersion('node -v');
    }

    private async getNpmVersion(): Promise<string | null> {
        return this.runCommandVersion('npm -v');
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
            return;
        }

        const existing = config.get<string[]>('javaHomes', []) || [];
        const next = Array.from(new Set([...existing, folder]));
        await config.update('javaHomes', next, true);
        await config.update('javaHome', folder, true);
        this.tomcat.updateConfig();
        Logger.getInstance().updateConfig();
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
            Logger.getInstance().updateConfig();
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
        Logger.getInstance().updateConfig();
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
        Logger.getInstance().updateConfig();
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

    async setProvider(provider: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        await config.update('ai.provider', provider, true);

        AI.getInstance().updateConfig();
        Logger.getInstance().updateConfig();

        if (!this.validateAIConfig()) {
            Logger.getInstance().warn(t('ai.invalidConfigReverted'), true);
            await this.restoreAIConfigDefaults();
        } else {
            Logger.getInstance().debug(t('ai.settingUpdated', { key: 'provider', value: provider }), false);
        }

        this.refresh();
    }

    async addListValue(element: any): Promise<void> {
        const setting = typeof element === 'string' ? element : element?.setting;
        if (!setting) { return; }

        if (setting === 'provider') {
            Logger.getInstance().warn(t('ai.providerReadOnly'), true);
            return;
        }

        if (setting === 'logEncoding') {
            Logger.getInstance().warn(t('ai.logEncodingReadOnly'), true);
            return;
        }

        if (setting === 'base') {
            const config = vscode.workspace.getConfiguration('tomcat');
            const selected = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: t('instance.addCatalinaBase')
            });
            const folder = selected?.[0]?.fsPath;
            if (!folder) { return; }

            const existing = config.get<string[]>('bases', []) || [];
            const next = Array.from(new Set([...existing, folder]));
            await config.update('bases', next, true);
            await config.update('base', folder, true);

            this.tomcat.updateConfig();
            Logger.getInstance().updateConfig();
            Logger.getInstance().info(t('instance.catalinaBaseSet', { path: folder }), false);
            this.refresh();
            return;
        }

        await this.updateAISetting({ setting, action: 'add' });
    }

    async removeListValue(element: any): Promise<void> {
        const setting = typeof element === 'string' ? element : element?.setting;
        const value = element?.value;
        if (!setting || !value) {
            return;
        }
        if (setting === 'logEncoding') {
            Logger.getInstance().warn(t('ai.logEncodingReadOnly'), true);
            return;
        }
        await this.updateAISetting({ setting, action: 'remove', value });
    }

    async updateAISetting(payload: any): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        const aiConfig = (key: string) => config.get<any>(`ai.${key}`, null);

        // Backward compatibility: string-based call
        if (typeof payload === 'string') {
            return this.updateAISetting({ setting: payload });
        }

        const setting = payload?.setting;
        const action = payload?.action ?? 'edit';
        const valueArg = payload?.value;

        if (!setting) { return; }

        const aiSettings = ['endpoint', 'model', 'apiKey', 'localStartCommand', 'maxTokens', 'timeoutMs', 'autoStartLocal'];
        const listSettings = ['endpoint', 'model', 'apiKey', 'localStartCommand', 'base', 'logEncoding'];
        const settingsArrayKeys: Record<string, string> = {
            endpoint: 'endpoints',
            model: 'models',
            apiKey: 'apiKeys',
            localStartCommand: 'localStartCommands',
            base: 'bases'
        };

        const isAISetting = aiSettings.includes(setting);
        const isListSetting = listSettings.includes(setting);

        let value: any;

        if (isListSetting && action === 'select') {
            const settingKey = isAISetting ? `ai.${setting}` : setting;

            value = valueArg;
            await config.update(settingKey, value, true);

            if (setting !== 'logEncoding') {
                const arrayKey = isAISetting ? `ai.${settingsArrayKeys[setting]}` : settingsArrayKeys[setting];
                const currentList = config.get<string[]>(arrayKey, []) || [];
                if (!currentList.includes(value)) {
                    currentList.push(value);
                    await config.update(arrayKey, currentList, true);
                }
            }

            return this.finishAIUpdate(setting, value);
        }

        if (isListSetting && action === 'add') {
            if (setting === 'logEncoding') {
                Logger.getInstance().warn(t('ai.logEncodingReadOnly'), true);
                return;
            }

            let prompt = t('ai.endpoint.prompt');
            let validation: ((v: string) => string | null) | undefined;
            if (setting === 'model') {
                prompt = t('ai.model.prompt');
                validation = (v) => v.trim() ? null : t('ai.model.validation');
            } else if (setting === 'apiKey') {
                prompt = t('ai.apiKey.prompt');
                validation = undefined;
            } else if (setting === 'localStartCommand') {
                prompt = t('ai.localStartCommand.prompt');
                validation = (v) => v.trim() ? null : t('ai.localStartCommand.validation');
            } else if (setting === 'base') {
                prompt = t('config.base');
                validation = undefined;
            }

            const input = await vscode.window.showInputBox({ prompt, value: valueArg ?? '', validateInput: validation });
            if (typeof input !== 'string') { return; }
            value = input.trim();

            const settingKey = isAISetting ? `ai.${setting}` : setting;
            const arrayKey = isAISetting ? `ai.${settingsArrayKeys[setting]}` : settingsArrayKeys[setting];

            const currentList = config.get<string[]>(arrayKey, []) || [];
            if (!currentList.includes(value)) {
                currentList.push(value);
                await config.update(arrayKey, currentList, true);
            }
            await config.update(settingKey, value, true);
            return this.finishAIUpdate(setting, value);
        }

        if (isListSetting && action === 'remove') {
            if (setting === 'logEncoding') {
                Logger.getInstance().warn(t('ai.logEncodingReadOnly'), true);
                return;
            }

            const settingKey = isAISetting ? `ai.${setting}` : setting;
            const arrayKey = isAISetting ? `ai.${settingsArrayKeys[setting]}` : settingsArrayKeys[setting];

            const currentList = config.get<string[]>(arrayKey, []) || [];
            const target = valueArg || (isAISetting ? aiConfig(setting) : config.get<string>(setting, ''));
            if (!target) {
                return;
            }
            const filtered = currentList.filter((item) => item !== target);
            await config.update(arrayKey, filtered, true);

            const activeValue = isAISetting ? aiConfig(setting) : config.get<string>(setting, '');
            if (activeValue === target) {
                await config.update(settingKey, filtered[0] || '', true);
            }

            return this.finishAIUpdate(setting, filtered[0] || '');
        }

        switch (setting) {
            case 'provider': {
                const providers = ['none', 'local', 'aliyun-dashscope', 'baichuan', 'zhipu', 'deepseek', 'custom'];
                const pick = await vscode.window.showQuickPick(
                    providers.map((p) => ({ label: p, description: p === aiConfig('provider') ? t('instance.activeLabel') : '' })),
                    { placeHolder: t('ai.selectProvider') }
                );
                if (!pick) { return; }
                value = pick.label;
                break;
            }
            case 'maxTokens': {
                const input = await vscode.window.showInputBox({ prompt: t('ai.maxTokens.prompt'), value: String(aiConfig('maxTokens') || 128), validateInput: (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? null : t('ai.maxTokens.validation'); } });
                if (typeof input !== 'string') { return; }
                value = Number(input);
                break;
            }
            case 'timeoutMs': {
                const input = await vscode.window.showInputBox({ prompt: t('ai.timeoutMs.prompt'), value: String(aiConfig('timeoutMs') || 45000), validateInput: (v) => { const n = Number(v); return Number.isInteger(n) && n >= 1000 ? null : t('ai.timeoutMs.validation'); } });
                if (typeof input !== 'string') { return; }
                value = Number(input);
                break;
            }
            case 'autoStartLocal': {
                value = !aiConfig(setting);
                break;
            }
            case 'logEncoding': {
                const options = ['utf8', 'utf-8', 'utf16le', 'utf-16le', 'ascii', 'latin1', 'binary', 'base64', 'base64url', 'hex', 'ucs2', 'ucs-2'];
                const current = config.get<string>('logEncoding', 'utf8');
                const pick = await vscode.window.showQuickPick(
                    options.map((option) => ({ label: option, description: option === current ? t('instance.activeLabel') : '' })),
                    { placeHolder: t('config.logEncoding') }
                );
                if (!pick) { return; }
                value = pick.label;
                break;
            }
            case 'showTimestamp': {
                value = !config.get<boolean>('showTimestamp', true);
                break;
            }
            case 'autoReloadBrowser': {
                value = !config.get<boolean>('autoReloadBrowser', true);
                break;
            }
            case 'base': {
                const input = await vscode.window.showInputBox({ prompt: t('config.base'), value: config.get<string>('base', '') });
                if (typeof input !== 'string') { return; }
                value = input.trim();
                break;
            }
            case 'javaHome': {
                const input = await vscode.window.showInputBox({ prompt: t('config.javaHome'), value: config.get<string>('javaHome', '') });
                if (typeof input !== 'string') { return; }
                value = input.trim();
                break;
            }
            default:
                return;
        }

        const configKey = isAISetting ? `ai.${setting}` : setting;
        await config.update(configKey, value, true);
        return this.finishAIUpdate(setting, value, isAISetting);
    }

    private async finishAIUpdate(setting: string, value: any, validateAI = true): Promise<void> {
        AI.getInstance().updateConfig();
        Logger.getInstance().updateConfig();

        if (validateAI && !this.validateAIConfig()) {
            Logger.getInstance().warn(t('ai.invalidConfigReverted'), true);
            await this.restoreAIConfigDefaults();
        } else {
            Logger.getInstance().debug(t('ai.settingUpdated', { key: setting, value: String(value) }), false);
        }

        this.refresh();
    }

    private validateAIConfig(): boolean {
        const config = vscode.workspace.getConfiguration('tomcat');
        const provider = config.get<string>('ai.provider', 'none');
        const endpoint = (config.get<string>('ai.endpoint', '') || '').trim();
        const model = (config.get<string>('ai.model', '') || '').trim();
        const maxTokens = config.get<number>('ai.maxTokens', 128);
        const timeoutMs = config.get<number>('ai.timeoutMs', 45000);

        if (!['none', 'local', 'aliyun-dashscope', 'baichuan', 'zhipu', 'deepseek', 'custom'].includes(provider)) {
            return false;
        }
        if (provider !== 'none' && !endpoint) {
            return false;
        }
        if (provider !== 'none' && !model) {
            return false;
        }
        if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
            return false;
        }
        if (!Number.isInteger(timeoutMs) || timeoutMs < 1000) {
            return false;
        }
        return true;
    }

    private async restoreAIConfigDefaults(): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        await config.update('ai.provider', 'none', true);
        await config.update('ai.endpoint', 'http://127.0.0.1:11434/api/chat', true);
        await config.update('ai.model', 'qwen2.5:7b', true);
        await config.update('ai.apiKey', '', true);
        await config.update('ai.localStartCommand', 'ollama serve', true);
        await config.update('ai.maxTokens', 128, true);
        await config.update('ai.timeoutMs', 45000, true);
        await config.update('ai.autoStartLocal', true, true);
        AI.getInstance().updateConfig();
        Logger.getInstance().updateConfig();
        this.refresh();
    }
}
