import * as vscode from 'vscode';

export function showHelpPanel(context: vscode.ExtensionContext): void {
    const panel = vscode.window.createWebviewPanel(
        'tomcatHelp',
        'Tomcat Extension Documentation',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
        }
    );

    panel.webview.html = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tomcat Management Suite Documentation</title>
        <style>
            :root {
                --vscode-font-family: 'Segoe UI', system-ui, sans-serif;
                --vscode-foreground: #e0e0e0;
                --vscode-background: #1e1e1e;
                --vscode-accent: #007acc;
                --vscode-border: #404040;
                --vscode-button-background: #0e639c;
            }

            body {
                font-family: var(--vscode-font-family);
                background: var(--vscode-background);
                color: var(--vscode-foreground);
                margin: 0;
                padding: 20px;
                line-height: 1.6;
            }

            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }

            header {
                text-align: center;
                margin-bottom: 2rem;
                border-bottom: 1px solid var(--vscode-border);
                padding-bottom: 1.5rem;
            }

            h1 {
                font-size: 2rem;
                margin: 0 0 0.5rem 0;
                font-weight: 600;
            }

            .version {
                color: #858585;
                font-size: 0.9rem;
                margin-bottom: 1rem;
            }

            .search-container {
                margin: 2rem 0;
                text-align: center;
            }

            #searchInput {
                width: 60%;
                padding: 0.8rem 1.2rem;
                background: #252526;
                border: 1px solid var(--vscode-border);
                color: inherit;
                border-radius: 4px;
                font-size: 1rem;
            }

            .section {
                margin: 2rem 0;
                background: #252526;
                border-radius: 6px;
                border: 1px solid var(--vscode-border);
                overflow: hidden;
            }

            .section-header {
                padding: 1.2rem;
                background: #2d2d2d;
                border-bottom: 1px solid var(--vscode-border);
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .section-title {
                margin: 0;
                font-size: 1.2rem;
            }

            .section-content {
                padding: 1.5rem;
                display: none;
            }

            .feature-grid {
                display: grid;
                gap: 1.5rem;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            }

            .feature-card {
                padding: 1.5rem;
                background: #2d2d2d;
                border-radius: 4px;
                border: 1px solid var(--vscode-border);
            }

            .settings-table {
                width: 100%;
                border-collapse: collapse;
                margin: 1rem 0;
            }

            .settings-table th,
            .settings-table td {
                padding: 0.8rem;
                border: 1px solid var(--vscode-border);
                text-align: left;
                vertical-align: top;
            }

            .settings-table th {
                background: #2d2d2d;
                font-weight: 600;
            }

            code {
                background: rgba(14, 99, 156, 0.15);
                padding: 0.2em 0.4em;
                border-radius: 3px;
                font-family: 'Consolas', monospace;
            }

            .documentation-links {
                text-align: center;
                margin-top: 2rem;
                padding-top: 2rem;
                border-top: 1px solid var(--vscode-border);
            }

            .documentation-links a {
                color: var(--vscode-accent);
                text-decoration: none;
                margin: 0 1rem;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                transition: background 0.2s ease;
            }

            .documentation-links a:hover {
                background: rgba(14, 99, 156, 0.1);
            }
            .architecture-diagram {
                margin: 2rem 0;
                padding: 1rem;
                background: #252526;
                border-radius: 6px;
                font-family: monospace;
                white-space: pre-wrap;
            }
            
            .code-block {
                background: #1e1e1e;
                padding: 1rem;
                border-radius: 4px;
                margin: 1rem 0;
                font-family: 'Consolas', monospace;
            }
            
            .warning {
                padding: 1rem;
                background: #4a2c2c;
                border-left: 4px solid #ff4444;
                margin: 1rem 0;
            }

            .author-credit {
                margin-top: 1.5rem;
                color: #858585;
                font-size: 0.9rem;
            }

            .author-credit a {
                color: #007acc;
                text-decoration: none;
            }

            .author-credit a:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <h1>Apache Tomcat</h1>
                <div class="version">Version ${vscode.extensions.getExtension('Al-rimi.tomcat')?.packageJSON.version || '1.2.4'}</div>
            </header>

            <div class="search-container">
                <input type="text" id="searchInput" placeholder="Search documentation...">
            </div>

            <div class="section">
                <div class="section-header" onclick="toggleSection(this)">
                    <h2 class="section-title">Core Concepts</h2>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="section-content">
                    <div class="feature-grid">
                        <div class="feature-card">
                            <h3>Architecture Overview</h3>
                            <p>The extension integrates directly with Apache Tomcat instances, providing:</p>
                            <ul>
                                <li>Automated server lifecycle management</li>
                                <li>Intelligent deployment pipelines</li>
                                <li>Cross-platform browser integration</li>
                                <li>Real-time status monitoring</li>
                            </ul>
                        </div>
                        
                        <div class="feature-card">
                            <h3>Deployment Strategies</h3>
                            <p>Three deployment modes supported:</p>
                            <ul>
                                <li><strong>Fast Deployment:</strong> Direct file synchronization</li>
                                <li><strong>Maven Build:</strong> Integrated with Maven lifecycle</li>
                                <li><strong>Gradle Build:</strong> Supports Gradle WAR generation</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-header" onclick="toggleSection(this)">
                    <h2 class="section-title">Configuration Reference</h2>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="section-content">
                    <table class="settings-table">
                        <thead>
                            <tr>
                                <th>Setting</th>
                                <th>Default</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${generateSettingsRows()}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section">
                <div class="section-header" onclick="toggleSection(this)">
                    <h2 class="section-title">Advanced Features</h2>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="section-content">
                    <div class="feature-grid">
                        <div class="feature-card">
                            <h3>Smart Cleanup System</h3>
                            <p>Advanced directory management:</p>
                            <ul>
                                <li>Preserves default Tomcat webapps</li>
                                <li>Automatically clears work/temp directories</li>
                                <li>Version-aware artifact management</li>
                            </ul>
                        </div>

                        <div class="feature-card">
                            <h3>Browser Integration</h3>
                            <p>Cross-platform browser control:</p>
                            <ul>
                                <li>Chrome Debug Protocol integration</li>
                                <li>Process management for all major browsers</li>
                                <li>Smart session reuse capabilities</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Deployment Strategies -->
            <div class="section">
                <div class="section-header" onclick="toggleSection(this)">
                    <h2 class="section-title">Deployment Strategies</h2>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="section-content">
                    <h3>Fast Deployment</h3>
                    <p>Direct file synchronization for rapid development:</p>
                    <div class="code-block">
// Typical fast deployment workflow
1. Copy webapp/ directory → Tomcat/webapps
2. Compile Java sources → WEB-INF/classes
3. Copy lib/ → WEB-INF/lib
4. Trigger Tomcat reload
                    </div>
                    <div class="warning">
                        Warning: Does not perform full build validation. 
                        Recommended for development only.
                    </div>

                    <h3>Maven Integration</h3>
                    <p>Full Maven lifecycle integration:</p>
                    <ul>
                        <li>Executes <code>mvn clean package</code></li>
                        <li>Supports multi-module projects</li>
                        <li>Automatic WAR file detection</li>
                    </ul>
                    <div class="code-block">
// Required pom.xml configuration
&lt;packaging&gt;war&lt;/packaging&gt;
&lt;build&gt;
    &lt;finalName&gt;${vscode.workspace.workspaceFolders?.[0]?.uri.fsPath}&lt;/finalName&gt;
&lt;/build&gt;
                    </div>

                    <h3>Gradle Integration</h3>
                    <p>Gradle build system support:</p>
                    <ul>
                        <li>Executes <code>gradle war</code></li>
                        <li>Supports custom build scripts</li>
                        <li>Automatic output directory detection</li>
                    </ul>
                </div>
            </div>

            <!-- Troubleshooting -->
            <div class="section">
                <div class="section-header" onclick="toggleSection(this)">
                    <h2 class="section-title">Troubleshooting Guide</h2>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="section-content">
                    <h3>Common Issues</h3>
                    <table class="settings-table">
                        <tr>
                            <th>Error</th>
                            <th>Solution</th>
                        </tr>
                        <tr>
                            <td>Port 8080 in use</td>
                            <td>
                                1. Stop conflicting process<br>
                                2. Set <code>tomcat.port</code> to different value<br>
                                3. Verify with <code>netstat -ano</code>
                            </td>
                        </tr>
                        <tr>
                            <td>Missing manager-gui role</td>
                            <td>
                                1. Edit tomcat-users.xml<br>
                                2. Add <code>&lt;user username="admin".../&gt;</code><br>
                                3. Restart Tomcat
                            </td>
                        </tr>
                    </table>

                    <h3>Diagnostic Tools</h3>
                    <div class="code-block">
# Check Tomcat logs
tail -f ${vscode.workspace.getConfiguration().get<string>('tomcat.home')}/logs/catalina.out

# Verify Java version
${vscode.workspace.getConfiguration().get<string>('tomcat.java.home')}/bin/java -version

# Test deployment manually
curl http://localhost:${vscode.workspace.getConfiguration().get<string>('tomcat.port')}/manager/text/list
                    </div>
                </div>
            </div>

            <!-- API Reference -->
            <div class="section">
                <div class="section-header" onclick="toggleSection(this)">
                    <h2 class="section-title">API Reference</h2>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="section-content">
                    <h3>Command Palette</h3>
                    <table class="settings-table">
                        <tr>
                            <th>Command</th>
                            <th>Description</th>
                            <th>Shortcut</th>
                        </tr>
                        <tr>
                            <td>Tomcat: Start</td>
                            <td>Launches Tomcat server</td>
                            <td>Ctrl+Alt+T S</td>
                        </tr>
                        <tr>
                            <td>Tomcat: Stop</td>
                            <td>Stops running instance</td>
                            <td>Ctrl+Alt+T X</td>
                        </tr>
                        <tr>
                            <td>Tomcat: Clean</td>
                            <td>Cleans Tomcat work directory</td>
                            <td>Ctrl+Alt+T C</td>
                        </tr>
                        <tr>
                            <td>Tomcat: Deploy</td>
                            <td>Deploys current project</td>
                            <td>Ctrl+Alt+T D</td>
                        </tr>
                        <tr>
                            <td>Tomcat: Help</td>
                            <td>Shows interactive documentation</td>
                            <td>Ctrl+Alt+T H</td>
                        </tr>
                    </table>

                    <h3>REST Endpoints</h3>
                    <p>Management interface endpoints:</p>
                    <div class="code-block">
GET /manager/text/list        # List deployed applications
POST /manager/text/deploy     # Deploy WAR file
GET /manager/text/undeploy    # Remove application
                    </div>
                </div>
            </div>

            <div class="documentation-links">
                <a href="https://github.com/Al-rimi/tomcat" onclick="handleLink('https://github.com/Al-rimi/tomcat')">GitHub Repository</a>
                <a href="https://tomcat.apache.org/tomcat-10.1-doc/" onclick="handleLink('https://tomcat.apache.org/tomcat-10.1-doc/')">Tomcat Docs</a>
                <a href="https://javaee.github.io/" onclick="handleLink('https://javaee.github.io/')">Java EE Spec</a>
                <div class="author-credit">
                    Developed by <a href="https://syalux.com" onclick="handleLink('https://syalux.com')">Abdullah Al Raimi</a>
                </div>
            </div>
        </div>

        <script>
            function toggleSection(header) {
                const content = header.nextElementSibling;
                const isVisible = content.style.display === 'block';
                content.style.display = isVisible ? 'none' : 'block';
                header.querySelector('.toggle-icon').textContent = isVisible ? '▼' : '▲';
            }

            function handleLink(url) {
                vscode.postMessage({ command: 'openLink', url: url });
            }

            document.getElementById('searchInput').addEventListener('input', function(e) {
                const term = e.target.value.toLowerCase();
                document.querySelectorAll('.section').forEach(section => {
                    const content = section.querySelector('.section-content').textContent.toLowerCase();
                    section.style.display = content.includes(term) ? 'block' : 'none';
                });
            });

            // Initialize all sections as expanded
            document.querySelectorAll('.section-header').forEach(header => {
                toggleSection(header);
            });
        </script>
    </body>
    </html>`;

    panel.webview.onDidReceiveMessage(message => {
        if (message.command === 'openLink') {
            vscode.env.openExternal(vscode.Uri.parse(message.url));
        }
    }, undefined, context.subscriptions);
}

function generateSettingsRows(): string {
    const settings = [
        {
            name: 'tomcat.defaultBuildType',
            default: 'Fast',
            description: 'Default build strategy for deployments (Fast, Maven, Gradle)'
        },
        {
            name: 'tomcat.defaultDeployMode',
            default: 'Disabled',
            description: 'Auto-deploy triggers (Disabled, On Save, On Shortcut)'
        },
        {
            name: 'tomcat.defaultBrowser',
            default: 'Google Chrome',
            description: 'Browser for app launch & debug (Google Chrome, Microsoft Edge, Firefox, Safari, Brave, Opera)'
        },
        {
            name: 'tomcat.loggingLevel',
            default: 'WARN',
            description: 'Log verbosity level (DEBUG, INFO, WARN, ERROR, SILENT)'
        },
        {
            name: 'tomcat.java.home',
            default: 'JAVA_HOME',
            description: 'JDK installation path (e.g., C:\\Program Files\\Java\\jdk-21)'
        },
        {
            name: 'tomcat.home',
            default: 'CATALINA_HOME',
            description: 'Tomcat installation directory (e.g., C:\\Java\\apache-tomcat-11.0.4)'
        },
        {
            name: 'tomcat.port',
            default: '8080',
            description: 'Tomcat server listen port (valid range: 1024-65535)'
        }
    ];

    return settings.map(setting => `
        <tr>
            <td><code>${setting.name}</code></td>
            <td>${setting.default}</td>
            <td>${setting.description}</td>
        </tr>
    `).join('');
}