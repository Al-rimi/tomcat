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
    private statusBarItem?: vscode.StatusBarItem;
    private context?: vscode.ExtensionContext;

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
        this.statusBarItem?.dispose();
    }

    public updateConfig(): void {
        this.config = vscode.workspace.getConfiguration('tomcat');
    }

    public updateStatusBar(value: string): void {
        if (this.statusBarItem) {
            this.statusBarItem.text = `$(sync~spin) ${value}`;
            this.statusBarItem.tooltip = `${value} Loading...`;
        }
    }

    public defaultStatusBar(): void {
        if (this.statusBarItem) {
            const setting = this.config.get<string>('defaultDeployMode', 'Disabled');
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

    public async toggleDeploySetting() {
        let setting = this.config.get<string>('defaultDeployMode', 'Disabled');    
        switch (setting) {
            case 'Disabled': setting = 'On Shortcut'; break;
            case 'On Shortcut': setting = 'On Save'; break;
            case 'On Save': setting = 'Disabled'; break;
        }

        await this.config.update('defaultDeployMode', setting, true);
        this.updateConfig();            
        this.defaultStatusBar();
    }

    public initStatusBar(context: vscode.ExtensionContext): void {
        this.context = context;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.statusBarItem.command = 'extension.tomcat.toggleDeploySetting';
        this.statusBarItem.show();
        context.subscriptions.push(
            this.statusBarItem,
            vscode.commands.registerCommand('extension.tomcat.toggleDeploySetting', () => this.toggleDeploySetting())
        );
        this.defaultStatusBar();
    }

    private getCurrentLogLevel(): LogLevel {
        const level = this.config.get<string>('loggingLevel', 'INFO');
        return LogLevel[level as keyof typeof LogLevel] || LogLevel.INFO;
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