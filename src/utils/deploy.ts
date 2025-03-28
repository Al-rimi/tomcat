import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { env } from 'vscode';
import { glob } from 'glob';
import { tomcat, findTomcatHome, findJavaHome } from './tomcat';
import { defaultStatusBar, updateStatusBar } from '../extension';
import { error, info, success } from './logger';
import { runBrowser } from './browser';

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

export async function deploy(type: 'Fast' | 'Maven' | 'Gradle'): Promise<void> {
    const projectDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!projectDir || !isJavaEEProject()) {
        await createNewProject();
        return;
    }

    info(`Build type: ${type}`);
    const appName = path.basename(projectDir);
    const tomcatHome = await findTomcatHome();

    if (!tomcatHome || !appName || !fs.existsSync(path.join(tomcatHome, 'webapps'))) { return; }

    const targetDir = path.join(tomcatHome, 'webapps', appName);

    await vscode.workspace.saveAll();

    try {
        updateStatusBar(`${type} Build`);
        
        const deployMode = vscode.workspace.getConfiguration('tomcat').get<string>('defaultDeployMode', 'Disabled');
        const deployActions = {
            'Fast': () => fastDeploy(projectDir, targetDir, tomcatHome),
            'Maven': () => mavenDeploy(projectDir, targetDir, appName),
            'Gradle': () => gradleDeploy(projectDir, targetDir, appName)
        };

        const action = deployActions[type];
        if (!action) {
            error(`Invalid deployment type: ${type}`);
            return;
        }

        if (deployMode !== 'On Save') {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `${type} Build`,
                    cancellable: false
                },
                action
            );
        } else {
            await action();
        }

        if (fs.existsSync(targetDir)) {
            info(`${appName} Deployed successfully`);
            await tomcat('reload');
            await new Promise(resolve => setTimeout(resolve, 40));
            runBrowser(appName);
        }
    } catch (err) {
        error(`${type} build failed`, err as Error);
    } finally {
        defaultStatusBar();
    }
}

export async function registerAutoDeploy(context: vscode.ExtensionContext): Promise<void> {
    let isDeploying = false;
    let autoDeployDisposables: vscode.Disposable[] = [];

    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(async (event) => {
        if (event.affectsConfiguration('tomcat.defaultDeployMode') || event.affectsConfiguration('tomcat.defaultBuildType')) {
            await updateAutoDeploy();
        }
    });

    context.subscriptions.push(configChangeDisposable);

    async function updateAutoDeploy(): Promise<void> {
        autoDeployDisposables.forEach(d => d.dispose());
        autoDeployDisposables = [];

        const config = vscode.workspace.getConfiguration('tomcat');
        const defaultBuildType = config.get<string>('defaultBuildType', 'Fast') as 'Fast' | 'Maven' | 'Gradle';
        let defaultDeployMode = config.get<string>('defaultDeployMode', 'Disabled');

        if (!isJavaEEProject()) { 
            defaultDeployMode = 'Disabled'; 
        }

        if (defaultDeployMode === 'On Save') {
            const saveDisposable = vscode.workspace.onDidSaveTextDocument(async (document) => {
                if (isDeploying) {return;}
                isDeploying = true;
                await deploy(defaultBuildType);
                isDeploying = false;
            });
            autoDeployDisposables.push(saveDisposable);
        }

        const shortcutDisposable = vscode.commands.registerCommand('tomcat.deployOnShortcut', async () => {
            if (isDeploying) {return;}
            isDeploying = true;

            const editor = vscode.window.activeTextEditor;
            if (editor) { 
                await editor.document.save();
                const currentDeployMode = vscode.workspace.getConfiguration('tomcat').get<string>('defaultDeployMode', 'Disabled');
                if (currentDeployMode === 'On Shortcut' || currentDeployMode === 'On Save') {
                    await deploy(defaultBuildType);
                }
            }
            isDeploying = false;
        });

        autoDeployDisposables.push(shortcutDisposable);
        context.subscriptions.push(...autoDeployDisposables);
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
            info('New Maven web app project created');
        } catch (err) {
            error('Failed to create new project:', err as Error);
            vscode.window.showErrorMessage(
                'Project creation failed. Ensure Java Extension Pack is installed and configured.',
                'Open Extensions'
            ).then(choice => {
                if (choice === 'Open Extensions') {
                    vscode.commands.executeCommand('workbench.extensions.action.showExtensions');
                }
            });
        }
        return;
    } else {
        success('Tomcat deploy canceled.');
        return;
    }
}

