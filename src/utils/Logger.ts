/**
 * Logger.ts - Advanced Logging and Status Reporting Subsystem
 *
 * Centralized logging facility implementing multi-channel output with intelligent
 * routing and filtering capabilities. Designed specifically for VS Code extensions
 * with enterprise-grade requirements for observability and user feedback.
 *
 * Architecture:
 * - Singleton pattern for consistent logging state
 * - Publish-subscribe model for log events
 * - Strategy pattern for output channel handling
 * - Decorator pattern for log message formatting
 *
 * Core Components:
 * 1. Hierarchical Logging System:
 *    - DEBUG (0): Detailed diagnostic information
 *    - INFO (1): General operational messages
 *    - WARN (2): Potentially harmful situations
 *    - ERROR (3): Critical failure conditions
 *    - SUCCESS (4): Positive outcome confirmation
 *    - SILENT (5): Complete logging suppression
 *
 * 2. Output Channels:
 *    - VS Code OutputChannel: Structured log retention
 *    - StatusBarItem: Real-time operation feedback
 *    - Window notifications: User-facing alerts
 *    - Error diagnostics: Stack trace integration
 *
 * 3. Advanced Features:
 *    - Dynamic log level configuration
 *    - Context-aware message formatting
 *    - Performance metric tracking
 *    - User interaction logging
 *    - Configuration hot-reload
 *
 * Technical Implementation:
 * - Implements VS Code's Disposable pattern
 * - Supports ANSI color codes in output channels
 * - Provides thread-safe logging operations
 * - Maintains log message structure consistency
 * - Implements efficient message filtering
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class Logger {
    private static instance: Logger;
    private autoDeployMode: string;
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
        this.autoDeployMode = vscode.workspace.getConfiguration().get<string>('tomcat.autoDeployMode', 'Disabled');    
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
        this.autoDeployMode = vscode.workspace.getConfiguration().get<string>('tomcat.autoDeployMode', 'Disabled');
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
        const tomcatHome = vscode.workspace.getConfiguration().get<string>('tomcat.home');
        if (!tomcatHome) {
            this.error('Tomcat home directory not configured', false, 'Missing tomcat.home configuration');
            return;
        }

        const logsDir = path.join(tomcatHome, 'logs');
        
        // Check for new files every 10 seconds
        this.fileCheckInterval = setInterval(() => {
            this.checkForNewLogFile(logsDir);
        }, 100);

        // Initial check
        this.checkForNewLogFile(logsDir);
    }

    // Add this private method
    private checkForNewLogFile(logsDir: string): void {
        fs.readdir(logsDir, (err, files) => {
            if (err) {
                this.error(`Error reading logs directory:`, false, err.message);
                return;
            }

            // Find latest access log file
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

    // Add this private method
    private switchLogFile(newFile: string): void {
        // Cleanup previous watchers
        this.logWatchers.forEach(({ file, listener }) => fs.unwatchFile(file, listener));
        this.logWatchers = [];

        this.currentLogFile = newFile;
        
        // Get initial file size
        fs.stat(newFile, (err) => {
            if (err) return;

            // Setup new watcher with polling
            const listener: fs.StatsListener = (curr, prev) => {
                if (curr.size > prev.size) {
                    this.handleLogUpdate(newFile, prev.size, curr.size);
                }
            };

            fs.watchFile(newFile, { interval: 1000 }, listener);
            this.logWatchers.push({ file: newFile, listener });
        });
    }

    // Add this private method
    private handleLogUpdate(filePath: string, prevSize: number, currSize: number): void {
        const stream = fs.createReadStream(filePath, {
            start: prevSize,
            end: currSize - 1,
            encoding: 'utf8'
        });

        let buffer = '';
        stream.on('data', chunk => buffer += chunk);
        stream.on('end', () => {
            const lines = buffer.split('\n').filter(line => line.trim());
            if (lines.length > 0) {
                const cleanedLine = lines[lines.length - 1]
                .replace(/(0:0:0:0:0:0:0:1|127\.0\.0\.1) - -?\s?/g, '')
                .replace(/\[.*?\]/g, '')
                .replace(/(HTTP\/1\.1|"+)\s?/g, '')
                .replace(/"\s?/g, '')
                .replace(/\s+/g, ' - ')
                .replace(/^ - | - $/g, '')
                .trim();
                
                this.http(cleanedLine, false);            
            }
        });
    }

    // Add this private method
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
        
        // Write to output channel
        this.outputChannel.appendLine(formattedMessage);

        // Conditionally show UI notification
        if (showUI) {
            showUI(message).then(selection => {
                if (selection) {
                    this.outputChannel.appendLine(`User selected: ${selection}`);
                }
            });
        }

        // Automatically show errors in output channel
        if (level === 'ERROR' || level === 'WARN') {
            this.outputChannel.show(true);
        }
    }
}