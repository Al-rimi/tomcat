import * as vscode from 'vscode';

export function info(message: string) {
    logToOutputChannel('INFO', message);
}

export function error(message: string) {
    vscode.window.showErrorMessage(message);
    logToOutputChannel('ERROR', message);
}

export function done(message: string) {
    vscode.window.showInformationMessage(message);
    logToOutputChannel('DONE', message);
}

export function warn(message: string) {
    vscode.window.showWarningMessage(message);
    logToOutputChannel('WARN', message);
}

export function debug(message: string) {
    logToOutputChannel('DEBUG', message);
}

const outputChannel = vscode.window.createOutputChannel('Tomcat');

function logToOutputChannel(level: string, message: string) {
    const enableLogger = vscode.workspace.getConfiguration('tomcat').get<boolean>('enableLogger', false);
    if (enableLogger) {
        const timestamp = new Date().toISOString();
        outputChannel.appendLine(`[${timestamp}] [${level}] ${message}`);
        outputChannel.show(true);
    }
}
