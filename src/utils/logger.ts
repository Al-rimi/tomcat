import * as vscode from 'vscode';

const OUTPUT_CHANNEL_NAME = 'Tomcat';
const LOG_LEVEL_CONFIG = 'tomcat.loggingLevel';

enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SUCCESS = 4,
    SILENT = 5
}

const outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
let configListener: vscode.Disposable;

export function activateLogger(): void {
    configListener = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration(LOG_LEVEL_CONFIG)) {
            outputChannel.appendLine(`Logging level changed to: ${getCurrentLogLevelName()}`);
        }
    });
}

export function deactivateLogger(): void {
    configListener?.dispose();
}

export function info(message: string, showToast = false): void {
    log('INFO', message, showToast ? vscode.window.showInformationMessage : undefined);
}

export function success(message: string, showToast = true): void {
    log('SUCCESS', message, showToast ? vscode.window.showInformationMessage : undefined);
}

export function warn(message: string, showToast = true): void {
    log('WARN', message, showToast ? vscode.window.showWarningMessage : undefined);
}

export function error(message: string, error?: Error, showToast = true): void {
    const fullMessage = error ? `${message}\n${error.message}\n${error.stack}` : message;
    log('ERROR', fullMessage, showToast ? vscode.window.showErrorMessage : undefined);
}

function getCurrentLogLevel(): LogLevel {
    const level = vscode.workspace.getConfiguration().get<string>(LOG_LEVEL_CONFIG, 'INFO');
    return LogLevel[level as keyof typeof LogLevel] || LogLevel.INFO;
}

function getCurrentLogLevelName(): string {
    return LogLevel[getCurrentLogLevel()];
}

function log(
    level: string,
    message: string,
    showUI?: (message: string) => Thenable<string | undefined>
): void {
    const minLevel = getCurrentLogLevel();
    const currentLevel = LogLevel[level as keyof typeof LogLevel] || LogLevel.INFO;

    if (currentLevel < minLevel) return;

    const timestamp = new Date().toLocaleString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
    
    outputChannel.appendLine(formattedMessage);

    if (showUI && currentLevel >= LogLevel.INFO) {
        showUI(message).then(selection => {
            if (selection) {
                outputChannel.appendLine(`User selected: ${selection}`);
            }
        });
    }

    if (level === 'ERROR') {
        outputChannel.show(true);
    }
}