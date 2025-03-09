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
        server.listen(8080);
    });
}

export async function tomcat(action: 'start' | 'stop' | 'reload'): Promise<void> {

    let tomcatHome = process.env.CATALINA_HOME;
    if (!tomcatHome) {
        const config = vscode.workspace.getConfiguration();
        tomcatHome = config.get('tomcat.home', '');

        if (!tomcatHome) {
            const selectedFolder = await vscode.window.showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
                openLabel: 'Select Tomcat Home Folder'
            });

            const selectedPath = selectedFolder[0].fsPath;
            const catalinaPath = `${selectedPath}/bin/catalina${process.platform === 'win32' ? '.bat' : '.sh'}`;
            if (!require('fs').existsSync(catalinaPath)) {
                error('Selected folder is incorrect. Please select the base folder of Apache Tomcat.');
                return;
            }

            tomcatHome = selectedFolder[0].fsPath;
            await config.update('tomcat.home', tomcatHome, vscode.ConfigurationTarget.Global);
        }
    }

    const javaHome = process.env.JAVA_HOME;
    if (!javaHome) {
        error('JAVA_HOME is not set please set it in your environment variables');
        return;
    }

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