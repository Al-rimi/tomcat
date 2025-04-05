import * as vscode from 'vscode';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from './Logger';
import { Buffer } from 'buffer';
import { Browser } from './Browser';

const execAsync = promisify(exec);
const logger = Logger.getInstance();

export class Tomcat {
    private static instance: Tomcat;
    private config: vscode.WorkspaceConfiguration;
    private port: number;
    private readonly PORT_RANGE = { min: 1024, max: 65535 };

    private constructor() {
        this.config = vscode.workspace.getConfiguration('tomcat');
        this.port = this.config.get<number>('port', 8080);
    }

    public static getInstance(): Tomcat {
        if (!Tomcat.instance) {
            Tomcat.instance = new Tomcat();
        }
        return Tomcat.instance;
    }

    public deactivate(): void {
        this.stop().catch(err => 
            logger.error('Error during deactivation:', err)
        );
    }

    public updateConfig(): void {
        this.config = vscode.workspace.getConfiguration('tomcat');
    }

    public async start(): Promise<void> {
        const tomcatHome = await this.findTomcatHome();
        const javaHome = await this.findJavaHome();
        if (!tomcatHome || !javaHome) {return;}

        if (await this.isTomcatRunning()) {
            logger.success('Tomcat is already running');
            return;
        }

        try {
            this.executeTomcatCommand('start', tomcatHome, javaHome);
            logger.success('Tomcat started successfully');
        } catch (err) {
            logger.error('Failed to start Tomcat', err as Error);
            throw err;
        }
    }

    public async stop(): Promise<void> {
        const tomcatHome = await this.findTomcatHome();
        const javaHome = await this.findJavaHome();
        if (!tomcatHome || !javaHome) {return;}

        if (!await this.isTomcatRunning()) {
            logger.success('Tomcat is not running');
            return;
        }

        try {
            await this.executeTomcatCommand('stop', tomcatHome, javaHome);
            logger.success('Tomcat stopped successfully');
        }catch (err) {
            logger.error('Failed to stop Tomcat', err as Error);
            throw err;
        }
    }

