import { exec } from 'child_process';
import * as net from 'net';
import { updateStatusBarItem } from '../extension';
import { error , info } from './logger';
const vscode = require('vscode');

export function isTomcatRunning(): Promise<boolean> {
    return new Promise((resolve) => {
        let server = net.createServer();
        server.once('error', () => {
            resolve(true);
        });
        server.once('listening', () => {
            server.close();
            resolve(false);
        });
        server.listen(vscode.workspace.getConfiguration().get('tomcat.port', 8080));
    });
}

export async function findTomcatHome(): Promise<string> {
    let tomcatHome = process.env.CATALINA_HOME;

    if (tomcatHome) { return tomcatHome; } else {
        const config = vscode.workspace.getConfiguration();
        tomcatHome = config.get('tomcat.home', '');
        
        if (tomcatHome) { return tomcatHome; } else {
    
            const selectedFolder = await vscode.window.showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
                openLabel: 'Select Tomcat Home Folder'
            });
    
            if (selectedFolder && selectedFolder.length > 0) {
                const selectedPath = selectedFolder[0].fsPath;
                const catalinaPath = `${selectedPath}/bin/catalina${process.platform === 'win32' ? '.bat' : '.sh'}`;
                if (!require('fs').existsSync(catalinaPath)) {
                    error('Selected folder is incorrect. Please select the base folder of Apache Tomcat.');
                    return '';
                }
    
                tomcatHome = selectedFolder[0].fsPath;
                await config.update('tomcat.home', tomcatHome, vscode.ConfigurationTarget.Global);
                return tomcatHome || '';
            } else {
                error('No folder selected.');
                return '';
            }
        }
    }
}

export async function findJavaHome(): Promise<string> {
    let javaHome = process.env.JAVA_HOME;

    if (javaHome) { return javaHome; } else {
        const config = vscode.workspace.getConfiguration();
        javaHome = config.get('tomcat.java.home', '');

        if (javaHome) { return javaHome; } else {

            const selectedFolder = await vscode.window.showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
                openLabel: 'Select Java Home Folder'
            });

            if (selectedFolder && selectedFolder.length > 0) {
                const selectedPath = selectedFolder[0].fsPath;
                const javaExecutablePath = `${selectedPath}/bin/java${process.platform === 'win32' ? '.exe' : ''}`;
                if (!require('fs').existsSync(javaExecutablePath)) {
                    error('Selected folder is incorrect. Please select the base folder of Java.');
                    return '';
                }
    
                javaHome = selectedFolder[0].fsPath;
                await config.update('tomcat.java.home', javaHome, vscode.ConfigurationTarget.Global);
                return javaHome || '';
            } else {
                error('No folder selected.');
                return '';
            }
        }
        
    }
}


export async function tomcat(action: 'start' | 'stop' | 'reload'): Promise<void> {

    let tomcatHome = findTomcatHome();
    if (!tomcatHome) { return; }

    let javaHome = findJavaHome();
    if (!javaHome) { return; }

    if (await isTomcatRunning()) {
        if (action === 'start') {
            info('Tomcat is already running');
            updateStatusBarItem(true);
            return;
        }
    } else {
        if (action === 'stop') {
            info('Tomcat is not running');
            updateStatusBarItem(false);
            return;
        }
        if (action === 'reload') {
            info('Tomcat is not running. Starting Tomcat');
        }
    }

    const javaExecutable = `${javaHome}/bin/java`;
    const classpath = `${tomcatHome}/bin/bootstrap.jar${process.platform === 'win32' ? ';' : ':'}${tomcatHome}/bin/tomcat-juli.jar`;
    const mainClass = 'org.apache.catalina.startup.Bootstrap';
    const catalinaOpts = `-Dcatalina.base=${tomcatHome} -Dcatalina.home=${tomcatHome} -Djava.io.tmpdir=${tomcatHome}/temp`;

    const command = `${javaExecutable} -cp ${classpath} ${catalinaOpts} ${mainClass} ${action === 'reload' ? 'start' : action}`;

    exec(command, async (err, stdout, stderr) => {
        if (err) {
            error(`Failed to ${action} Tomcat: ${stderr}`);
            return;
        }
    });

    info(`Tomcat ${action}ed`);

    updateStatusBarItem(!(action === 'stop'));
}