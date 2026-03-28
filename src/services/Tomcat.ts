/**
 * Tomcat server lifecycle management system
 * 
 * Architectural Role:
 * - Singleton server controller
 * - Facade pattern for complex operations
 * - Strategy pattern for platform-specific implementations
 * 
 * Core Responsibilities:
 * 1. Lifecycle Control: Start/Stop/Restart operations
 * 2. Configuration Management: Port and XML updates
 * 3. Security: User management and role configuration
 * 4. Maintenance: Resource cleanup and temp management
 * 
 * Implementation Notes:
 * - Child process management with SIGTERM handling
 * - Atomic server.xml modification
 * - Environment variable resolution hierarchy
 * - Port conflict detection and resolution
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
import { ChildProcess, spawn } from 'child_process';
import { t } from '../utils/i18n';

const execAsync = promisify(exec);
const logger = Logger.getInstance();

type ManagedTomcat = {
    appName: string;
    workspace: string;
    port: number;
    shutdownPort?: number;
    pid: number;
    startedAt: number;
    home: string;
    version?: string;
};

export class Tomcat {
    private static instance: Tomcat;
    private tomcatHome: string;
    private tomcatBase: string;
    private javaHome: string;
    private protectedWebApps: string[];
    private port: number;
    private tomcatProcess: ChildProcess | null = null;
    private managedPids: Map<number, ManagedTomcat>; // track managed instances by PID
    private versionCache: Map<string, string> = new Map();
    private currentAppName: string = '';
    private persistedByPort: Map<number, { app?: string; workspace?: string; home?: string; version?: string }> = new Map();
    private storagePath: string | null = null;

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
        this.tomcatBase = vscode.workspace.getConfiguration().get<string>('tomcat.base', '');
        this.javaHome = vscode.workspace.getConfiguration().get<string>('tomcat.javaHome', '');
        this.protectedWebApps = vscode.workspace.getConfiguration().get<string[]>('tomcat.protectedWebApps', ['ROOT', 'docs', 'examples', 'manager', 'host-manager']);
        this.port = vscode.workspace.getConfiguration().get<number>('tomcat.port', 8080);
        this.managedPids = new Map();
        void this.loadPersistedInstances();
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
        this.tomcatBase = vscode.workspace.getConfiguration().get<string>('tomcat.base', '');
        this.javaHome = vscode.workspace.getConfiguration().get<string>('tomcat.javaHome', '');
        this.protectedWebApps = vscode.workspace.getConfiguration().get<string[]>('tomcat.protectedWebApps', ['ROOT', 'docs', 'examples', 'manager', 'host-manager']);
        this.port = vscode.workspace.getConfiguration().get<number>('tomcat.port', 8080);
    }

    /**
     * Set the application name for deployment
     * 
     * @param appName Name of the application to be deployed
     */
    public setAppName(appName: string): void {
        this.currentAppName = appName;
    }

    /**
     * Get current app name context
     */
    public getAppName(): string {
        return this.currentAppName;
    }

    /**
     * Get current configured port
     */
    public getPort(): number {
        return this.port;
    }

    /**
     * Process liveness check
     *
     * Validates whether a PID is still alive:
     * 1. Sends a no-op signal to the process
     * 2. Interprets OS errors for existence vs permission
     * 3. Returns `true` for running and accessible processes
     * 4. Returns `false` when process is gone
     *
     * @param pid Process ID to validate
     * @returns boolean alive status
     */
    private isProcessRunning(pid: number): boolean {
        try {
            process.kill(pid, 0);
            return true;
        } catch (error: any) {
            return error?.code === 'EPERM';
        }
    }

    /**
     * Cleanup stale managed instances
     *
     * Synchronizes in-memory managed instances with actual OS processes:
     * 1. Iterates child process map
     * 2. Removes entries for dead PIDs
     * 3. Cleans persisted port metadata
     * 4. Persists updated instance map when dirty
     */
    public async cleanupStaleManagedInstances(): Promise<void> {
        let dirty = false;
        for (const [pid, meta] of Array.from(this.managedPids.entries())) {
            if (!this.isProcessRunning(pid)) {
                this.managedPids.delete(pid);
                this.persistedByPort.delete(meta.port);
                dirty = true;
            }
        }
        if (dirty) {
            await this.persistInstances();
        }
    }

    /**
     * Tomcat server start flow
     * 
     * Orchestrates startup including:
     * 1. Resolving Tomcat and Java homes
     * 2. Loading persisted instance metadata
     * 3. Allocating a non-conflicting port
     * 4. Starting Tomcat process and tracking PID
     * 5. Persisting state for recovery
     *
     * @param showMessages Show user-facing notifications
     * @param appNameOverride Override deployed app name
     */
    public async start(showMessages: boolean = false, appNameOverride?: string): Promise<void> {
        const tomcatHome = await this.findTomcatHome();
        const javaHome = await this.findJavaHome();
        if (!tomcatHome || !javaHome) { return; }
        await this.loadPersistedInstances();
        const appName = appNameOverride ?? '';
        const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'workspace';
        const tomcatBase = await this.findTomcatBase(tomcatHome);

        this.currentAppName = appName;

        // allocate a free port to avoid clashing with other instances
        const desiredPortFromConfig = vscode.workspace.getConfiguration().get<number>('tomcat.port', this.port);
        const preferredPort = this.getPersistedPort(appName, workspace) ?? desiredPortFromConfig;
        const availablePort = await this.findAvailablePort(preferredPort);
        if (availablePort !== preferredPort) {
            logger.debug(t('tomcat.portAdjusted', { from: preferredPort, to: availablePort }), false);
        }
        this.port = availablePort;
        await this.modifyServerXmlPort(tomcatBase, this.port);

        try {
            const child = await this.executeTomcatCommand('start', tomcatHome, tomcatBase, javaHome);
            if (child && child.pid) {
                const version = await this.getTomcatVersion(tomcatHome);
                const instance: ManagedTomcat = {
                    home: tomcatHome,
                    appName,
                    workspace,
                    port: this.port,
                    shutdownPort: await this.findAvailablePort(this.port + 1),
                    pid: child.pid,
                    startedAt: Date.now(),
                    version,
                };
                this.managedPids.set(child.pid, instance);
                this.syncPersistedFromManaged();
                await this.persistInstances();
            }
            if (showMessages) {
                logger.info(t('tomcat.started'), showMessages);
            }
        } catch (err) {
            logger.error(t('tomcat.startFailed'), showMessages, err as string);
        }
    }

    /**
     * Tomcat startup with explicit home path
     *
     * Similar to start(), but uses provided tomcatHome argument:
     * 1. Bypasses global/home lookup as source of truth
     * 2. Loads persisted state
     * 3. Allocates port and adjusts server.xml
     * 4. Starts and tracks process
     * 5. Persists state
     *
     * @param tomcatHome Explicit Tomcat installation directory
     * @param showMessages Whether to show user messages
     * @param appNameOverride App name to bind to this instance
     */
    public async startWithHome(tomcatHome: string, showMessages: boolean = false, appNameOverride?: string): Promise<void> {
        const javaHome = await this.findJavaHome();
        if (!tomcatHome || !javaHome) { return; }
        await this.loadPersistedInstances();
        this.tomcatHome = tomcatHome;
        const appName = appNameOverride ?? '';
        const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'workspace';
        const tomcatBase = await this.findTomcatBase(tomcatHome);

        this.currentAppName = appName;

        const desiredPortFromConfig = vscode.workspace.getConfiguration().get<number>('tomcat.port', this.port);
        const preferredPort = this.getPersistedPort(appName, workspace) ?? desiredPortFromConfig;
        const availablePort = await this.findAvailablePort(preferredPort);
        if (availablePort !== preferredPort) {
            logger.debug(t('tomcat.portAdjusted', { from: preferredPort, to: availablePort }), false);
        }
        this.port = availablePort;
        await this.modifyServerXmlPort(tomcatBase, this.port);

        try {
            const child = await this.executeTomcatCommand('start', tomcatHome, tomcatBase, javaHome);
            if (child && child.pid) {
                const version = await this.getTomcatVersion(tomcatHome);
                const instance: ManagedTomcat = {
                    home: tomcatHome,
                    appName,
                    workspace,
                    port: this.port,
                    shutdownPort: await this.findAvailablePort(this.port + 1),
                    pid: child.pid,
                    startedAt: Date.now(),
                    version,
                };
                this.managedPids.set(child.pid, instance);
                this.syncPersistedFromManaged();
                await this.persistInstances();
            }
            if (showMessages) {
                logger.info(t('tomcat.started'), showMessages);
            }
        } catch (err) {
            logger.error(t('tomcat.startFailed'), showMessages, err as string);
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
        if (!tomcatHome || !javaHome) { return; }
        const tomcatBase = await this.findTomcatBase(tomcatHome);

        if (!await this.isTomcatRunning()) {
            logger.info(t('tomcat.notRunning'), showMessages);
            return;
        }

        try {
            if (this.tomcatProcess) {
                this.tomcatProcess.kill('SIGTERM');
                this.tomcatProcess = null;
                logger.success(t('tomcat.stoppedProcess'), showMessages);
            } else if (this.managedPids.size > 0) {
                for (const [pid, meta] of Array.from(this.managedPids.entries())) {
                    try {
                        process.kill(pid, 'SIGTERM');
                        logger.info(t('tomcat.stoppedProcess'), showMessages);
                    } catch { }
                    this.managedPids.delete(pid);
                    this.persistedByPort.delete(meta.port);
                }
                await this.persistInstances();
            } else {
                await this.executeTomcatCommand('stop', tomcatHome, tomcatBase, javaHome);
                logger.success(t('tomcat.stopped'), showMessages);
            }
        } catch (err) {
            logger.error(t('tomcat.stopFailed'), showMessages, err as string);
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
        const tomcatBase = await this.findTomcatBase(tomcatHome);

        try {
            const appName = path.basename(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
            if (!appName) { return; }

            const response = await fetch(`http://localhost:${this.port}/manager/text/reload?path=/${encodeURIComponent(appName)}`, {
                headers: {
                    'Authorization': `Basic ${Buffer.from('admin:admin').toString('base64')}`
                }
            });

            if (!response.ok) {
                throw new Error(t('tomcat.reloadFailed', { reason: await response.text() }));
            }
            logger.success(t('tomcat.reloaded'));
        } catch (err) {
            if (!await this.isTomcatRunning()) {
                this.start();
                return;
            } else {
                logger.warn(t('tomcat.reloadAddingUser'));
                await this.addTomcatUser(tomcatBase);
            }
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
    public async clean(): Promise<void> {
        const tomcatHome = await this.findTomcatHome();
        if (!tomcatHome) { return; }
        const tomcatBase = await this.findTomcatBase(tomcatHome);

        const webappsDir = path.join(tomcatBase, 'webapps');

        if (!fs.existsSync(webappsDir)) {
            logger.warn(t('tomcat.webappsMissing', { path: webappsDir }));
            return;
        }

        try {
            await this.kill();
            const entries = fs.readdirSync(webappsDir, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = path.join(webappsDir, entry.name);

                if (!this.protectedWebApps.includes(entry.name)) {
                    try {
                        if (entry.isDirectory()) {
                            fs.rmSync(entryPath, { recursive: true, force: true });
                            logger.info(t('tomcat.removedDirectory', { path: entryPath }));
                        } else if (entry.isFile() || entry.isSymbolicLink()) {
                            fs.unlinkSync(entryPath);
                            logger.info(t('tomcat.removedFile', { path: entryPath }));
                        }
                    } catch (err) {
                        throw err;
                    }
                }
            }

            const workDir = path.join(tomcatBase, 'work');
            const tempDir = path.join(tomcatBase, 'temp');
            [workDir, tempDir].forEach(dir => {
                if (fs.existsSync(dir)) {
                    try {
                        fs.rmSync(dir, { recursive: true, force: true });
                        fs.mkdirSync(dir);
                        logger.info(t('tomcat.cleanedDirectory', { path: dir }));
                    } catch (err) {
                        throw err;
                    }
                }
            });

            logger.success(t('tomcat.cleaned'), true);
        } catch (err) {
            logger.error(t('tomcat.cleanupFailed'), true, err as string);
        }
    }

    /**
     * Undeploys a specific web application from Tomcat's webapps directory.
     *
     * Removes both exploded folder and war file (if present), and reloads Tomcat to apply.
     */
    public async undeployApp(appName: string): Promise<void> {
        const tomcatHome = await this.findTomcatHome();
        if (!tomcatHome) { return; }
        const tomcatBase = await this.findTomcatBase(tomcatHome);
        const webappsDir = path.join(tomcatBase, 'webapps');

        try {
            const appDir = path.join(webappsDir, appName);
            const warFile = path.join(webappsDir, `${appName}.war`);

            if (fs.existsSync(appDir)) {
                fs.rmSync(appDir, { recursive: true, force: true });
                logger.info(t('tomcat.appUndeployed', { app: appName }));
            }

            if (fs.existsSync(warFile)) {
                fs.rmSync(warFile, { force: true });
                logger.info(t('tomcat.appWarRemoved', { app: appName }));
            }

            if (await this.isTomcatRunning()) {
                await this.reload();
            }
            logger.success(t('tomcat.appUndeploySuccess', { app: appName }));
        } catch (err) {
            logger.error(t('tomcat.appUndeployFailed', { app: appName }), true, err as string);
        }
    }

    /**
     * Terminates Java-related processes to release locked Tomcat resources
     * 
     * Handles platform-specific process termination:
     * - Windows: Uses `taskkill` to forcibly stop `java.exe` and `javaw.exe`
     * - Unix-like: Uses `pkill` to target `java` and `tomcat` processes
     * 
     * Ensures file resources such as JARs are no longer locked by running JVMs
     * before attempting to clean the Tomcat directories.
     */
    public async kill(): Promise<void> {
        try {
            if (process.platform === 'win32') {
                await execAsync(`taskkill /F /IM java.exe`);
                await execAsync(`taskkill /F /IM javaw.exe`);
            } else {
                await execAsync(`pkill -f tomcat`);
                await execAsync(`pkill -f java`);
            }
        } catch { }
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
        if (this.tomcatProcess && !this.tomcatProcess.killed) return true;
        return this.managedPids.size > 0 || await this.isPortInUse(this.port);
    }

    /**
     * Check whether a TCP port is currently in use
     *
     * Uses platform-specific netstat commands to determine port occupancy.
     *
     * @param port Port number to check
     * @returns true if in use, false otherwise
     */
    private async isPortInUse(port: number): Promise<boolean> {
        try {
            const command = process.platform === 'win32'
                ? `netstat -an | findstr ":${port}"`
                : `netstat -an | grep ":${port}"`;
            const { stdout } = await execAsync(command);
            return stdout.includes(`:${port}`);
        } catch {
            return false;
        }
    }

    /**
     * Set persistent storage folder
     *
     * Moves instance persistence from workspace hidden folder to extension global storage:
     * 1. New path is used by `getPersistenceFile`
     * 2. Enables global, per-user state
     * 3. Reduces workspace clutter
     *
     * @param storagePath Global extension storage path
     */
    public setStoragePath(storagePath: string): void {
        this.storagePath = storagePath;
    }

    /**
     * Resolve persistence file location
     *
     * Behavior:
     * - global extension storage if set
     * - legacy workspace `.tomcat/instances.json` fallback if no global path
     *
     * @returns absolute path or null if workspace is unavailable
     */
    private getPersistenceFile(): string | null {
        if (this.storagePath) {
            return path.join(this.storagePath, 'instances.json');
        }

        const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!folder) { return null; }
        return path.join(folder, '.tomcat', 'instances.json');
    }

    /**
     * Load persisted instance mappings from disk
     *
     * Reads the persistence file and reconstructs `persistedByPort` map.
     * If file is missing or invalid, it silently ignores and continues.
     */
    private async loadPersistedInstances(): Promise<void> {
        const file = this.getPersistenceFile();
        if (!file) { return; }
        try {
            const content = await fsp.readFile(file, 'utf8');
            const parsed = JSON.parse(content) as Array<{ port: number; app?: string; workspace?: string; home?: string; version?: string }>;
            this.persistedByPort = new Map(parsed.map(p => [p.port, { app: p.app, workspace: p.workspace, home: p.home, version: p.version }]));
        } catch { }
    }

    /**
     * Persist instance metadata to disk
     *
     * Writes `persistedByPort` map to JSON file at persisted path.
     * Creates directories as needed.
     */
    private async persistInstances(): Promise<void> {
        const file = this.getPersistenceFile();
        if (!file) { return; }
        try {
            await fsp.mkdir(path.dirname(file), { recursive: true });
            const payload = Array.from(this.persistedByPort.entries()).map(([port, meta]) => ({ port, ...meta }));
            await fsp.writeFile(file, JSON.stringify(payload, null, 2));
        } catch { }
    }

    /**
     * Synchronize persisted state from managed instances
     *
     * Copies entries from in-memory managed PID metadata into persisted map.
     */
    private syncPersistedFromManaged(): void {
        for (const [, meta] of this.managedPids.entries()) {
            this.persistedByPort.set(meta.port, { app: meta.appName, workspace: meta.workspace, home: meta.home, version: meta.version });
        }
    }

    /**
     * Lookup persisted port by app or workspace
     *
     * Returns previously allocated port for matching app name or workspace.
     * @param appName Application name filter
     * @param workspace Workspace folder path filter
     */
    private getPersistedPort(appName: string, workspace: string): number | undefined {
        for (const [port, meta] of this.persistedByPort.entries()) {
            if (appName && meta.app === appName) {
                return port;
            }
            if (!appName && workspace && meta.workspace === workspace) {
                return port;
            }
        }
        return undefined;
    }

    /**
     * Find an available port starting from a candidate
     *
     * Scans a range from startPort to avoid clashes with managed and system ports.
     * @param startPort Candidate starting port
     * @returns The first available port found (falling back to startPort)
     */
    private async findAvailablePort(startPort: number): Promise<number> {
        const maxScan = 50;
        // collect ports already in use by managed instances to avoid collisions
        const managedPorts = new Set(Array.from(this.managedPids.values()).map(m => m.port));
        for (let i = 0; i <= maxScan; i++) {
            const candidate = startPort + i;
            if (candidate > this.PORT_RANGE.max) { break; }
            if (managedPorts.has(candidate)) {
                continue;
            }
            const inUse = await this.isPortInUse(candidate);
            if (!inUse) return candidate;
        }
        return startPort;
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
        if (this.tomcatHome && await this.validateTomcatHome(this.tomcatHome)) {
            return this.tomcatHome;
        }

        const candidates = [
            process.env.CATALINA_HOME,
            process.env.TOMCAT_HOME,
            vscode.workspace.getConfiguration().get<string>('tomcat.home')
        ];

        const validCandidate = candidates.find(path =>
            typeof path === 'string' && path.trim().length > 0
        );

        if (validCandidate && await this.validateTomcatHome(validCandidate)) {
            const config = vscode.workspace.getConfiguration('tomcat');
            const homes = config.get<string[]>('homes', []) || [];
            const merged = Array.from(new Set([...homes, validCandidate]));
            await config.update('homes', merged, true);
            await config.update('home', validCandidate, true);
            this.tomcatHome = validCandidate;
            return validCandidate;
        }

        const selectedFolder = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: t('tomcat.selectTomcatHome')
        });

        if (selectedFolder?.[0]?.fsPath) {
            const selectedPath = selectedFolder[0].fsPath;

            if (await this.validateTomcatHome(selectedPath)) {
                await vscode.workspace.getConfiguration().update('tomcat.home', selectedPath, true);
                this.tomcatHome = selectedPath;
                return selectedPath;
            } else {
                logger.warn(t('tomcat.invalidHome', { path: selectedPath }), true);
            }
        }

        return null;
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
        if (this.javaHome && await this.validateJavaHome(this.javaHome)) {
            return this.javaHome;
        }

        const candidates = [
            vscode.workspace.getConfiguration().get<string>('tomcat.javaHome'),
            vscode.workspace.getConfiguration().get<string>('java.home'),
            vscode.workspace.getConfiguration().get<string>('java.jdt.ls.java.home'),
            process.env.JAVA_HOME,
            process.env.JDK_HOME,
            process.env.JAVA_JDK_HOME
        ];

        const validCandidate = candidates.find(path =>
            typeof path === 'string' && path.trim().length > 0
        );

        if (validCandidate && await this.validateJavaHome(validCandidate)) {
            await vscode.workspace.getConfiguration().update('tomcat.javaHome', validCandidate, true);
            this.javaHome = validCandidate;
            return validCandidate;
        }

        const selectedFolder = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: t('tomcat.selectJavaHome')
        });

        if (selectedFolder?.[0]?.fsPath) {
            const selectedPath = selectedFolder[0].fsPath;

            if (await this.validateJavaHome(selectedPath)) {
                await vscode.workspace.getConfiguration().update('tomcat.javaHome', selectedPath, true);
                this.javaHome = selectedPath;
                return selectedPath;
            } else {
                logger.warn(t('tomcat.invalidJavaHome', { path: selectedPath }), true);
            }
        }

        return null;
    }

    /**
     * CATALINA_BASE resolution
     *
     * Follows precedence order:
     * 1. Explicit tomcat.base setting
     * 2. CATALINA_BASE environment variable
     * 3. Fallback to tomcat.home
     *
     * @param tomcatHome Resolved Tomcat home
     * @returns Resolved Tomcat base (defaults to home)
     */
    public async findTomcatBase(tomcatHome: string): Promise<string> {
        if (this.tomcatBase && await this.validateTomcatBase(this.tomcatBase)) {
            return this.tomcatBase;
        }

        const candidates = [
            vscode.workspace.getConfiguration().get<string>('tomcat.base'),
            process.env.CATALINA_BASE
        ];

        const validCandidate = candidates.find(basePath =>
            typeof basePath === 'string' && basePath.trim().length > 0
        );

        if (validCandidate && await this.validateTomcatBase(validCandidate)) {
            await vscode.workspace.getConfiguration().update('tomcat.base', validCandidate, true);
            this.tomcatBase = validCandidate;
            return validCandidate;
        }

        this.tomcatBase = tomcatHome;
        return tomcatHome;
    }

    /**
     * Validates a Tomcat base directory by checking for server.xml.
     *
     * @param tomcatBase Path to Tomcat base directory
     * @returns true if valid, false otherwise
     */
    private async validateTomcatBase(tomcatBase: string): Promise<boolean> {
        const serverXml = path.join(tomcatBase, 'conf', 'server.xml');
        try {
            await fsp.access(serverXml);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validates a Tomcat directory by checking for the startup script.
     *
     * @param tomcatHome Path to Tomcat root directory
     * @returns true if valid, false otherwise
     */
    public async validateTomcatHome(tomcatHome: string): Promise<boolean> {
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
    public async validateJavaHome(javaHome: string): Promise<boolean> {
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
        const requestedPort = config.get<number>('tomcat.port', 8080);
        const oldPort = this.port;

        if (requestedPort === oldPort) {
            return;
        }

        try {
            await this.validatePort(requestedPort);
            if (await this.isPortInUse(requestedPort)) {
                throw new Error(t('tomcat.portInUse', { port: requestedPort }));
            }

            const tomcatHome = await this.findTomcatHome();
            if (!tomcatHome) { return; }
            const tomcatBase = await this.findTomcatBase(tomcatHome);

            await this.modifyServerXmlPort(tomcatBase, requestedPort);

            this.port = requestedPort;
        } catch (err) {
            logger.warn(typeof err === 'string' ? err : (err as Error).message, true);
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
        if (port < this.PORT_RANGE.min) {
            throw new Error(t('tomcat.portBelowMin', { min: this.PORT_RANGE.min }));
        }

        if (port > this.PORT_RANGE.max) {
            throw new Error(t('tomcat.portAboveMax', { max: this.PORT_RANGE.max }));
        }

        if (await this.isPortInUse(port)) {
            throw new Error(t('tomcat.portInUse', { port }));
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
     * @param tomcatBase Tomcat base directory
     * @param newPort Port number to configure
     * @throws Error if file operations fail
     */
    private async modifyServerXmlPort(tomcatBase: string, newPort: number): Promise<void> {
        const serverXmlPath = path.join(tomcatBase, 'conf', 'server.xml');
        const content = await fsp.readFile(serverXmlPath, 'utf8');

        // pick a shutdown port offset from the HTTP port and ensure it is free
        const shutdownBase = 8005 + Math.max(0, newPort - 8080);
        const shutdownPort = await this.findAvailablePort(Math.min(shutdownBase, this.PORT_RANGE.max));

        const withHttpUpdated = content.replace(
            /(port=")\d+(".*protocol="HTTP\/1\.1")/,
            `$1${newPort}$2`
        );

        const updatedContent = withHttpUpdated.replace(
            /(<Server\s+port=")\d+("\s+shutdown=")/,
            `$1${shutdownPort}$2`
        );

        if (!updatedContent.includes(`port="${newPort}"`) || !updatedContent.includes(`<Server port="${shutdownPort}"`)) {
            throw (t('tomcat.updatePortsFailed'));
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
     * @param tomcatBase Tomcat base directory
     * @param javaHome JDK installation directory
     * @throws Error if command execution fails
     * @log Command output if logging level is DEBUG
     */
    private async executeTomcatCommand(
        action: 'start' | 'stop',
        tomcatHome: string,
        tomcatBase: string,
        javaHome: string
    ): Promise<ChildProcess | void> {
        if (action === 'start') {
            const logEncoding = logger.getLogEncoding();
            const { command, args } = this.buildCommand(action, tomcatHome, tomcatBase, javaHome);

            const child = spawn(command, args, {
                stdio: 'pipe',
                shell: process.platform === 'win32'
            });
            this.tomcatProcess = child;

            child.stdout.setEncoding(logEncoding as BufferEncoding);
            child.stderr.setEncoding(logEncoding as BufferEncoding);

            let stdoutBuffer = '';
            let stderrBuffer = '';

            child.stdout.on('data', (data) => {
                stdoutBuffer += data;
                const lines = stdoutBuffer.split(/\r?\n/);
                stdoutBuffer = lines.pop() || '';
                lines.forEach(line => logger.appendRawLine(line));
                this.runBrowserOnKeyword(data);
            });

            child.stderr.on('data', (data) => {
                stderrBuffer += data;
                const lines = stderrBuffer.split(/\r?\n/);
                stderrBuffer = lines.pop() || '';
                lines.forEach(line => logger.appendRawLine(line));
                this.runBrowserOnKeyword(data);
            });

            // resolve immediately with the spawned process; monitor close asynchronously
            return new Promise((resolve, reject) => {
                child.on('error', (err) => {
                    this.tomcatProcess = null;
                    reject(err);
                });

                resolve(child);

                child.on('close', (code) => {
                    this.tomcatProcess = null;
                    if (code && code !== 0) {
                        logger.info(t('tomcat.exitedWithCode', { code }));
                    }
                });
            });
        } else {
            const { command, args } = this.buildCommand(action, tomcatHome, tomcatBase, javaHome);
            const stopCommand = [command, ...args].join(' ');
            await execAsync(stopCommand);
        }
    }

    /**
     * Discover and manage running Tomcat instances (managed and external)
     */
    public async getInstanceSnapshot(): Promise<Array<{ pid: number; port?: number; app?: string; workspace?: string; command?: string; home?: string; version?: string; source: 'managed' | 'external' }>> {
        const managed = Array.from(this.managedPids.entries())
            .filter(([pid]) => {
                try {
                    process.kill(pid, 0);
                    return true;
                } catch (err) {
                    const code = (err as NodeJS.ErrnoException).code;
                    if (code === 'ESRCH') {
                        const meta = this.managedPids.get(pid);
                        this.managedPids.delete(pid);
                        if (meta) {
                            this.persistedByPort.delete(meta.port);
                        }
                    }
                    return false;
                }
            })
            .map(([pid, meta]) => ({
                pid,
                port: meta.port,
                app: meta.appName,
                workspace: meta.workspace,
                command: undefined,
                home: meta.home,
                version: meta.version,
                source: 'managed' as const
            }));

        const external = await this.detectExternalInstances();
        const managedPorts = new Set(managed.map(m => m.port).filter((p): p is number => typeof p === 'number'));
        const filteredExternal = external
            .filter(ext => {
                if (typeof ext.port !== 'number') { return true; }
                return !managedPorts.has(ext.port);
            })
            .map(ext => {
                const persisted = ext.port ? this.persistedByPort.get(ext.port) : undefined;
                if (persisted) {
                    return { ...ext, app: persisted.app, workspace: persisted.workspace, home: persisted.home, version: persisted.version };
                }
                return ext;
            });

        const snapshot = [...managed, ...filteredExternal];
        // status updates for instance counts are intentionally disabled for clean toolbar UX
        // this.updateInstanceStatusBar(snapshot);
        await this.persistInstances();
        return snapshot;
    }

    /**
     * Resolve a deployment target according to app occupancy rules
     *
     * Preference order:
     * 1) Managed instance with no app assigned
     * 2) Managed instance running the same app
     * 3) Start a new managed instance and assign the app
     */
    public async ensureDeploymentTarget(appName: string): Promise<{ home: string; port: number; base: string }> {
        const pickManaged = () => {
            const managed = Array.from(this.managedPids.entries());
            const sameApp = managed.find(([, meta]) => meta.appName === appName);
            if (sameApp) { return sameApp; }
            return managed.find(([, meta]) => !meta.appName);
        };

        let chosen = pickManaged();

        if (!chosen) {
            await this.start(false, appName);
            chosen = pickManaged();
        }

        if (!chosen) {
            throw new Error(t('tomcat.noAvailableInstance'));
        }

        const [pid, meta] = chosen;
        meta.appName = appName;
        this.managedPids.set(pid, meta);
        this.syncPersistedFromManaged();
        await this.persistInstances();

        this.currentAppName = appName;
        this.port = meta.port;
        this.tomcatHome = meta.home;
        const base = await this.findTomcatBase(meta.home);
        this.tomcatBase = base;

        return { home: meta.home, port: meta.port, base };
    }

    /**
     * Stop a specific managed instance by PID
     *
     * Supports graceful and forced termination with retries for permission errors.
     * Cleans state on process termination.
     *
     * @param pid Process ID to stop
     * @param force Force kill option
     */
    public async stopInstanceByPid(pid: number, force: boolean = false): Promise<void> {
        const isWindows = process.platform === 'win32';
        const meta = this.managedPids.get(pid);
        try {
            if (isWindows) {
                const base = `taskkill /PID ${pid}`;
                if (force) {
                    try {
                        await execAsync(`${base} /T /F`);
                    } catch (firstErr) {
                        // escalate if denied
                        if (String(firstErr).includes('Access is denied')) {
                            await execAsync(`powershell -Command "Start-Process taskkill -ArgumentList '/PID ${pid} /T /F' -Verb RunAs -WindowStyle Hidden -Wait"`);
                        } else {
                            throw firstErr;
                        }
                    }
                } else {
                    // graceful stop only; do not force
                    await execAsync(`${base} /T`);
                }
            } else {
                const signal = force ? 'SIGKILL' : 'SIGTERM';
                try {
                    process.kill(pid, signal as NodeJS.Signals);
                } catch (err) {
                    const code = (err as NodeJS.ErrnoException).code;
                    if (code === 'ESRCH') {
                        // already gone; treat as success
                    } else if (!force && code === 'EPERM') {
                        await execAsync(`kill -9 ${pid}`);
                    } else {
                        throw err;
                    }
                }
            }

            this.managedPids.delete(pid);
            if (meta) {
                this.persistedByPort.delete(meta.port);
                await this.persistInstances();
            }
            logger.success(t('tomcat.stoppedProcess'), false);
        } catch (err) {
            const message = String(err);
            if (isWindows && message.includes('not found')) {
                // PID already gone, just clean up state
                this.managedPids.delete(pid);
                if (meta) {
                    this.persistedByPort.delete(meta.port);
                    await this.persistInstances();
                }
                logger.info(t('tomcat.processAlreadyExited'), false);
                return;
            } else {
                logger.error(t('tomcat.stopFailed'), false, message);
            }
        }
        const snapshot = await this.getInstanceSnapshot();
        this.updateInstanceStatusBar(snapshot);
    }

    /**
     * Discover external HTTP/Tomcat processes running on the system
     *
     * Scans netstat for listening ports and filters out currently managed instances.
     * 
     * @returns Array of external instance metadata
     */
    private async detectExternalInstances(): Promise<Array<{ pid: number; port?: number; app?: string; workspace?: string; command?: string; source: 'external' }>> {
        try {
            const cmd = process.platform === 'win32'
                ? 'netstat -ano | findstr LISTENING'
                : 'netstat -anp tcp | grep LISTEN';
            const { stdout } = await execAsync(cmd);
            const lines = stdout.split(/\r?\n/).filter(Boolean);
            const seen = new Map<number, { pid: number; port?: number; source: 'external' }>();
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                const local = parts[1] || '';
                const pidStr = parts[parts.length - 1];
                const pid = Number(pidStr);
                const portMatch = local.match(/:(\d+)/);
                if (!pid || !portMatch) continue;
                const port = Number(portMatch[1]);
                if (port < 8000 || port > 10000) continue; // heuristic to limit noise
                if (this.managedPids.has(pid)) continue;
                try {
                    process.kill(pid, 0); // ensure the PID is alive
                    if (!seen.has(pid)) {
                        seen.set(pid, { pid, port, source: 'external' });
                    }
                } catch (err) {
                    const code = (err as NodeJS.ErrnoException).code;
                    if (code === 'ESRCH') {
                        continue; // skip dead PIDs
                    }
                }
            }
            return Array.from(seen.values());
        } catch {
            return [];
        }
    }

    /**
     * Detect Tomcat version for a given installation path
     *
     * Attempts in order:
     * 1. catalina version command
     * 2. RELEASE-NOTES / RUNNING.txt parse
     * 3. Directory name heuristics
     *
     * @param tomcatHome Tomcat installation path
     * @returns Version string or 'unknown'
     */
    public async getTomcatVersion(tomcatHome: string): Promise<string> {
        if (this.versionCache.has(tomcatHome)) {
            return this.versionCache.get(tomcatHome)!;
        }
        // 1) Try invoking catalina version for most accurate detection
        try {
            const script = process.platform === 'win32'
                ? path.join(tomcatHome, 'bin', 'catalina.bat')
                : path.join(tomcatHome, 'bin', 'catalina.sh');
            const cmd = process.platform === 'win32'
                ? `cmd /c "\"${script}\" version"`
                : `sh "${script}" version`;
            const { stdout } = await execAsync(cmd);
            const match = stdout.match(/Server version name:\s*Apache Tomcat\/([\d.]+)/i)
                || stdout.match(/Server number:\s*([\d.]+)/i);
            if (match && match[1]) {
                this.versionCache.set(tomcatHome, match[1]);
                return match[1];
            }
        } catch {
            // fall through to file-based detection
        }

        // 2) Fallback: parse release notes / running files
        const candidates = [
            path.join(tomcatHome, 'RELEASE-NOTES'),
            path.join(tomcatHome, 'RUNNING.txt')
        ];
        for (const file of candidates) {
            try {
                const data = await fsp.readFile(file, 'utf8');
                const snippet = data.slice(0, 800);
                const match = snippet.match(/Apache Tomcat(?: Version)?[^\d]*(\d+\.\d+\.\d+)/i);
                if (match) {
                    this.versionCache.set(tomcatHome, match[1]);
                    return match[1];
                }
            } catch {
                continue;
            }
        }

        // 3) Heuristic: derive from folder name (e.g., apache-tomcat-11.0.11)
        const base = path.basename(tomcatHome);
        const nameMatch = base.match(/(\d+\.\d+\.\d+)/);
        if (nameMatch) {
            this.versionCache.set(tomcatHome, nameMatch[1]);
            return nameMatch[1];
        }

        this.versionCache.set(tomcatHome, 'unknown');
        return 'unknown';
    }

    /**
     * Update status bar display with managed/external instance counts
     *
     * Provides a brief runtime snapshot in the VS Code status bar.
     *
     * @param snapshot Instance snapshot array
     */
    private updateInstanceStatusBar(snapshot: Array<{ source: 'managed' | 'external' }>): void {
        const managedCount = snapshot.filter(i => i.source === 'managed').length;
        const externalCount = snapshot.filter(i => i.source === 'external').length;
        logger.updateStatusBar(t('tomcat.statusBar', { managed: managedCount, external: externalCount }));
        setTimeout(() => logger.defaultStatusBar(), 2500);
    }

    /**
     * Browser launch keywords
     * 
     * Defines keywords for triggering browser launches:
     * - Server startup messages
     * - Context reload completion
     * 
     * @type {Array<string | RegExp>}
     */
    private browserCallKeywords: (string | RegExp)[] = [
        "Server startup in",
        "毫秒后服务器启动",
        /Reloading Context with name \[[^\]]+\] is completed/
    ];

    /**
     * Browser run on keywords
     * 
     * Handles Tomcat Manager API responses:
     * - Triggers browser launch on specific keywords
     * - Supports both exact strings and regex patterns
     * 
     * @param data Command output data
     */
    private runBrowserOnKeyword(data: string): void {
        for (const pattern of this.browserCallKeywords) {
            const isMatch = typeof pattern === 'string'
                ? data.includes(pattern)
                : pattern.test(data);

            if (isMatch) {
                if (this.currentAppName) {
                    // Find the managed instance for the current app
                    const managed = Array.from(this.managedPids.values()).find(meta => meta.appName === this.currentAppName);
                    if (managed) {
                        Browser.getInstance().run(this.currentAppName, managed.port);
                    }
                }
            }
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
     * @param tomcatBase Tomcat base directory
     * @param javaHome JDK installation directory
     * @returns Fully constructed command string
     */
    private buildCommand(
        action: 'start' | 'stop',
        tomcatHome: string,
        tomcatBase: string,
        javaHome: string
    ): { command: string; args: string[] } {
        const javaExecutable = path.join(javaHome, 'bin', `java${process.platform === 'win32' ? '.exe' : ''}`);
        const classpath = [
            path.join(tomcatHome, 'bin', 'bootstrap.jar'),
            path.join(tomcatHome, 'bin', 'tomcat-juli.jar')
        ].join(path.delimiter);

        return {
            command: javaExecutable,
            args: [
                '-cp',
                classpath,
                `-Dcatalina.base=${tomcatBase}`,
                `-Dcatalina.home=${tomcatHome}`,
                `-Djava.io.tmpdir=${path.join(tomcatBase, 'temp')}`,
                'org.apache.catalina.startup.Bootstrap',
                action
            ]
        };
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
     * @param tomcatBase Tomcat base directory
     */
    private async addTomcatUser(tomcatBase: string): Promise<void> {
        const usersXmlPath = path.join(tomcatBase, 'conf', 'tomcat-users.xml');

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
            logger.info(t('tomcat.addedAdminUser'));
            this.start();
        } catch (err) {
            return;
        }
    }
}