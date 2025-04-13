# Change Log

## [Unreleased]

## [2.4.0] - 2025-04-14
### Added
- Implemented on-demand access logging for Tomcat with dynamic log file watching
- Added retry mechanism for EBUSY errors during deployment (kills Tomcat process before retry)
- Add `tomcat.autoScrollOutput` configuration option to automatically reveal and scroll output channel when new logs are added
- Introduced syntax highlighting rules for Tomcat HTTP logs and admin actions

### Fixed
- Resolved EBUSY errors when replacing running libraries during deployment
- Prevented deployment of already-deployed libraries with pre-deployment checks
- Improved Tomcat clean process to kill all Java processes before cleaning webapps

### Changed
- Refactored fast build process with enhanced directory management and JAR skip copying logic

## [2.3.5] - 2025-04-13
### Changed
- Updated documentation for `ARCHITECTURE.md` and `README.md`

## [2.3.4] - 2025-04-12  
### Fixed
- Limited fast build method to only build `src/main` folder (Thanks to @ILG2021)

## [2.3.3] - 2025-04-12
### Added
- Implemented browser future disabling option

### Changed
- Standardized logging messages across `Browser` and `Tomcat` classes
- Refactored environment detection methods with improved validation
- Renamed configuration parameters for consistency:
  - `tomcat.defaultBrowser` → `tomcat.browser`
  - `tomcat.defaultDeployMode` → `tomcat.autoDeployMode`
  - `tomcat.defaultBuildType` → `tomcat.autoDeployBuildType`
  - `tomcat.webapps` → `tomcat.protectedWebapps`
  - `tomcat.java.home` → `tomcat.javaHome`

### Fixed
- Corrected Java home detection to use `tomcat.javaHome` setting

## [2.3.2] - 2025-04-09
### Fixed
- Resolved undefined logger error during fast mode Java compilation
- Prevented original Java syntax highlighting overwrite

## [2.3.1] - 2025-04-09
### Fixed
- Addressed configuration registration issue for `defaultDeployMode`
- Improved browser reload timing with additional 40ms delay

## [2.3.0] - 2025-04-09
### Fixed
- Enhanced Tomcat running detection using `0.0.0.0:8080` check
- Corrected type definitions for environment detection methods

### Changed
- Updated logger methods with `showToast` parameter support
- Optimized configuration management and message display
- Automated environment detection for hidden settings
- Simplified deployment mode configuration with UI button

### Removed
- Eliminated redundant `loggingLevel` setting
- Deprecated `restart` method in favor of separate start/stop
- Removed unused log levels and command stderr logging

## [2.2.3] - 2025-04-07
### Changed
- Reduced extension package size through image optimization

## [2.2.2] - 2025-04-07
### Changed
- Improved port update responsiveness (2000ms → 200ms delay)
- Replaced embedded images with external links

## [2.2.1] - 2025-04-06
### Changed
- Enhanced port modification logic with post-stop updates

### Fixed
- Improved error handling for invalid port values

## [2.2.0] - 2025-04-06
### Added
- Comprehensive JSDoc documentation
- Memory-optimized fast build strategy
- Tomcat log syntax coloring rules
- Build duration tracking system

### Changed
- Refactored activation process with simplified error handling
- Improved configuration management reliability

### Fixed
- Resolved memory leaks in builder operations
- Addressed browser reload synchronization issues

## [2.1.1] - 2025-04-05
### Fixed
- Corrected Tomcat clean process environment variables
- Fixed icon file naming inconsistency

## [2.1.0] - 2025-04-03
### Fixed
- Resolved package generation dependency issues
- Corrected webpack configuration path

## [2.0.2] - 2025-04-01
### Fixed
- Prevented browser focus stealing on MacOS/Linux
- Addressed cross-platform dependency issues

## [2.0.1] - 2025-03-30
### Fixed
- Resolved Tomcat reload failure during initial start

## [2.0.0] - 2025-03-30
### Added
- OOP architecture with Singleton implementation
- Automated project creation wizard

### Changed
- Full TypeScript migration with class-based structure
- Enhanced cross-platform path handling

### Fixed
- Addressed Windows process management edge cases
- Improved logging system thread safety

## [1.3.0] - 2025-03-28
### Fixed
- Corrected path escaping logic for browser and Java
- Resolved Tomcat startup failures

### Removed
- Deprecated manual `javac` configuration in favor of `JAVA_HOME`

## [1.2.4] - 2025-03-25
### Added
- Deployment progress notifications
- Automatic `JAVA_HOME` detection

### Changed
- Implemented smart webapp preservation during cleanup

### Fixed
- Resolved cross-platform browser management issues

## [1.2.3] - 2025-03-14
### Fixed
- Addressed premature browser reload issues
- Improved Windows process termination commands

## [1.2.2] - 2025-03-13
### Added
- Initial Firefox and Safari support

### Changed
- Standardized configuration parameter names

### Fixed
- Improved non-Chromium browser detection

## [1.2.1] - 2025-03-12
### Changed
- Enhanced visual feedback for deployment modes

### Fixed
- Removed legacy Firefox WebDriver support

## [1.2.0] - 2025-03-11
### Added
- Tomcat reload with authentication support
- Webview-based configuration interface

### Changed
- Modernized browser session management

### Fixed
- Addressed configuration persistence issues

## [1.1.1] - 2025-03-10
### Fixed
- Prevented disruptive process exits during errors

## [1.1.0] - 2025-03-10
### Added
- Gradle deployment pipeline support
- Interactive help documentation panel

### Changed
- Default auto-deploy to "On Save" mode

## [1.0.1] - 2025-03-09
### Fixed
- Improved project creation workflow

## [1.0.0] - 2025-03-08
### Added
- Core Tomcat management commands
- Auto-deployment engine with save triggers