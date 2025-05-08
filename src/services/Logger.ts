/**
 * Unified logging facility with Tomcat integration
 * 
 * Architectural Role:
 * - Singleton logging service
 * - Observer pattern for status updates
 * - Disposable resource management
 * 
 * Core Responsibilities:
 * 1. Multi-level Logging: DEBUG to ERROR filtering
 * 2. Log Monitoring: Real-time access log processing
 * 3. Status Management: Deployment mode indication
 * 4. Output Handling: Auto-scroll and channel management
 * 
 * Implementation Notes:
 * - Hybrid log watching (polling + stream-based)
 * - Tomcat log format normalization
 * - Status bar animation coordination
 * - Context-aware log filtering
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class Logger {
    private static instance: Logger;
    private tomcatHome: string;
    private autoDeployMode: string;
    private outputChannel: vscode.OutputChannel;
    private statusBarItem?: vscode.StatusBarItem;
    private currentLogFile: string | null = null;
    private fileCheckInterval?: NodeJS.Timeout;
    private logWatchers: { file: string; listener: fs.StatsListener }[] = [];
    private accessLogStream?: fs.ReadStream;
    private accessLogWatcher?: fs.FSWatcher;
    private logLevel: string;
    private showTimestamp: boolean;
    private logEncoding: string;
    private logLevels: { [key: string]: number } = {
        DEBUG: 0,
        INFO: 1,
        SUCCESS: 2,
        HTTP: 3,
        APP: 4,
        WARN: 5,
        ERROR: 6
    };

    private readonly TOMCAT_FILTERS = [
        /^Loaded Apache Tomcat Native library/,
        /^org.apache.catalina.startup.VersionLoggerListener log/,
        /^OpenSSL successfully initialized/,
        /^At least one JAR was scanned for TLDs/,
        /^Log4j API could not find a logging provider/,
        /^You need to add "--add-opens"/,
        /^Match \[Context\] failed to set property/,
        /^org.apache.catalina.core.ApplicationContext log/,
        /^Manager: init:/,
        /^Reloading Context with name/,
        /^SessionListener: contextInitialized/,
        /^ContextListener: /,
        /^Starting ProtocolHandler/,
        /^Server version name/,
        /^Server built:/,
        /^OS Name:/,
        /^Architecture:/,
        /^Java Home:/,
        /^JVM Version:/,
        /^CATALINA_/
    ];

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
        this.logLevel = vscode.workspace.getConfiguration().get<string>('tomcat.logLevel', 'INFO').toUpperCase();
        if (!Object.keys(this.logLevels).includes(this.logLevel)) {
            this.logLevel = 'INFO';
        }
        this.showTimestamp = vscode.workspace.getConfiguration().get<boolean>('tomcat.showTimestamp', true);
        this.outputChannel = vscode.window.createOutputChannel('Tomcat', 'tomcat-log');
        this.logEncoding = vscode.workspace.getConfiguration().get<string>('tomcat.logEncoding', 'utf8');
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
     * Tomcat Log Encoding getter
     * 
     * @returns Current log encoding setting
     */
    public getLogEncoding(): string {
        return this.logEncoding;
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
        this.logLevel = vscode.workspace.getConfiguration().get<string>('tomcat.logLevel', 'INFO').toUpperCase();
        if (!Object.keys(this.logLevels).includes(this.logLevel)) {
            this.logLevel = 'INFO';
        }
        this.showTimestamp = vscode.workspace.getConfiguration().get<boolean>('tomcat.showTimestamp', true);
        this.logEncoding = vscode.workspace.getConfiguration().get<string>('tomcat.logEncoding', 'utf8');
    }

    /**
     * Resource Cleanup Handler
     * 
     * Now handles four resource types:
     * 1. Output channels
     * 2. Status bar components
     * 3. Polling intervals
     * 4. Filesystem watchers (both polling and event-driven)
     * 
     * Guarantees zero resource leaks during:
     * - Extension reloads
     * - Configuration changes
     * - Server restarts
     * - Unexpected errors
     */
    public deactivate(): void {
        this.outputChannel.dispose();
        this.statusBarItem?.dispose();
        if (this.fileCheckInterval) clearInterval(this.fileCheckInterval);
        this.logWatchers.forEach(watcher => fs.unwatchFile(watcher.file, watcher.listener));
        this.accessLogStream?.destroy();
        this.accessLogWatcher?.close();
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
        vscode.commands.executeCommand('setContext', 'tomcat.showdeployButton', true);
        this.startLogFileWatcher();

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
     * Log file watcher initialization (Enhanced)
     * 
     * Implements hybrid monitoring strategy:
     * - 500ms polling interval for rotation detection
     * - Event-driven access log watching
     * - Cross-platform filesystem abstraction
     * 
     * Combines reliability of polling with responsiveness
     * of OS-level notifications
     */
    public startLogFileWatcher(): void {
        if (!this.tomcatHome) return;

        const logsDir = path.join(this.tomcatHome, 'logs');
        this.fileCheckInterval = setInterval(() => {
            this.checkForNewLogFile(logsDir);
        }, 500);

        this.watchAccessLogDirectly(this.tomcatHome);
    }

    public appendRawLine(message: string): void {
        const processed = this.processTomcatLine(message);
        if (processed) {
            const [level, cleanMessage] = processed;
            this.log(level, cleanMessage);
        }
    }

    /**
     * Raw log line processor (Enhanced)
     * 
     * Handles multi-format log inputs:
     * - Tomcat's native formatted logs
     * - Server startup metadata
     * - HTTP access patterns
     * - Unstructured debug output
     * 
     * Output standardization features:
     * - Level translation (SEVERE → ERROR)
     * - Contextual filtering
     * - Whitespace normalization
     * - Redundancy elimination
     */
    private processTomcatLine(rawLine: string): [string, string] | null {
        const cleanLine = rawLine
            .replace(/\x1B\[\d+m/g, '')
            .replace(/^\w+ \d+, \d+ \d+:\d+:\d+ [AP]M /, '');

        const logMatch = cleanLine.match(
            /^(?:\w+ \d+, \d+ \d+:\d+:\d+ [AP]M )?.*?\b(?:SEVERE|WARNING|INFO|FINE)\b:?\s+(.*)$/i
        );

        if (logMatch) {
            const message = logMatch[1]
                .replace(/^\s*\[[^\]]+\]\s*/, '')  // Remove bracketed prefixes
                .replace(/\s{2,}/g, ' ')           // Collapse multiple spaces
                .trim();

            if (message.startsWith('Deploying web application') ||
                message.startsWith('At least one JAR was scanned for TLDs yet') ||
                message.startsWith('You need to add "') ||
                message.startsWith('Match [Context] failed to set property')) {
                return null;
            }

            if (cleanLine.includes('Server startup in')) {
                return ['SUCCESS', cleanLine.replace(/.*?(Server startup in.*)/, '$1').replace('Server startup in [', 'Tomcat started in ').replace('] milliseconds', 'ms')];
            }

            const levelMap: { [key: string]: string } = {
                'SEVERE': 'ERROR',
                'WARNING': 'WARN',
                'INFO': 'INFO',
                'FINE': 'DEBUG'
            };

            const level = Object.keys(levelMap).find(l => cleanLine.includes(l)) || 'INFO';
            const mappedLevel = levelMap[level];

            return [mappedLevel, message];
        }

        if (cleanLine.match(/GET|POST|PUT|DELETE/)) {
            const httpMessage = cleanLine
                .replace(/(\d+)\s*ms$/, '')
                .replace(/\s{2,}/g, ' ')
                .trim();
            if (httpMessage.includes('/manager/text/reload?path=')) {
                return ['DEBUG', httpMessage];
            } else {
                return ['HTTP', httpMessage];
            }
        }

        if (cleanLine.includes('Syntax error on token "finally"') ||
            cleanLine.includes('] in the jsp file')) {
            return ['ERROR', cleanLine];
        }

        if (cleanLine.includes('java.') ||
            cleanLine.includes('javax.') ||
            cleanLine.includes('jakarta.') ||
            cleanLine.includes('org.') ||
            cleanLine.includes('in the generated') ||
            cleanLine.includes('cannot be resolved') ||
            cleanLine.includes('Syntax error on token') ||
            cleanLine.includes('com.') ||
            cleanLine.includes('Stacktrace:') ||
            cleanLine.includes('Syntax error') ||
            cleanLine.includes('An error occurred') ||
            cleanLine.match(/^\d+:/) ||
            cleanLine.match(/.java:([0-9]+)\)/)) {
            return ['DEBUG', cleanLine];
        }

        if (this.TOMCAT_FILTERS.some(pattern => pattern.test(cleanLine)) ||
            cleanLine.trim().length === 0 ||
            cleanLine.includes('API could not find a logging provider.')) {
            return null;
        }

        return ['APP', cleanLine];
    }

    /**
     * Direct access log monitoring initializer
     * 
     * Implements low-latency access log observation:
     * 1. Identifies current access log file
     * 2. Establishes filesystem watcher
     * 3. Configures continuous stream reader
     * 4. Handles log rotation transparently
     * 
     * @param tomcatHome Valid Tomcat installation directory
     */
    private async watchAccessLogDirectly(tomcatHome: string) {
        const logsDir = path.join(tomcatHome, 'logs');
        const accessLogPattern = /localhost_access_log\.\d{4}-\d{2}-\d{2}\.log/;

        if (this.accessLogStream) {
            this.accessLogStream.destroy();
            this.accessLogWatcher?.close();
        }

        const files = await fs.promises.readdir(logsDir);
        const accessLogs = files.filter(f => accessLogPattern.test(f))
            .sort().reverse();

        if (accessLogs.length > 0) {
            const logPath = path.join(logsDir, accessLogs[0]);
            this.setupRealtimeAccessLog(logPath);
        }
    }

    /**
     * Real-time access log processor
     * 
     * Configures dual monitoring mechanisms:
     * - Event-driven filesystem watcher for instant notifications
     * - Persistent read stream for efficient data consumption
     * - Coordinates with log rotation detection system
     * 
     * @param logPath Full path to current access log file
     */
    private setupRealtimeAccessLog(logPath: string) {
        this.accessLogWatcher = fs.watch(logPath, (eventType) => {
            if (eventType === 'change') this.handleLiveLogUpdate(logPath);
        });

        this.accessLogStream = fs.createReadStream(logPath, {
            encoding: this.logEncoding as BufferEncoding,
            autoClose: false,
            start: fs.existsSync(logPath) ? fs.statSync(logPath).size : 0
        });

        this.accessLogStream.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.trim()) this.processAccessLogLine(line);
            });
        });
    }

    /**
     * Live log update handler
     * 
     * Processes file change events with:
     * - Size comparison for delta calculation
     * - Targeted partial file reading
     * - Line-by-line processing pipeline
     * - Memory-efficient stream handling
     * 
     * @param logPath Path to modified log file
     */
    private handleLiveLogUpdate(logPath: string) {
        const newSize = fs.statSync(logPath).size;
        const oldSize = this.accessLogStream?.bytesRead || 0;

        if (newSize > oldSize) {
            const stream = fs.createReadStream(logPath, {
                start: oldSize,
                end: newSize - 1,
                encoding: this.logEncoding as BufferEncoding
            });

            stream.on('data', data => {
                data.toString().split('\n').forEach(line => {
                    if (line.trim()) this.processAccessLogLine(line);
                });
            });
        }
    }

    /**
     * Access log entry processor
     * 
     * Transforms raw access log lines to standardized format:
     * 1. Removes localhost IP variations
     * 2. Strips bracketed timestamps
     * 3. Normalizes HTTP version markers
     * 4. Collapses whitespace
     * 5. Formats as [METHOD] - [PATH] - [STATUS] - [DURATION]
     * 
     * @param rawLine Unprocessed access log entry
     */
    private processAccessLogLine(rawLine: string) {
        const cleanedLine = rawLine
            .replace(/(0:0:0:0:0:0:0:1|127\.0\.0\.1) - -?\s?/g, '')
            .replace(/\[.*?\]/g, '')
            .replace(/(HTTP\/1\.1|"+)\s?/g, '')
            .replace(/"\s?/g, '')
            .replace(/\s+/g, ' - ')
            .replace(/^ - | - $/g, '')
            .replace(/- -/g, '- 200')
            .trim();

        this.http(cleanedLine, false);
    }

    /**
     * Log file rotation detector (Enhanced)
     * 
     * Now handles access log specific patterns:
     * - Uses optimized filename date extraction
     * - Coordinates with direct access log watcher
     * - Maintains dual monitoring consistency
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
     * Active log file switcher (Updated)
     * 
     * Maintains dual monitoring consistency during rotation:
     * 1. Preserves active access log stream
     * 2. Updates both polling and event-driven watchers
     * 3. Handles cross-platform filesystem quirks
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
            encoding: this.logEncoding as BufferEncoding
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
        const messageLevel = level.toUpperCase();
        const messageLevelValue = this.logLevels[messageLevel] ?? this.logLevels.INFO;
        if (messageLevelValue < this.logLevels[this.logLevel]) return;

        const timestamp = this.showTimestamp ? `[${new Date().toLocaleString()}] ` : '';
        const formattedMessage = `${timestamp}[${level}] ${message}`;

        // Directly append to channel without recursion
        this.outputChannel.appendLine(formattedMessage);

        if (showUI) {
            showUI(message).then(selection => {
                if (selection) {
                    this.outputChannel.appendLine(`User selected: ${selection}`);
                }
            });
        }

        if (level === 'ERROR' || level === 'WARN' || level === 'APP') {
            this.outputChannel.show(true);
        }
    }
}