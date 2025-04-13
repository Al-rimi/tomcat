/**
 * Logger.ts - Integrated Logging and Tomcat Deployment Management System
 *
 * Unified facility combining advanced logging capabilities with Tomcat server management
 * features. Provides real-time monitoring of deployment operations and access logs
 * through tight VS Code integration.
 *
 * Key Functionalities:
 * - Multi-level logging with UI integration
 * - Tomcat deployment mode management
 * - Access log file monitoring
 * - Status bar interaction system
 * - Configuration synchronization
 *
 * Architecture Highlights:
 * - Singleton service management
 * - Event-driven log file watching
 * - Disposable pattern for resource cleanup
 * - Observer pattern for status updates
 * - Asynchronous file system operations
 *
 * Core Operational Components:
 * 1. Logging Subsystem:
 *    - DEBUG: Development diagnostics
 *    - INFO: Operational milestones
 *    - WARN: Non-critical issues
 *    - ERROR: Critical failures
 *    - SUCCESS: Deployment confirmations
 *    - HTTP: Access log processing
 *
 * 2. Deployment Management:
 *    - Status bar mode indicator
 *    - Deployment mode cycling
 *    - Configuration persistence
 *    - Auto-deploy triggers
 *    - Shortcut key binding
 *
 * 3. Log Monitoring:
 *    - Automatic log file detection
 *    - Real-time log rotation handling
 *    - Access log sanitization
 *    - HTTP event extraction
 *    - Change delta processing
 *
 * Advanced Features:
 * - Cross-platform shortcut adaptation
 * - Dynamic status bar animations
 * - Configurable polling intervals
 * - User interaction tracking
 * - Log context preservation
 * - Automated resource cleanup
 *
 * Technical Implementation:
 * - VS Code API integration (OutputChannel, StatusBarItem)
 * - Node.js filesystem watchers
 * - Stream-based log processing
 * - Configuration change listeners
 * - Disposable resource management
 * - Async/Promise error handling
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class Logger {
    private static instance: Logger;
    private tomcatHome: string;
    private autoDeployMode: string;
    private autoScrollOutput: boolean;
    private outputChannel: vscode.OutputChannel;
    private statusBarItem?: vscode.StatusBarItem;
    private currentLogFile: string | null = null;
    private fileCheckInterval?: NodeJS.Timeout;
    private logWatchers: { file: string; listener: fs.StatsListener }[] = [];
    
    /**
     * Private constructor for Singleton pattern
     * 
     * Initializes logging subsystem with:
     * - Workspace configuration binding
     * - Output channel creation
     * - Default log level setup
     * - Resource allocation tracking
     */
    private constructor() {
        this.tomcatHome = vscode.workspace.getConfiguration().get<string>('tomcat.home', '');
        this.autoDeployMode = vscode.workspace.getConfiguration().get<string>('tomcat.autoDeployMode', 'Disabled'); 
        this.autoScrollOutput = vscode.workspace.getConfiguration().get<boolean>('tomcat.autoScrollOutput', true);   
        this.outputChannel = vscode.window.createOutputChannel('Tomcat', 'tomcat-log'); 
    }

    /**
     * Singleton accessor method
     * 
     * Provides global access to logging instance while ensuring:
     * - Thread-safe lazy initialization
     * - Consistent configuration state
     * - Single point of output control
     * 
     * @returns Singleton Logger instance
     */
    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
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
        this.autoDeployMode = vscode.workspace.getConfiguration().get<string>('tomcat.autoDeployMode', 'Disabled');
        this.autoScrollOutput = vscode.workspace.getConfiguration().get<boolean>('tomcat.autoScrollOutput', true);
    }

    /**
     * Resource cleanup handler
     * 
     * Properly disposes of logging resources:
     * - Releases output channel
     * - Removes status bar items
     * - Cleans up subscriptions
     * - Preserves final log state
     */
    public deactivate(): void {
        this.outputChannel.dispose();
        this.statusBarItem?.dispose();
        if (this.fileCheckInterval) clearInterval(this.fileCheckInterval);
        this.logWatchers.forEach(watcher => fs.unwatchFile(watcher.file, watcher.listener));
    }

    /**
     * Status bar initializer
     * 
     * Sets up status bar component with:
     * - Persistent UI element
     * - Command binding
     * - Context subscriptions
     * - Initial state
     * 
     * @param context VS Code extension context
     */
    public init(context: vscode.ExtensionContext): void {
        // Set context for UI contribution enablement
        vscode.commands.executeCommand('setContext', 'tomcat.showdeployButton', true);

        // Initialize watcher for log files
        this.startLogFileWatcher();

        // Initialize status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.statusBarItem.command = 'extension.tomcat.toggleDeploySetting';
        this.statusBarItem.show();
        context.subscriptions.push(
            this.statusBarItem,
            vscode.commands.registerCommand('extension.tomcat.toggleDeploySetting', () => this.toggleDeploySetting())
        );
        this.defaultStatusBar();
    }

    /**
     * Status bar update handler
     * 
     * Provides real-time operation feedback:
     * - Spinner animation for active operations
     * - Contextual tooltips
     * - Timely status updates
     * - Visual state indication
     * 
     * @param value Status message to display
     */
    public updateStatusBar(value: string): void {
        if (this.statusBarItem) {
            this.statusBarItem.text = `$(sync~spin) ${value}`;
            this.statusBarItem.tooltip = `${value} Loading...`;
        }
    }

    /**
     * Default status bar state
     * 
     * Restores status bar to baseline configuration:
     * - Shows current deployment mode
     * - Platform-appropriate shortcuts
     * - Interactive command binding
     * - Consistent visual styling
     */
    public defaultStatusBar(): void {
        if (this.statusBarItem) {
            const displayText = this.autoDeployMode === 'On Shortcut' 
                ? process.platform === 'darwin' ? 'Cmd+S' : 'Ctrl+S'
                : this.autoDeployMode;
                
            this.statusBarItem.text = `${this.autoDeployMode === 'On Save' ? '$(sync~spin)' : '$(server)'} Tomcat deploy: ${displayText}`;
            this.statusBarItem.tooltip = 'Click to change deploy mode';
        }
    }

    /**
     * Information-level logging
     * 
     * @param message Informational message
     * @param showToast Whether to show user notification
     */
    public info(message: string, showToast: boolean = false): void {
        this.log('INFO', message, showToast ? vscode.window.showInformationMessage : undefined);
    }

    /**
     * Success confirmation logging
     * 
     * @param message Success message
     * @param showToast Whether to show user notification
     */
    public success(message: string, showToast: boolean = false): void {
        this.log('SUCCESS', message, showToast ? vscode.window.showInformationMessage : undefined);
    }

    /**
     * Debug-level logging
     * 
     * @param message Debug information
     * @param showToast Whether to show user notification
     */
    public debug(message: string, showToast: boolean = false): void {
        this.log('DEBUG', message, showToast ? vscode.window.showInformationMessage : undefined);
    }

    /**
     * Warning-level logging
     * 
     * @param message Warning message
     * @param showToast Whether to show user notification
     */
    public warn(message: string, showToast: boolean = false): void {
        this.log('WARN', message, showToast ? vscode.window.showWarningMessage : undefined);
    }

    /**
     * Error-level logging
     * 
     * @param message Error description
     * @param error Optional Error object for stack trace
     * @param showToast Whether to show user notification
     */
    public error(message: string, showToast: boolean = false, error: string): void {
        const fullMessage = error ? `${message}\n${error}` : message;
        this.log('ERROR', fullMessage, showToast ? vscode.window.showErrorMessage : undefined);
    }
    
    /**
     * HTTP request logging
     * 
     * @param message HTTP request details
     * @param showToast Whether to show user notification
     */
    public http(message: string, showToast: boolean = false): void {
        this.log('HTTP', message, showToast ? vscode.window.showInformationMessage : undefined);
    }

    /**
     * Deployment mode toggler
     * 
     * Cycles through deployment modes:
     * 1. Disabled → On Shortcut
     * 2. On Shortcut → On Save
     * 3. On Save → Disabled
     * 
     * Persists changes to workspace configuration
     */
    public async toggleDeploySetting() {
        switch (this.autoDeployMode) {
            case 'Disabled': this.autoDeployMode = 'On Shortcut'; break;
            case 'On Shortcut': this.autoDeployMode = 'On Save'; break;
            case 'On Save': this.autoDeployMode = 'Disabled'; break;
        }

        await vscode.workspace.getConfiguration().update('tomcat.autoDeployMode', this.autoDeployMode, true);
        this.defaultStatusBar();
    }

    /**
     * Log file watcher initialization
     * 
     * Starts monitoring Tomcat access logs with:
     * - Automatic latest file detection
     * - Cross-platform file watching
     * - Smart log entry extraction
     * - Configurable polling intervals
     */
    public startLogFileWatcher(): void {
        if (!this.tomcatHome) { return; }

        const logsDir = path.join(this.tomcatHome, 'logs');
        
        this.fileCheckInterval = setInterval(() => {
            this.checkForNewLogFile(logsDir);
        }, 1000);

        this.checkForNewLogFile(logsDir);
    }

    /**
     * Log file rotation detector
     * 
     * Monitors log directory for new access log files with:
     * - Directory content scanning
     * - Date-based filename sorting
     * - Latest file detection
     * - Change event triggering
     * 
     * @param logsDir Path to Tomcat logs directory
     */
    private checkForNewLogFile(logsDir: string): void {
        fs.readdir(logsDir, (err, files) => {
            if (err) {
                return;
            }

            const logFiles = files
                .filter(file => file.startsWith('localhost_access_log.'))
                .sort((a, b) => this.extractDate(b) - this.extractDate(a));

            if (logFiles.length === 0) return;

            const latestFile = path.join(logsDir, logFiles[0]);
            if (latestFile !== this.currentLogFile) {
                this.switchLogFile(latestFile);
            }
        });
    }

    /**
     * Active log file switcher
     * 
     * Handles log file rotation by:
     * - Cleaning up previous file watchers
     * - Updating current log file reference
     * - Setting up new file change listener
     * - Tracking active watchers for cleanup
     * 
     * @param newFile Path to new log file to monitor
     */
    private switchLogFile(newFile: string): void {
        this.logWatchers.forEach(({ file, listener }) => fs.unwatchFile(file, listener));
        this.logWatchers = [];

        this.currentLogFile = newFile;
        
        fs.stat(newFile, (err) => {
            if (err) return;

            const listener: fs.StatsListener = (curr, prev) => {
                if (curr.size > prev.size) {
                    this.handleLogUpdate(newFile, prev.size, curr.size);
                }
            };

            fs.watchFile(newFile, { interval: 1000 }, listener);
            this.logWatchers.push({ file: newFile, listener });
        });
    }

    /**
     * Log update handler
     * 
     * Processes new log entries with:
     * - Delta change detection
     * - Stream-based partial reading
     * - Log line sanitization
     * - HTTP event extraction
     * 
     * @param filePath Path to modified log file
     * @param prevSize Previous file size in bytes
     * @param currSize Current file size in bytes
     */
    private handleLogUpdate(filePath: string, prevSize: number, currSize: number): void {
        const stream = fs.createReadStream(filePath, {
            start: prevSize,
            end: currSize - 1,
            encoding: 'utf8'
        });

        let buffer = '';
        stream.on('data', chunk => buffer += chunk);
        stream.on('end', () => {
            let lines = buffer.split('\n').filter(line => line.trim());
            while (lines.length > 0) {
                const cleanedLine = lines[lines.length - 1]
                .replace(/(0:0:0:0:0:0:0:1|127\.0\.0\.1) - -?\s?/g, '')
                .replace(/\[.*?\]/g, '')
                .replace(/(HTTP\/1\.1|"+)\s?/g, '')
                .replace(/"\s?/g, '')
                .replace(/\s+/g, ' - ')
                .replace(/^ - | - $/g, '')
                .replace(/- -/g, '- 200')
                .trim();
                
                this.http(cleanedLine, false);
                lines.pop();
            }
        });
    }

    /**
     * Log filename date extractor
     * 
     * Parses timestamp from log filenames for:
     * - Chronological sorting
     * - Rotation pattern detection
     * - File version comparison
     * - Temporal correlation
     * 
     * @param filename Access log filename
     * @returns Parsed timestamp in milliseconds
     */
    private extractDate(filename: string): number {
        const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
        return dateMatch ? Date.parse(dateMatch[1]) : 0;
    }

    /**
     * Core logging mechanism
     * 
     * Handles log message processing with:
     * - Level filtering
     * - Timestamping
     * - Formatting
     * - Multi-channel routing
     * 
     * @param level Log severity level
     * @param message Log content
     * @param showUI Optional UI notification callback
     */
    private log(
        level: string,
        message: string,
        showUI?: (message: string) => Thenable<string | undefined>
    ): void {
        const timestamp = new Date().toLocaleString();
        const formattedMessage = `[${timestamp}] [${level}] ${message}`;
        
        this.outputChannel.appendLine(formattedMessage);

        if (showUI) {
            showUI(message).then(selection => {
                if (selection) {
                    this.outputChannel.appendLine(`User selected: ${selection}`);
                }
            });
        }

        if (this.autoScrollOutput || level === 'ERROR' || level === 'WARN') {
            this.outputChannel.show(true);
        }
    }
}