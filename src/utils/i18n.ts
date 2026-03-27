import * as vscode from 'vscode';

export type Locale = 'en' | 'zh-CN';
export type LanguageSetting = 'auto' | Locale;
export type DeployMode = 'Disable' | 'On Save' | 'On Shortcut';
export type BuildType = 'Local' | 'Maven' | 'Gradle';
export type BrowserName = 'Disable' | 'Google Chrome' | 'Microsoft Edge' | 'Firefox' | 'Safari' | 'Brave' | 'Opera';

type TranslationKey = keyof typeof translations.en;

const LANGUAGE_FLAG_KEY = 'tomcat.languageInitialized';

const translations = {
    en: {
        'output.channelName': 'Tomcat',
        'config.encoding.unsupported': 'Unsupported encoding "{encoding}" detected. Falling back to utf8.',
        'status.deployLabel': 'Tomcat deploy: {mode}',
        'status.loadingTooltip': '{value} Loading...',
        'status.changeModeTooltip': 'Click to change deploy mode',
        'status.aiTyping': 'AI typing...',
        'status.aiTooltip': 'AI is typing a response',
        'status.aiReady': 'AI ready',
        'status.aiIdle': 'AI idle',
        'deployMode.disable': 'Disable',
        'deployMode.onSave': 'On Save',
        'deployMode.onShortcut': 'On Shortcut',
        'tomcat.alreadyRunning': 'Tomcat is already running',
        'tomcat.started': 'Tomcat started successfully',
        'tomcat.startFailed': 'Failed to start Tomcat:',
        'tomcat.notRunning': 'Tomcat is not running',
        'tomcat.stoppedProcess': 'Tomcat stopped (process terminated)',
        'tomcat.stopped': 'Tomcat stopped successfully',
        'tomcat.stopFailed': 'Failed to stop Tomcat:',
        'tomcat.reloaded': 'Tomcat reloaded',
        'tomcat.reloadAddingUser': 'Reload failed, attempting to add admin user...',
        'tomcat.webappsMissing': 'Webapps directory not found: {path}',
        'tomcat.removedDirectory': 'Removed directory: {path}',
        'tomcat.removedFile': 'Removed file: {path}',
        'tomcat.cleanedDirectory': 'Cleaned and recreated: {path}',
        'tomcat.cleaned': 'Tomcat cleaned successfully',
        'tomcat.cleanupFailed': 'Tomcat cleanup failed:',
        'tomcat.invalidHome': 'Invalid Tomcat home: {path} not found.',
        'tomcat.invalidJavaHome': 'Invalid Java home: {path} not found.',
        'tomcat.portUpdated': 'Tomcat port updated from {oldPort} to {newPort}',
        'tomcat.portUpdateFailed': 'Failed to update Tomcat port:',
        'tomcat.selectTomcatHome': 'Select Tomcat Home Folder',
        'tomcat.selectJavaHome': 'Select Java Home Folder',
        'instance.selectJavaHome': 'Select Java home',
        'instance.openInBrowser': 'Open in Browser',
        'instance.useThisTomcat': 'Use This Tomcat',
        'instance.useThisJava': 'Use This Java',
        'instance.useThisPort': 'Use This Port',
        'instance.setBrowser': 'Set Browser',
        'instance.activeLabel': 'Active',
        'instance.selectJavaHomeToRemove': 'Select a Java home entry to remove.',
        'instance.javaHomeNotFound': 'Java home not found in list.',
        'instance.removedJavaHome': 'Removed Java home {path}',
        'tomcat.portBelowMin': 'Ports below {min} require admin privileges',
        'tomcat.portAboveMax': 'Maximum allowed port is {max}',
        'tomcat.portInUse': 'Port {port} is already in use',
        'tomcat.noAvailableInstance': 'No available Tomcat instance for deployment',
        'tomcat.processAlreadyExited': 'Process already exited.',
        'tomcat.addedAdminUser': 'Added admin user to tomcat-users.xml',
        'tomcat.portAdjusted': 'Tomcat port in use; adjusted from {from} to {to}.',
        'tomcat.exitedWithCode': 'Tomcat exited with code {code}',
        'tomcat.reloadFailed': 'Reload failed: {reason}',
        'tomcat.updatePortsFailed': 'Failed to update ports in server.xml',
        'tomcat.statusBar': 'Tomcat: {managed} managed · {external} external',
        'builder.buildCompleted': '{type} Build completed in {duration}ms',
        'builder.buildFailed': '{type} Build failed:',
        'builder.newProjectPrompt': 'No Java EE project found. Do you want to create a new one?',
        'builder.newProjectYes': 'Yes',
        'builder.newProjectNo': 'No',
        'builder.installJavaPack': 'Java Extension Pack required for project creation',
        'builder.installExtension': 'Install Extension',
        'builder.projectCreationFailed': 'Project creation failed. Ensure Java Extension Pack is installed and configured.',
        'builder.openExtensions': 'Open Extensions',
        'builder.newProjectCreated': 'New Maven web app project created',
        'builder.deployCanceled': 'Tomcat deploy canceled',
        'builder.selectBuildType': 'Select build type',
        'builder.webAppMissing': 'WebApp directory not found: {path}',
        'builder.invalidDeployType': 'Invalid deployment type: {type}',
        'builder.noWarAfterMaven': 'No WAR file found after Maven build.',
        'builder.noWarAfterGradle': 'No WAR file found after Gradle build.',
        'builder.pomMissing': 'pom.xml not found.',
        'builder.gradleMissing': 'build.gradle not found.',
        'builder.unknownError': 'Unknown error.',
        'builder.buildProgressTitle': '{type} Build',
        'buildType.local': 'Local',
        'buildType.maven': 'Maven',
        'buildType.gradle': 'Gradle',
        'browser.noAppName': 'No application name provided',
        'browser.noAppNameDetails': 'Please provide a valid application name',
        'browser.accessUrl': 'Access your app at: {url}',
        'browser.unsupportedPlatform': '{browser} is not supported on this platform.',
        'browser.unsupportedPlatformDetails': 'Please use a different browser',
        'browser.openNewWindow': 'Opening new {browser} window',
        'browser.reloaded': '{browser} reloaded',
        'browser.reloadFailedFallback': 'Failed to connect to {browser}; launching a new window. Change the browser or disable browser reload in the settings. See the README known issues section for details.',
        'browser.launchFailed': 'Browser launch failed',
        'browser.requestTimeout': 'Request timeout',
        'browser.restartPrompt': '{browser} needs restart in debug mode',
        'browser.restartOption': 'Restart',
        'browser.cancelOption': 'Cancel',
        'browser.failedReload': 'Failed to reload {browser} process:',
        'browser.processCheckFailed': 'Process check failed: {error}',
        'browser.name.disable': 'Disable',
        'browser.name.chrome': 'Google Chrome',
        'browser.name.edge': 'Microsoft Edge',
        'browser.name.firefox': 'Firefox',
        'browser.name.safari': 'Safari',
        'browser.name.brave': 'Brave',
        'browser.name.opera': 'Opera',
        'instance.noTomcatHomes': 'No Tomcat homes configured',
        'instance.noTomcatInstances': 'No Tomcat instances',
        'instance.runningInstances': 'Running Instances ({count})',
        'instance.addPort.prompt': 'Add HTTP port (1024-49151)',
        'instance.addPort.validation': 'Enter a port between 1024 and 49151',
        'instance.removeActivePortWarn': 'Switch to another port before removing the active one.',
        'instance.removedPort': 'Removed saved port {port}.',
        'instance.buildTypeSet': 'Auto deploy build type set to {type}',
        'instance.logLevelSet': 'Log level set to {level}',
        'group.buildType': 'Build Type',
        'group.logLevel': 'Log Level',
        'group.settings': 'Settings',
        'group.home': 'Tomcat Home',
        'group.browser': 'Browser',
        'group.javaHome': 'Java Home',
        'group.port': 'HTTP Port',
        'action.select': 'Select',
        'action.configure': 'Configure',
        'label.current': '(Current)',
        'label.na': 'n/a',
        'label.port': 'port',
        'label.pid': 'PID',
        'label.version': 'Version',
        'label.workspace': 'Workspace',
        'label.command': 'Command',
        'logLevel.DEBUG': 'DEBUG',
        'logLevel.INFO': 'INFO',
        'logLevel.SUCCESS': 'SUCCESS',
        'logLevel.HTTP': 'HTTP',
        'logLevel.APP': 'APP',
        'logLevel.WARN': 'WARN',
        'logLevel.ERROR': 'ERROR',
        'instance.noJavaHomes': 'No Java homes configured',
        'instance.tomcatHomeNotSet': 'Home not set',
        'instance.javaHomeNotSet': 'Java home not set',
        'instance.addTomcatHome': 'Add Tomcat home',
        'instance.addJavaHome': 'Add Java home',
        'instance.invalidTomcatHome': 'Selected folder is not a valid Tomcat home.',
        'instance.invalidJavaHome': 'Selected folder is not a valid Java home.',
        'instance.tomcatHomeSet': 'Tomcat home set to {path} (v{version})',
        'instance.javaHomeSet': 'Java home set to {path}',
        'instance.noTomcatHomesAddOne': 'No Tomcat homes configured. Add one first.',
        'instance.noJavaHomesAddOne': 'No Java homes configured. Add one first.',
        'instance.selectTomcatHomeToRemove': 'Select a Tomcat home entry to remove.',
        'instance.tomcatHomeNotFound': 'Tomcat home not found in list.',
        'instance.removedTomcatHome': 'Removed Tomcat home {path}',
        'instance.portRangeError': 'Port must be between 1024 and 49151.',
        'instance.portSet': 'Port set to {port}',
        'instance.selectTomcatHomeToSetActive': 'Select Tomcat home to set active',
        'instance.selectJavaHomeToSetActive': 'Select Java home to set active',
        'instance.browserSet': 'Browser set to {name}',
        'ai.endpointUnreachable': 'AI endpoint not reachable; skipped explanation.',
        'ai.noContent': 'AI returned no content',
        'ai.explainFailed': 'AI explanation failed: {error}',
        'ai.moreLines': '... (+{count} more lines)',
        'ai.systemPrompt': 'You are a concise Tomcat build/server log assistant. Explain the probable cause and a short fix in under 120 words. If the log is incomplete, say what to check next.',
        'ai.userPrompt': 'Log level: {level}\nLog: {log}',
        'ai.failedLocalStart': '[AI] failed to start local AI: {error}',
        'logger.userSelected': 'User selected: {selection}',
        'logger.noErrorLocationParsed': 'No error location parsed from build output',
        'logger.failedOpenErrorLocation': 'Failed to open error location {path}: {error}',
        'logger.infoLabel': 'INFO',
        'logger.warnLabel': 'WARN',
        'logger.errorLabel': 'ERROR',
        'logger.successLabel': 'SUCCESS',
        'logger.debugLabel': 'DEBUG',
        'logger.aiLabel': 'AI',
        'ai.requestTimedOut': 'AI request timed out',
    },
    'zh-CN': {
        'output.channelName': 'Tomcat',
        'config.encoding.unsupported': '检测到不支持的编码"{encoding}"，已回退到 utf8。',
        'status.deployLabel': 'Tomcat 部署：{mode}',
        'status.loadingTooltip': '{value} 加载中...',
        'status.changeModeTooltip': '点击切换部署模式',
        'status.aiTyping': 'AI 正在生成...',
        'status.aiTooltip': 'AI 正在回复',
        'status.aiReady': 'AI 已就绪',
        'status.aiIdle': 'AI 空闲',
        'deployMode.disable': '关闭',
        'deployMode.onSave': '保存时',
        'deployMode.onShortcut': '快捷键',
        'tomcat.alreadyRunning': 'Tomcat 已在运行',
        'tomcat.started': 'Tomcat 启动成功',
        'tomcat.startFailed': 'Tomcat 启动失败：',
        'tomcat.notRunning': 'Tomcat 未在运行',
        'tomcat.stoppedProcess': 'Tomcat 已停止（进程已终止）',
        'tomcat.stopped': 'Tomcat 已成功停止',
        'tomcat.stopFailed': 'Tomcat 停止失败：',
        'tomcat.reloaded': 'Tomcat 已重新加载',
        'tomcat.reloadAddingUser': '热重载失败，正在尝试添加管理员账号...',
        'tomcat.webappsMissing': '未找到 Webapps 目录：{path}',
        'tomcat.removedDirectory': '已删除目录：{path}',
        'tomcat.removedFile': '已删除文件：{path}',
        'tomcat.cleanedDirectory': '已清理并重新创建：{path}',
        'tomcat.cleaned': 'Tomcat 清理成功',
        'tomcat.cleanupFailed': 'Tomcat 清理失败：',
        'tomcat.invalidHome': 'Tomcat 安装目录无效：未找到 {path}。',
        'tomcat.invalidJavaHome': 'Java 安装目录无效：未找到 {path}。',
        'tomcat.portUpdated': 'Tomcat 端口已从 {oldPort} 更新为 {newPort}',
        'tomcat.portUpdateFailed': '更新 Tomcat 端口失败：',
        'tomcat.selectTomcatHome': '选择 Tomcat 根目录',
        'tomcat.selectJavaHome': '选择 Java 安装目录',
        'tomcat.portAdjusted': 'Tomcat 端口已被占用；已从 {from} 调整为 {to}。',
        'tomcat.exitedWithCode': 'Tomcat 已退出，退出码 {code}',
        'tomcat.reloadFailed': '重载失败：{reason}',
        'tomcat.updatePortsFailed': '更新 server.xml 端口失败',
        'tomcat.statusBar': 'Tomcat：{managed} 个托管 · {external} 个外部',
        'instance.selectJavaHome': '选择 Java 根目录',
        'instance.openInBrowser': '在浏览器中打开',
        'instance.useThisTomcat': '使用此 Tomcat',
        'instance.useThisJava': '使用此 Java',
        'instance.useThisPort': '使用此端口',
        'instance.setBrowser': '设置浏览器',
        'instance.activeLabel': '激活',
        'instance.selectJavaHomeToRemove': '请选择一个要删除的 Java 路径。',
        'instance.javaHomeNotFound': 'Java 路径未在列表中找到。',
        'instance.removedJavaHome': '已删除 Java 路径 {path}',
        'tomcat.portBelowMin': '端口号低于 {min} 需要管理员权限',
        'tomcat.portAboveMax': '最大允许端口为 {max}',
        'tomcat.portInUse': '端口 {port} 已被占用',
        'logger.failedOpenErrorLocation': '无法打开错误位置 {path}：{error}',
        'tomcat.noAvailableInstance': '没有可用的 Tomcat 实例用于部署',
        'tomcat.processAlreadyExited': '进程已退出。',
        'tomcat.addedAdminUser': '已在 tomcat-users.xml 中添加管理员账号',
        'builder.buildCompleted': '{type} 构建完成，用时 {duration}ms',
        'builder.buildFailed': '{type} 构建失败：',
        'builder.newProjectPrompt': '未找到 Java EE 项目，是否创建新项目？',
        'builder.newProjectYes': '是',
        'builder.newProjectNo': '否',
        'builder.installJavaPack': '创建项目需要 Java Extension Pack',
        'builder.installExtension': '安装扩展',
        'builder.projectCreationFailed': '创建项目失败。请确认已安装并配置 Java Extension Pack。',
        'builder.openExtensions': '打开扩展视图',
        'builder.newProjectCreated': '已创建新的 Maven Web 应用项目',
        'builder.deployCanceled': '已取消 Tomcat 部署',
        'builder.selectBuildType': '选择构建类型',
        'builder.webAppMissing': '未找到 WebApp 目录：{path}',
        'builder.invalidDeployType': '无效的部署类型：{type}',
        'builder.noWarAfterMaven': 'Maven 构建后未找到 WAR 文件。',
        'builder.noWarAfterGradle': 'Gradle 构建后未找到 WAR 文件。',
        'builder.pomMissing': '未找到 pom.xml。',
        'builder.gradleMissing': '未找到 build.gradle。',
        'builder.unknownError': '未知错误。',
        'builder.buildProgressTitle': '{type} 构建',
        'buildType.local': '本地',
        'buildType.maven': 'Maven',
        'buildType.gradle': 'Gradle',
        'browser.noAppName': '未提供应用名称',
        'browser.noAppNameDetails': '请提供有效的应用名称',
        'browser.accessUrl': '可在此访问应用：{url}',
        'browser.unsupportedPlatform': '{browser} 在当前平台不受支持。',
        'browser.unsupportedPlatformDetails': '请使用其他浏览器',
        'browser.openNewWindow': '正在打开新的 {browser} 窗口',
        'browser.reloaded': '{browser} 已重新加载',
        'browser.reloadFailedFallback': '无法连接到 {browser}，改为打开新窗口。可在设置中更换浏览器或关闭自动重载。详见 README 的已知问题章节。',
        'browser.launchFailed': '浏览器启动失败',
        'browser.restartPrompt': '{browser} 需要以调试模式重启',
        'browser.restartOption': '重新启动',
        'browser.cancelOption': '取消',
        'browser.failedReload': '{browser} 重载进程失败：',
        'browser.processCheckFailed': '进程检查失败：{error}',
        'browser.name.disable': '关闭',
        'browser.name.chrome': 'Google Chrome',
        'browser.name.edge': '微软 Edge',
        'browser.name.firefox': '火狐浏览器',
        'browser.name.safari': 'Safari',
        'browser.name.brave': 'Brave 浏览器',
        'browser.name.opera': 'Opera 浏览器',
        'instance.noTomcatHomes': '未配置 Tomcat 路径',
        'instance.noTomcatInstances': '未检测到 Tomcat 实例',
        'instance.runningInstances': '运行中的实例（{count}）',
        'instance.addPort.prompt': '添加 HTTP 端口（1024-49151）',
        'instance.addPort.validation': '请输入 1024 到 49151 之间的端口号',
        'instance.removeActivePortWarn': '在删除活动端口前请切换到另一个端口。',
        'instance.removedPort': '已删除保存的端口 {port}。',
        'instance.buildTypeSet': '自动部署构建类型已设置为 {type}',
        'instance.logLevelSet': '日志级别已设置为 {level}',
        'group.buildType': '构建类型',
        'group.logLevel': '日志级别',
        'group.settings': '设置',
        'group.home': 'Tomcat 根目录',
        'group.browser': '浏览器',
        'group.javaHome': 'Java 根目录',
        'group.port': 'HTTP 端口',
        'action.select': '选择',
        'action.configure': '配置',
        'label.current': '（当前）',
        'label.na': '无',
        'label.port': '端口',
        'label.pid': 'PID',
        'label.version': '版本',
        'label.workspace': '工作区',
        'label.command': '命令',
        'logLevel.DEBUG': '调试',
        'logLevel.INFO': '信息',
        'logLevel.SUCCESS': '成功',
        'logLevel.HTTP': 'HTTP',
        'logLevel.APP': '应用',
        'logLevel.WARN': '警告',
        'logLevel.ERROR': '错误',
        'instance.noJavaHomes': '未配置 Java 路径',
        'instance.tomcatHomeNotSet': '未设置 Tomcat 路径',
        'instance.javaHomeNotSet': '未设置 Java 路径',
        'instance.addTomcatHome': '添加 Tomcat 路径',
        'instance.addJavaHome': '添加 Java 路径',
        'instance.invalidTomcatHome': '所选目录不是有效的 Tomcat 路径。',
        'instance.invalidJavaHome': '所选目录不是有效的 Java 路径。',
        'instance.tomcatHomeSet': 'Tomcat 根目录设置为 {path}（v{version}）',
        'instance.javaHomeSet': 'Java 根目录设置为 {path}',
        'instance.noTomcatHomesAddOne': '未配置 Tomcat 路径。请先添加一个。',
        'instance.noJavaHomesAddOne': '未配置 Java 路径。请先添加一个。',
        'instance.selectTomcatHomeToRemove': '请选择一个要删除的 Tomcat 路径。',
        'instance.tomcatHomeNotFound': 'Tomcat 路径未在列表中找到。',
        'instance.removedTomcatHome': '已删除 Tomcat 路径 {path}',
        'instance.portRangeError': '端口号必须在 1024 到 49151 之间。',
        'instance.portSet': '端口设置为 {port}',
        'instance.selectTomcatHomeToSetActive': '请选择要激活的 Tomcat 路径',
        'instance.selectJavaHomeToSetActive': '请选择要激活的 Java 路径',
        'instance.browserSet': '浏览器设置为 {name}',
        'ai.endpointUnreachable': 'AI 接口不可达，已跳过自动解释。',
        'ai.requestTimedOut': 'AI 请求超时',
        'browser.requestTimeout': '请求超时',
        'ai.noContent': 'AI 未返回内容',
        'ai.explainFailed': 'AI 解析失败：{error}',
        'ai.moreLines': '...（再多 {count} 行）',
        'ai.systemPrompt': '你是简洁的 Tomcat 构建/服务器日志助手，用不超过 120 字说明可能原因和简短修复方案。如果日志不完整，请说明下一步应该检查什么。',
        'ai.userPrompt': '日志级别：{level}\n日志：{log}',
        'ai.failedLocalStart': '[AI] 启动本地 AI 失败：{error}',
        'logger.userSelected': '用户选择：{selection}',
        'logger.noErrorLocationParsed': '未解析到错误位置',
        'logger.infoLabel': '信息',
        'logger.warnLabel': '警告',
        'logger.errorLabel': '错误',
        'logger.successLabel': '成功',
        'logger.debugLabel': '调试',
        'logger.aiLabel': 'AI',
    }
} as const;