async function fastDeploy(projectDir: string, targetDir: string, tomcatHome: string) {
    const webAppPath = path.join(projectDir, 'src', 'main', 'webapp');
    if (!fs.existsSync(webAppPath)) {
        throw new Error(`WebApp directory not found: ${webAppPath}`);
    }
    const javaHome = await findJavaHome();
    if (!javaHome) { return; }

    const javacPath = path.join(javaHome, 'bin', 'javac');

    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.rmSync(`${targetDir}.war`, { force: true });


    fs.cpSync(webAppPath, targetDir, { recursive: true });

    const javaSourcePath = path.join(projectDir, 'src', 'main', 'java');
    const classesDir = path.join(targetDir, 'WEB-INF', 'classes');

    if (fs.existsSync(javaSourcePath)) {
        try {
            fs.mkdirSync(classesDir, { recursive: true });

            const javaPattern = path.join(javaSourcePath, '**', '*.java');
            const javaFiles = await findFiles(javaPattern);
            
            if (javaFiles.length > 0) {
                const tomcatLibs = path.join(tomcatHome, 'lib', '*');
                const tempFile = path.join(projectDir, 'sources.list');

                fs.writeFileSync(tempFile, javaFiles.map(file => `"${file}"`).join('\n').split(path.sep).join('//'));

                const javacCommand = process.platform === 'win32' 
                    ? `"${javacPath}" -d "${classesDir}" -cp "${tomcatLibs}" @"${tempFile}"`
                    : `'${javacPath}' -d '${classesDir}' -cp '${tomcatLibs}' @'${tempFile}'`;

                await executeCommand(javacCommand, projectDir);
                fs.unlinkSync(tempFile);
            }
        } catch (err) {
            throw new Error(`Java compilation failed: ${err}. Continuing without compiled classes.`);
        }
    }

    const existingClasses = path.join(projectDir, 'WEB-INF', 'classes');
    if (fs.existsSync(existingClasses)) {
        fs.cpSync(existingClasses, classesDir, { recursive: true });
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

async function findFiles(pattern: string): Promise<string[]> {
    return await glob(pattern, {
        nodir: true,
        windowsPathsNoEscape: process.platform === 'win32',
        absolute: true,
    });
}

async function mavenDeploy(projectDir: string, targetDir: string, appName: string) {
    if (!fs.existsSync(path.join(projectDir, 'pom.xml'))) {
        throw new Error('pom.xml not found.');
    }

    await executeCommand(`mvn clean package`, projectDir);

    const targetPath = path.join(projectDir, 'target');
    const warFiles = fs.readdirSync(targetPath).filter(file => file.toLowerCase().endsWith('.war'));
    if (warFiles.length === 0) {
        throw new Error('No WAR file found after Maven build.');
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
        fs.cpSync(warFolderPath, targetDir, { recursive: true });
    }
}

async function gradleDeploy(projectDir: string, targetDir: string, appName: string) {
    if (!fs.existsSync(path.join(projectDir, 'build.gradle'))) {
        throw new Error('build.gradle not found.');
    }

    const gradleCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    await executeCommand(`${gradleCmd} war -PfinalName=${appName}`, projectDir);

    const warFile = path.join(projectDir, 'build', 'libs', `${appName}.war`);
    if (!warFile) {
        throw new Error('No WAR file found after Gradle build.');
    }

    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.rmSync(`${targetDir}.war`, { recursive: true, force: true });

    fs.copyFileSync(warFile, `${targetDir}.war`);
}

async function executeCommand(command: string, cwd: string): Promise<void> {
    info(`Executing: ${command}`);
    return new Promise(async (resolve) => {
        exec(command, { cwd }, async (err, stdout, stderr) => {
            if (err) {
                throw new Error(err.message || stderr || stdout || 'Unknown error.');
            }
            resolve();
        });
    });
}