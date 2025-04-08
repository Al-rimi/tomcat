/**
 * extension.ts - VS Code Extension Main Entry Point
 * 
 * Primary module responsible for initializing and coordinating all Tomcat management
 * functionality within the VS Code extension host environment. Implements the VS Code
 * Extension API contract for activation/deactivation lifecycle management.
 *
 * Architectural Role:
 * - Serves as the composition root for dependency injection
 * - Implements the mediator pattern for cross-component coordination
 * - Acts as the event hub for configuration changes and workspace events
 * - Maintains the subscription registry for proper resource cleanup
 *
 * Core Functionality:
 * 1. Extension Lifecycle Management:
 *    - Implements activate()/deactivate() hooks per VS Code API spec
 *    - Manages singleton component initialization
 *    - Handles extension context subscription disposal
 *
 * 2. Command Registration:
 *    - Exposes Tomcat control surface via VS Code command palette
 *    - Maps CLI-style commands to component methods
 *    - Maintains context-aware command enablement states
 *
 * 3. Configuration Management:
 *    - Monitors workspace configuration changes
 *    - Coordinates cascading configuration updates
 *    - Handles environment variable resolution
 *
 * 4. Event Handling:
 *    - Listens to workspace save events for auto-deploy
 *    - Filters events by project scope
 *    - Implements debouncing where needed
 *
 * 5. UI Integration:
 *    - Initializes syntax highlighting rules
 *    - Manages status bar components
 *    - Controls webview-based help system
 *
 * Implementation Details:
 * - Uses VS Code's Disposable pattern for resource management
 * - Implements lazy initialization for heavy components
 * - Follows the principle of least privilege for API access
 * - Maintains separation of concerns between UI and core logic
 * - Implements defensive programming for workspace state
 */

import * as vscode from 'vscode';
import { showHelpPanel } from './ui/help';
import { addSyntaxColoringRules } from './ui/syntax';
import { Builder } from './utils/Builder';
import { Tomcat } from './utils/Tomcat';
import { Logger } from './utils/Logger';
import { Browser } from './utils/Browser';

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
    // Initialize core services using singleton pattern
    const builder = Builder.getInstance();
    const tomcat = Tomcat.getInstance();

    // Configure editor syntax highlighting
    addSyntaxColoringRules();

    // Register command palette entries
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

    // Conditional initialization for Java EE projects
    if (Builder.isJavaEEProject()) {
        // Initialize status bar UI component
        Logger.getInstance().initStatusBar(context);

        // Set context for UI contribution enablement
        vscode.commands.executeCommand('setContext', 'tomcat.showdeployButton', true);

        // Register save event handler for auto-deployment
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
    const config = vscode.workspace.getConfiguration('tomcat');

    // Cascading configuration updates based on changed settings
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

    } else if (event.affectsConfiguration('tomcat.defaultDeployMode') ||
        event.affectsConfiguration('tomcat.defaultBuildType')) {
        Builder.getInstance().updateConfig();

    } else if (event.affectsConfiguration('tomcat.defaultBrowser')) {
        Browser.getInstance().updateConfig();

    } else if (event.affectsConfiguration('tomcat.loggingLevel')) {
        Logger.getInstance().updateConfig();
        
    }
}