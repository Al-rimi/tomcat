# Tomcat for VSCode

Easy way to manage Apache Tomcat servers directly from VS Code. It allows you to start, stop, clean, and deploy applications to Tomcat, along with configurable auto-deployment options and browser integration.

![Tomcat Auto Deploy on Save](resources/tomcat-auto-ex.gif)

## Features
- **Start & Stop Tomcat**: Quickly start or stop your Tomcat server.
- **Deploy Applications**: Deploy your web applications with a simple command Fast deployment or Maven.
- **Auto-Deployment**: Automatically deploy applications on save or using `Ctrl+S`.
- **Configurable Browser Integration**: Choose your preferred browser to open deployed applications.
- **Logging Support**: Enable logging to track server events and deployment actions.

## Installation
1. Open VS Code.
2. Go to the Extensions Marketplace (`Ctrl+Shift+X`).
3. Search for "Tomcat".
4. Click "Install".

## Usage

### Commands
You can access extension commands via the **Command Palette** (`Ctrl+Shift+P`):
- `Tomcat: Start` - Starts the Tomcat server.
- `Tomcat: Stop` - Stops the Tomcat server.
- `Tomcat: Clean` - Cleans the deployment directory.
- `Tomcat: Deploy` - Deploys the current project.
- `Tomcat: Help` - Opens the help documentation.

### Configuration
Modify settings via **Settings (`Ctrl+,`)** under `Tomcat`:
- **`tomcat.home`**: Path to the Tomcat installation.
- **`tomcat.defaultBrowser`**: Preferred browser for deployment preview.
- **`tomcat.enableLogger`**: Enable logging output.
- **`tomcat.autoDeploy`**: Choose between "Disabled", "On Save", or "On Ctrl+S".
- **`tomcat.autoDeployType`**: Select deployment type: "Fast" or "Maven".

## Requirements

1. **Java Development Kit (JDK)**
   - Install the JDK and set the `JAVA_HOME` environment variable.

2. **Apache Tomcat**
   - Install Apache Tomcat and set the `CATALINA_HOME` environment variable.

3. **Maven**
   - Install Maven and ensure it is available in your system's `PATH`.

## Known Issues

- **Browser Automation**: Firefox doesn't use chrome devtools protocol for automation and may not work as expected reloading a specific session is not supported.

If you encounter any issues, please [report them here](https://github.com/Al-rimi/tomcat/issues).

## Contributing

Contributions are welcome! If you have ideas for new features or improvements, please open an issue or submit a pull request.

## Acknowledgments

- Special thanks to the [Apache Tomcat](https://tomcat.apache.org/) project for providing the server software.
- Thanks to the [VS Code](https://code.visualstudio.com/) team for creating a powerful editor.

## Contact

For any questions or feedback, please contact the maintainer at [Al-rimi](https://github.com/Al-rimi).

<br>

### For More Information

- Visit the [GitHub Repository](https://github.com/Al-rimi/tomcat) for source code and contributions.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.