/**
 * VS Code Tomcat Extension Main Entry Point
 * 
 * Architectural Role:
 * - Composition root for dependency injection
 * - Mediator for cross-component coordination
 * - Central event hub for workspace/config events
 * - Subscription management for resource disposal
 * 
 * Core Responsibilities:
 * 1. Lifecycle Management: Activation/deactivation hooks, singleton initialization
 * 2. Command Surface: Palette command registration with context-aware states
 * 3. Config Management: Cascading updates with env variable resolution
 * 4. Event Handling: Workspace save events with project-scoped filtering
 * 5. UI Integration: Syntax highlighting, status bar, webview panels
 * 
 * Implementation Notes:
 * - Strict Disposable pattern adherence
 * - Lazy initialization for resource-heavy components
 * - Principle of least privilege for VS Code API access
 * - Decoupled UI/core logic architecture
 * - Defensive workspace state handling
 */

import * as vscode from 'vscode';
import { showHelpPanel } from '../utils/help';
import { addSyntaxColoringRules } from '../utils/syntax';
import { Builder } from '../services/Builder';
import { Tomcat } from '../services/Tomcat';
import { Logger } from '../services/Logger';
import { Browser } from '../services/Browser';

/**
 * Extension activation hook
 * 
 * Initializes the extension when activated by VS Code. This function:
 * 1. Creates singleton instances of core components
 * 2. Registers command handlers with the VS Code extension context
 * 3. Sets up configuration change listeners
 * 4. Initializes UI components
 * 5. Establishes workspace event handlers
 * 
 * @param context - VS Code extension context providing access to:
 *   - Subscription management
 *   - Global state storage
 *   - Extension URI resolution
 *   - Environment information
 */
export function activate(context: vscode.ExtensionContext) {
    const builder = Builder.getInstance();
    const tomcat = Tomcat.getInstance();

    addSyntaxColoringRules();

    context.subscriptions.push(
        vscode.commands.registerCommand('tomcat.start', () => tomcat.start(true)),
        vscode.commands.registerCommand('tomcat.stop', () => tomcat.stop(true)),
        vscode.commands.registerCommand('tomcat.clean', () => tomcat.clean()),
        vscode.commands.registerCommand('tomcat.deploy', () => builder.deploy('Choice')),
        vscode.commands.registerCommand('tomcat.help', () => showHelpPanel(context)),

        // Configuration change listener with efficient filtering
        vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (event.affectsConfiguration('tomcat')) {
                updateSettings(event);
            }
        })
    );

    if (Builder.isJavaEEProject()) {
        Logger.getInstance().init(context);

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
        tomcat.kill();
    }
}

/**
 * Extension deactivation hook
 * 
 * Performs cleanup operations when extension is deactivated:
 * 1. Stops any running Tomcat instances
 * 2. Releases logging resources
 * 3. Cleans up any temporary files
 * 
 * Note: VS Code automatically disposes all registered subscriptions
 * via the extension context's subscriptions array
 */
export function deactivate() {
    Tomcat.getInstance().deactivate();
    Logger.getInstance().deactivate();
}

/**
 * Configuration change handler
 * 
 * Centralized processor for workspace configuration updates that:
 * 1. Determines which specific configuration changed
 * 2. Updates affected components atomically
 * 3. Maintains configuration consistency across components
 * 4. Handles environment variable resolution
 * 
 * @param event - VS Code configuration change event containing:
 *   - Affected configuration sections
 *   - Old/new value information
 *   - Scope metadata
 */
function updateSettings(event: vscode.ConfigurationChangeEvent) {
    if (event.affectsConfiguration('tomcat.home')) {
        Tomcat.getInstance().findTomcatHome();
        Builder.getInstance().updateConfig();
        Browser.getInstance().updateConfig();

    } else if (event.affectsConfiguration('tomcat.javaHome')) {
        Tomcat.getInstance().findJavaHome();
        Builder.getInstance().updateConfig();

    } else if (event.affectsConfiguration('tomcat.port') || 
        event.affectsConfiguration('tomcat.protectedWebApps')) {
        Tomcat.getInstance().updatePort();

    } else if (event.affectsConfiguration('tomcat.autoDeployMode') ||
        event.affectsConfiguration('tomcat.autoDeployBuildType')) {
        Builder.getInstance().updateConfig();
        Logger.getInstance().updateConfig();

    } else if (event.affectsConfiguration('tomcat.browser')) {
        Browser.getInstance().updateConfig();

    } else if (event.affectsConfiguration('tomcat.autoScrollOutput') ||
        event.affectsConfiguration('tomcat.showTimestamp') ||
        event.affectsConfiguration('tomcat.logLevel')) {
        Logger.getInstance().updateConfig();
    } else if (event.affectsConfiguration('tomcat.logEncoding')) {
        const configured = vscode.workspace.getConfiguration().get<string>('tomcat.logEncoding', 'utf8');
        try {
            Buffer.from('test', configured as BufferEncoding);
        } catch (e) {
            Logger.getInstance().warn(`Unsupported encoding '${configured}' detected. Falling back to utf8.`);
            vscode.workspace.getConfiguration().update('tomcat.logEncoding', 'utf8', true);
        }
        Tomcat.getInstance().kill();
        Logger.getInstance().updateConfig();
    }
}