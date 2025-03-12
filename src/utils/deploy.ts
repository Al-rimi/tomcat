import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import path from 'path';
import { tomcat, findTomcatHome } from './tomcat';
import { runBrowser } from './browser';
import { error, info, done } from './logger';
import { defaultStatusBar, updateStatusBar } from '../extension';

let autoDeployDisposables: vscode.Disposable[] = [];

export function isJavaEEProject(): boolean {
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


export async function cleanOldDeployments(): Promise<void> {
    const tomcatHome = await findTomcatHome();
    if (!tomcatHome) { return; }

    const appName = path.basename(process.cwd());
    const targetDir = path.join(tomcatHome, 'webapps', appName);

    if (fs.existsSync(`${targetDir}.war`)) {
        fs.unlinkSync(`${targetDir}.war`);
        info('Old deployment file deleted');
    }

    if (fs.existsSync(targetDir)) {
        fs.rmdirSync(targetDir, { recursive: true });
        info('Old deployment directory deleted');
    }
}

export async function deploy(type: 'Fast' | 'Maven' | 'Gradle'): Promise<void> {
    const projectDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!projectDir || !await isJavaEEProject()) {
        await createNewProject();
        return;
    }

    const appName = path.basename(projectDir);
    const tomcatHome = await findTomcatHome();
    if (!tomcatHome) { return; }

    updateStatusBar(type);
    await vscode.workspace.saveAll();

    try {
        await cleanOldDeployments();
        
        if (type === 'Fast') {
            await fastDeploy(projectDir, tomcatHome, appName);
        } else if (type === 'Maven') {
            await mavenDeploy(projectDir, tomcatHome);
        } else if (type === 'Gradle') {
            await gradleDeploy(projectDir, tomcatHome);
        } else {
            error('Invalid deployment type.');
            return;
        }

        info('Deployment completed');
        await tomcat('reload');        
        runBrowser(appName);
    } catch (err) {
        error(`Deployment failed: ${(err instanceof Error) ? err.message : 'Unknown error'}`);
    } finally {
        defaultStatusBar();
    }
}

export async function registerAutoDeploy(context: vscode.ExtensionContext): Promise<void> {
    let isDeploying = false;

    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(async (event) => {
        if (event.affectsConfiguration('tomcat.defaultDeployMood') || event.affectsConfiguration('tomcat.defaultBuildType')) {
            info('Configuration changed, reloading Auto Deploy settings');
            await updateAutoDeploy();
        }
    });

    context.subscriptions.push(configChangeDisposable);

    async function updateAutoDeploy(): Promise<void> {
        const config = vscode.workspace.getConfiguration('tomcat');
        const defaultBuildType = config.get<string>('defaultBuildType', 'Fast') as 'Fast' | 'Maven' | 'Gradle';
        let defaultDeployMood = config.get<string>('defaultDeployMood', 'Disabled');

        if (!await isJavaEEProject()) { defaultDeployMood = 'Disabled'; }

        if (defaultDeployMood !== 'Disabled') {
            autoDeployDisposables.forEach(disposable => disposable.dispose());
            autoDeployDisposables = [];

            if (defaultDeployMood === 'On Save') {
                const saveDisposable = vscode.workspace.onDidSaveTextDocument(async (document) => {
                    if (isDeploying) { return; }
                    isDeploying = true;
                    await deploy(defaultBuildType);
                    info('Deploy On Save');
                    isDeploying = false;
                });

                autoDeployDisposables.push(saveDisposable);
                context.subscriptions.push(saveDisposable);
            }
        }

        const ShortcutDisposable = vscode.commands.registerCommand('tomcat.deployOnShortcut', async () => {
            if (isDeploying) { return; }
            isDeploying = true;

            const editor = vscode.window.activeTextEditor;
            if (editor) { 
                await editor.document.save();
                if (defaultDeployMood === 'On Shortcut' || defaultDeployMood === 'On Save') {
                    await deploy(defaultBuildType);
                    info('Deploy triggered by Ctrl+S');
                }
            }
            isDeploying = false;
        });

        autoDeployDisposables.push(ShortcutDisposable);
        context.subscriptions.push(ShortcutDisposable);
    }

    await updateAutoDeploy();
}

async function createNewProject(): Promise<void> {
    const answer = await vscode.window.showInformationMessage(
        'No Java EE project found. Do you want to create a new one?',
        'Yes',
        'No'
    );

    if (answer === 'Yes') {
        try {
            await vscode.commands.executeCommand('java.project.create', {
                type: 'maven',
                archetype: 'maven-archetype-webapp'
            });
            info('New Maven web app project created');
        } catch (err) {
            error(`Failed to create new project: ${err}`);
        }
        return;
    } else {
        done('Tomcat deploy canceled.');
        return;
    }
}

async function fastDeploy(projectDir: string, tomcatHome: string, appName: string) {
    const targetDir = path.join(tomcatHome, 'webapps', appName);

    const webAppPath = path.join(projectDir, 'src', 'main', 'webapp');
    if (!fs.existsSync(webAppPath)) {
        throw new Error(`WebApp directory not found: ${webAppPath}`);
    }

    fs.mkdirSync(targetDir, { recursive: true });
    fs.cpSync(webAppPath, targetDir, { recursive: true });

    const classesPath = path.join(projectDir, 'WEB-INF', 'classes');
    if (fs.existsSync(classesPath)) {
        fs.cpSync(classesPath, path.join(targetDir, 'WEB-INF', 'classes'), { recursive: true });
    }
}

async function mavenDeploy(projectDir: string, tomcatHome: string) {
    if (!fs.existsSync(path.join(projectDir, 'pom.xml'))) {
        throw new Error('pom.xml not found.');
    }

    await executeCommand('mvn clean package', projectDir);

    const warFile = findWarFile(projectDir);
    if (!warFile) {
        throw new Error('No WAR file found after Maven build.');
    }

    fs.copyFileSync(warFile, path.join(tomcatHome, 'webapps', path.basename(warFile)));
}

async function gradleDeploy(projectDir: string, tomcatHome: string) {
    if (!fs.existsSync(path.join(projectDir, 'build.gradle'))) {
        throw new Error('build.gradle not found.');
    }

    await executeCommand('./gradlew build', projectDir);

    const warFile = findWarFile(projectDir);
    if (!warFile) {
        throw new Error('No WAR file found after Gradle build.');
    }

    fs.copyFileSync(warFile, path.join(tomcatHome, 'webapps', path.basename(warFile)));
}

async function executeCommand(command: string, cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
        exec(command, { cwd }, (err, stdout, stderr) => {
            if (err) {
                error(`Command failed: ${command}\n${stderr || stdout || 'Unknown error'}`);
                reject(new Error(stderr || stdout || 'Unknown error.'));
                return;
            }
            resolve();
        });
    });
}

function findWarFile(projectDir: string): string | null {
    const targetDir = path.join(projectDir, 'target');
    if (!fs.existsSync(targetDir)) { return null; }

    return fs.readdirSync(targetDir).find(file => file.endsWith('.war')) 
        ? path.join(targetDir, fs.readdirSync(targetDir).find(file => file.endsWith('.war'))!)
        : null;
}
