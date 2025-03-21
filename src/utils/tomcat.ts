import { exec } from 'child_process';
import * as net from 'net';
import { error , info } from './logger';
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

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
                const catalinaPath = path.join(selectedPath, 'bin', `catalina${process.platform === 'win32' ? '.bat' : ''}`);
                if (!require('fs').existsSync(catalinaPath)) {
                    error(`Selected folder is incorrect: ${catalinaPath} does not exist. Please select the base folder of Apache Tomcat.`);
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
                const javaExecutablePath = path.join(selectedPath, 'bin', `java${process.platform === 'win32' ? '.exe' : ''}`);
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
    let tomcatHome = await findTomcatHome();
    if (!tomcatHome) { return; }

    let javaHome = await findJavaHome();
    if (!javaHome) { return; }

    if (await isTomcatRunning()) {
        if (action === 'start') {
            info('Tomcat is already running');
            return;
        }
        if (action === 'reload') {
            const appName = path.basename(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
            if (!appName) { return; }
            const creds = Buffer.from('admin:admin').toString('base64');
            const options = {
                hostname: 'localhost',
                port: vscode.workspace.getConfiguration().get('tomcat.port', 8080),
                path: `/manager/text/reload?path=/${appName}`,
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${creds}`
                }
            };

            const req = require('http').request(options, (res: any) => {
                if (res.statusCode === 200) {
                    info('Tomcat reloaded');
                } else {
                    info(`Failed to reload Tomcat: ${res.statusCode}`);
                    addTomcatUser();
                }
            });
            req.on('error', (e: any) => {
                info(`Failed to reload Tomcat: ${e.message}`);
                addTomcatUser();
            });

            req.end();
            return;
        }
    } else {
        if (action === 'stop') {
            info('Tomcat is not running');
            return;
        }
        if (action === 'reload') {
            info('Tomcat is not running. Starting Tomcat');
        }
    }

    const javaExecutable = `${javaHome}/bin/java${process.platform === 'win32' ? '.exe' : ''}`;
    const classpath = `${tomcatHome}/bin/bootstrap.jar${process.platform === 'win32' ? ';' : ':'}${tomcatHome}/bin/tomcat-juli.jar`;
    const mainClass = 'org.apache.catalina.startup.Bootstrap';
    const catalinaOpts = `-Dcatalina.base=${tomcatHome} -Dcatalina.home=${tomcatHome} -Djava.io.tmpdir=${tomcatHome}/temp`;

    const command = `${javaExecutable} -cp ${classpath} ${catalinaOpts} ${mainClass} ${action === 'reload' ? 'start' : action}`;

    exec(command, async (err, stdout, stderr) => {
        if (err) {
            error(`Failed to ${action} Tomcat: ${stderr}`);
            return;
        }
        info(`Tomcat ${action}ed`);
    });
}

async function addTomcatUser(): Promise<void> {
    try {
        const tomcatHome = await findTomcatHome();
        if (!tomcatHome) { return; }

        const filePath = path.join(tomcatHome, 'conf', 'tomcat-users.xml');
        
        let content: string;
        try {
            content = fs.readFileSync(filePath, 'utf8');
        } catch (err) {
            error(`Unable to read ${filePath}: ${(err as Error).message}, Please add "<user username="admin" password="admin" roles="manager-gui,manager-script"/>" to the file.`);
            return;
        }
        const newUserLine = '<user username="admin" password="admin" roles="manager-gui,manager-script"/>';

        if (content.includes('<user username="admin"')) {
            info('Admin user already exists in tomcat-users.xml. Removing existing user.');
            content = content.replace(/<user username="admin".*\/>/, '');
        }

        const updatedContent = content.replace(
            /(\s*<\/tomcat-users>)/,
            `\n  ${newUserLine}\n$1`
        );

        try {
            fs.writeFileSync(filePath, updatedContent);
            info('Successfully added admin user to tomcat-users.xml.');
        } catch (err) {
            error(`Failed to write to tomcat-users.xml: ${(err as Error).message}`);
        }
    } catch (err) {
        error(`Unexpected error adding Tomcat user: ${(err as Error).message}`);
    } finally {
        tomcat('stop');
    }
}