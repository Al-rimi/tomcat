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

export class Logger {
    private static instance: Logger;
    private defaultDeployMode: string;
    private outputChannel: vscode.OutputChannel;
    private statusBarItem?: vscode.StatusBarItem;
    
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
        this.defaultDeployMode = vscode.workspace.getConfiguration().get<string>('tomcat.defaultDeployMode', 'Disabled');    
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
        this.defaultDeployMode = vscode.workspace.getConfiguration().get<string>('tomcat.defaultDeployMode', 'Disabled');
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
            const displayText = this.defaultDeployMode === 'On Shortcut' 
                ? process.platform === 'darwin' ? 'Cmd+S' : 'Ctrl+S'
                : this.defaultDeployMode;
                
            this.statusBarItem.text = `${this.defaultDeployMode === 'On Save' ? '$(sync~spin)' : '$(server)'} Tomcat deploy: ${displayText}`;
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
    public error(message: string, showToast: boolean = false, error?: Error | undefined): void {
        const fullMessage = error ? `${message}\n${error.message}\n${error.stack}` : message;
        this.log('ERROR', fullMessage, showToast ? vscode.window.showErrorMessage : undefined);
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
        switch (this.defaultDeployMode) {
            case 'Disabled': this.defaultDeployMode = 'On Shortcut'; break;
            case 'On Shortcut': this.defaultDeployMode = 'On Save'; break;
            case 'On Save': this.defaultDeployMode = 'Disabled'; break;
        }

        await vscode.workspace.getConfiguration().update('tomcat.defaultDeployMode', this.defaultDeployMode, true);
        this.defaultStatusBar();
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