# Tomcat for VScode
Advanced Apache Tomcat management directly in your editor. Full server control, smart deployment, and browser integration.

![Tomcat Auto Deploy on Save](resources/tomcat-auto-ex.gif)

## Features

| Category               | Highlights                                                           |
|------------------------|----------------------------------------------------------------------|
| **Server Control**     | Single-click management • Real-time status                           |
| **Deployment**         | Visual deploy selector • Fast/Maven/Gradle • Auto-save integration   |
| **UI Enhancements**    | Status bar integration • Contextual hover • Interactive help         |
| **Optimization**       | WAR caching • Smart browser reload • Configuration versioning        |

## Installation

1. Open VS Code (`Ctrl+Shift+N`)
2. Launch Extensions View (`Ctrl+Shift+X`)
3. Search for `Al-rimi.tomcat`
4. Click <kbd>Install</kbd>

command line:
```bash
code --install-extension Al-rimi.tomcat
```

## Usage
> The extension is Fully AUTOMATED to work out of the box. Simply open a Java EE project and start coding...

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

| Setting                   | Type    | Default       | Values/Options                         | Description                                      |
|---------------------------|---------|---------------|----------------------------------------|--------------------------------------------------|
| `tomcat.defaultBrowser`   | `string`|`Google Chrome`| Chrome/Edge/Firefox/Safari/Brave/Opera | Browser for app launch & debug                   |
| `tomcat.defaultDeployMood`| `string`| `On Save`     | Disabled/On Save/On Ctrl+S             | Automatic deployment trigger behavior            |
| `tomcat.defaultBuildType` | `string`| `Fast`        | Fast/Maven/Gradle                      | Default build strategy for deployments           |
| `tomcat.java.home`        | `string`|`JAVA_HOME`    | Valid JDK path                         | JDK installation path (e.g., `C:\Program Files\Java\jdk-21`)   |
| `tomcat.home`             | `string`|`CATALINA_HOME`| Valid path                             | Tomcat installation directory (e.g., `C:\Java\apache-tomcat-11.0.4`)|
| `tomcat.port`             | `number`|`8080`         | 1024-65535                             | Tomcat server listen port                        |
| `tomcat.enableLogger`     |`boolean`| `false`       | true/false                             | Toggle logging in Output channel                 |

## Requirements

- **Runtime**:
  - JDK 11+ (`JAVA_HOME` or `tomcat.java.home`)
  - Apache Tomcat 9+ (`CATALENA_HOME` or `tomcat.home`)
  
- **Build Tools** (optional):
  - Maven ≥3.6 *or* Gradle ≥7

## Known Issues

- Firefox and Safari will always open a new tab instead of reusing the existing one due to browser limitations.

[![Report Issue](https://img.shields.io/badge/-Report_Issue-red?style=flat-square)](https://github.com/Al-rimi/tomcat/issues)

## What's New in 1.2.3
- **Gradle Improvements**: Fixed critical build logic errors
- **Reload Synchronization**: Better Tomcat-browser coordination
- **Config Hot-Reload**: Instant detection of setting changes
- **Mac UX Enhancements**: Removed disruptive focus stealing

[View Full Changelog](https://github.com/Al-rimi/tomcat/blob/main/CHANGELOG.md)

---

**License**: [MIT](LICENSE) • 💖 **Support**: Star our [GitHub Repo](https://github.com/Al-rimi/tomcat) • [VScode Marketplace](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat)