# Tomcat AI Deployer for VS Code [![Version](https://img.shields.io/visual-studio-marketplace/v/Al-rimi.tomcat?label)](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat) [![Downloads](https://img.shields.io/visual-studio-marketplace/d/Al-rimi.tomcat?label=Downloads)](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat) [![Rating](https://img.shields.io/visual-studio-marketplace/stars/Al-rimi.tomcat?label=Rating)](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat) [![Build Status](https://img.shields.io/github/actions/workflow/status/Al-rimi/tomcat/ci.yml?label=Build)](https://github.com/Al-rimi/tomcat/actions)

[中文文档](README.zh-CN.md)

AI-assisted Tomcat control for VS Code: streaming log explanations, one-click deploys, and browser reloads.

![](resources/tomcat-video-showcase.gif)

## Features

- **Full Server Logs Monitoring**  
  Monitor All+ Tomcat logs in real-time with syntax highlighting

- **Build Strategies**  
  Three build strategies Local, Maven and Gradle to choose from

- **AI Explanations (Streaming)**  
  WARN/ERROR logs are auto-explained via your configured AI provider, with live streaming output, local-endpoint fallback, and automatic navigation to the offending file/line.

- **Save/Ctrl+S Deployment**
  Automatically deploy your project every time you save a file or press Ctrl+S/Cmd+S

- **Built-in Debugging**  
  Java-specific syntax coloring in output channel with organized error messages

- **Browser Automation**  
  Automate browser testing across multiple browsers seamlessly.

- **Localized UI (English/Chinese)**  
  Extension commands, status bar text, and prompts are localized with a new language switch that follows VS Code on first run.

- **Instance Management UI and Settings Window**  
  Manage all Tomcat instances in one place: start, stop, kill, refresh, open in browser, and configure Tomcat/Java homes and HTTP ports from a unified view.

## Installation

1. Open VS Code  
2. Launch Extensions View (`Ctrl+Shift+X`)  
3. Search for `Al-rimi.tomcat`  
4. Click <kbd>Install</kbd>

Command line:
```bash
code --install-extension Al-rimi.tomcat
```

## Usage

> The `Editor Button` and `Status Bar` are only visible when the current project is detected as a Java EE project, following VScode [Editor Actions](https://code.visualstudio.com/api/ux-guidelines/editor-actions) and [Status Bar](https://code.visualstudio.com/api/ux-guidelines/status-bar) Guidelines.

<details>
<summary>When is a project considered a Java EE project? click to expand</summary>

```typescript
public static isJavaEEProject(): boolean {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    // Check 0: Workspace must be open
    if (!workspaceFolders) {
        return false;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const webInfPath = path.join(rootPath, 'src', 'main', 'webapp', 'WEB-INF');

    // Check 1: Look for WEB-INF directory in the standard structure
    if (fs.existsSync(webInfPath)) {
        return true;
    }

    // Check 2: Check for presence of deployment descriptor (web.xml)
    if (fs.existsSync(path.join(webInfPath, 'web.xml'))) {
        return true;
    }

    const pomPath = path.join(rootPath, 'pom.xml');

    // Check 3: Look for WAR packaging in Maven project
    if (
        fs.existsSync(pomPath) &&
        fs.readFileSync(pomPath, 'utf-8').includes('<packaging>war</packaging>')
    ) {
        return true;
    }

    const gradlePath = path.join(rootPath, 'build.gradle');

    // Check 4: Look for Java EE-related keywords in Gradle config
    if (
        fs.existsSync(gradlePath) &&
        fs.readFileSync(gradlePath, 'utf-8').match(/(tomcat|jakarta|javax\.ee)/i)
    ) {
        return true;
    }

    const targetPath = path.join(rootPath, 'target');

    // Check 5: Look for compiled artifacts (.war or .ear) in target folder
    if (
        fs.existsSync(targetPath) &&
        fs.readdirSync(targetPath).some(file => file.endsWith('.war') || file.endsWith('.ear'))
    ) {
        return true;
    }

    // If none match, project is not considered a Java EE project
    return false;
}
```

[Method location](src/services/Builder.ts#L121-L159), If you notice any false positives/negatives or have better ideas for detection logic, you are more than welcome to contribute:

[![Create an issue](https://img.shields.io/badge/-Create_an_issue-red?style=flat-square&logo=github)](https://github.com/Al-rimi/tomcat/issues/new?title=Improve+Java+EE+Project+Detection+Logic)

---

</details>

### ![](resources/tomcat-icon-dark.png) Instances View

The Instances View provides a real-time tree of all running and saved Tomcat instances. You can start, stop, or kill servers, manage Tomcat/Java homes and HTTP ports, and open deployed apps in your browser, all from one place. Each instance shows its PID, port, version, and workspace, with quick actions for configuration and browser launch.

![](resources/tomcat-view-showcase.png)

### ![](resources/tomcat-icon-dark.png) Editor Button

Click the Tomcat icon in the editor title bar to deploy your project.

![](resources/tomcat-editor-showcase.png)

### ![](resources/server.png) Status Bar

Click the Tomcat status in the bottom bar to toggle auto deploy modes.

![](resources/tomcat-status-showcase.png)

### Command Palette

Use the Command Palette (`Ctrl+Shift+P`) to quickly access core commands:

| Command                | Description                                         |
|------------------------|-----------------------------------------------------|
| `Tomcat: Start`        | Launch the Tomcat server                            |
| `Tomcat: Stop`         | Stop the running server                             |
| `Tomcat: Clean`        | Clean Tomcat `webapps`, `temp`, and `work` folders |
| `Tomcat: Deploy`       | Deploy the current Java EE project                 |
| `Tomcat: Refresh Instances` | Refresh the list of running and saved Tomcat instances |
| `Tomcat: Kill Instance`     | Force-stop a selected Tomcat instance                  |
| `Tomcat: Open in Browser`   | Open the deployed app for an instance in your browser  |
| `Tomcat: New Instance`      | Start a new Tomcat instance                            |
| `Tomcat: Configure Field`   | Edit Tomcat Home, Java Home, Port, or Browser for an instance |
| `Tomcat: Add Tomcat Home`   | Add a new Tomcat installation path                     |
| `Tomcat: Remove Tomcat Home`| Remove a saved Tomcat installation path                |
| `Tomcat: Refresh Versions`  | Refresh available Tomcat versions                      |
| `Tomcat: Use This Tomcat`   | Set a Tomcat home as the active one                    |
| `Tomcat: Add Java Home`     | Add a new Java installation path                       |
| `Tomcat: Remove Java Home`  | Remove a saved Java installation path                  |
| `Tomcat: Use This Java`     | Set a Java home as the active one                      |
| `Tomcat: Set HTTP Port`     | Change the HTTP port for an instance                   |
| `Tomcat: Add HTTP Port`     | Add a new HTTP port to the quick selection list        |
| `Tomcat: Remove HTTP Port`  | Remove a saved HTTP port                               |
| `Tomcat: Set Build Type`    | Change the build strategy for an instance              |
| `Tomcat: Set Log Level`     | Change the log level for an instance                   |

## Configuration

Access via <kbd>Ctrl+,</kbd> → Search "Tomcat"

| **Setting**                  | **Default**       | **Description**                                                                          |
|------------------------------|-------------------|------------------------------------------------------------------------------------------|
| `tomcat.language`            | `auto`           | Extension UI language (`auto`, `en`, `zh-CN`). On first run, `auto` follows VS Code's display language. |
| `tomcat.buildType`           | `Local`           | Default build strategy for deployments (`Local`, `Maven`, `Gradle`)                      |
| `tomcat.autoDeployMode`      | `Disable`        | Auto-deploy triggers (`Disable`, `On Save`, `On Shortcut`)                              |
| `tomcat.browser`             | `Google Chrome`   | Browser for app launch & debug (`Disable`, `Google Chrome`, `Microsoft Edge`, `Firefox`, `Safari`, `Brave`, `Opera`) |
| `tomcat.port`                | `8080`            | Tomcat server listen port (valid range: `1024`-`49151`)                                  |
| `tomcat.ports`               | `[]`              | Saved HTTP ports for quick selection (array of numbers, preserved per workspace)         |
| `tomcat.homes`               | `[]`              | List of available Tomcat installation paths for multi-version management               |
| `tomcat.javaHomes`           | `[]`              | List of configured Java homes (array of strings); `tomcat.javaHome` is the active entry |
| `tomcat.base`                | ``                | Path to `CATALINA_BASE` (conf/webapps/logs). Defaults to `tomcat.home` if not set.       |
| `tomcat.protectedWebApps`    | `["ROOT", "docs", "examples", "manager", "host-manager"]` | List of protected web apps during cleanup operations |
| `tomcat.logLevel`            | `INFO`            | Minimum log level to display (`DEBUG`, `INFO`, `SUCCESS`, `HTTP`, `APP`, `WARN`, `ERROR`) |
| `tomcat.showTimestamp`       | `true`            | Whether to include timestamps in log messages                                            |
| `tomcat.autoReloadBrowser`   | `true`            | Whether to automatically reload the browser after deployment. Disable this option if having issues with the browser reloading. |
| `tomcat.logEncoding`         | `utf8`            | Encoding for Tomcat logs (`utf8`, `ascii`, `utf-8`, `utf16le`, `utf-16le`, `ucs2`, `ucs-2`, `base64`, `base64url`, `latin1`, `binary`, `hex`) |
| `tomcat.ai.provider`         | `none`           | AI provider for streaming explanations (`none`, `local`, `aliyun-dashscope`, `baichuan`, `zhipu`, `deepseek`, `custom`). |
| `tomcat.ai.endpoint`         | `http://127.0.0.1:11434/api/chat` | Full HTTP endpoint for AI chat/completions. |
| `tomcat.ai.model`            | `qwen2.5:7b`      | Model identifier sent to the configured AI endpoint. |
| `tomcat.ai.apiKey`           | ``                | Optional bearer token for hosted providers. |
| `tomcat.ai.localStartCommand`| `ollama serve`    | Command to launch the local AI service when the endpoint is unreachable. |

> `tomcat.home` and `tomcat.javaHome` are now auto-detected and hidden from user settings.
> AI explanations are automatic for WARN/ERROR logs; local AI auto-starts only for localhost endpoints when unreachable.

## Requirements

- **Runtime**:
  - JDK 11+
  - Apache Tomcat 9+
  
- **Build Tools** (optional):
  - `Maven` 3.6+ *or* `Gradle` 6.8+ (if using `Maven` or `Gradle` build types)

## Developer Documentation

For technical implementation details and contribution guidelines, see:
- [System Architecture](https://github.com/Al-rimi/tomcat/tree/main/docs/ARCHITECTURE.md)
- [Development Guide](https://github.com/Al-rimi/tomcat/tree/main/docs/DEVELOPMENT.md) 
- [Testing Strategy](https://github.com/Al-rimi/tomcat/tree/main/docs/TESTING.md)


## Known Issues

- **Browser Compatibility for Auto-Reload**  
  <details>
  <summary>Some browsers may not support automatic page reloading (click to expand)</summary>

  The extension uses the Chrome Debug Protocol (CDP) to reload pages after deployment. Currently supported browsers include:
  - Google Chrome
  - Microsoft Edge
  - Brave
  - Opera

  **Unsupported Browsers**:
  - Firefox
  - Safari
  
  These lack CDP support and will not auto-reload.
  </details>

- **Debug Mode Launch Failures**  
  <details>
  <summary>Occasional issues launching browsers in debug mode (click to expand)</summary>

  Even supported browsers might fail to launch in debug mode due to system configurations. The extension uses this command template:
  ```bash
  start chrome.exe --remote-debugging-port=9222 http://localhost:8080/app-name
  ```
  **Common solutions**:
  1. Verify browser executable path in system PATH
  2. Ensure no other instances are using port 9222
  3. Update browser to latest version

  If issues persist, disable `tomcat.autoReloadBrowser` in settings.
  </details>

[![Report Issue](https://img.shields.io/badge/-Report_Issue-red?style=flat-square&logo=github)](https://github.com/Al-rimi/tomcat/issues/new)  
[![Suggest Fix](https://img.shields.io/badge/-Suggest_Fix-green?style=flat-square&logo=github)](https://github.com/Al-rimi/tomcat/pulls)


## What's New in 4.0.0

### Added
- Instance Management UI and Settings Window: Manage all Tomcat instances from a single view—start, stop, kill, refresh servers, open apps in your browser, and configure Tomcat/Java homes and ports. The new settings window streamlines multi-instance setup and configuration.
- Persist Tomcat instance metadata across VS Code restarts (saved instances file under workspace `.tomcat/instances.json`).
- New Instances management UI: Running Instances tree, start/stop/kill per PID, saved Tomcat homes and Java homes, and saved HTTP ports with add/remove.
- Commands and TreeView integration for instance lifecycle and configuration (start new, refresh, add/remove homes/ports, set active home/java, set browser, set log level).

### Changed
- Avoid forcibly closing external Tomcat processes on extension deactivate; managed instances are tracked and persisted instead.
- Improved deployment logic to reuse running instances when possible (reuse same app instance, pick unused instance, or start a new one).
- Browser handling improved: availability checks, preferred-browser fallback, and safer launch/timeout handling.
- Large i18n sweep: all user-facing strings moved to runtime NLS with English and Chinese translations.

### Fixed
- Various localization and JSON/TypeScript issues introduced during the i18n sweep have been resolved.
- Port allocation and update behavior improved to avoid accidental restarts; better port-in-use detection.

[View Full Changelog](https://github.com/Al-rimi/tomcat/blob/main/CHANGELOG.md)

## Roadmap & Future Work

- Per-instance log panels and filtered views for easier troubleshooting.
- Remote/SSH Tomcat instance management and cross-workspace syncing of persisted instances.
- Visual improvements to the Instances Tree (grouping, filtering, and inline actions).
- Enhanced AI features: multi-provider orchestration, richer suggestions, and custom explanation templates.

If you'd like any roadmap items prioritized for v4.x, tell me which ones and I can prepare a focused PR or issue list.

---

**License**: [MIT](LICENSE) • 💖 **Support**: Star our [GitHub Repo](https://github.com/Al-rimi/tomcat) • [VScode Marketplace](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat)
