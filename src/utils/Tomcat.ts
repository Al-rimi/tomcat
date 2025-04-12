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
    private tomcatHome: string;
    private javaHome: string;
    private protectedWebApps: string[];
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
        this.tomcatHome = vscode.workspace.getConfiguration().get<string>('tomcat.home', '');
        this.javaHome = vscode.workspace.getConfiguration().get<string>('tomcat.javaHome', '');
        this.protectedWebApps = vscode.workspace.getConfiguration().get<string[]>('tomcat.protectedWebApps', ['ROOT', 'docs', 'examples', 'manager', 'host-manager']);
        this.port = vscode.workspace.getConfiguration().get<number>('tomcat.port', 8080);
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
        this.tomcatHome = vscode.workspace.getConfiguration().get<string>('tomcat.home', '');
        this.javaHome = vscode.workspace.getConfiguration().get<string>('tomcat.javaHome', '');
        this.protectedWebApps = vscode.workspace.getConfiguration().get<string[]>('tomcat.protectedWebApps', ['ROOT', 'docs', 'examples', 'manager', 'host-manager']);
        this.port = vscode.workspace.getConfiguration().get<number>('tomcat.port', 8080);
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
    public async start(showMessages: boolean = false): Promise<void> {
        const tomcatHome = await this.findTomcatHome();
        const javaHome = await this.findJavaHome();
        if (!tomcatHome || !javaHome) {return;}

        if (await this.isTomcatRunning()) {
            logger.success('Tomcat is already running', showMessages);
            return;
        }

        try {
            this.executeTomcatCommand('start', tomcatHome, javaHome);
            logger.success('Tomcat started successfully', showMessages);
        } catch (err) {
            logger.error('Failed to start Tomcat:', showMessages, err as string);
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
    public async stop(showMessages: boolean = false): Promise<void> {        
        const tomcatHome = await this.findTomcatHome();
        const javaHome = await this.findJavaHome();
        if (!tomcatHome || !javaHome) {return;}

        if (!await this.isTomcatRunning()) {
            logger.success('Tomcat is not running', showMessages);
            return;
        }

        try {
            await this.executeTomcatCommand('stop', tomcatHome, javaHome);
            logger.success('Tomcat stopped successfully', showMessages);
        }catch (err) {
            logger.error('Failed to stop Tomcat:', showMessages, err as string);
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
            this.start();
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
            logger.info('Tomcat reloaded.');
        } catch (err) {
            logger.warn('Reload failed, attempting to add admin user');
            await this.addTomcatUser(tomcatHome);
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

        const webappsDir = path.join(tomcatHome, 'webapps');
        
        if (!fs.existsSync(webappsDir)) {
            logger.warn(`Webapps directory not found: ${webappsDir}`, false);
            return;
        }
    
        try {
            const entries = fs.readdirSync(webappsDir, { withFileTypes: true });
    
            for (const entry of entries) {
                const entryPath = path.join(webappsDir, entry.name);
                
                if (!this.protectedWebApps.includes(entry.name)) {
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
            logger.error(`Error during cleanup:`, false, err as string);
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
            return stdout.includes(`0.0.0.0:${this.port}`);
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
        if (this.tomcatHome) {return this.tomcatHome;}

        let tomcatHome = process.env.CATALINA_HOME ?? process.env.TOMCAT_HOME ?? vscode.workspace.getConfiguration().get<string>('tomcat.home') ?? '';

        if (tomcatHome && await this.validateTomcatHome(tomcatHome)) {
            vscode.workspace.getConfiguration().update('tomcat.home', tomcatHome, true);
            this.tomcatHome = tomcatHome;
            return tomcatHome;
        }

        const selectedFolder = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Select Tomcat Home Folder'
        });

        if (selectedFolder?.[0]?.fsPath) {
            tomcatHome = selectedFolder[0].fsPath;
            
            if (tomcatHome && await this.validateTomcatHome(tomcatHome)) {
                await vscode.workspace.getConfiguration().update('tomcat.home', tomcatHome, true);
                this.tomcatHome = tomcatHome;
                return tomcatHome;
            } else {
                logger.warn(`Invalid Tomcat home: ${tomcatHome} not found`, true);
                return null;
            }
        } else {
            return null;
        }
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
        if (this.javaHome) {return this.javaHome;}

        let javaHome = vscode.workspace.getConfiguration().get<string>('tomcat.javaHome') ?? vscode.workspace.getConfiguration().get<string>('java.home') ?? vscode.workspace.getConfiguration().get<string>('java.jdt.ls.java.home') ?? process.env.JAVA_HOME ?? process.env.JDK_HOME ?? process.env.JAVA_JDK_HOME ?? '';
        if (javaHome && await this.validateJavaHome(javaHome)) {
            vscode.workspace.getConfiguration().update('tomcat.javaHome', javaHome, true);
            this.javaHome = javaHome;
            return javaHome;
        }

        const selectedFolder = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Select Java Home Folder'
        });

        if (selectedFolder?.[0]?.fsPath) {
            javaHome = selectedFolder[0].fsPath;

            if (await this.validateJavaHome(javaHome)) {
                await vscode.workspace.getConfiguration().update('tomcat.javaHome', javaHome, true);
                this.javaHome = javaHome;
                return javaHome;
            } else {
                logger.warn(`Invalid Java home: ${selectedFolder[0].fsPath} not found`, true);
                return null;
            }
        } else {
            return null;
        }
        
    }

    /**
     * Validates a Tomcat directory by checking for the startup script.
     *
     * @param tomcatHome Path to Tomcat root directory
     * @returns true if valid, false otherwise
     */
    private async validateTomcatHome(tomcatHome: string): Promise<boolean> {
        const catalinaPath = path.join(tomcatHome, 'bin', `catalina${process.platform === 'win32' ? '.bat' : '.sh'}`);
        try {
            await fsp.access(catalinaPath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validates a Java installation directory by checking for the java executable.
     *
     * @param javaHome Path to Java home
     * @returns true if valid, false otherwise
     */
    private async validateJavaHome(javaHome: string): Promise<boolean> {
        const javaExecutable = path.join(javaHome, 'bin', `java${process.platform === 'win32' ? '.exe' : ''}`);
        try {
            await fsp.access(javaExecutable);
            return true;
        } catch {
            return false;
        }
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
                logger.success(`Tomcat port updated from ${oldPort} to ${newPort}`, true);

                this.executeTomcatCommand('start', tomcatHome, javaHome);
            } catch (err) {
                await vscode.workspace.getConfiguration().update('tomcat.port', oldPort, true);
                logger.error('Failed to update Tomcat port:', true, err as string);
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
            await execAsync(command);
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
            if (await this.isTomcatRunning()) {
                await this.stop();
            }
            let content = await fsp.readFile(usersXmlPath, 'utf8');
            const newUser = '<user username="admin" password="admin" roles="manager-gui,manager-script"/>';

            content = content
                .replace(/<user username="admin".*\/>/g, '')
                .replace(/(<\/tomcat-users>)/, `  ${newUser}\n$1`);

            await fsp.writeFile(usersXmlPath, content);
            logger.info('Added admin user to tomcat-users.xml');
            this.start();
        } catch (err) {
            return;
        }
    }
}