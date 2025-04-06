import * as vscode from 'vscode';
import { showHelpPanel } from './help';
import { Builder } from './utils/Builder';
import { Tomcat } from './utils/Tomcat';
import { Logger } from './utils/Logger';
import { Browser } from './utils/Browser';

export function activate(context: vscode.ExtensionContext) {
    const builder = Builder.getInstance();
    const tomcat = Tomcat.getInstance();
    addSyntaxColoringRules();

    context.subscriptions.push(
        vscode.commands.registerCommand('tomcat.start', () => tomcat.start()),
        vscode.commands.registerCommand('tomcat.stop', () => tomcat.stop()),
        vscode.commands.registerCommand('tomcat.clean', () => tomcat.clean()),
        vscode.commands.registerCommand('tomcat.deploy', () => builder.deploy('Choice')),
        vscode.commands.registerCommand('tomcat.help', () => showHelpPanel(context)),
        vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (event.affectsConfiguration('tomcat')) {
                updateSettings(event);
            }
        })
    );

    if (Builder.isJavaEEProject()) {
        Logger.getInstance().initStatusBar(context);
        vscode.commands.executeCommand('setContext', 'tomcat.showdeployButton', true);
        context.subscriptions.push(
            vscode.workspace.onWillSaveTextDocument((e) => {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders) {
                    const selectedProjectPath = workspaceFolders[0].uri.fsPath;
                    if (e.document.uri.fsPath.startsWith(selectedProjectPath)) {
                        builder.autoDeploy(e.reason);
                    }
                }
            })
        );
    }
}

function addSyntaxColoringRules() {
    const config = vscode.workspace.getConfiguration();
    const existingColors: { textMateRules?: Array<{ scope: string; settings: any }> } = config.get('editor.tokenColorCustomizations') || {};
    
    const colorRules = [
        // Timestamp - subtle gray
        { "scope": "meta.timestamp.tomcat", "settings": { "foreground": "#858585", "fontStyle": "" }},
        
        // Log levels - cleaner colors
        { "scope": "support.type.log-level.info.tomcat", "settings": { "foreground": "#4FC1FF", "fontStyle": "" }},
        { "scope": "support.type.log-level.debug.tomcat", "settings": { "foreground": "#888888", "fontStyle": "italic" }},
        { "scope": "support.type.log-level.error.tomcat", "settings": { "foreground": "#FF6B6B", "fontStyle": "bold" }},
        { "scope": "support.type.log-level.success.tomcat", "settings": { "foreground": "#73C991", "fontStyle": "" }},
        { "scope": "support.type.log-level.warn.tomcat", "settings": { "foreground": "#FFCC66", "fontStyle": "" }},
        
        // File paths
        { "scope": "entity.name.filename.java", "settings": { "foreground": "#9CDCFE", "fontStyle": "underline" }},
        
        // Build info
        { "scope": "constant.numeric.build-duration.tomcat", "settings": { "foreground": "#B5CEA8" }},
        { "scope": "constant.numeric.integer.tomcat", "settings": { "foreground": "#B5CEA8" }},
        
        // Java syntax
        { "scope": "entity.name.class.java", "settings": { "foreground": "#4EC9B0", "fontStyle": "" }},
        { "scope": "entity.name.function.java", "settings": { "foreground": "#DCDCAA", "fontStyle": "" }},
        { "scope": "variable.parameter.java", "settings": { "foreground": "#9CDCFE", "fontStyle": "" }},
        { "scope": "variable.other.object.java", "settings": { "foreground": "#DCDCAA", "fontStyle": "" }},
        { "scope": "storage.modifier.java", "settings": { "foreground": "#569CD6", "fontStyle": "" }},
        { "scope": "storage.type.java", "settings": { "foreground": "#4EC9B0", "fontStyle": "" }},
        { "scope": "keyword.control.java", "settings": { "foreground": "#C586C0", "fontStyle": "" }},
        { "scope": "invalid.illegal.java", "settings": { "foreground": "#FF6B6B", "fontStyle": "bold" }},
        { "scope": "markup.error", "settings": { "foreground": "#FF6B6B", "fontStyle": "bold" }},
        { "scope": "string.quoted.double.java", "settings": { "foreground": "#CE9178", "fontStyle": "" }},
        { "scope": "keyword.operator.java", "settings": { "foreground": "#D4D4D4", "fontStyle": "" }},
        { "scope": "storage.type.annotation.java", "settings": { "foreground": "#569CD6", "fontStyle": "" }},
        { "scope": "meta.annotation.parameters.java", "settings": { "foreground": "#9CDCFE", "fontStyle": "" }},
        
        // Punctuation
        { "scope": "punctuation.terminator.java", "settings": { "foreground": "#D4D4D4" }},
        { "scope": "punctuation.separator.comma.java", "settings": { "foreground": "#D4D4D4" }},
        { "scope": "punctuation.bracket.square.java", "settings": { "foreground": "#D4D4D4" }},
        { "scope": "punctuation.bracket.round.java", "settings": { "foreground": "#D4D4D4" }},
        { "scope": "punctuation.bracket.angle.java", "settings": { "foreground": "#D4D4D4" }},
        
        // Packages and imports
        { "scope": "entity.name.package.java", "settings": { "foreground": "#858585", "fontStyle": "" }},
        { "scope": "keyword.control.import.java", "settings": { "foreground": "#569CD6", "fontStyle": "" }}
    ];

    const updatedRules = [
        ...(existingColors.textMateRules || []).filter(rule => 
            !colorRules.some(r => r.scope === rule.scope)
        ),
        ...colorRules
    ];

    config.update('editor.tokenColorCustomizations', 
        { ...existingColors, textMateRules: updatedRules },
        vscode.ConfigurationTarget.Global
    ).then(() => {
        Logger.getInstance().info('Syntax coloring rules initialized');
    }, err => {
        Logger.getInstance().error(`Failed to set syntax coloring rules: ${err}`);
    });
}

function updateSettings(event: vscode.ConfigurationChangeEvent) {
    const config = vscode.workspace.getConfiguration('tomcat');

    if (event.affectsConfiguration('tomcat.home')) {
        const tomcatHome = Tomcat.getInstance().findTomcatHome();
        config.update('home', tomcatHome || '');
        Tomcat.getInstance().updatePort();
        Builder.getInstance().updateConfig();
        Browser.getInstance().updateConfig();
    } else if (event.affectsConfiguration('tomcat.javaHome')) {
        const javaHome = Tomcat.getInstance().findJavaHome();
        config.update('javaHome', javaHome || '');
    } else if (event.affectsConfiguration('tomcat.port')) {
        Tomcat.getInstance().updatePort();
    } else if (event.affectsConfiguration('tomcat.defaultDeployMode') || event.affectsConfiguration('tomcat.defaultBuildType')) {
        Builder.getInstance().updateConfig();
    } else if (event.affectsConfiguration('tomcat.defaultBrowser')) {
        Browser.getInstance().updateConfig();
    } else if (event.affectsConfiguration('tomcat.loggingLevel')) {
        Logger.getInstance().updateConfig();
    }
}

export function deactivate() {
    Tomcat.getInstance().deactivate();
    Logger.getInstance().deactivate();
}