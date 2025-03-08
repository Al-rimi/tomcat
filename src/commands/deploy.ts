import * as vscode from 'vscode';
import { deploy } from '../utils/deploy';

export function deployTomcat() {
    const subAction = vscode.window.showQuickPick(['Fast', 'Maven'], {
        placeHolder: 'Select deployment type'
    });
    subAction.then((type) => {
        if (type === 'Fast' || type === 'Maven') {
            deploy(type);
        }
    });
}