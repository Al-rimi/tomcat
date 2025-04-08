# Change Log

## [Unreleased]

## [2.3.2] - 2025-04-09
### Fixed
- logger undefined error when compiling java in fast mode
- ovrwrite orjginal java syntax highlighting

## [2.3.1] - 2025-04-09
### Fixed
- Unable to write to User Settings because defaultDeployMode is not a registered configuration.
- Fix the miss browse to reload the page before full deployment (add more delay 40ms) 

## [2.3.0] - 2025-04-09
### Fixed
- Corrected the `isTomcatRunning` detection logic to search for `0.0.0.0:8080` instead of just `:8080`
- Adjusted the types of `findTomcatHome` and `findJavaHome` from `object` to `string`

### Changed
- Refactored logger methods to include a `showToast` parameter and updated Tomcat commands to support message display
- Optimized messages to reduce interruptions
- `tomcat.home` and `java.home` are now automatically detected and hidden in `settings.json`
- Deployment mode configuration moved from settings to a button for easier access
- Simplified and enhanced configuration logic across all classes for better reliability

### Removed
- Removed the `loggingLevel` setting as it is no longer required
- Removed `restart` method from the Tomcat class, replaced with separate `start` and `stop` methods
- Refined `Logger` class by removing unused log levels and improving deployment mode handling
- Remove logging of Tomcat command stderr output to streamline execution process

## [2.2.3] - 2025-04-07
### Changed
- Compressed heavy images in the vscode package to reduce overall package size (broken link removed)

## [2.2.2] - 2025-04-07
### Changed
- Reduced delay in the `updatePort` method from 2000ms to 200ms for better responsiveness
- Removed large images from the vscode package to improve size (using links instead)

## [2.2.1] - 2025-04-06
### Changed
- Refactored port modification logic to ensure `server.xml` port updates after stopping Tomcat
- Simplified port pattern detection for improved consistency

### Fixed
- Corrected logic in `server.xml` port update to handle invalid port values properly (throws error instead of logging)

## [2.2.0] - 2025-04-06
### Added
- Comprehensive JSDoc comments for major classes and components
- Detailed architectural pattern documentation for core components
- Optimized memory usage in fast build strategy (replaced temp files with in-memory lists)
- Organized error messages for Java compilation and debugging
- Syntax coloring rules for Tomcat output in the logs
- Build duration tracking added to deployment process
- Enhanced handling for build type selection

### Changed
- Refined `activate` function by removing unnecessary try-catch blocks
- Improved error logging practices across Tomcat and Logger classes
- Added a delay before stopping Tomcat during port updates
- Streamlined configuration management processes for better reliability
- Enhanced deployment operation reliability and error handling

### Fixed
- Fixed memory leaks in builder operations
- Handled edge cases in port validation
- Addressed browser reload synchronization issues
- Ensured status bar updates remain consistent

## [2.1.1] - 2025-04-05
### Fixed
- Fixed Tomcat clean logic by using `JavaHome` instead of `CatalinaHome`
- Corrected port update logic in the Tomcat class and improved error handling
- Updated the icon file from `tomcat-icon-ligh.svg` to `tomcat-icon-light.svg`

## [2.1.0] - 2025-04-03
### Fixed
- Fixed package generation error due to missing dependencies
- Corrected webpack configuration file path

## [2.0.2] - 2025-04-01
### Fixed
- Resolved browser stealing focus on MacOS/Linux
- Fixed package dependency issues on MacOS/Linux

## [2.0.1] - 2025-03-30
### Fixed
- Addressed Tomcat reload failure during case start

## [2.0.0] - 2025-03-30
### Added
- Full OOP architecture with Singleton pattern implementation
- Comprehensive port management system
- Advanced configuration validation subsystem
- Developer documentation system
- Automated project creation wizard

### Changed
- Refactored codebase to TypeScript with class-based structure
- Enhanced configuration management system
- Improved cross-platform path handling
- Restructured deployment pipeline architecture
- Optimized browser session management
- Reduced dependencies on external libraries

### Fixed
- Fixed memory leaks in long-running processes
- Addressed configuration synchronization issues
- Resolved Windows process management edge cases
- Fixed deployment race conditions
- Improved logging system thread safety
- Fixed spaces escaping logic for file, folder, and URL paths

