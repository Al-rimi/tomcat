# Change Log

## [Unreleased]

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
- Multiple save requests resulting crashing.

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