    public async reload(): Promise<void> {
        const tomcatHome = await this.findTomcatHome();
        const javaHome = await this.findJavaHome();
        
        if (!tomcatHome || !javaHome) {
            logger.error('Missing required configurations');
            return;
        }

        if (!await this.isTomcatRunning()) {
            this.executeTomcatCommand('start', tomcatHome, javaHome);
            logger.info('Tomcat started');
            return;
        }

        try {
            const appName = path.basename(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
            if (!appName) {return;}

            const response = await fetch(`http://localhost:${this.port}/manager/text/reload?path=/${encodeURIComponent(appName)}`, {
                headers: {
                    'Authorization': `Basic ${Buffer.from('admin:admin').toString('base64')}`
                }
            });

            if (!response.ok) {
                throw new Error(`Reload failed: ${await response.text()}`);
            }
            logger.info('Tomcat reloaded successfully');
        } catch (err) {
            logger.error('Reload failed, attempting to add admin user', err as Error);
            await this.addTomcatUser(tomcatHome);
        }
    }

    public async restart(): Promise<void> {
        const tomcatHome = await this.findTomcatHome();
        const javaHome = await this.findJavaHome();
        if (!tomcatHome || !javaHome) {return;}

        await this.executeTomcatCommand('stop', tomcatHome, javaHome);
        this.executeTomcatCommand('start', tomcatHome, javaHome);
    }
    
    public async clean(): Promise<void>{
        const tomcatHome = await this.findTomcatHome();
        if (!tomcatHome) {return;}

        const config = vscode.workspace.getConfiguration('tomcat');
        const defaultWebApps = config.get<string[]>('webApps') || [
        'ROOT',
        'docs',
        'examples',
        'manager',
        'host-manager'
        ];

        const webappsDir = path.join(tomcatHome, 'webapps');
        
        if (!fs.existsSync(webappsDir)) {
            logger.error(`Webapps directory not found: ${webappsDir}`);
            return;
        }
    
        try {
            const entries = fs.readdirSync(webappsDir, { withFileTypes: true });
    
            for (const entry of entries) {
                const entryPath = path.join(webappsDir, entry.name);
                
                if (!defaultWebApps.includes(entry.name)) {
                    try {
                        if (entry.isDirectory()) {
                            fs.rmSync(entryPath, { recursive: true, force: true });
                            logger.info(`Removed directory: ${entryPath}`);
                        } else if (entry.isFile() || entry.isSymbolicLink()) {
                            fs.unlinkSync(entryPath);
                            logger.info(`Removed file: ${entryPath}`);
                        }
                    } catch (err) {
                        logger.error(`Error removing ${entryPath}:`, err as Error);
                    }
                }
            }
    
            const workDir = path.join(tomcatHome, 'work');
            const tempDir = path.join(tomcatHome, 'temp');
            [workDir, tempDir].forEach(dir => {
                if (fs.existsSync(dir)) {
                    try {
                        fs.rmSync(dir, { recursive: true, force: true });
                        fs.mkdirSync(dir);
                        logger.info(`Cleaned and recreated: ${dir}`);
                    } catch (err) {
                        logger.error(`Error cleaning ${dir}:`, err as Error);
                    }
                }
            });
    
            logger.success('Tomcat cleaned successfully');
        } catch (err) {
            logger.error(`Error during cleanup:`, err as Error);
        }
    }

    private async isTomcatRunning(): Promise<boolean> {
        try {
            let command: string;
    
            if (process.platform === 'win32') {
                command = `netstat -an | findstr ":${this.port}"`;
            } else {
                command = `netstat -an | grep ":${this.port}"`;
            }
    
            const { stdout } = await execAsync(command);
            return stdout.includes(`:${this.port}`);
        } catch (error) {
            return false;
        }
    }

    public async findTomcatHome(): Promise<string | null> {
        let tomcatHome = process.env.CATALINA_HOME || this.config.get<string>('home', '');

        if (!tomcatHome) {
            const selectedFolder = await vscode.window.showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
                openLabel: 'Select Tomcat Home Folder'
            });

            if (selectedFolder?.[0]?.fsPath) {
                const catalinaExt = process.platform === 'win32' ? '.bat' : '.sh';
                const catalinaPath = path.join(selectedFolder[0].fsPath, 'bin', `catalina${catalinaExt}`);
                
                if (await this.pathExists(catalinaPath)) {
                    tomcatHome = selectedFolder[0].fsPath;
                    await this.config.update('home', tomcatHome, true);
                } else {
                    logger.error(`Invalid Tomcat home: ${catalinaPath} not found`);
                    return null;
                }
            }
        }
        return tomcatHome || null;
    }

    public async findJavaHome(): Promise<string | null> {
        let javaHome = process.env.JAVA_HOME || this.config.get<string>('java.home', '');

        if (!javaHome) {
            const selectedFolder = await vscode.window.showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
                openLabel: 'Select Java Home Folder'
            });

            if (selectedFolder?.[0]?.fsPath) {
                const javaExecutable = path.join(
                    selectedFolder[0].fsPath, 
                    'bin', 
                    `java${process.platform === 'win32' ? '.exe' : ''}`
                );

                if (await this.pathExists(javaExecutable)) {
                    javaHome = selectedFolder[0].fsPath;
                    await this.config.update('java.home', javaHome, true);
                } else {
                    logger.error(`Invalid Java home: ${javaExecutable} not found`);
                    return null;
                }
            }
        }
        return javaHome || null;
    }

    public async updatePort(): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const config = vscode.workspace.getConfiguration();
        const newPort = config.get<number>('tomcat.port', 8080);
        const oldPort = this.port;

        if (newPort !== oldPort){
            try {
                const javaHome = await this.findJavaHome();
                const tomcatHome = await this.findTomcatHome();
                if (!javaHome || !tomcatHome) {return;}

                await this.validatePort(newPort);
                if (await this.isTomcatRunning()) {
                    await this.executeTomcatCommand('stop', tomcatHome, javaHome);
                    await this.modifyServerXmlPort(tomcatHome, newPort);
                }

                this.port = newPort;
                this.updateConfig();
                Tomcat.getInstance().updateConfig();
                Browser.getInstance().updateConfig();

                await vscode.workspace.getConfiguration().update('tomcat.port', newPort, true);
                logger.success(`Tomcat port updated from ${oldPort} to ${newPort}`);

                this.executeTomcatCommand('start', tomcatHome, javaHome);
            } catch (err) {
                await vscode.workspace.getConfiguration().update('tomcat.port', oldPort, true);
                logger.error(`Tomcat port ${newPort} update failed reverting to ${oldPort}`, err as Error);
            }
        }

    }

    private async validatePort(port: number): Promise<void> {
        if (port < this.PORT_RANGE.min) {throw new Error(
            `Ports below ${this.PORT_RANGE.min} require admin privileges`
        );}
        
        if (port > this.PORT_RANGE.max) {throw new Error(
            `Maximum allowed port is ${this.PORT_RANGE.max}`
        );}

        try {
            let command: string;
    
            if (process.platform === 'win32') {
                command = `netstat -an | findstr ":${port}"`;
            } else {
                command = `netstat -an | grep ":${port}"`;
            }
    
            const { stdout } = await execAsync(command);
            if (stdout.includes(`:${port}`)) {throw new Error(`Port ${port} is already in use`);}
        } catch (error) {
            return;
        }

    }

    private async modifyServerXmlPort(tomcatHome: string, newPort: number): Promise<void> {
        const serverXmlPath = path.join(tomcatHome, 'conf', 'server.xml');
        const content = await fsp.readFile(serverXmlPath, 'utf8');
        
        const updatedContent = content.replace(
            /<Connector([^>]*?)protocol="HTTP\/1\.1"([^>]*?)port="(\d+)"([^>]*?)\/>/,
            (beforeProtocol, between, after) => {
              return `<Connector${beforeProtocol}protocol="HTTP/1.1"${between}port="${newPort}"${after}/>`;
            }
          );
          
        if (!updatedContent.includes(`port="${newPort}"`)) {
            logger.error(`Failed to update port in server.xml`);
        }

        await fsp.writeFile(serverXmlPath, updatedContent);
    }

    private async executeTomcatCommand(
        action: 'start' | 'stop',
        tomcatHome: string,
        javaHome: string
    ): Promise<void> {

        const command = this.buildCommand(action, tomcatHome, javaHome);
        try {
            const { stderr } = await execAsync(command);
            if (stderr && this.config.get<string>('loggingLevel', 'WARN') === 'DEBUG') {
                logger.info(`Tomcat log: ${stderr}`);
            }
        } catch (err) {
            throw err;
        }
    }

    private buildCommand(
        action: 'start' | 'stop',
        tomcatHome: string,
        javaHome: string
    ): string {
        const javaExecutable = path.join(javaHome, 'bin', `java${process.platform === 'win32' ? '.exe' : ''}`);
        const classpath = [
            path.join(tomcatHome, 'bin', 'bootstrap.jar'),
            path.join(tomcatHome, 'bin', 'tomcat-juli.jar')
        ].join(path.delimiter);

        return [
            `"${javaExecutable.replace(/"/g, '\\"')}"`,
            `-cp "${classpath}"`,
            `-Dcatalina.base="${tomcatHome}"`,
            `-Dcatalina.home="${tomcatHome}"`,
            `-Djava.io.tmpdir="${path.join(tomcatHome, 'temp')}"`,
            'org.apache.catalina.startup.Bootstrap',
            action
        ].join(' ');
    }

    private async addTomcatUser(tomcatHome: string): Promise<void> {
        const usersXmlPath = path.join(tomcatHome, 'conf', 'tomcat-users.xml');
        
        try {
            let content = await fsp.readFile(usersXmlPath, 'utf8');
            const newUser = '<user username="admin" password="admin" roles="manager-gui,manager-script"/>';

            content = content
                .replace(/<user username="admin".*\/>/g, '')
                .replace(/(<\/tomcat-users>)/, `  ${newUser}\n$1`);

            await fsp.writeFile(usersXmlPath, content);
            logger.info('Added admin user to tomcat-users.xml');
            await this.restart();
        } catch (err) {
            logger.error('Failed to modify tomcat-users.xml', err as Error);
            throw err;
        }
    }

    private async pathExists(filePath: string): Promise<boolean> {
        try {
            await fsp.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}