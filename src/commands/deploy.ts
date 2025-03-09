import * as vscode from 'vscode';
import { deploy } from '../utils/deploy';

export function deployTomcat(): void {
    const subAction = vscode.window.showQuickPick(['Fast', 'Maven', 'Gradle'], {
        placeHolder: 'Select deployment type'
    });
    subAction.then((type) => {
        if (type === 'Fast' || type === 'Maven' || type === 'Gradle') {
            deploy(type);
        }
    });
}