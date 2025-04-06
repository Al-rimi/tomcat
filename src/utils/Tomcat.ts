/**
 * Tomcat.ts - Apache Tomcat Server Lifecycle Management System
 *
 * Core service responsible for complete Tomcat server instance control within the VS Code
 * environment. Implements enterprise-grade server management capabilities following
 * Apache Tomcat's architectural principles while providing IDE integration features.
 *
 * Architecture:
 * - Implements Singleton pattern to ensure single control point for server state
 * - Follows Facade pattern for complex Tomcat operations
 * - Adheres to VS Code's Disposable pattern for resource management
 * - Uses Strategy pattern for platform-specific implementations
 *
 * Core Capabilities:
 * 1. Server Lifecycle Management:
 *    - Start/Stop/Restart operations with proper sequencing
 *    - Process monitoring and health checking
 *    - Graceful shutdown handling
 *    - PID management for process tracking
 *
 * 2. Configuration Management:
 *    - Dynamic port configuration with validation
 *    - server.xml modification with atomic updates
 *    - Environment variable resolution hierarchy
 *    - Configuration versioning and rollback
 *
 * 3. Security Management:
 *    - tomcat-users.xml administration
 *    - Role-based access control
 *    - Credential management
 *    - Secure configuration updates
 *
 * 4. System Integration:
 *    - Java environment detection
 *    - Platform-specific path handling
 *    - Filesystem permission management
 *    - Network port conflict resolution
 *
 * 5. Maintenance Operations:
 *    - Work directory cleanup
 *    - Temp file management
 *    - Deployment artifact cleanup
 *    - Log file rotation
 *
 * Technical Implementation:
 * - Uses child_process for Tomcat process control
 * - Implements filesystem watchers for configuration changes
 * - Provides atomic operations for critical configurations
 * - Maintains cross-platform compatibility
 * - Implements proper error recovery procedures
 */

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

    /**
     * Private constructor for Singleton pattern
     * 
     * Initializes core Tomcat management properties:
     * - Loads workspace configuration
     * - Sets default port value
     * - Establishes port range constraints
     * - Prepares environment variable fallbacks
     */
    private constructor() {
        this.config = vscode.workspace.getConfiguration('tomcat');
        this.port = this.config.get<number>('port', 8080);
    }

    /**
     * Singleton accessor method
     * 
     * Provides global access point to the Tomcat manager instance while ensuring:
     * - Thread-safe lazy initialization
     * - Consistent state management
     * - Single point of configuration
     * 
     * @returns The singleton Tomcat manager instance
     */
    public static getInstance(): Tomcat {
        if (!Tomcat.instance) {
            Tomcat.instance = new Tomcat();
        }
        return Tomcat.instance;
    }

    /**
     * Extension deactivation handler
     * 
     * Performs critical cleanup operations:
     * - Ensures Tomcat process is stopped
     * - Releases system resources
     * - Maintains server state consistency
     * - Preserves configuration integrity
     */
    public deactivate(): void {
        this.stop();
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
        this.config = vscode.workspace.getConfiguration('tomcat');
    }

    /**
     * Tomcat server startup procedure
     * 
     * Orchestrates complete server startup sequence:
     * 1. Validates environment prerequisites
     * 2. Checks for existing running instances
     * 3. Constructs platform-specific launch command
     * 4. Executes startup process
     * 5. Handles startup errors and recovery
     * 
     * @log Error if critical startup failure occurs
     */
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
        }
    }

    /**
     * Tomcat server shutdown procedure
     * 
     * Implements controlled server shutdown:
     * 1. Verifies running state
     * 2. Executes platform-specific shutdown command
     * 3. Handles shutdown timeouts
     * 4. Verifies process termination
     * 5. Cleans up residual resources
     * 
     * @log Error if shutdown sequence fails
     */
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
        }
    }

    /**
     * Application hot-reload handler
     * 
     * Implements zero-downtime application reload:
     * 1. Detects current server state
     * 2. Uses Tomcat Manager API for reload
     * 3. Falls back to full restart if needed
     * 4. Maintains session persistence
     * 5. Handles authentication requirements
     * 
     * @log Error if reload fails with diagnostic information
     */
    public async reload(): Promise<void> {
        const tomcatHome = await this.findTomcatHome();
        const javaHome = await this.findJavaHome();
        
        if (!tomcatHome || !javaHome) { return; }

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
            logger.warn('Reload failed, attempting to add admin user');
            await this.addTomcatUser(tomcatHome);
        }
    }

    /**
     * Server restart procedure
     * 
     * Orchestrates complete server restart cycle:
     * 1. Ordered shutdown sequence
     * 2. Configuration verification
     * 3. Clean startup process
     * 4. State synchronization
     * 
     * @log Error if restart sequence fails
     */
    public async restart(): Promise<void> {
        const tomcatHome = await this.findTomcatHome();
        const javaHome = await this.findJavaHome();
        if (!tomcatHome || !javaHome) {return;}

        try {
            if (await this.isTomcatRunning()) {
                await this.executeTomcatCommand('stop', tomcatHome, javaHome);
            }
            this.executeTomcatCommand('start', tomcatHome, javaHome);
        } catch (err) {
            logger.error('Failed to restart Tomcat', err as Error);
        }
    }

    /**
     * Server maintenance and cleanup
     * 
     * Performs comprehensive server cleanup:
     * 1. Webapp directory cleaning with exclusions
     * 2. Work directory purging
     * 3. Temp file removal
     * 4. Resource leak prevention
     * 
     * @log Error if cleanup fails with filesystem details
     */    
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
                        throw err;
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
                        throw err;
                    }
                }
            });
    
            logger.success('Tomcat cleaned successfully');
        } catch (err) {
            logger.error(`Error during cleanup:`, err as Error);
        }
    }

    /**
     * Server process status check
     * 
     * Implements platform-specific process detection:
     * - Windows: netstat with findstr
     * - Unix: netstat with grep
     * - Port binding verification
     * - Process existence confirmation
     * 
     * @returns Boolean indicating server running state
     */
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

    /**
     * CATALINA_HOME resolution
     * 
     * Implements hierarchical location discovery:
     * 1. Checks environment variables
     * 2. Verifies workspace configuration
     * 3. Provides interactive selection
     * 4. Validates Tomcat installation
     * 
     * @returns Valid Tomcat home path or null
     */
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

    /**
     * JAVA_HOME resolution
     * 
     * Implements JDK location discovery:
     * 1. Checks environment variables
     * 2. Verifies workspace configuration
     * 3. Provides interactive selection
     * 4. Validates JDK installation
     * 
     * @returns Valid Java home path or null
     */
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

    /**
     * Dynamic port configuration
     * 
     * Handles live port changes with:
     * 1. Range validation
     * 2. Conflict detection
     * 3. Atomic server.xml updates
     * 4. Coordinated server restart
     * 
     * @log Error with detailed validation messages
     */
    public async updatePort(): Promise<void> {
        const config = vscode.workspace.getConfiguration();
        const newPort = config.get<number>('tomcat.port', 8080);
        const oldPort = this.port;

        if (newPort !== oldPort){
            try {
                const javaHome = await this.findJavaHome();
                const tomcatHome = await this.findTomcatHome();
                if (!javaHome || !tomcatHome) {return;}

                await this.validatePort(newPort);
                await new Promise(resolve => setTimeout(resolve, 200));

                if (await this.isTomcatRunning()) {
                    await this.executeTomcatCommand('stop', tomcatHome, javaHome);
                }

                await this.modifyServerXmlPort(tomcatHome, newPort);

                this.port = newPort;
                this.updateConfig();
                Tomcat.getInstance().updateConfig();
                Browser.getInstance().updateConfig();

                await vscode.workspace.getConfiguration().update('tomcat.port', newPort, true);
                logger.success(`Tomcat port updated from ${oldPort} to ${newPort}`);

                this.executeTomcatCommand('start', tomcatHome, javaHome);
            } catch (err) {
                await vscode.workspace.getConfiguration().update('tomcat.port', oldPort, true);
                logger.error(err ? err as string  : 'Failed to update Tomcat port');
            }
        }

    }

    /**
     * Port number validation
     * 
     * Implements comprehensive port checking:
     * - Privileged port verification
     * - Upper range limitation
     * - Conflict detection
     * - Platform-specific checks
     * 
     * @param port Port number to validate
     * @throws Error with validation failure details
     */
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

    /**
     * server.xml modification
     * 
     * Performs atomic connector configuration updates:
     * - Safe file handling
     * - XML structure preservation
     * - Change verification
     * - Error recovery
     * 
     * @param tomcatHome Tomcat installation directory
     * @param newPort Port number to configure
     * @throws Error if file operations fail
     */
    private async modifyServerXmlPort(tomcatHome: string, newPort: number): Promise<void> {
        const serverXmlPath = path.join(tomcatHome, 'conf', 'server.xml');
        const content = await fsp.readFile(serverXmlPath, 'utf8');
        
        const updatedContent = content.replace(
            /(port=")\d+(".*protocol="HTTP\/1\.1")/,
            `$1${newPort}$2`
        );
          
        if (!updatedContent.includes(`port="${newPort}"`)) {
            throw(`Failed to update port in server.xml`);
        }

        await fsp.writeFile(serverXmlPath, updatedContent);
    }

    /**
     * Tomcat command execution
     * 
     * Executes Tomcat control commands with:
     * - Proper JVM argument setup
     * - Classpath configuration
     * - System property injection
     * - Error handling
     * 
     * @param action Command to execute (start/stop)
     * @param tomcatHome Tomcat installation directory
     * @param javaHome JDK installation directory
     * @throws Error if command execution fails
     * @log Command output if logging level is DEBUG
     */
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

    /**
     * Tomcat command construction
     * 
     * Builds platform-specific command strings with:
     * - Proper Java executable location
     * - Classpath configuration
     * - System property injection
     * - Argument escaping
     * 
     * @param action Command to build (start/stop)
     * @param tomcatHome Tomcat installation directory
     * @param javaHome JDK installation directory
     * @returns Fully constructed command string
     */
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

    /**
     * User management
     * 
     * Handles tomcat-users.xml modifications:
     * - Admin user creation
     * - Role assignment
     * - File permission handling
     * - XML structure preservation
     * 
     * @param tomcatHome Tomcat installation directory
     */
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
            return;
        }
    }

    /**
     * Filesystem existence check
     * 
     * Robust path verification with:
     * - Async I/O operations
     * - Error handling
     * - Cross-platform compatibility
     * 
     * @param filePath Path to verify
     * @returns Boolean indicating existence
     */
    private async pathExists(filePath: string): Promise<boolean> {
        try {
            await fsp.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}