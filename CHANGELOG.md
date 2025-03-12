# Change Log

## [Unreleased]

## [1.2.2] - 2025-03-13
### Added
- Half support for Firefox and Safari browsers.

### Changed
- Renamed `autoDeployType` to `defaultBuildType` for clarity
- Improved browser process management across platforms
- Refactored deployment configuration system

### Fixed
- Browser detection logic for non-Chromium browsers
- Path validation for Java executable locations
- Deployment trigger conflicts during save operations
- Status bar tooltip consistency across platforms

## [1.2.1] - 2025-03-12
### Changed
- Better visual feedback for deployment modes
- Renamed `autoDeploy` to `defaultDeployMood` for consistency
- Improved handling of deployment triggers and save events
- More descriptive error messages for invalid Tomcat and Java paths

### Fixed
- Removed Firefox support due to legacy protocol limitations
- Issues with path validation for `catalina.bat` and `java.exe` on win
- Resolved issues with toggling deployment modes in the status bar
- Improved reliability of browser reload functionality

### Fixed
- Removed Firefox support due to legacy protocol limitations.
- Issues with path validation for `catalina.bat` and `java.exe` on win.
- Resolved issues with toggling deployment modes in the status bar.
- Improved reliability of browser reload functionality.

## [1.2.0] - 2025-03-11
### Added
- Tomcat reload functionality with basic authentication.
- Automatic addition of admin user to `tomcat-users.xml` if missing.
- Editor deploy button to trigger deployments.
- Status bar deployment status indicators.
- Configuration memory for deployment preferences.
- Webview-based deployment type selector.

### Changed
- Revamped help panel with interactive UI components.
- Enhanced status bar integration with deployment states.
- Improved configuration change handling.
- Updated browser session management logic.

### Fixed
- Deployment type persistence issues.
- Status bar flickering during operations.
- Configuration validation edge cases.
- Help panel styling inconsistencies.
- Multiple save requests resulting in crashes.

## [1.1.1] - 2025-03-10
### Fixed
- Auto-deploy on Ctrl+S trigger conditions.
- Removed disruptive `process.exit()` calls.
- Improved missing directory error handling.
- Promise rejection in command failures.

## [1.1.0] - 2025-03-10
### Added
- Gradle deployment support.
- Configurable Tomcat server port.
- Java Home configuration option.
- Enhanced Java EE project detection.
- Interactive HTML help panel.
- Browser session management improvements.

### Changed
- Default auto-deploy behavior to "On Save".
- Improved deployment reliability.
- Restructured configuration system.
- Enhanced status bar integration.

### Fixed
- Deployment failures with non-ASCII paths.
- Maven build detection issues.
- Browser reload race conditions.
- Configuration change handling.
- Project validation false positives.

## [1.0.1] - 2025-03-09
### Fixed
- Deployment failure when Java EE project not detected.
- Project creation flow improvements.

## [1.0.0] - Initial Release
### Added
- Basic Tomcat management commands.
- Auto-deployment functionality.
- Browser integration.
- Configuration system.