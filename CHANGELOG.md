# Change Log

## [Unreleased]

## [1.0.1] - 2025-03-09
### Fixed
- Resolved an issue in the deployment functionality where the process would fail if a Java EE project was not detected. The updated logic now includes a more robust project detection mechanism and prompts the user to create a new project if none is found, ensuring a smoother and more intuitive workflow.

### Enhanced
- Improved project creation flow in the deployment functionality.

## [1.0.0] - Initial Release
### Added
- Start, Stop, Clean, and Deploy commands.
- Auto-deployment on Save and Ctrl+S using Fast deployment or Maven.
- Configurable settings for Tomcat home, browser, and logging.
- WebSocket-based browser reloading.