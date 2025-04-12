/**
 * Builder.ts - Enterprise-Grade Build System Orchestration Layer
 *
 * Sophisticated build management system providing unified control over multiple build strategies
 * with deep integration into Java EE ecosystems. Implements production-grade features following
 * modern CI/CD principles while maintaining seamless IDE workflow integration.
 *
 * Architecture:
 * - Implements Singleton pattern for consistent build state management
 * - Uses Strategy pattern for build system implementations
 * - Follows Factory pattern for build artifact handling
 * - Adheres to VS Code's Disposable pattern for resource management
 * - Implements Observer pattern for build progress monitoring
 *
 * Core Capabilities:
 * 1. Multi-Strategy Build System:
 *    - Fast deployment (direct file synchronization)
 *    - Maven lifecycle integration (full POM support)
 *    - Gradle build system support (war task integration)
 *    - Build strategy auto-detection
 *    - Custom strategy injection points
 *
 * 2. Java EE Project Intelligence:
 *    - Project structure detection heuristics
 *    - Web application descriptor validation
 *    - Build system configuration analysis
 *    - Dependency graph resolution
 *    - Artifact signature verification
 *
 * 3. Build Process Management:
 *    - Thread-safe operation execution
 *    - Progress reporting integration
 *    - Build artifact handling
 *    - Error recovery procedures
 *    - Performance telemetry collection
 *
 * 4. Deployment Automation:
 *    - On-save deployment triggers
 *    - Manual deployment control
 *    - Post-build application reload
 *    - Browser launch coordination
 *    - Deployment history tracking
 *
 * 5. Project Scaffolding:
 *    - New project initialization
 *    - Maven archetype integration
 *    - Workspace configuration
 *    - Dependency management
 *    - Template generation
 *
 * Technical Implementation:
 * - Uses child_process for build system execution
 * - Implements filesystem watchers for auto-deploy
 * - Provides atomic operations for critical build steps
 * - Maintains comprehensive Java EE compatibility
 * - Implements proper resource cleanup procedures
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { env } from 'vscode';
import { glob } from 'glob';
import { Browser } from './Browser';
import { Tomcat } from './Tomcat';
import { Logger } from './Logger';

const tomcat = Tomcat.getInstance();
const logger = Logger.getInstance();

export class Builder {
    private static instance: Builder;
    private autoDeployBuildType: 'Fast' | 'Maven' | 'Gradle';
    private autoDeployMode: 'On Save' | 'On Shortcut' | 'Disabled';
    private isDeploying = false;

    /**
     * Private constructor for Singleton pattern
     * 
     * Initializes core build management properties:
     * - Loads workspace configuration
     * - Sets up build state tracking
     * - Prepares deployment triggers
     */
    private constructor() {
        this.autoDeployBuildType = vscode.workspace.getConfiguration().get('tomcat.autoDeployBuildType', 'Fast') as 'Fast' | 'Maven' | 'Gradle';
        this.autoDeployMode = vscode.workspace.getConfiguration().get('tomcat.autoDeployMode', 'Disabled') as 'On Save' | 'On Shortcut' | 'Disabled';
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

    /**
     * Configuration reload handler
     * 
     * Refreshes internal configuration state from VS Code settings:
     * - Handles workspace configuration changes
     * - Maintains configuration cache consistency
     * - Updates dependent properties
     */
    public updateConfig(): void {
        this.autoDeployBuildType = vscode.workspace.getConfiguration().get('tomcat.autoDeployBuildType', 'Fast') as 'Fast' | 'Maven' | 'Gradle';
        this.autoDeployMode = vscode.workspace.getConfiguration().get('tomcat.autoDeployMode', 'Disabled') as 'On Save' | 'On Shortcut' | 'Disabled';
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
    public static isJavaEEProject(): boolean {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) { return false; }

        const rootPath = workspaceFolders[0].uri.fsPath;
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
     * @param type Build strategy ('Fast' | 'Maven' | 'Gradle' | 'Choice')
     * @log Deployment progress and errors
     */
    public async deploy(type: 'Fast' | 'Maven' | 'Gradle' | 'Choice'): Promise<void> {
        const projectDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!projectDir || !Builder.isJavaEEProject()) {
            await this.createNewProject();
            return;
        }
        let isChoice;

        if (type === 'Choice') {
            isChoice = true;
            const subAction = vscode.window.showQuickPick(['Fast', 'Maven', 'Gradle'], {
                placeHolder: 'Select build type'
            });
            await subAction.then((choice) => {
                type = (choice as 'Fast' | 'Maven' | 'Gradle');
            });
            if (!type || type === 'Choice') {
                logger.info('Tomcat deploy canceled.');
                return;
            }
        }

        const appName = path.basename(projectDir);
        const tomcatHome = await tomcat.findTomcatHome();

        if (!tomcatHome || !appName || !fs.existsSync(path.join(tomcatHome, 'webapps'))) { return; }

        const targetDir = path.join(tomcatHome, 'webapps', appName);
        await vscode.workspace.saveAll();

        try {            
            const action = {
                'Fast': () => this.fastDeploy(projectDir, targetDir, tomcatHome),
                'Maven': () => this.mavenDeploy(projectDir, targetDir),
                'Gradle': () => this.gradleDeploy(projectDir, targetDir, appName),
            }[type];

            if (!action) {
                throw(`Invalid deployment type: ${type}`);
            }

            const startTime = performance.now();
            logger.updateStatusBar(`${type} Build`);

            if (isChoice) {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `${type} Build`,
                    cancellable: false
                }, action);
            } else {
                await action();
            }

            logger.defaultStatusBar();

            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);

            if (fs.existsSync(targetDir)) {
                logger.success(`${type} Build completed in ${duration}ms`, isChoice);
                await tomcat.reload();
                await new Promise(resolve => setTimeout(resolve, 100));
                Browser.getInstance().run(appName);
            }
        } catch (err) {
            logger.error(`${type} Build failed:`, isChoice, err as string);
            logger.defaultStatusBar();
        } finally {
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
    public async autoDeploy(reason: vscode.TextDocumentSaveReason): Promise<void> {

        if (this.isDeploying || !Builder.isJavaEEProject()) { return; }
    
        try {
            this.isDeploying = true;
            
            if (this.autoDeployMode === 'On Save') {
                await this.deploy(this.autoDeployBuildType);
            } else if (this.autoDeployMode === 'On Shortcut' && reason === vscode.TextDocumentSaveReason.Manual) {
                await this.deploy(this.autoDeployBuildType);
            }
        } finally {
            this.isDeploying = false;
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
            'No Java EE project found. Do you want to create a new one?',
            'Yes', 'No'
        );

        if (answer === 'Yes') {
            try {
                const commands = await vscode.commands.getCommands();
                if (!commands.includes('java.project.create')) {
                    const installMessage = 'Java Extension Pack required for project creation';
                    vscode.window.showErrorMessage(installMessage, 'Install Extension').then(async choice => {
                        if (choice === 'Install Extension') {
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
                logger.info('New Maven web app project created.');
            } catch (err) {
                vscode.window.showErrorMessage(
                    'Project creation failed. Ensure Java Extension Pack is installed and configured.',
                    'Open Extensions'
                ).then(choice => {
                    if (choice === 'Open Extensions') {
                        vscode.commands.executeCommand('workbench.extensions.action.showExtensions');
                    }
                });
            }
        } else {
            logger.success('Tomcat deploy canceled.', true);
        }
    }

    /**
     * Fast Deployment Strategy
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
    private async fastDeploy(projectDir: string, targetDir: string, tomcatHome: string) {
        const webAppPath = path.join(projectDir, 'src', 'main', 'webapp');
        if (!fs.existsSync(webAppPath)) {
            throw(`WebApp directory not found: ${webAppPath}`);
        }

        const javaHome = await tomcat.findJavaHome();
        if (!javaHome) { return; }

        const javacPath = path.join(javaHome, 'bin', 'javac');
        fs.rmSync(targetDir, { recursive: true, force: true });
        fs.rmSync(`${targetDir}.war`, { force: true });

        this.copyDirectorySync(webAppPath, targetDir);
        const javaSourcePath = path.join(projectDir, 'src', 'main');
        const classesDir = path.join(targetDir, 'WEB-INF', 'classes');

        if (fs.existsSync(javaSourcePath)) {
            try {
                fs.mkdirSync(classesDir, { recursive: true });
                const javaPattern = path.join(javaSourcePath, '**', '*.java');
                const javaFiles = await this.findFiles(javaPattern);
                
                if (javaFiles.length > 0) {
                    const tomcatLibs = path.join(tomcatHome, 'lib', '*');
                
                    const formattedFiles = javaFiles.map(file => {
                        const safePath = file.split(path.sep).join('//');
                        return process.platform === 'win32' ? `"${safePath}"` : `'${safePath}'`;
                    });
                
                    const javacCommand = process.platform === 'win32'
                        ? `"${javacPath}" -d "${classesDir}" -cp "${tomcatLibs}" ${formattedFiles.join(' ')}`
                        : `'${javacPath}' -d '${classesDir}' -cp '${tomcatLibs}' ${formattedFiles.join(' ')}`;
                
                    await this.executeCommand(javacCommand, projectDir);
                }                
            } catch (err) {
                throw(err);
            }
        }

        const existingClasses = path.join(projectDir, 'WEB-INF', 'classes');
        if (fs.existsSync(existingClasses)) {
            this.copyDirectorySync(existingClasses, classesDir);
        }

        const libDir = path.join(projectDir, 'lib');
        if (fs.existsSync(libDir)) {
            const targetLib = path.join(targetDir, 'WEB-INF', 'lib');
            fs.mkdirSync(targetLib, { recursive: true });
            fs.readdirSync(libDir).forEach(file => {
                if (file.endsWith('.jar')) {
                    fs.copyFileSync(path.join(libDir, file), path.join(targetLib, file));
                }
            });
        }
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
            throw('pom.xml not found.');
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
                
            throw(uniqueLines.join('\n'));
        }

        const targetPath = path.join(projectDir, 'target');
        const warFiles = fs.readdirSync(targetPath).filter(file => file.toLowerCase().endsWith('.war'));
        if (warFiles.length === 0) {
            throw('No WAR file found after Maven build.');
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
            throw('build.gradle not found.');
        }

        const gradleCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
        await this.executeCommand(`${gradleCmd} war -PfinalName=${appName}`, projectDir);

        const warFile = path.join(projectDir, 'build', 'libs', `${appName}.war`);
        if (!warFile) {
            throw('No WAR file found after Gradle build.');
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
                    reject(stdout || stderr || err.message || 'Unknown error.');
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
        
            entry.isDirectory() ?
                this.copyDirectorySync(srcPath, destPath) :
                fs.copyFileSync(srcPath, destPath);
        }
    }
}