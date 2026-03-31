/**
 * Internationalization utilities for the Tomcat extension.
 *
 * Provides:
 * - Translations for both English and Chinese (simplified)
 * - Locale detection and user preference resolution
 * - Runtime lookup of translation keys with variable interpolation
 * - Convenience mapping for deploy mode/build type/browser names
 *
 * Input: user/workspace language settings, translation key + vars
 * Output: localized string messages for UI and logs
 */
import * as vscode from 'vscode';

/**
 * Supported locale identifiers.
 */
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
        'tomcat.stoppedProcess': 'Tomcat stopped (process terminated{context})',
        'tomcat.stopped': 'Tomcat stopped successfully',
        'tomcat.stopFailed': 'Failed to stop Tomcat:',
        'tomcat.stopMultipleInstancesNotSupported': 'Stop command is not performed because multiple managed instances exist; stop one instance from the tree instead.',
        'tomcat.noInstanceForApp': 'No managed instance was found for app {app}',
        'tomcat.reloaded': 'Tomcat reloaded',
        'tomcat.reloadAddingUser': 'Reload failed, attempting to add admin user...',
        'tomcat.stopViaJavaFailed': 'Tomcat stop command failed for app {app}: {reason}',
        'tomcat.portReleaseTimeout': 'Timed out waiting for port {port} to become free',
        'tomcat.reloadedInstance': 'Tomcat instance reloaded: {app} on port {port}',
        'tomcat.stoppedInstance': 'Tomcat instance stopped: {app} on port {port}',
        'tomcat.noInstanceForPort': 'No managed Tomcat instance discovered on port {port}',
        'tomcat.noAppContext': 'App context is required for instance reload',
        'tomcat.reloadFailedNoInstance': 'Reload failed for unknown or missing instance: {app} on port {port}',
        'tomcat.webappsMissing': 'Webapps directory not found: {path}',
        'tomcat.removedDirectory': 'Removed directory: {path}',
        'tomcat.removedFile': 'Removed file: {path}',
        'tomcat.cleanedDirectory': 'Cleaned and recreated: {path}',
        'tomcat.cleaned': 'Tomcat cleaned successfully',
        'tomcat.appUndeployed': 'Removed app directory from webapps: {app}',
        'tomcat.appWarRemoved': 'Removed WAR from webapps: {app}',
        'tomcat.appUndeploySuccess': 'App {app} undeployed successfully',
        'tomcat.appUndeployFailed': 'Undeploy failed for {app}',
        'tomcat.appUndeployBusy': 'App {app} undeploy busy, stopping its Tomcat instance and retrying.',
        'tomcat.appUndeployForceCleanup': 'App {app} undeploy still busy after stop; cleaning maps and refreshing state.',
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
        'tomcat.exitedWithCodeInstance': 'Tomcat instance {app} exited with code {code} on port {port}',
        'tomcat.reloadFailed': 'Reload failed: {reason}',
        'tomcat.updatePortsFailed': 'Failed to update ports in server.xml',
        'tomcat.statusBar': 'Tomcat: {managed} managed · {external} external',
        'builder.buildCompleted': '{type} Build completed in {duration}ms',
        'builder.buildCompletedWithApp': '{type} Build completed for app {app} on port {port} in {duration}ms',
        'builder.deployingAppAfterBuild': 'Build output verified; reloading Tomcat app {app} on port {port}',
        'builder.startingTomcatAfterBuild': 'Build output verified; starting Tomcat instance for app {app}',
        'builder.buildFailed': '{type} Build failed:',
        'builder.buildFailedWithApp': '{type} Build failed for app {app} on port {port}',
        'builder.newProjectPrompt': 'No Java EE project found. Do you want to create a new one?',

        'builder.newProjectYes': 'Yes',
        'builder.newProjectNo': 'No',
        'builder.installJavaPack': 'Java Extension Pack required for project creation',
        'builder.selectProject': 'Select Java EE project to deploy',
        'builder.installExtension': 'Install Extension',
        'builder.projectCreationFailed': 'Project creation failed. Ensure Java Extension Pack is installed and configured.',
        'builder.openExtensions': 'Open Extensions',
        'builder.newProjectCreated': 'New Maven web app project created',
        'builder.deployCanceled': 'Tomcat deploy canceled',
        'builder.deployInProgress': 'Deployment already in progress. Please wait until it completes.',
        'builder.deployInProgressApp': 'Deployment already in progress for app {app}. Request will restart it after current run ends.',
        'builder.deployQueuedRestart': 'Re-running queued deployment for app {app}.',
        'builder.deployAlreadyRunning': 'App {app} is already running after previous deployment, skipping queued restart.',
        'builder.autoDeployError': 'Auto deploy failed: {error}',
        'builder.autoDeploySuppressed': 'AutoDeploy suppressed due to recent configuration change.',
        'builder.selectBuildType': 'Select build type',
        'builder.webAppMissing': 'WebApp directory not found: {path}',
        'builder.invalidDeployType': 'Invalid deployment type: {type}',
        'builder.noWarAfterMaven': 'No WAR file found after Maven build.',
        'builder.noWarAfterGradle': 'No WAR file found after Gradle build.',
        'builder.pomMissing': 'pom.xml not found.',
        'builder.gradleMissing': 'build.gradle not found.',
        'builder.unknownError': 'Unknown error.',
        'builder.buildProgressTitle': '{type} Build',
        'builder.libDirCreated': 'Source lib directory not found; created {path}',
        'buildType.local': 'Local',
        'buildType.maven': 'Maven',
        'buildType.gradle': 'Gradle',
        'browser.noAppName': 'No application name provided',
        'browser.noAppNameDetails': 'Please provide a valid application name',
        'browser.revertToPrevious': 'Browser {choice} not found. Reverted to previous: {previous}.',
        'browser.revertToDisable': 'Browser {choice} not found. Reverted to Disable.',
        'browser.accessUrl': 'Access your app at: {url}',
        'browser.unsupportedPlatform': '{browser} is not supported on this platform.',
        'browser.unsupportedPlatformDetails': 'Please use a different browser',
        'browser.openNewWindow': 'Opening new {browser} window',
        'browser.reloaded': '{browser} reloaded',
        'browser.reloadFailedFallback': 'Failed to connect to {browser}; launching a new window. Change the browser or disable browser reload in the settings. See the README known issues section for details.',
        'browser.launchFailed': 'Browser launch failed',
        'browser.requestTimeout': 'Request timeout',
        'browser.invalidDebugProtocolResponse': 'Invalid debug protocol response',
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
        'group.instances': 'Instances',
        'group.apps': 'Apps',
        'group.appsTooltip': 'Detected Java web applications in your workspace. Expand to view deployment status and controls.',
        'group.additional': 'Additional Settings',
        'group.settingsTooltip': 'Configure Tomcat workspace settings and defaults.',
        'group.aiTooltip': 'View and manage AI provider settings.',
        'group.portTooltip': 'List of configured HTTP ports for deployments.',
        'group.additionalTooltip': 'Additional deployment and Tomcat settings for advanced configuration.',
        'ai.providerTooltip': 'Select the AI provider source for log explain features.',
        'config.logEncoding': 'Log Encoding',
        'config.logEncoding.description': 'Encoding used to read Tomcat log files (e.g., utf8, utf16le). Set this to match the Tomcat log file encoding to avoid garbled characters.',
        'config.showTimestamp': 'Show Timestamp',
        'config.showTimestamp.description': 'Enable this to show a timestamp prefix on each log line in the extension output pane, useful for correlating events over time.',
        'config.autoReloadBrowser': 'Auto-Reload Browser',
        'config.autoReloadBrowser.description': 'When enabled, the extension will automatically refresh the browser tab after a successful deployment, saving manual reload actions.',
        'config.base': 'Tomcat Base',
        'config.base.description': 'Path to Tomcat base directory (CATALINA_BASE). Contains conf, logs, webapps. If empty, the default tomcat home is used.',
        'config.javaHome': 'Java Home',
        'config.javaHome.description': 'Path to JDK home used to start Tomcat. If empty, extension attempts to auto-detect a JDK.',
        'config.home': 'Tomcat Home',
        'config.home.description': 'Path to Tomcat installation directory. If empty, extension will search for valid Tomcat locations.',
        'config.port': 'HTTP Port',
        'config.port.description': 'Tomcat HTTP listening port (1024-49151).',
        'config.browser': 'Browser',
        'config.browser.description': 'Browser for Tomcat “Open in browser” actions and auto-reload behavior.',
        'config.language': 'Language',
        'config.language.description': 'Extension UI language (auto = follow VS Code language).',
        'config.language.enum.auto': 'Auto (system language)',
        'config.language.enum.en': 'English',
        'config.language.enum.zh': '简体中文',
        'config.language.tooltip.auto': 'Great power in the developer world: your tools adapt to you, not the other way around.',
        'config.language.tooltip.en': 'English mode: ship to the world, align with most docs, and keep your console style sharp.',
        'config.language.tooltip.zh': '中文模式：专注国内开发节奏，少些翻译脑洞，多些熟悉的写码韵味。',
        'config.ai.provider.description': 'AI provider for log explanation. "local" launches a local agent; other values use configured endpoint.',
        'config.ai.endpoint.description': 'Full HTTP endpoint for AI log explanation requests (e.g. http://localhost:11434/api/chat).',
        'config.ai.model.description': 'Model name or identifier for AI conversations (e.g. qwen2.5:7b).',
        'config.ai.apiKey.description': 'Bearer token/API key used for authenticated AI endpoint calls.',
        'config.ai.localStartCommand.description': 'Command used to spawn a local AI service if endpoint is unavailable.',
        'config.ai.maxTokens.description': 'Maximum token count per AI request; bigger values increase cost and response length.',
        'config.ai.timeoutMs.description': 'AI request timeout in milliseconds; prevents hanging calls.',
        'config.ai.autoStartLocal.description': 'Auto-start local AI service when endpoint is unreachable.',
        'config.ai.base.description': 'Path to Tomcat base directory (CATALINA_BASE) for the AI environment configuration',
        'config.ai.logEncoding.description': 'Character encoding for logs displayed in AI log explain output',
        'config.ai.showTimestamp.description': 'Show timestamps in AI-generated log analysis output',
        'config.ai.autoReloadBrowser.description': 'Auto-reload browser after AI context-aware deployment insights',
        'config.logLevel': 'Log Level',
        'config.logLevel.description': 'Minimum log severity to display (DEBUG/INFO/WARN/ERROR).',
        'config.buildType': 'Build Type',
        'config.buildType.description': 'Default build strategy used for app deployment.',
        'instance.addTomcatHome': 'Add Tomcat home',
        'instance.addCatalinaBase': 'Add CATALINA_BASE',
        'instance.catalinaBaseSet': 'CATALINA_BASE set to {path}',
        'app.noAppsFound': 'No Java EE apps found',
        'app.status': 'Status',
        'app.status.running': 'Running',
        'app.status.stopped': 'Stopped',
        'home.version': 'Version',
        'config.itemTooltip': '{label}: {value}',
        'ai.settingTooltip': '{title}: {value}',
        'optionItem.tooltip': '{value}',
        'ai.optionSettingTooltip': '{title}: {value}',
        'ai.listGroupTooltip': 'Set and manage {setting} options.',
        'ai.listValueTooltip': 'Select {value} for {setting}.',
        'instance.portTooltip': 'HTTP port {port} ({status}).',
        'app.create.template.javaee': 'Java EE Web App',
        'app.create.template.javaee.desc': 'Standard Java EE web application (servlet, JSP).',
        'app.create.template.springboot': 'Spring Boot Web App',
        'app.create.template.springboot.desc': 'Spring Boot starter application with embedded Tomcat.',
        'app.create.template.struts2': 'Struts 2 Web App',
        'app.create.template.struts2.desc': 'Struts2 sample including action and web.xml setup.',
        'app.create.template.jakartaee': 'Jakarta EE Web App',
        'app.create.template.jakartaee.desc': 'Java EE successor Jakarta EE sample web app.',
        'app.create.nameRequired': 'App name is required.',
        'app.create.pathExists': 'Path already exists: {path}',
        'app.create.noValidJdk': 'No valid JAVA_HOME found. Generated app may not compile.',
        'app.create.noValidTomcat': 'No valid Tomcat home found. Please configure Tomcat.',
        'app.create.selectType': 'Select Java EE application template',
        'app.create.maven': 'Maven Web App',
        'app.create.gradle': 'Gradle Web App',
        'app.create.springBoot': 'Spring Boot Web App',
        'app.create.custom': 'Custom Java EE App',
        'app.create.enterName': 'Enter app name',
        'app.create.selectLocation': 'Select location folder for new app',
        'app.create.selectFrontend': 'Select frontend framework',
        'app.create.frontend.jsp': 'JSP',
        'app.create.frontend.thymeleaf': 'Thymeleaf',
        'app.create.frontend.react': 'React',
        'app.create.frontend.vue': 'Vue',
        'app.create.frontend.angular': 'Angular',
        'app.create.frontend.none': 'No frontend',
        'app.create.projectOverview': 'Project Overview',
        'app.create.templateLabel': 'Template',
        'app.create.frontendLabel': 'Frontend',
        'app.create.javaVersion': 'Java version',
        'app.create.tomcatVersion': 'Tomcat version',
        'ai.logEncodingReadOnly': 'Log encoding list is read-only; choose from the list directly.',
        'app.create.nodeVersion': 'Node version',
        'app.create.npmVersion': 'NPM version',
        'app.create.platform': 'Platform',
        'app.create.quickStart': 'Quick Setup',
        'app.create.quickStep1': 'Build the project with Maven/Gradle',
        'app.create.quickStep2': 'Run the app with mvn spring-boot:run or Tomcat workflow',
        'app.create.quickStep3': 'Open browser at http://localhost:8080',
        'app.create.layout': 'Project layout',
        'app.create.moreInfo': 'More information',
        'app.create.informationLine1': 'This template includes best-practice directories and initial code snippets.',
        'app.create.success': 'Created app {name} at {path}',
        'app.tooltip': 'Java EE app path',
        'app.deploy': 'Deploy app',
        'app.openInBrowser': 'Open app in Browser',
        'instance.runningInstances': 'Running Instances ({count})',
        'instance.addPort.prompt': 'Add HTTP port (1024-49151)',
        'instance.addPort.validation': 'Enter a port between 1024 and 49151',
        'instance.removeActivePortWarn': 'Switch to another port before removing the active one.',
        'instance.removedPort': 'Removed saved port {port}.',
        'instance.buildTypeSet': 'Auto deploy build type set to {type}',
        'instance.logLevelSet': 'Log level set to {level}',
        'instance.languageSet': 'Extension language set to {language}',
        'group.buildType': 'Build Type',
        'group.logLevel': 'Log Level',
        'group.language': 'Language',
        'group.languageTooltip': 'Set the extension display language for this workspace.',
        'group.ai': 'AI',
        'group.settings': 'Settings',
        'ai.selectProvider': 'Select AI provider',
        'ai.provider': 'Provider',
        'ai.selectSettingValue': 'Select AI setting value',
        'ai.endpoint': 'Endpoint',
        'ai.model': 'Model',
        'ai.apiKey': 'API Key',
        'ai.localStartCommand': 'Local Start Command',
        'ai.maxTokens': 'Max Tokens',
        'ai.timeoutMs': 'Timeout (ms)',
        'ai.debug': 'Debug',
        'ai.autoStartLocal': 'Auto Start Local',
        'ai.addOption': 'Add new value',
        'ai.removeOption': 'Remove selected value',
        'ai.providerReadOnly': 'Provider list is fixed and cannot be extended.',
        'ai.toggles': 'AI Toggles',
        'ai.providerOptions': 'Provider options',
        'ai.endpoint.prompt': 'AI endpoint URL',
        'ai.endpoint.validation': 'AI endpoint cannot be empty when provider is enabled',
        'ai.model.prompt': 'AI model name',
        'ai.model.validation': 'AI model cannot be empty when provider is enabled',
        'ai.debugExplainStart': 'Explain start: level={level}',
        'ai.debugReady': 'Ready in {elapsed}ms (provider={provider}, bootMs={bootMs})',
        'ai.debugSending': 'Sending to {endpoint} (tokens={tokens}, timeout={timeout}ms, promptLen={promptLen})',
        'ai.debugStreamFailed': 'Stream failed: {error}',
        'ai.debugException': 'Exception: {error}',
        'ai.debugTimers': 'Timers ready={ready}ms boot={boot}ms firstToken={firstToken}ms totalStream={totalStream}ms call={call}ms',
        'ai.debugReachabilityOk': 'Reachability ok in {elapsed}ms',
        'ai.debugLocalReachable': 'Local AI became reachable in {elapsed}ms after spawn attempt',
        'ai.debugSpawnFailed': 'Spawn failed: {error}',
        'ai.debugLocalNotReachable': 'Local AI not reachable after {elapsed}ms of retries',
        'ai.debugSpawningLocal': 'Spawning local AI: {cmd}',
        'ai.debugNonShellSpawnFailed': 'Non-shell spawn failed, retrying with shell: {error}',
        'ai.debugResponseStatus': 'Response status={status} len={len} text={text} body={body}',
        'ai.debugResponseParseFail': 'Response parse fail status={status} len={len} err={error} body={body}',
        'ai.debugPrefix': 'AI_DEBUG: {message}',
        'ai.apiKey.prompt': 'AI API key (optional)',
        'ai.localStartCommand.prompt': 'Local AI start command',
        'ai.localStartCommand.validation': 'Local start command cannot be empty',
        'ai.maxTokens.prompt': 'Maximum AI tokens',
        'ai.maxTokens.validation': 'Enter a positive integer greater than 0',
        'ai.timeoutMs.prompt': 'AI request timeout in milliseconds',
        'ai.timeoutMs.validation': 'Enter a number >= 1000',
        'ai.trueFalsePrompt': 'Choose true or false',
        'ai.settingUpdated': 'AI setting {key} updated to {value}',
        'ai.invalidConfigReverted': 'Invalid AI config detected and reverted to defaults.',
        'group.home': 'Tomcat Home', 'group.instancesTooltip': 'Running Tomcat server instances managed by the extension. Expand to view and control each instance.', 'group.browser': 'Browser',
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
        'ai.debugFirstStreamToken': 'First stream token in {ms}ms',
        'ai.debugFirstStreamTokenEndOfStream': 'First stream token in {ms}ms (end-of-stream)',
        'ai.debugStreamFinished': 'Stream finished in {ms}ms',
        'ai.streamStart': 'AI stream started',
        'ai.streamChunk': 'AI stream chunk: {chunk}',
        'ai.streamEnd': 'AI stream ended',
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
        'tomcat.stoppedProcess': 'Tomcat 已停止（进程已终止{context}）',
        'tomcat.stopped': 'Tomcat 已成功停止',
        'tomcat.stopFailed': 'Tomcat 停止失败：',
        'tomcat.reloaded': 'Tomcat 已重新加载',
        'tomcat.reloadAddingUser': '热重载失败，正在尝试添加管理员账号...',
        'tomcat.reloadedInstance': 'Tomcat 实例已重新加载：{app}，端口 {port}',
        'tomcat.stoppedInstance': 'Tomcat 实例已停止：{app}，端口 {port}',
        'tomcat.noInstanceForPort': '未发现端口 {port} 的托管 Tomcat 实例',
        'tomcat.noAppContext': '实例重载需要 App 上下文',
        'tomcat.reloadFailedNoInstance': '实例重载失败：{app} (端口 {port}) 未知或不存在',
        'tomcat.stopViaJavaFailed': 'Tomcat 停止命令失败，应用 {app}：{reason}',
        'tomcat.webappsMissing': '未找到 Webapps 目录：{path}',
        'tomcat.removedDirectory': '已删除目录：{path}',
        'tomcat.removedFile': '已删除文件：{path}',
        'tomcat.cleanedDirectory': '已清理并重新创建：{path}',
        'tomcat.cleaned': 'Tomcat 清理成功',
        'tomcat.appUndeployed': '已从 webapps 中删除应用目录：{app}',
        'tomcat.appWarRemoved': '已从 webapps 中删除 WAR：{app}',
        'tomcat.appUndeploySuccess': '应用 {app} 卸载成功',
        'tomcat.appUndeployFailed': '应用 {app} 卸载失败',
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
        'tomcat.portReleaseTimeout': '等待端口 {port} 释放超时',
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
        'builder.libDirCreated': '未找到 lib 源目录，已创建 {path}',
        'builder.buildCompleted': '{type} 构建完成，用时 {duration}ms',
        'builder.buildCompletedWithApp': '{type} 应用 {app} 在端口 {port} 构建完成，用时 {duration}ms',
        'builder.deployingAppAfterBuild': '构建输出已验证，正在重新加载端口 {port} 上的应用 {app}',
        'builder.startingTomcatAfterBuild': '构建输出已验证，正在启动应用 {app} 的 Tomcat 实例',
        'builder.buildFailed': '{type} 构建失败：',
        'builder.buildFailedWithApp': '{type} 应用 {app} 在端口 {port} 构建失败',
        'builder.newProjectPrompt': '未找到 Java EE 项目，是否创建新项目？',
        'builder.newProjectYes': '是',
        'builder.newProjectNo': '否',
        'builder.installJavaPack': '创建项目需要 Java Extension Pack',
        'builder.installExtension': '安装扩展',
        'builder.projectCreationFailed': '创建项目失败。请确认已安装并配置 Java Extension Pack。',
        'builder.openExtensions': '打开扩展视图',
        'builder.newProjectCreated': '已创建新的 Maven Web 应用项目',
        'builder.deployCanceled': '已取消 Tomcat 部署',
        'builder.deployInProgress': '部署正在进行中。请稍候。',
        'builder.deployInProgressApp': '应用 {app} 的部署正在进行中。',
        'builder.autoDeployError': '自动部署失败：{error}',
        'builder.autoDeploySuppressed': '由于最近的配置更改，自动部署已被抑制。',
        'builder.selectProject': '选择要部署的 Java EE 项目',
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
        'browser.revertToPrevious': '未找到浏览器 {choice}。已恢复为之前：{previous}。',
        'browser.revertToDisable': '未找到浏览器 {choice}。已恢复为“关闭”。',
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
        'group.instances': '实例',
        'group.instancesTooltip': '正在管理的 Tomcat 服务器实例。展开以查看每个实例的运行状态和操作。',
        'group.apps': '应用',
        'group.appsTooltip': '工作区中检测到的 Java Web 应用。展开以查看部署状态和控制项。',
        'group.additional': '额外设置',
        'group.settingsTooltip': '配置 Tomcat 工作区设置和默认值。',
        'group.aiTooltip': '查看和管理 AI 提供商设置。',
        'group.portTooltip': '部署使用的已配置 HTTP 端口列表。',
        'group.additionalTooltip': '用于高级配置的附加部署和 Tomcat 设置。',
        'ai.providerTooltip': '选择用于日志解释功能的 AI 提供商。',

        'config.logEncoding': '日志编码',
        'config.logEncoding.description': '用于读取 Tomcat 日志文件的编码（例如 utf8、utf16le）。请设置与 Tomcat 日志文件编码一致，避免出现乱码。',
        'config.showTimestamp': '显示时间戳',
        'config.showTimestamp.description': '启用后在输出面板中每条日志前显示时间戳，有助于分析事件时间线。',
        'config.autoReloadBrowser': '自动刷新浏览器',
        'config.autoReloadBrowser.description': '启用后部署成功后自动刷新浏览器选项卡，避免手动刷新。',
        'config.base': 'Tomcat 根目录',
        'config.base.description': 'Tomcat 基目录路径（CATALINA_BASE）。包含 conf、logs、webapps。若为空，则使用默认 Tomcat 主目录。',
        'config.javaHome': 'Java 主目录',
        'config.javaHome.description': '用于启动 Tomcat 的 JDK 安装路径。若为空，则尝试自动检测。',
        'config.home': 'Tomcat 路径',
        'config.home.description': 'Tomcat 安装路径。若为空，扩展会尝试查找有效路径。',
        'config.port': 'HTTP 端口',
        'config.port.description': 'Tomcat HTTP 监听端口（1024-49151）。',
        'config.browser': '浏览器',
        'config.browser.description': '打开应用或自动重载时使用的浏览器。',
        'config.language': '扩展语言',
        'config.language.description': '扩展界面语言（auto = 跟随 VS Code 语言）。',
        'config.language.enum.auto': '自动（系统语言）',
        'config.language.enum.en': 'English',
        'config.language.enum.zh': '简体中文',
        'config.language.tooltip.auto': '开发者的高级感：让工具跟你走，而不是你随它跑。',
        'config.language.tooltip.en': 'English 模式：面向全球，文档兼容，控制台风格更犀利。',
        'config.language.tooltip.zh': '中文模式：愿每一个汉字都成为你写码时的节奏和自豪。',
        'config.ai.provider.description': 'AI 提供商，用于日志解释。“local”启动本地 AI；其他值使用配置的端点。',
        'config.ai.endpoint.description': 'AI 日志解释请求的 HTTP 端点（例如 http://localhost:11434/api/chat）。',
        'config.ai.model.description': 'AI 模型名称或标识（例如 qwen2.5:7b）。',
        'config.ai.apiKey.description': '调用 AI 端点时的 Bearer 令牌/API 密钥。',
        'config.ai.localStartCommand.description': '当端点不可用时启动本地 AI 服务的命令。',
        'config.ai.maxTokens.description': 'AI 每次请求的最大 token 数，值越大可能成本越高。',
        'config.ai.timeoutMs.description': 'AI 请求超时时间（毫秒），防止请求挂起。',
        'config.ai.autoStartLocal.description': '端点不可用时是否自动启动本地 AI 服务。',
        'config.ai.base.description': '指定 AI 相关的 Tomcat 基目录路径（CATALINA_BASE），用于日志上下文绑定。',
        'config.ai.logEncoding.description': 'AI 日志解释功能使用的日志编码设置。',
        'config.ai.showTimestamp.description': 'AI 日志分析中是否显示时间戳。',
        'config.ai.autoReloadBrowser.description': 'AI 智能建议的自动刷新浏览器行为设置。',
        'config.logLevel': '日志级别',
        'config.logLevel.description': '显示最低日志级别（DEBUG/INFO/WARN/ERROR）。',
        'config.buildType': '构建类型',
        'config.buildType.description': '应用部署的默认构建策略。',
        'app.noAppsFound': '未找到 Java EE 应用',
        'app.status': '状态',
        'app.status.running': '正在运行',
        'app.status.stopped': '已停止',
        'home.version': '版本',
        'app.create.projectOverview': '项目概览',
        'app.create.templateLabel': '模板',
        'app.create.frontendLabel': '前端框架',
        'app.create.javaVersion': 'Java 版本',
        'app.create.tomcatVersion': 'Tomcat 版本',
        'app.create.nodeVersion': 'Node 版本',
        'app.create.npmVersion': 'NPM 版本',
        'app.create.platform': '平台',
        'app.create.quickStart': '快速开始',
        'app.create.quickStep1': '1. 使用 Maven/Gradle 构建项目',
        'app.create.quickStep2': '2. 使用 mvn spring-boot:run 或 Tomcat 工作流运行项目',
        'app.create.quickStep3': '3. 在浏览器打开 http://localhost:8080',
        'app.create.layout': '项目结构',
        'app.create.moreInfo': '更多信息',
        'app.create.informationLine1': '此模板包含最佳实践目录和初始代码片段。',
        'app.create.success': '已在 {path} 创建应用 {name}',
        'app.create.frontend.none': '无前端',
        'group.language': '语言',
        'group.languageTooltip': '为此工作区设置扩展显示语言。',
        'ai.debugResponseStatus': '响应状态：{status}，长度：{len}',
        'ai.debugResponseParseFail': '响应解析失败：状态={status}，长度={len}，错误={error}，正文={body}',
        'config.itemTooltip': '{label}：{value}',
        'ai.settingTooltip': '{title}：{value}',
        'optionItem.tooltip': '{value}',
        'ai.optionSettingTooltip': '{title}：{value}',
        'ai.listGroupTooltip': '设置并管理 {setting} 选项。',
        'ai.listValueTooltip': '为 {setting} 选择 {value}。',
        'instance.portTooltip': 'HTTP 端口 {port}（{status}）。',
        'app.create.template.javaee': 'Java EE Web 应用',
        'app.create.template.javaee.desc': '标准 Java EE Web 应用（servlet，JSP）。',
        'app.create.template.springboot': 'Spring Boot Web 应用',
        'app.create.template.springboot.desc': 'Spring Boot 入门应用，内嵌 Tomcat。',
        'app.create.template.struts2': 'Struts 2 Web 应用',
        'app.create.template.struts2.desc': 'Struts2 示例，包含 action 与 web.xml。',
        'app.create.template.jakartaee': 'Jakarta EE Web 应用',
        'app.create.template.jakartaee.desc': 'Jakarta EE Web 应用示例。',
        'app.create.nameRequired': '应用名称为必填项。',
        'app.create.pathExists': '路径已存在：{path}',
        'app.create.noValidJdk': '未找到有效 JAVA_HOME，生成应用可能无法编译。',
        'app.create.noValidTomcat': '未找到有效 Tomcat Home，请配置 Tomcat。',
        'tomcat.stopMultipleInstancesNotSupported': '由于存在多个托管实例，无法执行停止命令；请从树中停止一个实例。',
        'tomcat.noInstanceForApp': '未找到应用 {app} 的托管实例。',
        'tomcat.appUndeployBusy': '应用 {app} 正在卸载中，正在停止 Tomcat 实例并重试。',
        'tomcat.appUndeployForceCleanup': '应用 {app} 仍在卸载，停止后执行清理并刷新状态。',
        'tomcat.exitedWithCodeInstance': 'Tomcat 实例 {app} 在端口 {port} 退出，代码 {code}。',
        'builder.deployQueuedRestart': '正在重新运行队列中的部署（应用 {app}）。',
        'builder.deployAlreadyRunning': '应用 {app} 在上一次部署后已在运行，跳过排队重启。',
        'app.create.selectType': '选择 Java EE 应用模板',
        'app.create.maven': 'Maven Web 应用',
        'app.create.gradle': 'Gradle Web 应用',
        'app.create.springBoot': 'Spring Boot Web 应用',
        'app.create.custom': '自定义 Java EE 应用',
        'app.create.enterName': '输入应用名称',
        'app.create.selectLocation': '选择新应用的位置文件夹',
        'app.create.selectFrontend': '选择前端框架',
        'app.create.frontend.jsp': 'JSP',
        'app.create.frontend.thymeleaf': 'Thymeleaf',
        'app.create.frontend.react': 'React',
        'app.create.frontend.vue': 'Vue',
        'app.create.frontend.angular': 'Angular',
        'app.tooltip': 'Java EE 应用路径',

        'app.deploy': '部署应用',
        'app.openInBrowser': '在浏览器中打开应用',
        'instance.runningInstances': '运行中的实例（{count}）',
        'instance.addPort.prompt': '添加 HTTP 端口（1024-49151）',
        'instance.addPort.validation': '请输入 1024 到 49151 之间的端口号',
        'instance.removeActivePortWarn': '在删除活动端口前请切换到另一个端口。',
        'instance.removedPort': '已删除保存的端口 {port}。',
        'instance.buildTypeSet': '自动部署构建类型已设置为 {type}',
        'instance.logLevelSet': '日志级别已设置为 {level}',
        'instance.languageSet': '扩展语言已设置为 {language}',
        'group.buildType': '构建类型',
        'group.logLevel': '日志级别',
        'group.ai': 'AI',
        'group.settings': '设置',
        'ai.provider': '提供商',
        'ai.selectSettingValue': '选择 AI 设置值',
        'ai.endpoint': '端点',
        'ai.model': '模型',
        'ai.apiKey': 'API 密钥',
        'ai.localStartCommand': '本地启动命令',
        'ai.maxTokens': '最大 Tokens',
        'ai.timeoutMs': '超时 (毫秒)', 'ai.debug': '调试', 'ai.autoStartLocal': '自动启动本地 AI',
        'ai.addOption': '添加新值',
        'ai.removeOption': '删除当前值',
        'ai.providerReadOnly': '提供商列表固定，无法扩展。',
        'ai.logEncodingReadOnly': '日志编码列表只读；请直接从列表中选择。',
        'ai.toggles': 'AI 开关',
        'ai.providerOptions': '提供商选项',
        'ai.selectProvider': '选择 AI 提供商',
        'ai.endpoint.prompt': 'AI 端点 URL',
        'ai.endpoint.validation': '启用 AI 时端点不能为空',
        'ai.model.prompt': 'AI 模型名称',
        'ai.model.validation': '启用 AI 时模型不能为空',
        'ai.apiKey.prompt': 'AI API Key（可选）',
        'ai.debugExplainStart': '开始解释：级别={level}',
        'ai.debugReady': '就绪耗时 {elapsed} 毫秒（提供商={provider}，启动={bootMs} 毫秒）',
        'ai.debugSending': '发送到 {endpoint}（tokens={tokens}, 超时={timeout}ms, promptLen={promptLen}）',
        'ai.debugStreamFailed': '流式传输失败：{error}',
        'ai.debugException': '异常：{error}',
        'ai.debugTimers': '计时 ready={ready}ms boot={boot}ms firstToken={firstToken}ms totalStream={totalStream}ms call={call}ms',
        'ai.debugReachabilityOk': '可访问性正常，耗时 {elapsed}ms',
        'ai.debugLocalReachable': '本地 AI 在启动后 {elapsed}ms 可访问',
        'ai.debugSpawnFailed': '启动失败：{error}',
        'ai.debugLocalNotReachable': '本地 AI 在 {elapsed}ms 重试后仍不可访问',
        'ai.debugSpawningLocal': '正在启动本地 AI：{cmd}',
        'ai.debugNonShellSpawnFailed': '非 shell 启动失败，尝试使用 shell 重试：{error}',
        'ai.localStartCommand.prompt': '本地 AI 启动命令',
        'ai.localStartCommand.validation': '本地启动命令不能为空',
        'ai.maxTokens.prompt': 'AI 最大 token 数',
        'ai.maxTokens.validation': '请输入大于 0 的整数',
        'ai.timeoutMs.prompt': 'AI 请求超时时间（毫秒）',
        'ai.timeoutMs.validation': '请输入大于等于 1000 的数值',
        'ai.trueFalsePrompt': '请选择 True 或 False',
        'ai.settingUpdated': 'AI 设置 {key} 已更新为 {value}',
        'ai.invalidConfigReverted': '检测到无效的 AI 配置，已还原为默认值。',
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
        'instance.addCatalinaBase': '添加 CATALINA_BASE',
        'instance.catalinaBaseSet': 'CATALINA_BASE 设置为 {path}',
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
        'ai.debugFirstStreamToken': '首次流 token 用时 {ms}ms',
        'ai.debugFirstStreamTokenEndOfStream': '首次流 token 用时 {ms}ms（流结束）',
        'ai.debugStreamFinished': '流已完成，用时 {ms}ms',
        'ai.debugPrefix': 'AI_DEBUG：{message}',
        'ai.streamStart': 'AI 流开始',

        'ai.streamChunk': 'AI 流内容：{chunk}',
        'ai.streamEnd': 'AI 流结束',
        'browser.invalidDebugProtocolResponse': '无效的调试协议响应',
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
const reportedMissingKeys = new Set<string>();

function getAllLocales(): Locale[] {
    return ['en', 'zh-CN'];
}

function validateTranslationCoverage(): void {
    const baseKeys = Object.keys(translations.en) as Array<TranslationKey>;
    const missingList: Array<{ locale: Locale; key: string }> = [];

    for (const locale of getAllLocales()) {
        if (locale === 'en') { continue; }
        const localeStrings = (translations as Record<string, any>)[locale] || {};
        for (const key of baseKeys) {
            if (!(key in localeStrings)) {
                missingList.push({ locale, key });
            }
        }
    }

    if (missingList.length > 0) {
        const firstBlank = missingList.slice(0, 20).map((m) => `${m.locale}:${m.key}`).join(', ');
        const msg = `Tomcat i18n coverage error: missing keys (${missingList.length}) in other locales: ${firstBlank}${missingList.length > 20 ? ', ...' : ''}`;
        console.error(msg);
        vscode.window.showErrorMessage(msg);

        // do not throw, to avoid extension activation failure during exercises and debugging;
        // missing translations fallback to English at runtime.
    }
}

/**
 * Initialize localization state once per extension activation.
 *
 * Input: extension context for persistent global state.
 * Output: sets `currentLocale` and `initialized`.
 */
export function initializeLocalization(context: vscode.ExtensionContext): void {
    if (initialized) { return; }

    validateTranslationCoverage();

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

/**
 * Refresh locale setting from configuration without extension reload.
 *
 * Input: current workspace language setting
 * Output: updates `currentLocale`.
 */
export function refreshLocalization(): void {
    const cfg = vscode.workspace.getConfiguration('tomcat');
    const configured = cfg.get<LanguageSetting>('language', 'auto');
    currentLocale = resolveLocale(configured, detectLocale());
}

/**
 * Get current locale in use by the extension.
 *
 * If not initialized, resolves from configuration/default and detects environment.
 *
 * @returns {Locale}
 */
export function getCurrentLocale(): Locale {
    if (!initialized) {
        currentLocale = resolveLocale(
            vscode.workspace.getConfiguration('tomcat').get<LanguageSetting>('language', 'auto'),
            detectLocale()
        );
    }
    return currentLocale;
}

/**
 * Translate a key into a localized string with optional replacements.
 *
 * @param key Translation key
 * @param vars Optional replacement variables
 * @returns Localized string
 */
export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    const locale = getCurrentLocale();
    const localeStrings = (translations as Record<string, any>)[locale] || {};
    const template = localeStrings[key as string] ?? translations.en[key];

    if (template === undefined) {
        const missingContext = `${locale}:${key}`;
        if (!reportedMissingKeys.has(missingContext)) {
            reportedMissingKeys.add(missingContext);
            const msg = `Tomcat i18n missing key at runtime: ${missingContext}`;
            console.error(msg);
            vscode.window.showErrorMessage(msg);
        }
        return key;
    }

    return format(template, vars);
}