let currentLocale: Locale = 'en';
let initialized = false;

export function initializeLocalization(context: vscode.ExtensionContext): void {
    if (initialized) return;

    const cfg = vscode.workspace.getConfiguration('tomcat');
    const configured = cfg.get<LanguageSetting>('language', 'auto');
    const envLocale = detectLocale();
    const stored = context.globalState.get<boolean>(LANGUAGE_FLAG_KEY, false);

    if (!stored && configured === 'auto') {
        const target = envLocale;
        void cfg.update('language', target, true);
        void context.globalState.update(LANGUAGE_FLAG_KEY, true);
        currentLocale = target;
    } else {
        currentLocale = resolveLocale(configured, envLocale);
    }

    initialized = true;
}

export function refreshLocalization(): void {
    const cfg = vscode.workspace.getConfiguration('tomcat');
    const configured = cfg.get<LanguageSetting>('language', 'auto');
    currentLocale = resolveLocale(configured, detectLocale());
}

export function getCurrentLocale(): Locale {
    if (!initialized) {
        currentLocale = resolveLocale(
            vscode.workspace.getConfiguration('tomcat').get<LanguageSetting>('language', 'auto'),
            detectLocale()
        );
    }
    return currentLocale;
}

export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    const locale = getCurrentLocale();
    const template = translations[locale]?.[key] ?? translations.en[key] ?? key;
    return format(template, vars);
}

