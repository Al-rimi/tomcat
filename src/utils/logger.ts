import * as vscode from 'vscode';

export function info(message: string): void {
    logToOutputChannel('INFO', message);
}

export function error(message: string): void {
    vscode.window.showErrorMessage(message);
    logToOutputChannel('ERROR', message);
}

export function done(message: string): void {
    vscode.window.showInformationMessage(message);
    logToOutputChannel('DONE', message);
}

export function warn(message: string): void {
    vscode.window.showWarningMessage(message);
    logToOutputChannel('WARN', message);
}

export function debug(message: string): void {
    logToOutputChannel('DEBUG', message);
}

const outputChannel = vscode.window.createOutputChannel('Tomcat');

function logToOutputChannel(level: string, message: string): void {
    const enableLogger = vscode.workspace.getConfiguration('tomcat').get<boolean>('enableLogger', false);
    if (enableLogger) {
        const timestamp = new Date().toISOString();
        outputChannel.appendLine(`[${timestamp}] [${level}] ${message}`);
        outputChannel.show(true);
    }
}
