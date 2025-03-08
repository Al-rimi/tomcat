import { exec } from 'child_process';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { tomcat } from './tomcat';
import { runBrowser } from './browser';
import { error, info } from './logger';
import path from 'path';

if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {

    (vscode.commands.executeCommand('java.project.create', {
        name: 'NewWebApp',
        type: 'maven',
        archetype: 'maven-archetype-webapp'
    }) as Promise<void>).then(() => {
        info('New Maven web app project created');
    }).catch((err: any) => {
        error(`Failed to create new project: ${err}`);
    });

    process.exit(0);
}
const projectDir = vscode.workspace.workspaceFolders[0].uri.fsPath;

export function cleanOldDeployments() {
    const tomcatHome = process.env.CATALINA_HOME;
    if (!tomcatHome) {
        error('CATALINA_HOME environment variable is not set');
        return;
    }

    const appName = path.basename(process.cwd());
    const targetDir = `${tomcatHome}/webapps/${appName}`;

    if (fs.existsSync(`${targetDir}.war`)) {
        fs.unlinkSync(`${targetDir}.war`);
        info('Old deployment file deleted');
    }

    if (fs.existsSync(targetDir)) {
        fs.rmdirSync(targetDir, { recursive: true });
        info('Old deployment directory deleted');
    }
}

export async function deploy(type: 'Fast' | 'Maven') {
    const loadingMessage = vscode.window.setStatusBarMessage(`$(sync~spin)` + (type === 'Fast' ? ` Fast Deploying` : ` Maven`));

    await vscode.workspace.saveAll();

    const appName = path.basename(projectDir);
    const tomcatHome = process.env.CATALINA_HOME;
    if (!tomcatHome) {
        error('CATALINA_HOME environment variable is not set. Exiting.');
        return;
    }

    cleanOldDeployments();

    if (type === 'Fast') {
        const targetDir = `${tomcatHome}/webapps/${appName}`;

        if (!fs.existsSync(`${projectDir}/src/main/webapp`)) {
            error(`${appName}/src/main/webapp not found. Exiting.`);
            return;
        }

        fs.mkdirSync(targetDir, { recursive: true });
        fs.mkdirSync(`${targetDir}/WEB-INF/classes`, { recursive: true });

        fs.cpSync(`${projectDir}/src/main/webapp`, targetDir, { recursive: true });

        if (fs.existsSync(`${projectDir}/WEB-INF/classes`)) {
            fs.cpSync(`${projectDir}/WEB-INF/classes`, `${targetDir}/WEB-INF/classes`, { recursive: true });
        }

    } else if (type === 'Maven') {
        if (!fs.existsSync(`${projectDir}/pom.xml`)) {
            error('pom.xml not found');
            return;
        }

        try {
            await new Promise<void>((resolve, reject) => {
                exec('mvn clean package', { cwd: projectDir }, (err, stdout, stderr) => {
                    if (err) {
                        error(`Maven build failed: ${stderr}`);
                        reject(err);
                        return;
                    }
                    info('Maven build successful');
                    resolve();
                });
            });
            tomcat('stop');
            await new Promise(resolve => setTimeout(resolve, 800));
        } catch (err) {
            if (err instanceof Error) {
                error(`Deployment failed: ${err.message}`);
            } else {
                error('Deployment failed with an unknown error');
            }
            return;
        }

        const warFile = fs.readdirSync(`${projectDir}/target`).find((file: string) => file.endsWith('.war'));
        if (!warFile) {
            return;
        }
        fs.copyFileSync(`${projectDir}/target/${warFile}`, `${tomcatHome}/webapps/${warFile}`);
    } else {
        error('Invalid deployment type');
        return;
    }

    info('Deployment completed successfully');
    await tomcat('reload');
    runBrowser(appName);

    loadingMessage.dispose();
}
