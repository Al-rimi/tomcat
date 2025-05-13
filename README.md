# Tomcat for VSCode [![Version](https://img.shields.io/visual-studio-marketplace/v/Al-rimi.tomcat?label)](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat) [![Downloads](https://img.shields.io/visual-studio-marketplace/d/Al-rimi.tomcat?label=Downloads)](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat) [![Rating](https://img.shields.io/visual-studio-marketplace/stars/Al-rimi.tomcat?label=Rating)](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat) [![Build Status](https://img.shields.io/github/actions/workflow/status/Al-rimi/tomcat/ci.yml?label=Build)](https://github.com/Al-rimi/tomcat/actions)

Advanced Apache Tomcat management. Full server control, smart deployment, browser integration and debugging support.

![](resources/tomcat-video-showcase.gif)

## Features

- **Full Server Logs Monitoring**  
  Monitor All+ Tomcat logs in real-time with syntax highlighting

- **Build Strategies**  
  Three build strategies Local, Maven and Gradle to choose from

- **Save/Ctrl+S Deployment**
  Automatically deploy your project every time you save a file or press Ctrl+S/Cmd+S

- **Built-in Debugging**  
  Java-specific syntax coloring in output channel with organized error messages

- **Browser Automation**  
  Automate browser testing across multiple browsers seamlessly.

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

[Method location](https://github.com/Al-rimi/tomcat/blob/main/src/utils/Builder.ts#L121-L159), If you notice any false positives/negatives or have better ideas for detection logic, you are more than welcome to contribute:

[![Create an issue](https://img.shields.io/badge/-Create_an_issue-red?style=flat-square&logo=github)](https://github.com/Al-rimi/tomcat/issues/new?title=Improve+Java+EE+Project+Detection+Logic)

---

</details>

### ![](resources/tomcat-icon-dark.png) Editor Button

Click the Tomcat icon in the editor title bar to deploy your project.

![](resources/tomcat-editor-showcase.png)

### ![](resources/server.png) Status Bar

Click the Tomcat status in the bottom bar to toggle auto-deploy modes.

![](resources/tomcat-status-showcase.png)

### Command Palette

Use the Command Palette (`Ctrl+Shift+P`) to quickly access core commands:

| Command                | Description                                         |
|------------------------|-----------------------------------------------------|
| `Tomcat: Start`        | Launch the Tomcat server                            |
| `Tomcat: Stop`         | Stop the running server                             |
| `Tomcat: Clean`        | Clean Tomcat `webapps`, `temp`, and `work` folders |
| `Tomcat: Deploy`       | Deploy the current Java EE project                 |

## Configuration

Access via <kbd>Ctrl+,</kbd> → Search "Tomcat"

| **Setting**                  | **Default**       | **Description**                                                                          |
|------------------------------|-------------------|------------------------------------------------------------------------------------------|
| `tomcat.autoDeployBuildType` | `Fast`            | Default build strategy for deployments (`Fast`, `Maven`, `Gradle`)                       |
| `tomcat.autoDeployMode`      | `Disable`        | Auto-deploy triggers (`Disable`, `On Save`, `On Shortcut`)                              |
| `tomcat.browser`             | `Google Chrome`   | Browser for app launch & debug (`Disable`, `Google Chrome`, `Microsoft Edge`, `Firefox`, `Safari`, `Brave`, `Opera`) |
| `tomcat.port`                | `8080`            | Tomcat server listen port (valid range: `1024`-`65535`)                                  |
| `tomcat.protectedWebApps`    | `["ROOT", "docs", "examples", "manager", "host-manager"]` | List of protected web apps during cleanup operations |
| `tomcat.logLevel`            | `INFO`            | Minimum log level to display (`DEBUG`, `INFO`, `SUCCESS`, `HTTP`, `APP`, `WARN`, `ERROR`) |
| `tomcat.showTimestamp`       | `true`            | Whether to include timestamps in log messages                                            |
| `tomcat.autoReloadBrowser`   | `true`            | Whether to automatically reload the browser after deployment. Disable this option if having issues with the browser reloading. |
| `tomcat.logEncoding`         | `utf8`            | Encoding for Tomcat logs (`utf8`, `ascii`, `utf-8`, `utf16le`, `utf-16le`, `ucs2`, `ucs-2`, `base64`, `base64url`, `latin1`, `binary`, `hex`) |

> `tomcat.home` and `tomcat.javaHome` are now auto-detected and hidden from user settings.

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


## What's New in 2.5.3

- **Real-Time Server Insights**  
  Instant full server logging with dual-stream architecture for all server events (Thanks to @zhuxiaodics6)

- **Granular Log Control**  
  New `tomcat.logLevel` and `tomcat.showTimestamp` settings for customized logging

- **Fixed Browser Reload Issue**
  Add fall back to reduce CDP bug damage and `tomcat.autoReloadBrowser` setting to control browser reload behavior

- **Removed Unnecessary Futures**
  Removed help command and associated documentation and `tomcat.autoScrollOutput` configuration setting

[View Full Changelog](https://github.com/Al-rimi/tomcat/blob/main/CHANGELOG.md)

---

**License**: [MIT](LICENSE) • 💖 **Support**: Star our [GitHub Repo](https://github.com/Al-rimi/tomcat) • [VScode Marketplace](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat)
