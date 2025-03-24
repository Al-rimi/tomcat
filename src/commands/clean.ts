import { findTomcatHome } from "../utils/tomcat";
import { info, success, error } from "../utils/logger";
import fs from 'fs';
import path from 'path';

const DEFAULT_WEBAPPS = [
    'ROOT',          // Default root application
    'docs',          // Tomcat documentation
    'examples',      // Servlet/JSP examples
    'manager',       // Management interface
    'host-manager'   // Virtual host management
];

export async function cleanTomcat(): Promise<void>{
    const tomcatHome = await findTomcatHome();
    if (!tomcatHome) return;

    const webappsDir = path.join(tomcatHome, 'webapps');
    
    if (!fs.existsSync(webappsDir)) {
        error(`Webapps directory not found: ${webappsDir}`);
        return;
    }

    try {
        const entries = fs.readdirSync(webappsDir, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = path.join(webappsDir, entry.name);
            
            if (!DEFAULT_WEBAPPS.includes(entry.name)) {
                try {
                    if (entry.isDirectory()) {
                        fs.rmSync(entryPath, { recursive: true, force: true });
                        info(`Removed directory: ${entryPath}`);
                    } else if (entry.isFile() || entry.isSymbolicLink()) {
                        fs.unlinkSync(entryPath);
                        info(`Removed file: ${entryPath}`);
                    }
                } catch (err) {
                    error(`Error removing ${entryPath}:`, err as Error);
                }
            }
        }

        const workDir = path.join(tomcatHome, 'work');
        const tempDir = path.join(tomcatHome, 'temp');
        [workDir, tempDir].forEach(dir => {
            if (fs.existsSync(dir)) {
                try {
                    fs.rmSync(dir, { recursive: true, force: true });
                    fs.mkdirSync(dir);
                    info(`Cleaned and recreated: ${dir}`);
                } catch (err) {
                    error(`Error cleaning ${dir}:`, err as Error);
                }
            }
        });

        success('Tomcat cleaned successfully');
    } catch (err) {
        error(`Error during cleanup:`, err as Error);
    }
}