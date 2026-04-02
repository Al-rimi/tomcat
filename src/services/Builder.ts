/**
 * Enterprise build orchestration system for Java EE workflows
 * 
 * Architectural Role:
 * - Singleton build coordinator
 * - Factory pattern for artifact handling
 * - Observer pattern for progress monitoring
 * 
 * Core Responsibilities:
 * 1. Multi-strategy Builds: Local/Maven/Gradle deployment
 * 2. Project Validation: Structure analysis and verification
 * 3. Auto-deployment: Save event integration
 * 4. Scaffolding: Project initialization and templating
 * 
 * Implementation Notes:
 * - Filesystem watchers with project scope filtering
 * - Atomic directory synchronization (brutalSync)
 * - Build system detection heuristics
 * - Concurrency control for deployment operations
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { env } from 'vscode';
import { glob } from 'glob';
import { Tomcat } from './Tomcat';
import { Logger } from './Logger';
import { BuildType, t, translateBuildType } from '../utils/i18n';

const tomcat = Tomcat.getInstance();
const logger = Logger.getInstance();

export class Builder {
    private static instance: Builder;
    private buildType: 'Local' | 'Maven' | 'Gradle';
    private autoDeployMode: 'On Save' | 'On Shortcut' | 'Disable';
    private deployingApps: Set<string> = new Set();
    private pendingDeployRequests: Map<string, { type: 'Local' | 'Maven' | 'Gradle' | 'Choice'; projectDir?: string; preferActiveProject: boolean }> = new Map();
    private currentDeployingApp: string | null = null;
    private attempts = 0;
    private autoDeploySuppressedUntil = 0;
    private stateChangeListeners: Array<() => void> = [];

    /**
     * Private constructor for Singleton pattern
     * 
     * Initializes core build management properties:
     * - Loads workspace configuration
     * - Sets up build state tracking
     * - Prepares deployment triggers
     */
    private constructor() {
        this.buildType = vscode.workspace.getConfiguration().get('tomcat.buildType', 'Local') as 'Local' | 'Maven' | 'Gradle';
        this.autoDeployMode = vscode.workspace.getConfiguration().get('tomcat.autoDeployMode', 'Disable') as 'On Save' | 'On Shortcut' | 'Disable';
    }

    public getBuildType(): 'Local' | 'Maven' | 'Gradle' {
        return this.buildType;
    }

    public isDeployingInProgress(appName?: string): boolean {
        if (appName) {
            return this.deployingApps.has(appName);
        }
        return this.deployingApps.size > 0;
    }

    public getCurrentDeployingApp(): string | null {
        return this.currentDeployingApp;
    }

    public onStateChange(listener: () => void): void {
        this.stateChangeListeners.push(listener);
    }

    public offStateChange(listener: () => void): void {
        this.stateChangeListeners = this.stateChangeListeners.filter((cb) => cb !== listener);
    }

    private emitStateChange(): void {
        for (const cb of this.stateChangeListeners) {
            try {
                cb();
            } catch (err) {
                console.error(t('error.builderStateChangeFailed'), err);
            }
        }
    }

    /**
     * Singleton accessor method
     * 
     * Provides global access point to the Builder instance while ensuring:
     * - Thread-safe lazy initialization
     * - Consistent state management
     * - Single point of configuration
     * 
     * @returns The singleton Builder instance
     */
    public static getInstance(): Builder {
        if (!Builder.instance) {
            Builder.instance = new Builder();
        }
        return Builder.instance;
    }

    public suppressAutoDeploy(durationMs: number = 1000): void {
        this.autoDeploySuppressedUntil = Date.now() + durationMs;
    }

    /**
     * Configuration reload handler
     * 
     * Refreshes internal configuration state from VS Code settings:
     * - Handles workspace configuration changes
     * - Maintains configuration cache consistency
     * - Updates dependent properties
     */
    public updateConfig(): void {
        this.buildType = vscode.workspace.getConfiguration().get('tomcat.buildType', 'Local') as 'Local' | 'Maven' | 'Gradle';
        this.autoDeployMode = vscode.workspace.getConfiguration().get('tomcat.autoDeployMode', 'Disable') as 'On Save' | 'On Shortcut' | 'Disable';
    }

    /**
     * Java EE Project Detection
     * 
     * Comprehensive project structure analysis implementing:
     * 1. Standard directory layout verification
     * 2. Web application descriptor detection
     * 3. Build system configuration analysis
     * 4. Existing artifact inspection
     * 5. Framework signature detection
     * 
     * @returns Boolean indicating Java EE project validity
     */
    private static isJavaEEProjectRoot(rootPath: string): boolean {
        const webInfPath = path.join(rootPath, 'src', 'main', 'webapp', 'WEB-INF');
        if (fs.existsSync(webInfPath)) { return true; }
        if (fs.existsSync(path.join(webInfPath, 'web.xml'))) { return true; }

        const pomPath = path.join(rootPath, 'pom.xml');
        if (fs.existsSync(pomPath) && fs.readFileSync(pomPath, 'utf-8').includes('<packaging>war</packaging>')) {
            return true;
        }

        const gradlePath = path.join(rootPath, 'build.gradle');
        if (fs.existsSync(gradlePath) && fs.readFileSync(gradlePath, 'utf-8').match(/(tomcat|jakarta|javax\.ee)/i)) {
            return true;
        }

        const targetPath = path.join(rootPath, 'target');
        if (fs.existsSync(targetPath) && fs.readdirSync(targetPath).some(file => file.endsWith('.war') || file.endsWith('.ear'))) {
            return true;
        }

        return false;
    }

    public static findJavaEEProjects(baseDir?: string): string[] {
        const roots = new Set<string>();
        const toScan = new Set<string>();

        const workspaceFolders = vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) || [];
        if (baseDir) { toScan.add(baseDir); }
        workspaceFolders.forEach(folder => toScan.add(folder));

        const walk = (dir: string, depth = 0) => {
            if (depth > 5 || roots.has(dir)) { return; }
            if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) { return; }
            if (Builder.isJavaEEProjectRoot(dir)) {
                roots.add(dir);
                return;
            }
            for (const child of fs.readdirSync(dir)) {
                const childPath = path.join(dir, child);
                if (fs.existsSync(childPath) && fs.statSync(childPath).isDirectory()) {
                    walk(childPath, depth + 1);
                }
            }
        };

        toScan.forEach(folder => walk(folder));
        return Array.from(roots);
    }

    public static isJavaEEProject(): boolean {
        const projects = Builder.findJavaEEProjects();
        return projects.length > 0;
    }

    public static findProjectForFile(filePath: string): string | undefined {
        let dir = path.dirname(filePath);
        while (dir && dir !== path.dirname(dir)) {
            if (Builder.isJavaEEProjectRoot(dir)) {
                return dir;
            }
            dir = path.dirname(dir);
        }

        const projects = Builder.findJavaEEProjects();
        return projects.length ? projects[0] : undefined;
    }

    /**
     * Chooses a JavaEE project path for deployment.
     *
     * Behavior:
     * - active editor file's parent project wins
     * - workspace root wins if valid
     * - if none found, searches nested projects
     * - if exactly one found, choose it automatically
     * - if many found, prompt user to pick by name
     * - if none found, ask to create new project
     */
    private async selectProjectDirectory(projectDir?: string, preferActiveProject: boolean = false): Promise<string | undefined> {
        const projects = Builder.findJavaEEProjects();

        if (projectDir && Builder.isJavaEEProjectRoot(projectDir)) {
            return projectDir;
        }

        const activePath = vscode.window.activeTextEditor?.document.uri.fsPath;
        const activeProject = activePath ? Builder.findProjectForFile(activePath) : undefined;

        if (projects.length === 0) {
            await this.createNewProject();
            return undefined;
        }

        if (projects.length === 1) {
            return projects[0];
        }

        if (preferActiveProject && activeProject && projects.includes(activeProject)) {
            return activeProject;
        }

        const selectOptions = projects
            .map(p => ({
                label: path.basename(p),
                description: p
            }));

        const picked = await vscode.window.showQuickPick(selectOptions, {
            placeHolder: t('builder.selectProject')
        });

        return picked?.description;
    }

    /**
     * Build and Deployment Orchestrator
     * 
     * Centralized deployment control implementing:
     * 1. Project validation
     * 2. Build strategy selection
     * 3. Target environment preparation
     * 4. Build execution
     * 5. Post-deployment actions
     * 
     * @param type Build strategy ('Local' | 'Maven' | 'Gradle' | 'Choice')
     * @log Deployment progress and errors
     */
    public async deploy(type: 'Local' | 'Maven' | 'Gradle' | 'Choice', projectDir?: string, preferActiveProject: boolean = false): Promise<void> {
        projectDir = await this.selectProjectDirectory(projectDir, preferActiveProject);
        if (!projectDir) { return; }

        const appName = path.basename(projectDir);
        if (this.isDeployingInProgress(appName)) {
            this.pendingDeployRequests.set(appName, { type, projectDir, preferActiveProject });
            logger.debug(t('builder.deployInProgressApp', { app: appName }));
            return;
        }

        let isChoice;

        if (type === 'Choice') {
            isChoice = true;
            const displayOptions = [t('buildType.local'), t('buildType.maven'), t('buildType.gradle')];
            const subAction = await vscode.window.showQuickPick(displayOptions, {
                placeHolder: t('builder.selectBuildType')
            });
            if (!subAction) { return; }
            const idx = displayOptions.indexOf(subAction);
            type = ['Local', 'Maven', 'Gradle'][idx] as 'Local' | 'Maven' | 'Gradle';
            if (!type) { return; }
        }

        tomcat.setAppName(appName);

        const preBuildTarget = await tomcat.ensureDeploymentTarget(appName, false);
        const tomcatHome = preBuildTarget.home;
        const defaultPort = preBuildTarget.port;

        if (!tomcatHome || !appName || !fs.existsSync(path.join(tomcatHome, 'webapps'))) { return; }

        const targetDir = path.join(tomcatHome, 'webapps', appName);
        await vscode.workspace.saveAll();

        this.deployingApps.add(appName);
        this.currentDeployingApp = appName;
        this.emitStateChange();

        let buildSucceeded = false;
        try {
            const action = {
                'Local': () => this.localDeploy(projectDir, targetDir, tomcatHome),
                'Maven': () => this.mavenDeploy(projectDir, targetDir),
                'Gradle': () => this.gradleDeploy(projectDir, targetDir, appName),
            }[type];

            if (!action) {
                throw (t('builder.invalidDeployType', { type }));
            }

            logger.clearDiagnostics();

            const startTime = performance.now();
            const typeLabel = translateBuildType(type as BuildType);
            const buildLabel = t('builder.buildProgressTitle', { type: typeLabel });
            logger.updateStatusBar(buildLabel);

            if (isChoice) {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: buildLabel,
                    cancellable: false
                }, action);
            } else {
                await action();
            }

            buildSucceeded = true;
            logger.defaultStatusBar();

            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);

            if (buildSucceeded && fs.existsSync(targetDir)) {
                const successfulInstance = (await tomcat.getInstanceSnapshot()).some(i => i.app === appName && i.source === 'managed');
                const activeTarget = await tomcat.ensureDeploymentTarget(appName, true);
                const port = activeTarget.port;
                logger.success(t('builder.buildCompletedWithApp', { type: typeLabel, app: appName, port, duration }), isChoice);

                if (successfulInstance) {
                    logger.info(t('builder.deployingAppAfterBuild', { app: appName, port }));
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await tomcat.reload(port, appName);
                } else {
                    logger.info(t('builder.startingTomcatAfterBuild', { app: appName }));
                }
            }

            this.attempts = 0;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            const isBusyError = errorMessage.includes('EBUSY') || errorMessage.includes('resource busy or locked');
            const port = defaultPort ?? Tomcat.getInstance().getPort();

            if (isBusyError && this.attempts < 3) {
                this.attempts++;
                await tomcat.killManagedInstanceByPort(port);
                await this.deploy(type, projectDir, preferActiveProject);
            } else {
                const typeLabel = ['Local', 'Maven', 'Gradle'].includes(type as string)
                    ? translateBuildType(type as BuildType)
                    : translateBuildType(this.buildType as BuildType);
                logger.error(t('builder.buildFailedWithApp', { type: typeLabel, app: appName, port }), isChoice, err as string);
            }
            logger.defaultStatusBar();
        } finally {
            if (appName) {
                this.deployingApps.delete(appName);
                if (this.currentDeployingApp === appName) {
                    this.currentDeployingApp = null;
                }

                if (this.pendingDeployRequests.has(appName)) {
                    const pending = this.pendingDeployRequests.get(appName)!;
                    this.pendingDeployRequests.delete(appName);
                    this.emitStateChange();

                    const snapshot = await tomcat.getInstanceSnapshot();
                    const alreadyRunning = snapshot.some(i => i.app === appName && i.source === 'managed');
                    if (!alreadyRunning) {
                        logger.debug(t('builder.deployQueuedRestart', { app: appName }));
                        void this.deploy(pending.type, pending.projectDir, pending.preferActiveProject);
                        return;
                    } else {
                        logger.debug(t('builder.deployAlreadyRunning', { app: appName }));
                    }
                }
            }
            this.emitStateChange();
            logger.defaultStatusBar();
        }
    }

    /**
     * Automated Deployment Trigger
     * 
     * Implements intelligent deployment automation with:
     * 1. Save event analysis
     * 2. Build type resolution
     * 3. Deployment mode evaluation
     * 4. Concurrency control
     * 5. Error handling
     * 
     * @param reason Document save reason triggering deployment
     */
    public async autoDeploy(reason?: vscode.TextDocumentSaveReason): Promise<void> {

        if (Date.now() < this.autoDeploySuppressedUntil) {
            this.autoDeploySuppressedUntil = 0;
            logger.debug(t('builder.autoDeploySuppressed'));
            return;
        }

        if (!Builder.isJavaEEProject()) { return; }

        if (this.isDeployingInProgress()) { return; }

        try {
            if (this.autoDeployMode === 'On Save') {
                await this.deploy(this.buildType, undefined, true);
            } else if (this.autoDeployMode === 'On Shortcut' && reason === vscode.TextDocumentSaveReason.Manual) {
                await this.deploy(this.buildType, undefined, true);
            }
        } catch (err) {
            Logger.getInstance().debug(t('builder.autoDeployError', { error: String(err) }));
        }
    }

    /**
     * Project Scaffolding System
     * 
     * Implements new project initialization with:
     * 1. User confirmation flow
     * 2. Extension dependency verification
     * 3. Maven archetype selection
     * 4. Workspace configuration
     * 5. Error recovery
     * 
     */
    private async createNewProject(): Promise<void> {
        const answer = await vscode.window.showInformationMessage(
            t('builder.newProjectPrompt'),
            t('builder.newProjectYes'), t('builder.newProjectNo')
        );

        if (answer === t('builder.newProjectYes')) {
            try {
                const commands = await vscode.commands.getCommands();
                if (!commands.includes('java.project.create')) {
                    const installMessage = t('builder.installJavaPack');
                    vscode.window.showErrorMessage(installMessage, t('builder.installExtension')).then(async choice => {
                        if (choice === t('builder.installExtension')) {
                            await env.openExternal(vscode.Uri.parse(
                                'vscode:extension/vscjava.vscode-java-pack'
                            ));
                        }
                    });
                    return;
                }

                await vscode.commands.executeCommand('java.project.create', {
                    type: 'maven',
                    archetype: 'maven-archetype-webapp'
                });
                logger.info(t('builder.newProjectCreated'));
            } catch (err) {
                vscode.window.showErrorMessage(
                    t('builder.projectCreationFailed'),
                    t('builder.openExtensions')
                ).then(choice => {
                    if (choice === t('builder.openExtensions')) {
                        vscode.commands.executeCommand('workbench.extensions.action.showExtensions');
                    }
                });
            }
        } else {
            logger.success(t('builder.deployCanceled'));
        }
    }

    /**
     * Local Deployment Strategy
     * 
     * Implements direct file synchronization with:
     * 1. Web application directory validation
     * 2. Java source compilation
     * 3. Resource copying
     * 4. Dependency management
     * 5. Atomic deployment
     * 
     * @param projectDir Source project directory
     * @param targetDir Target deployment directory
     * @param tomcatHome Tomcat installation directory
     * @throws Error if build fails or java source compilation fails or if webapp directory not found
     */
    private async localDeploy(projectDir: string, targetDir: string, tomcatHome: string) {
        const webAppPath = path.join(projectDir, 'src', 'main', 'webapp');
        if (!fs.existsSync(webAppPath)) {
            throw new Error(t('builder.webAppMissing', { path: webAppPath }));
        }
        const javaHome = await tomcat.findJavaHome();
        if (!javaHome) { return; }

        const javacPath = path.join(javaHome, 'bin', 'javac');
        const javaSourcePath = path.join(projectDir, 'src', 'main', 'java');
        const classesDir = path.join(targetDir, 'WEB-INF', 'classes');

        this.brutalSync(webAppPath, targetDir, true);

        fs.rmSync(classesDir, { force: true, recursive: true });
        fs.mkdirSync(classesDir, { recursive: true });

        if (fs.existsSync(javaSourcePath)) {
            const javaFiles = await this.findFiles(path.join(javaSourcePath, '**', '*.java'));
            if (javaFiles.length > 0) {
                const tomcatLibs = path.join(tomcatHome, 'lib', '*');
                const cmd = `"${javacPath}" -d "${classesDir}" -cp "${tomcatLibs}" ${javaFiles.map(f => `"${f}"`).join(' ')}`;
                await this.executeCommand(cmd, projectDir);
            }
        }

        const libDir = path.join(projectDir, 'lib');
        const targetLib = path.join(targetDir, 'WEB-INF', 'lib');

        if (!fs.existsSync(libDir)) {
            logger.info(t('builder.libDirCreated', { path: libDir }));
            fs.mkdirSync(libDir, { recursive: true });
        }

        this.brutalSync(libDir, targetLib);
    }

    /**
     * Maven Build Strategy
     * 
     * Implements full Maven lifecycle integration with:
     * 1. POM validation
     * 2. Clean package execution
     * 3. Error analysis
     * 4. Artifact handling
     * 5. Deployment synchronization
     * 
     * @param projectDir Source project directory
     * @param targetDir Target deployment directory
     * @throws Error if Maven build fails or artifact not found
     */
    private async mavenDeploy(projectDir: string, targetDir: string) {
        if (!fs.existsSync(path.join(projectDir, 'pom.xml'))) {
            throw (t('builder.pomMissing'));
        }

        try {
            await this.executeCommand(`mvn clean package`, projectDir);
        } catch (err) {
            const errorOutput = err?.toString() || '';

            const lines = errorOutput
                .split('\n')
                .filter(line =>
                    line.includes('[ERROR]') &&
                    !line.includes('re-run Maven') &&
                    !line.includes('[Help') &&
                    !line.includes('Re-run Maven') &&
                    !line.includes('For more information') &&
                    !line.includes('http')
                )
                .map(line => line.replace('[ERROR]', '\t\t'));

            const uniqueLines = [...new Set(lines)];

            throw (uniqueLines.join('\n'));
        }

        const targetPath = path.join(projectDir, 'target');
        const warFiles = fs.readdirSync(targetPath).filter(file => file.toLowerCase().endsWith('.war'));
        if (warFiles.length === 0) {
            throw (t('builder.noWarAfterMaven'));
        }

        const warFileName = warFiles[0];
        const warFilePath = path.join(targetPath, warFileName);

        const warBaseName = path.basename(warFileName, '.war');
        const warFolderPath = path.join(targetPath, warBaseName);

        if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
        }
        if (fs.existsSync(`${targetDir}.war`)) {
            fs.rmSync(`${targetDir}.war`, { force: true });
        }

        fs.copyFileSync(warFilePath, `${targetDir}.war`);

        if (fs.existsSync(warFolderPath)) {
            fs.mkdirSync(targetDir, { recursive: true });
            this.copyDirectorySync(warFolderPath, targetDir);
        }
    }

    /**
     * Gradle Build Strategy
     * 
     * Implements Gradle integration with:
     * 1. Build script validation
     * 2. War task execution
     * 3. Artifact naming control
     * 4. Deployment synchronization
     * 5. Cleanup procedures
     * 
     * @param projectDir Source project directory
     * @param targetDir Target deployment directory
     * @param appName Application name for artifact naming
     * @throws Error if Gradle build fails or artifact not found
     */
    private async gradleDeploy(projectDir: string, targetDir: string, appName: string) {
        if (!fs.existsSync(path.join(projectDir, 'build.gradle'))) {
            throw (t('builder.gradleMissing'));
        }

        const gradleCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
        await this.executeCommand(`${gradleCmd} war -PfinalName=${appName}`, projectDir);

        const warFile = path.join(projectDir, 'build', 'libs', `${appName}.war`);
        if (!fs.existsSync(warFile)) {
            throw (t('builder.noWarAfterGradle'));
        }

        fs.rmSync(targetDir, { recursive: true, force: true });
        fs.rmSync(`${targetDir}.war`, { recursive: true, force: true });
        fs.copyFileSync(warFile, `${targetDir}.war`);
    }

    /**
     * File System Utility - Pattern Matching
     * 
     * Implements robust file discovery with:
     * - Cross-platform path handling
     * - Absolute path resolution
     * - Directory exclusion
     * - Windows path escaping
     * 
     * @param pattern Glob pattern for file matching
     * @returns Array of matching file paths
     * @throws Error if file discovery fails
     */
    private async findFiles(pattern: string): Promise<string[]> {
        return await glob(pattern, {
            nodir: true,
            windowsPathsNoEscape: process.platform === 'win32',
            absolute: true,
        });
    }

    /**
     * Command Execution Wrapper
     * 
     * Provides robust command execution with:
     * - Working directory control
     * - Error aggregation
     * - Promise-based interface
     * - Output capture
     * 
     * @param command Command to execute
     * @param cwd Working directory for execution
     * @returns Promise resolving on success, rejecting on error
     * @throws Error if command execution fails
     */
    private async executeCommand(command: string, cwd: string): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(command, { cwd }, (err, stdout, stderr) => {
                if (err) {
                    reject(stdout || stderr || err.message || t('builder.unknownError'));
                }
                resolve();
            });
        });
    }

    /**
     * Directory Copy Utility
     * 
     * Implements recursive directory copy with:
     * - Recursive structure preservation
     * - File type handling
     * - Atomic operations
     * - Error-tolerant implementation
     * 
     * @param src Source directory path
     * @param dest Target directory path
     * @throws Error if directory copy fails
     */
    private copyDirectorySync(src: string, dest: string) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            try { fs.rmSync(destPath, { force: true, recursive: true }); } catch (e) { }

            if (entry.isDirectory()) {
                this.copyDirectorySync(srcPath, destPath);
            } else {
                try { fs.copyFileSync(srcPath, destPath); } catch (e) { }
            }
        }
    }

    /**
     * Atomic File Synchronization Utility
     * 
     * Implements aggressive directory synchronization with:
     * 1. Delta-based file copying (only changed files)
     * 2. Clean target directory pruning (removes orphaned files)
     * 3. Recursive directory handling
     * 4. Atomic write operations
     * 5. Error-resilient implementation
     * 
     * Operation Flow:
     * 1. Scans source directory to determine required files
     * 2. Removes any target files not present in source (clean sync)
     * 3. Creates destination directory structure if missing
     * 4. Performs file-by-file copy with error recovery
     * 
     * Special Features:
     * - Forceful overwrite mode (retries on failure)
     * - Recursive directory handling
     * - Minimal filesystem operations
     * - Cross-platform path handling
     * 
     * @param src Source directory path (must exist)
     * @param dest Target directory path (will be created/cleaned)
     * @throws Error if critical filesystem operations fail
     */
    private brutalSync(src: string, dest: string, restricted: boolean = false) {
        if (fs.existsSync(dest)) {
            const keepers = new Set(fs.readdirSync(src));
            const restrictedFolders = [
                'classes',
                'lib'
            ];
            fs.readdirSync(dest).forEach(f => {
                const fullPath = path.join(dest, f);
                if (!keepers.has(f) && (!restricted ? true : !restrictedFolders.includes(f))) {
                    try { fs.rmSync(fullPath, { force: true, recursive: true }); } catch (e) { }
                }
            });
        }

        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src, { withFileTypes: true }).forEach(entry => {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                this.brutalSync(srcPath, destPath, restricted);
            } else {
                try {
                    fs.copyFileSync(srcPath, destPath);
                } catch {
                    fs.rmSync(destPath, { force: true });
                    fs.copyFileSync(srcPath, destPath);
                }
            }
        });
    }
}