export function translateDeployMode(mode: DeployMode): string {
    switch (mode) {
        case 'On Save':
            return t('deployMode.onSave');
        case 'On Shortcut':
            return t('deployMode.onShortcut');
        default:
            return t('deployMode.disable');
    }
}

export function translateBuildType(type: BuildType): string {
    const keyMap: Record<BuildType, TranslationKey> = {
        'Local': 'buildType.local',
        'Maven': 'buildType.maven',
        'Gradle': 'buildType.gradle'
    };
    return t(keyMap[type]);
}

export function translateBrowserName(browser: BrowserName): string {
    const keyMap: Record<BrowserName, TranslationKey> = {
        'Disable': 'browser.name.disable',
        'Google Chrome': 'browser.name.chrome',
        'Microsoft Edge': 'browser.name.edge',
        'Firefox': 'browser.name.firefox',
        'Safari': 'browser.name.safari',
        'Brave': 'browser.name.brave',
        'Opera': 'browser.name.opera'
    };
    return t(keyMap[browser]);
}

function resolveLocale(setting: LanguageSetting | undefined, fallback: Locale): Locale {
    if (setting === 'zh-CN') return 'zh-CN';
    if (setting === 'en') return 'en';
    return fallback;
}

function detectLocale(): Locale {
    const language = (vscode.env.language || '').toLowerCase();
    if (language.startsWith('zh')) {
        return 'zh-CN';
    }
    return 'en';
}

function format(template: string, vars?: Record<string, string | number>): string {
    if (!vars) return template;
    return Object.keys(vars).reduce((acc, key) => {
        const value = typeof vars[key] === 'number' ? String(vars[key]) : (vars[key] as string);
        return acc.replace(new RegExp(`\\{${key}\\}`, 'g'), value ?? '');
    }, template);
}
