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
    private config: vscode.WorkspaceConfiguration;
    private isDeploying = false;

    private constructor() {
        this.config = vscode.workspace.getConfiguration('tomcat');
    }

    public static getInstance(): Builder {
        if (!Builder.instance) {
            Builder.instance = new Builder();
        }
        return Builder.instance;
    }

    public updateConfig(): void {
        this.config = vscode.workspace.getConfiguration('tomcat');
    }

    public static isJavaEEProject(): boolean {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {return false;}

        const rootPath = workspaceFolders[0].uri.fsPath;
        const webInfPath = path.join(rootPath, 'src', 'main', 'webapp', 'WEB-INF');
        
        if (fs.existsSync(webInfPath)) {return true;}
        if (fs.existsSync(path.join(webInfPath, 'web.xml'))) {return true;}

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
            if (type === 'Choice') {
                logger.info('Tomcat deploy canceled.');
                return;
            }
        }

        const appName = path.basename(projectDir);
        const tomcatHome = await tomcat.findTomcatHome();

        if (!tomcatHome || !appName || !fs.existsSync(path.join(tomcatHome, 'webapps'))) {return;}

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
                if (isChoice) {
                    logger.success(`${type} Build completed in ${duration}ms`);
                } else {
                    logger.info(`${type} Build completed in ${duration}ms`);
                }
                await tomcat.reload();
                await new Promise(resolve => setTimeout(resolve, 60));
                Browser.getInstance().run(appName);
            }
        } catch (err) {
            logger.error(`${type} Build failed:\n${err}`);
            logger.defaultStatusBar();
        } finally {
            logger.defaultStatusBar();
        }
    }

    public async autoDeploy(reason: vscode.TextDocumentSaveReason): Promise<void> {
        const defaultBuildType = this.config.get<string>('defaultBuildType', 'Fast') as 'Fast' | 'Maven' | 'Gradle';
        const defaultDeployMode = this.config.get<string>('defaultDeployMode', 'Disabled');

        if (this.isDeploying || !Builder.isJavaEEProject()) {return;}
    
        try {
            this.isDeploying = true;
            
            if (defaultDeployMode === 'On Save') {
                await this.deploy(defaultBuildType);
            } else if (defaultDeployMode === 'On Shortcut' && reason === vscode.TextDocumentSaveReason.Manual) {
                await this.deploy(defaultBuildType);
            }
        } finally {
            this.isDeploying = false;
        }
    }
    
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
                logger.info('New Maven web app project created');
            } catch (err) {
                logger.error('Failed to create new project:', err as Error);
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
            logger.success('Tomcat deploy canceled.');
        }
    }

    private async fastDeploy(projectDir: string, targetDir: string, tomcatHome: string) {
        const webAppPath = path.join(projectDir, 'src', 'main', 'webapp');
        if (!fs.existsSync(webAppPath)) {
            throw(`WebApp directory not found: ${webAppPath}`);
        }

        const javaHome = await tomcat.findJavaHome();
        if (!javaHome) {return;}

        const javacPath = path.join(javaHome, 'bin', 'javac');
        fs.rmSync(targetDir, { recursive: true, force: true });
        fs.rmSync(`${targetDir}.war`, { force: true });

        this.copyDirectorySync(webAppPath, targetDir);
        const javaSourcePath = path.join(projectDir, 'src');
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

    private async findFiles(pattern: string): Promise<string[]> {
        return await glob(pattern, {
            nodir: true,
            windowsPathsNoEscape: process.platform === 'win32',
            absolute: true,
        });
    }

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