/**
 * Convert deploy mode to localized deploy label.
 *
 * @param mode DeployMode (Disable/On Save/On Shortcut)
 * @returns Localized string for UI
 */
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

/**
 * Convert build type to localized label.
 *
 * @param type BuildType (Local/Maven/Gradle)
 * @returns Localized build type name
 */
export function translateBuildType(type: BuildType): string {
    const keyMap: Record<BuildType, TranslationKey> = {
        'Local': 'buildType.local',
        'Maven': 'buildType.maven',
        'Gradle': 'buildType.gradle'
    };
    return t(keyMap[type]);
}

/**
 * Convert internal browser name to localized display name.
 *
 * @param browser BrowserName
 * @returns Localized browser name
 */
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

/**
 * Resolve configured language setting to supported locale, with fallback.
 *
 * @param setting The configured tomcat.language setting
 * @param fallback Detected locale fallback
 * @returns Locale ('en' or 'zh-CN')
 */
function resolveLocale(setting: LanguageSetting | undefined, fallback: Locale): Locale {
    if (setting === 'zh-CN') { return 'zh-CN'; }
    if (setting === 'en') { return 'en'; }
    return fallback;
}

/**
 * Detect locale from VS Code environment language.
 *
 * @returns Locale (defaults to 'en' unless zh- prefix)
 */
function detectLocale(): Locale {
    const language = (vscode.env.language || '').toLowerCase();
    if (language.startsWith('zh')) {
        return 'zh-CN';
    }
    return 'en';
}

/**
 * Interpolate variables into template placeholders.
 *
 * e.g. template 'Hello {name}' with vars {name:'Tom'} returns 'Hello Tom'.
 *
 * @param template String with placeholders {var}
 * @param vars Optional object map of replacements
 * @returns Interpolated string
 */
function format(template: string, vars?: Record<string, string | number>): string {
    if (!vars) { return template; }
    return Object.keys(vars).reduce((acc, key) => {
        const value = typeof vars[key] === 'number' ? String(vars[key]) : (vars[key] as string);
        return acc.replace(new RegExp(`\\{${key}\\}`, 'g'), value ?? '');
    }, template);
}
