import * as fs from 'fs';
import * as path from 'path';
import { t } from './i18n';

export type ProjectType = 'maven' | 'gradle' | 'eclipse' | 'javaweb' | 'springboot' | 'jakartaee' | 'unknown';

/**
 * Comprehensive project type detection for Java web applications
 * Supports Eclipse, Maven, Gradle, and various Java EE frameworks
 */
export class ProjectDetector {

    /**
     * Detect the project type for a given directory
     */
    static detectProjectType(projectPath: string): ProjectType {
        try {
            if (!fs.existsSync(projectPath)) {
                return 'unknown';
            }

            const files = fs.readdirSync(projectPath);

            // Check for Eclipse project (.project + .classpath)
            if (files.includes('.project') && files.includes('.classpath')) {
                return 'eclipse';
            }

            // Check for Maven project
            if (files.includes('pom.xml')) {
                const pomContent = fs.readFileSync(path.join(projectPath, 'pom.xml'), 'utf-8');

                // Spring Boot detection
                if (pomContent.includes('spring-boot-starter-web') ||
                    pomContent.includes('spring-boot-starter-tomcat')) {
                    return 'springboot';
                }

                // Jakarta EE detection
                if (pomContent.includes('jakarta.servlet') ||
                    pomContent.includes('jakarta.persistence') ||
                    pomContent.includes('jakarta.ws.rs')) {
                    return 'jakartaee';
                }

                // Standard Maven WAR project
                if (pomContent.includes('<packaging>war</packaging>')) {
                    return 'maven';
                }

                // Maven project with web dependencies
                if (pomContent.includes('javax.servlet') ||
                    pomContent.includes('servlet-api') ||
                    pomContent.includes('jsp-api')) {
                    return 'maven';
                }
            }

            // Check for Gradle project
            if (files.includes('build.gradle') || files.includes('build.gradle.kts')) {
                const gradlePath = files.includes('build.gradle') ?
                    path.join(projectPath, 'build.gradle') :
                    path.join(projectPath, 'build.gradle.kts');

                if (fs.existsSync(gradlePath)) {
                    const gradleContent = fs.readFileSync(gradlePath, 'utf-8');
                    if (gradleContent.match(/(tomcat|jakarta|javax\.ee|spring-boot)/i)) {
                        return 'gradle';
                    }
                }
            }

            // Check for standard Java web app structure (Eclipse-style)
            if (files.includes('WebContent')) {
                const webInfPath = path.join(projectPath, 'WebContent', 'WEB-INF');
                if (fs.existsSync(webInfPath)) {
                    return 'javaweb';
                }
            }

            // Check for Maven standard directory structure
            const mavenWebappPath = path.join(projectPath, 'src', 'main', 'webapp', 'WEB-INF');
            if (fs.existsSync(mavenWebappPath)) {
                return 'maven';
            }

            // Check for existing build artifacts
            if (files.includes('target')) {
                const targetPath = path.join(projectPath, 'target');
                if (fs.existsSync(targetPath)) {
                    const targetFiles = fs.readdirSync(targetPath);
                    if (targetFiles.some(file => file.endsWith('.war') || file.endsWith('.ear'))) {
                        return 'maven'; // Assume Maven if WAR/EAR found in target
                    }
                }
            }

            // Check for Gradle build directory
            if (files.includes('build')) {
                const buildPath = path.join(projectPath, 'build');
                if (fs.existsSync(buildPath)) {
                    const buildFiles = fs.readdirSync(buildPath);
                    if (buildFiles.some(file => file.endsWith('.war') || file.endsWith('.ear'))) {
                        return 'gradle';
                    }
                }
            }

            return 'unknown';

        } catch (error) {
            console.error(t('error.projectDetectionFailed'), error);
            return 'unknown';
        }
    }

    /**
     * Check if a directory contains a valid Java web project
     */
    static isJavaWebProject(projectPath: string): boolean {
        const projectType = this.detectProjectType(projectPath);
        return projectType !== 'unknown';
    }

    /**
     * Get the web application root directory for a project
     */
    static getWebAppRoot(projectPath: string): string | null {
        const projectType = this.detectProjectType(projectPath);

        switch (projectType) {
            case 'maven':
            case 'springboot':
            case 'jakartaee':
                return path.join(projectPath, 'src', 'main', 'webapp');

            case 'eclipse':
            case 'javaweb':
                return path.join(projectPath, 'WebContent');

            case 'gradle':
                // Gradle can use either Maven or Eclipse structure
                const mavenPath = path.join(projectPath, 'src', 'main', 'webapp');
                if (fs.existsSync(mavenPath)) {
                    return mavenPath;
                }
                return path.join(projectPath, 'WebContent');

            default:
                return null;
        }
    }

    /**
     * Get the WEB-INF directory for a project
     */
    static getWebInfDir(projectPath: string): string | null {
        const webAppRoot = this.getWebAppRoot(projectPath);
        if (webAppRoot) {
            const webInfPath = path.join(webAppRoot, 'WEB-INF');
            return fs.existsSync(webInfPath) ? webInfPath : null;
        }
        return null;
    }

    /**
     * Get the source directory for a project
     */
    static getSourceDir(projectPath: string): string | null {
        const projectType = this.detectProjectType(projectPath);

        switch (projectType) {
            case 'maven':
            case 'springboot':
            case 'jakartaee':
                return path.join(projectPath, 'src', 'main', 'java');

            case 'eclipse':
            case 'javaweb':
                return path.join(projectPath, 'src');

            case 'gradle':
                // Gradle can use either Maven or Eclipse structure
                const mavenSrc = path.join(projectPath, 'src', 'main', 'java');
                if (fs.existsSync(mavenSrc)) {
                    return mavenSrc;
                }
                return path.join(projectPath, 'src');

            default:
                return null;
        }
    }

    /**
     * Find all Java web projects in a directory tree
     */
    static findJavaWebProjects(baseDir: string): string[] {
        const projects: string[] = [];

        function scanDir(dir: string) {
            try {
                const items = fs.readdirSync(dir);

                // Check if current directory is a project root
                if (ProjectDetector.isJavaWebProject(dir)) {
                    projects.push(dir);
                    return; // Don't scan subdirectories of project roots
                }

                // Recursively scan subdirectories
                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                        scanDir(fullPath);
                    }
                }
            } catch (error) {
                // Skip directories we can't read
            }
        }

        scanDir(baseDir);
        return projects;
    }

    /**
     * Get build command for a project type
     */
    static getBuildCommand(projectPath: string): string | null {
        const projectType = this.detectProjectType(projectPath);

        switch (projectType) {
            case 'maven':
            case 'springboot':
            case 'jakartaee':
                return 'mvn clean package';

            case 'gradle':
                return 'gradle build';

            case 'eclipse':
            case 'javaweb':
                // Eclipse projects typically use Ant or manual compilation
                return null;

            default:
                return null;
        }
    }

    /**
     * Check if project needs compilation
     */
    static needsCompilation(projectPath: string): boolean {
        const projectType = this.detectProjectType(projectPath);

        switch (projectType) {
            case 'maven':
            case 'gradle':
            case 'springboot':
            case 'jakartaee':
                return true;

            case 'eclipse':
            case 'javaweb':
                // May need manual compilation
                return false;

            default:
                return false;
        }
    }
}