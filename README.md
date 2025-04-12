# Tomcat for VSCode [![Version](https://img.shields.io/visual-studio-marketplace/v/Al-rimi.tomcat?label)](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat) [![Downloads](https://img.shields.io/visual-studio-marketplace/d/Al-rimi.tomcat?label=Downloads)](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat) [![Rating](https://img.shields.io/visual-studio-marketplace/stars/Al-rimi.tomcat?label=Rating)](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat) [![Build Status](https://img.shields.io/github/actions/workflow/status/Al-rimi/tomcat/ci.yml?label=Build)](https://github.com/Al-rimi/tomcat/actions)

Advanced Apache Tomcat management. Full server control, smart deployment, browser integration and debugging support.

![Tomcat showcase video](resources/tomcat-video-showcase.gif)

## Features

- **Customizable Deployment Strategies**  
  Three build strategies with memory-optimized fast deployment (4× faster than Maven)

- **On-Save Deployment**  
Automatically deploy your project every time you save a file — no manual steps needed.

- **Built-in Debugging**  
Java-specific syntax coloring in output channel with organized error messages

- **Custom Port Configuration**  
Configure and switch Tomcat ports effortlessly to suit your environment.

- **Cross-Browser Automation**  
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
> The extension is Fully AUTOMATED to work out of the box. Simply open a Java EE project and start coding...

### Editor Button

#### Click to Deploy the current project
![Tomcat Editor Button](resources/tomcat-editor-showcase.png)

### Status Bar

#### Click to Change the default deploy mode
![Tomcat Status Bar](resources/tomcat-status-showcase.png)

### Command Palette (`Ctrl+Shift+P`)

| Command                | Action                                           |
|------------------------|--------------------------------------------------|
| `Tomcat: Start`        | Launches Tomcat server                           |
| `Tomcat: Stop`         | Stops Tomcat server                              | 
| `Tomcat: Clean`        | Cleans Tomcat webapps, temp and work directories |
| `Tomcat: Deploy`       | Deploys current project                          | 
| `Tomcat: Help`         | Shows interactive help documentation             |

## Configuration

Access via <kbd>Ctrl+,</kbd> → Search "Tomcat"

| **Setting**                  | **Default**       | **Description**                                                                          |
|------------------------------|-------------------|------------------------------------------------------------------------------------------|
| `tomcat.autoDeployBuildType`    | `Fast`            | Default build strategy for deployments (`Fast`, `Maven`, `Gradle`)                       |
| `tomcat.autoDeployMode`   | `Disabled`        | Auto-deploy triggers (`Disabled`, `On Save`, `On Shortcut`)                              |
| `tomcat.browser`      | `Google Chrome`   | Browser for app launch & debug (`Google Chrome`, `Microsoft Edge`, `Firefox`, `Safari`, `Brave`, `Opera`) |
| `tomcat.port`                | `8080`            | Tomcat server listen port (valid range: `1024`-`65535`)                                  |
| `tomcat.protectedWebApps`             | `["ROOT", "docs", "examples", "manager", "host-manager"]`     | List of protected web apps during cleanup operations                                     |

> ℹ️ `tomcat.home` and `tomcat.javaHome` are now auto-detected and hidden from user settings.

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

- Firefox and Safari will always open a new tab instead of reusing the existing one due to browser limitations.

[![Report Issue](https://img.shields.io/badge/-Report_Issue-red?style=flat-square)](https://github.com/Al-rimi/tomcat/issues)

## What's New in 2.3.4

### Added
- The option to disable the browser future

### Fixed
- For the fast build method, only build the `src/main` folder and not the `src/test` folder. (Thanks to @ILG2021 for the suggestion)
- Fixed `Tomcat.findJavaHome()` using `java.home` instead of `tomcat.java.home` for updating the user settings (use `tomcat.javaHome` now)

### Changed
- All messages optimized to be less annoying
- Simplified and more reliable configuration logic across all classes
- Refactor `findTomcatHome` and `findJavaHome` methods for improved candidate validation and code clarity
- Settings `tomcat.defaultBrowser` to `tomcat.browser`
- Settings `tomcat.defaultDeployMode` to `tomcat.autoDeployMode`
- Settings `tomcat.defaultBuildType` to `tomcat.autoDeployBuildType`
- Settings `tomcat.webapps` to `tomcat.protectedWebapps`
- Settings `tomcat.java.home` to `tomcat.javaHome`

[View Full Changelog](https://github.com/Al-rimi/tomcat/blob/main/CHANGELOG.md)

---

**License**: [MIT](LICENSE) • 💖 **Support**: Star our [GitHub Repo](https://github.com/Al-rimi/tomcat) • [VScode Marketplace](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat)