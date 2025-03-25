# Tomcat for VScode
Advanced Apache Tomcat management directly in your editor. Full server control, smart deployment, and browser integration.

![Tomcat Auto Deploy on Save](resources/tomcat-auto-ex.gif)

## Installation

1. Open VS Code
2. Launch Extensions View (`Ctrl+Shift+X`)
3. Search for `Al-rimi.tomcat`
4. Click <kbd>Install</kbd>

command line:
```bash
code --install-extension Al-rimi.tomcat
```

## Usage
> The extension is Fully AUTOMATED to work out of the box. Simply open a Java EE project and start coding...

### Editor Button

#### Click to Deploy the current project
![Tomcat Editor Button](resources/tomcat-editor.png)

### Status Bar

#### Click to Change the default deploy mode
![Tomcat Status Bar](resources/tomcat-status-bar.png)

### Command Palette (`Ctrl+Shift+P`)

| Command                | Action                                      |
|------------------------|---------------------------------------------|
| `Tomcat: Start`        | Launches Tomcat server                      |
| `Tomcat: Stop`         | Stops running instance                      | 
| `Tomcat: Clean`        | Cleans Tomcat work directory                |
| `Tomcat: Deploy`       | Deploys current project                     | 
| `Tomcat: Help`         | Shows interactive documentation             |

## Configuration

Access via <kbd>Ctrl+,</kbd> → Search "Tomcat"

| **Setting**                  | **Default**       | **Description**                                                                          |
|------------------------------|-------------------|------------------------------------------------------------------------------------------|
| `tomcat.defaultBuildType`    | `Fast`            | Default build strategy for deployments (`Fast`, `Maven`, `Gradle`)                               |
| `tomcat.defaultDeployMode`   | `Disabled`        | Auto-deploy triggers (`Disabled`, `On Save`, `On Shortcut`)                                      |
| `tomcat.defaultBrowser`      | `Google Chrome`   | Browser for app launch & debug (`Google Chrome`, `Microsoft Edge`, `Firefox`, `Safari`, `Brave`, `Opera`) |
| `tomcat.loggingLevel`        | `WARN`            | Log verbosity level (`DEBUG`, `INFO`, `WARN`, `ERROR`, `SILENT`)                                       |
| `tomcat.java.home`           | `JAVA_HOME`       | JDK installation path (e.g., `C:\Program Files\Java\jdk-21`)                             |
| `tomcat.home`                | `CATALINA_HOME`   | Tomcat installation directory (e.g., `C:\Java\apache-tomcat-11.0.4`)                     |
| `tomcat.port`                | `8080`            | Tomcat server listen port (valid range: `1024`-`65535`)                                      |

## Requirements

- **Runtime**:
  - JDK 11+ (`JAVA_HOME` or `tomcat.java.home`)
  - Apache Tomcat 9+ (`CATALENA_HOME` or `tomcat.home`)
  
- **Build Tools** (optional):
  - `Maven` 3.6+ *or* `Gradle` 6.8+ (if using `Maven` or `Gradle` build types)

## Known Issues

- Firefox and Safari will always open a new tab instead of reusing the existing one due to browser limitations.

[![Report Issue](https://img.shields.io/badge/-Report_Issue-red?style=flat-square)](https://github.com/Al-rimi/tomcat/issues)

## What's New in 1.2.43
- **Enhanced Cleanup**: Intelligent Tomcat directory cleaning preserves default apps
- **Deployment Progress**: Visual notifications for build processes
- **Browser Management**: Improved browsers handling with process control
- **Path Validation**: Strict checks for Java/Tomcat installations
- **Logging System**: Configurable logging levels (DEBUG/INFO/WARN/ERROR)

[View Full Changelog](https://github.com/Al-rimi/tomcat/blob/main/CHANGELOG.md)

---

**License**: [MIT](LICENSE) • 💖 **Support**: Star our [GitHub Repo](https://github.com/Al-rimi/tomcat) • [VScode Marketplace](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat)