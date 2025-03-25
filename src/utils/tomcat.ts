import { exec } from 'child_process';
import * as net from 'net';
import { error, info, success } from './logger';
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
                const catalinaExt = process.platform === 'win32' ? '.bat' : '.sh';
                const catalinaPath = path.join(selectedPath, 'bin', `catalina${catalinaExt}`);
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
        
            try {
                await new Promise<void>((resolve, reject) => {
                    const req = require('http').request(options, (res: any) => {
                        let responseData = '';
                        res.on('data', (chunk: Buffer) => responseData += chunk.toString());
                        res.on('end', () => {
                            if (res.statusCode === 200) {
                                info('Tomcat reloaded');
                                resolve();
                            } else {
                                reject(new Error(`Status ${res.statusCode}: ${responseData.trim()}`));
                            }
                        });
                    });
                    
                    req.on('error', (e: Error) => reject(e));
                    req.end();
                });
            } catch (e: any) {
                info(`Failed to reload Tomcat: ${e.message}`);
                addTomcatUser();
            }
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

    const javaExecutable = path.join(javaHome, 'bin', `java${process.platform === 'win32' ? '.exe' : ''}`);
    const classpath = [
        path.join(tomcatHome, 'bin', 'bootstrap.jar'),
        path.join(tomcatHome, 'bin', 'tomcat-juli.jar')
    ].join(path.delimiter);    
    const mainClass = 'org.apache.catalina.startup.Bootstrap';
    const catalinaOpts = `-Dcatalina.base="${tomcatHome}" -Dcatalina.home="${tomcatHome}" -Djava.io.tmpdir="${path.join(tomcatHome, 'temp')}"`;
    const quoted = (p: string) => `"${p.replace(/"/g, '\\"')}"`;
    const command = [
        quoted(javaExecutable),
        `-cp ${quoted(classpath)}`,
        catalinaOpts,
        mainClass,
        action === 'reload' ? 'start' : action
    ].join(' ');

    exec(command, {
        shell: process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : '/bin/sh',
        windowsHide: true,
        encoding: 'utf-8'
    }, (err, stdout, stderr) => {
        if (err) {
            error(`Failed to ${action} Tomcat: ${stderr || stdout || err.message}`);
            return;
        }else if (stderr) {
            if (vscode.workspace.getConfiguration().get('tomcat.loggingLevel', 'WARN') === 'DEBUG'){ 
                info(`Tomcat log: ${stderr}`);
            }
        }
    });
    success(`Tomcat ${action}ed successfully`);
}

async function addTomcatUser(): Promise<void> {
    try {
        const tomcatHome = await findTomcatHome();
        if (!tomcatHome) { return; }

        const filePath = path.join(tomcatHome, 'conf', 'tomcat-users.xml');

        try {
            await fs.promises.access(filePath, fs.constants.W_OK);
        } catch (e) {
            throw new Error (`Insufficient permissions to modify ${filePath}. Run as administrator?`);
        }

        let content: string;
        try {
            content = fs.readFileSync(filePath, 'utf8');
        } catch (err) {
            throw new Error (`Unable to read ${filePath}: ${(err as Error).message}, Please add "<user username="admin" password="admin" roles="manager-gui,manager-script"/>" to the file.`);
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
            error('Failed to write to tomcat-users.xml', err as Error);
        }
    } catch (err) {
        error('Unexpected error adding Tomcat user', err as Error);
    } finally {
        tomcat('stop');
    }
}