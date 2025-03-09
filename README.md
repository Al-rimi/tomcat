# Tomcat for VSCode

Easy way to manage Apache Tomcat servers directly from VS Code. It allows you to start, stop, clean, and deploy applications to Tomcat, along with configurable auto-deployment options and browser integration.

![Tomcat Auto Deploy on Save](resources/tomcat-auto-ex.gif)

## Features
- **Start & Stop Tomcat**: Quickly start or stop your Tomcat server
- **Multi-build Deployments**: Support for Fast, Maven, and Gradle deployment strategies
- **Smart Auto-Deployment**: Automatic deployment on save with configurable triggers
- **Port Configuration**: Customizable Tomcat server port (default: 8080)
- **Browser Integration**: Choose from 6 supported browsers with debug reloading
- **Enhanced Project Detection**: Improved Java EE project recognition logic
- **Visual Help System**: New HTML-based documentation panel

## Installation
1. Open VS Code
2. Go to the Extensions Marketplace (`Ctrl+Shift+X`)
3. Search for "Tomcat"
4. Click "Install"

## Usage

### Commands
Access commands via **Command Palette** (`Ctrl+Shift+P`):
- `Tomcat: Start` - Starts the Tomcat server
- `Tomcat: Stop` - Stops the Tomcat server
- `Tomcat: Clean` - Cleans the deployment directory
- `Tomcat: Deploy` - Deploys with selected build system
- `Tomcat: Help` - Opens interactive documentation

### Configuration
Modify settings via **Settings (`Ctrl+,`)** under `Tomcat`:
- **`tomcat.home`**: Path to Tomcat installation
- **`tomcat.java.home`**: JDK installation path
- **`tomcat.port`**: Server port (default: 8080)
- **`tomcat.defaultBrowser`**: Choose from 6 supported browsers
- **`tomcat.autoDeploy`**: Default: "On Save" (options: Disabled/On Save/On Ctrl+S)
- **`tomcat.autoDeployType`**: Fast/Maven/Gradle deployment

## Requirements
1. **Java Development Kit (JDK) 11+**
   - Set `JAVA_HOME` or configure `tomcat.java.home` in settings
2. **Apache Tomcat 9+**
   - Configure `tomcat.home` in settings or via environment variable
3. **Build Tools**
   - Maven 3.6+ or Gradle 7+ (for respective deployment types)

## Known Issues
- Firefox browser automation uses limited debugging protocol
- First-run configuration requires Tomcat home selection

[Report issues](https://github.com/Al-rimi/tomcat/issues)

## Changelog
### [1.1.1] - 2025-03-10
- Added Gradle deployment support
- Configurable server port
- Enhanced project detection logic
- New visual help system
- Default auto-deploy set to "On Save"

[Full Changelog](#changelog)

## License
MIT License - See [LICENSE](LICENSE)