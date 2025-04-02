# Change Log

## [Unreleased]

## [2.0.5] - 2025-04-01
### Fixed
- Package generation error missing dependencies

## [2.0.2] - 2025-04-01
### Fixed
- Browser stealing focus on MacOS/Linux
- Package dependency issues on MacOS/Linux

## [2.0.1] - 2025-03-30
### Fixed
- Tomcat reload on case start failure

## [2.0.0] - 2025-03-30
### Added
- Full OOP architecture with Singleton pattern implementation
- Comprehensive port management system
- Advanced configuration validation subsystem
- Developer documentation system
- Automated project creation wizard

### Changed
- Complete codebase refactor to TypeScript classes
- Enhanced configuration management system
- Improved cross-platform path handling
- Restructured deployment pipeline architecture
- Optimized browser session management
- Reduce dependencies on external libraries

### Fixed
- Memory leaks in long-running processes
- Configuration synchronization issues
- Windows process management edge cases
- Deployment race conditions
- Logging system thread safety
- Spaces escaping logic for file, Folder and url paths

## [1.3.0] - 2025-03-28
### Fixed
- Browser path spaces sscaping logic
- Browser reload bug (Windows)
- Path directory spaces sscaping logic for javac (Windows)
- Tomcat startup failure

### Removed
- javac environment variable configuration, use `JAVA_HOME` instead

## [1.2.4] - 2025-03-25  
### Added  
- Progress notifications for deployment operations  
- Configurable logging system with multiple verbosity levels  
- Windows PowerShell integration for process management (Windows)  
- Automatic `JAVA_HOME` detection and PATH configuration  

### Changed  
- **Smart Cleanup**: Preserve default Tomcat webapps during cleaning  
- **Deployment Sequencing**: Verify Tomcat readiness before browser refresh  
- **Error Handling**: Enhanced path validation for Java/Tomcat installations  

### Fixed  
- Browser process management inconsistencies (Windows/macOS)  
- Deployment failures caused by spaces in directory paths  
- Intermittent reload failures during rapid file saves  
- Gradle build detection in nested project structures  

## [1.2.3] - 2025-03-14  
### Fixed  
- Gradle build logic errors and deployment failures  
- Premature browser reloads before Tomcat initialization  
- Auto-deploy configuration change detection reliability  
- Intrusive browser focus behavior on macOS  
- Enhanced deployment error messaging clarity  
- Windows process termination commands for browser management  

## [1.2.2] - 2025-03-13  
### Added  
- Initial support for Firefox and Safari browsers  

### Changed  
- Renamed `autoDeployType` parameter to `defaultBuildType` for semantic clarity  
- Optimized cross-platform browser process management  
- Restructured deployment configuration subsystem  

### Fixed  
- Browser detection logic for non-Chromium browsers  
- Path validation checks for Java executable locations  
- Deployment trigger conflicts during concurrent save operations  
- Status bar tooltip consistency across operating systems  

## [1.2.1] - 2025-03-12  
### Changed  
- Enhanced visual feedback mechanisms for deployment modes  
- Renamed `autoDeploy` parameter to `defaultDeployMode` for consistency  
- Improved synchronization between deployment triggers and save events  
- Expanded error message details for invalid Tomcat/Java paths  

### Fixed  
- Removed Firefox support due to legacy WebDriver protocol limitations  
- Path validation issues for `catalina.bat` and `java.exe` (Windows)  
- Status bar deployment mode toggle reliability  
- Browser reload functionality stability  

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
- Deployment type persistence across sessions  
- Status bar flickering during active operations  
- Edge cases in configuration validation logic  
- Styling inconsistencies in help panel  
- Crash scenarios from concurrent save requests  

## [1.1.1] - 2025-03-10  
### Fixed  
- Auto-deploy trigger conditions for `Ctrl+S` keyboard shortcut  
- Removed disruptive `process.exit()` calls in error handling  
- Improved error recovery for missing directory scenarios  
- Unhandled promise rejections during command execution  

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
- Deployment failures with non-ASCII directory paths  
- Maven build detection false negatives  
- Browser reload race condition scenarios  
- Configuration change propagation delays  
- Project validation false positive cases  

## [1.0.1] - 2025-03-09  
### Fixed  
- Deployment failures when Java EE project not detected  
- Project creation workflow usability improvements  

## [1.0.0] - 2025-03-08  
### Added  
- Core Tomcat server management commands  
- Auto-deployment engine with save-trigger support  
- Cross-browser integration framework  
- Hierarchical configuration management system