## [1.3.0] - 2025-03-28
### Fixed
- Corrected browser path spaces escaping logic
- Fixed browser reload bug (Windows)
- Addressed path directory spaces escaping logic for `javac` (Windows)
- Fixed Tomcat startup failure

### Removed
- Removed `javac` environment variable configuration, using `JAVA_HOME` instead

## [1.2.4] - 2025-03-25
### Added
- Progress notifications for deployment operations
- Configurable logging system with multiple verbosity levels
- Windows PowerShell integration for process management (Windows)
- Automatic `JAVA_HOME` detection and PATH configuration

### Changed
- **Smart Cleanup**: Preserved default Tomcat webapps during cleanup
- **Deployment Sequencing**: Ensured Tomcat readiness before browser refresh
- **Error Handling**: Enhanced path validation for Java/Tomcat installations

### Fixed
- Fixed browser process management inconsistencies (Windows/macOS)
- Resolved deployment failures caused by spaces in directory paths
- Addressed intermittent reload failures during rapid file saves
- Fixed Gradle build detection in nested project structures

## [1.2.3] - 2025-03-14
### Fixed
- Resolved Gradle build logic errors and deployment failures
- Fixed premature browser reloads before Tomcat initialization
- Corrected auto-deploy configuration change detection reliability
- Fixed intrusive browser focus behavior on macOS
- Improved deployment error messaging clarity
- Fixed Windows process termination commands for browser management

## [1.2.2] - 2025-03-13
### Added
- Initial support for Firefox and Safari browsers

### Changed
- Renamed `autoDeployType` parameter to `defaultBuildType` for clarity
- Optimized cross-platform browser process management
- Restructured deployment configuration subsystem

### Fixed
- Fixed browser detection logic for non-Chromium browsers
- Corrected path validation checks for Java executable locations
- Addressed deployment trigger conflicts during concurrent save operations
- Fixed status bar tooltip consistency across OSes

## [1.2.1] - 2025-03-12
### Changed
- Improved visual feedback mechanisms for deployment modes
- Renamed `autoDeploy` parameter to `defaultDeployMode` for consistency
- Enhanced synchronization between deployment triggers and save events
- Expanded error message details for invalid Tomcat/Java paths

### Fixed
- Removed Firefox support due to legacy WebDriver protocol limitations
- Fixed path validation issues for `catalina.bat` and `java.exe` (Windows)
- Improved status bar deployment mode toggle reliability
- Fixed browser reload functionality stability

## [1.2.0] - 2025-03-11
### Added
- Tomcat reload functionality with basic authentication support
- Automatic admin user injection into `tomcat-users.xml` when missing
- Editor-integrated deployment trigger button
- Real-time status bar deployment indicators
- Persistent configuration storage for deployment preferences
- Webview-based deployment type selection interface

### Changed
- Redesigned help panel with interactive UI components
- Upgraded status bar integration with stateful deployment tracking
- Improved configuration change propagation handling
- Modernized browser session management architecture

### Fixed
- Fixed deployment type persistence across sessions
- Addressed status bar flickering during active operations
- Resolved edge cases in configuration validation logic
- Fixed styling inconsistencies in help panel
- Fixed crash scenarios from concurrent save requests

## [1.1.1] - 2025-03-10
### Fixed
- Corrected auto-deploy trigger conditions for `Ctrl+S` keyboard shortcut
- Removed disruptive `process.exit()` calls in error handling
- Improved error recovery for missing directory scenarios
- Fixed unhandled promise rejections during command execution

## [1.1.0] - 2025-03-10
### Added
- Gradle-based deployment pipeline support
- Configurable Tomcat server port specification
- `JAVA_HOME` configuration override capability
- Enhanced Java EE project detection heuristics
- Interactive HTML help documentation panel
- Advanced browser session management features

### Changed
- Default auto-deploy behavior set to "On Save" mode
- Restructured configuration management subsystem
- Optimized deployment process reliability
- Upgraded status bar integration architecture

### Fixed
- Fixed deployment failures with non-ASCII directory paths
- Resolved Maven build detection false negatives
- Addressed browser reload race condition scenarios
- Fixed configuration change propagation delays
- Resolved project validation false positive cases

## [1.0.1] - 2025-03-09
### Fixed
- Resolved deployment failures when Java EE project was not detected
- Improved project creation workflow usability

## [1.0.0] - 2025-03-08
### Added
- Core Tomcat server management commands
- Auto-deployment engine with save-trigger support
- Cross-browser integration framework
- Hierarchical configuration management system