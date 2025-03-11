import * as vscode from 'vscode';

export function showHelpPanel(): void {
    const panel = vscode.window.createWebviewPanel(
        'tomcatHelp',
        'Tomcat Extension - Help',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Tomcat Help</title>
            <style>
                :root {
                    --vscode-font-family: 'Segoe UI', system-ui, sans-serif;
                    --vscode-foreground: #CCCCCC;
                    --vscode-descriptionForeground: #858585;
                    --vscode-focusBorder: #007FD4;
                    --vscode-button-background: #0E639C;
                    --vscode-editor-background: #1E1E1E;
                    --vscode-editorWidget-background: #252526;
                    --vscode-badge-background: #4D4D4D;
                }

                body {
                    font-family: var(--vscode-font-family);
                    margin: 0;
                    padding: 20px;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-foreground);
                    line-height: 1.6;
                }

                .container {
                    max-width: 800px;
                    margin: 20px auto;
                    background-color: var(--vscode-editorWidget-background);
                    border-radius: 4px;
                    padding: 24px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                }

                h2 {
                    color: var(--vscode-foreground);
                    font-size: 1.5em;
                    margin: 0 0 24px 0;
                    font-weight: 600;
                    border-bottom: 1px solid var(--vscode-badge-background);
                    padding-bottom: 12px;
                }

                .section {
                    margin-bottom: 24px;
                }

                .command {
                    font-family: 'Consolas', monospace;
                    color: var(--vscode-focusBorder);
                    background-color: rgba(14, 99, 156, 0.1);
                    padding: 2px 6px;
                    border-radius: 3px;
                    border: 1px solid rgba(14, 99, 156, 0.2);
                }

                ul {
                    padding-left: 0;
                    margin: 16px 0;
                    list-style: none;
                }

                li {
                    margin-bottom: 12px;
                    padding: 12px;
                    background-color: var(--vscode-editor-background);
                    border-radius: 4px;
                    border: 1px solid var(--vscode-badge-background);
                }

                .badge {
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-foreground);
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 0.85em;
                    float: right;
                }

                .browsers {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                    gap: 8px;
                    margin-top: 16px;
                }

                .browser-item {
                    padding: 8px 12px;
                    background-color: var(--vscode-editor-background);
                    border-radius: 4px;
                    border: 1px solid var(--vscode-badge-background);
                    font-size: 0.9em;
                }

                .footer {
                    margin-top: 32px;
                    padding-top: 16px;
                    border-top: 1px solid var(--vscode-badge-background);
                    color: var(--vscode-descriptionForeground);
                    font-size: 0.9em;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Tomcat Extension Help</h2>

                <div class="section">
                    <h3>Core Commands</h3>
                    <ul>
                        <li>
                            <span class="command">stop</span> - 
                            <span>Gracefully stops the Tomcat service</span>
                        </li>
                        <li>
                            <span class="command">clean</span> - 
                            <span>Cleans the Tomcat deployment directory</span>
                        </li>
                        <li>
                            <span class="command">start</span> - 
                            <span>Starts the Tomcat service</span>
                        </li>
                    </ul>
                </div>

                <div class="section">
                    <h3>Deployment Options</h3>
                    <ul>
                        <li>
                            <span class="command">Fast Deployment</span> - 
                            <span>Direct file copy from development folder</span>
                        </li>
                        <li>
                            <span class="command">Maven</span> - 
                            <span>Build and deploy using Maven-generated WAR</span>
                        </li>
                        <li>
                            <span class="command">Gradle</span> - 
                            <span>Build and deploy using Gradle</span>
                        </li>
                    </ul>
                </div>

                <div class="section">
                    <h3>Configuration Settings</h3>
                    <ul>
                        <li>
                            <span class="command">tomcat.home</span>
                            <span class="badge">Required</span>
                            <div>Tomcat installation path</div>
                        </li>
                        <li>
                            <span class="command">tomcat.java.home</span>
                            <span class="badge">Required</span>
                            <div>Java JDK path</div>
                        </li>
                        <li>
                            <span class="command">tomcat.port</span>
                            <span class="badge">Default: 8080</span>
                            <div>Server port configuration</div>
                        </li>
                        <li>
                            <span class="command">tomcat.autoDeploy</span>
                            <span class="badge">Options: Disabled, On Save, Ctrl+S</span>
                            <div>Automatic deployment trigger</div>
                        </li>
                    </ul>

                    <h3>Browser Configuration</h3>
                    <div class="browsers">
                        <div class="browser-item">Google Chrome</div>
                        <div class="browser-item">Firefox</div>
                        <div class="browser-item">Microsoft Edge</div>
                        <div class="browser-item">Safari</div>
                        <div class="browser-item">Brave</div>
                        <div class="browser-item">Opera</div>
                    </div>
                </div>

                <div class="footer">
                    <div>Developed by Al-rimi</div>
                    <div>Version 1.2.0</div>
                </div>
            </div>
        </body>
        </html>
    `;
}