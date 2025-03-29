import * as vscode from 'vscode';

enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SUCCESS = 4,
    SILENT = 5
}

export class Logger {
    private static instance: Logger;
    private config: vscode.WorkspaceConfiguration;
    private outputChannel: vscode.OutputChannel;
    private configListener?: vscode.Disposable;
    private statusBarItem?: vscode.StatusBarItem;

    private constructor() {
        this.config = vscode.workspace.getConfiguration('tomcat');
        this.outputChannel = vscode.window.createOutputChannel('Tomcat');
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public deactivate(): void {
        this.outputChannel.dispose();
        this.configListener?.dispose();
        this.statusBarItem?.dispose();
    }

    public updateConfig(): void {
        this.config = vscode.workspace.getConfiguration('tomcat');
    }

    public activate(context: vscode.ExtensionContext): void {
        this.configListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('tomcat.loggingLevel')) {
                this.outputChannel.appendLine(`Logging level changed to: ${this.getCurrentLogLevelName()}`);
            }
        });
        context.subscriptions.push(this.configListener);
    }

    public initStatusBar(context: vscode.ExtensionContext): void {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.statusBarItem.command = 'tomcat.toggleDeploySetting';
        this.statusBarItem.show();
        context.subscriptions.push(this.statusBarItem);
    }

    public updateStatusBar(value: string): void {
        if (this.statusBarItem) {
            this.statusBarItem.text = `$(sync~spin) ${value}`;
            this.statusBarItem.tooltip = `${value} Loading...`;
        }
    }

    public defaultStatusBar(): void {
        if (this.statusBarItem) {
            const setting = this.config.get<string>('tomcat.defaultDeployMode', 'On Save');
            const displayText = setting === 'On Shortcut' 
                ? process.platform === 'darwin' ? 'Cmd+S' : 'Ctrl+S'
                : setting;
                
            this.statusBarItem.text = `${setting === 'On Save' ? '$(sync~spin)' : '$(server)'} Tomcat deploy: ${displayText}`;
            this.statusBarItem.tooltip = 'Click to change deploy mode';
        }
    }

    public info(message: string, showToast = false): void {
        this.log('INFO', message, showToast ? vscode.window.showInformationMessage : undefined);
    }

    public success(message: string, showToast = true): void {
        this.log('SUCCESS', message, showToast ? vscode.window.showInformationMessage : undefined);
    }

    public warn(message: string, showToast = true): void {
        this.log('WARN', message, showToast ? vscode.window.showWarningMessage : undefined);
    }

    public error(message: string, error?: Error, showToast = true): void {
        const fullMessage = error ? `${message}\n${error.message}\n${error.stack}` : message;
        this.log('ERROR', fullMessage, showToast ? vscode.window.showErrorMessage : undefined);
    }

    private getCurrentLogLevel(): LogLevel {
        const level = this.config.get<string>('tomcat.loggingLevel', 'INFO');
        return LogLevel[level as keyof typeof LogLevel] || LogLevel.INFO;
    }

    private getCurrentLogLevelName(): string {
        return LogLevel[this.getCurrentLogLevel()];
    }

    private log(
        level: string,
        message: string,
        showUI?: (message: string) => Thenable<string | undefined>
    ): void {
        const minLevel = this.getCurrentLogLevel();
        const currentLevel = LogLevel[level as keyof typeof LogLevel] || LogLevel.INFO;

        if (currentLevel < minLevel) {return;}

        const timestamp = new Date().toLocaleString();
        const formattedMessage = `[${timestamp}] [${level}] ${message}`;
        
        this.outputChannel.appendLine(formattedMessage);

        if (showUI && currentLevel >= LogLevel.INFO) {
            showUI(message).then(selection => {
                if (selection) {
                    this.outputChannel.appendLine(`User selected: ${selection}`);
                }
            });
        }

        if (level === 'ERROR') {
            this.outputChannel.show(true);
        }
    }
}