# Change Log

## [Unreleased]

## [1.1.1] - 2025-03-11
### Fixed
- Auto-deploy On Ctrl+S logic now properly checks deployment trigger conditions
- Removed disruptive process.exit() calls from configuration flows
- Improved error handling for missing Tomcat/Java home directories
- Added proper promise rejection in command execution failures

## [1.1.0] - 2025-03-10
### Added
- Gradle deployment support
- Configurable Tomcat server port
- Java Home configuration option
- Enhanced Java EE project detection
- Interactive HTML help panel
- Browser session management improvements

### Changed
- Default auto-deploy behavior to "On Save"
- Improved deployment reliability
- Restructured configuration system
- Enhanced status bar integration

### Fixed
- Deployment failures with non-ASCII paths
- Maven build detection issues
- Browser reload race conditions
- Configuration change handling
- Project validation false positives

## [1.0.1] - 2025-03-09
### Fixed
- Deployment failure when Java EE project not detected
- Project creation flow improvements

## [1.0.0] - Initial Release
### Added
- Basic Tomcat management commands
- Auto-deployment functionality
- Browser integration
- Configuration system