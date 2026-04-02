import * as fs from 'fs';
import * as path from 'path';
import { t } from './i18n';

export type AppTemplateId = 'javaee' | 'springboot' | 'struts2' | 'jakartaee' | 'javaweb' | 'mavenweb' | 'eclipseweb';

export interface AppTemplate {
    id: AppTemplateId;
    labelKey: string;
    descriptionKey: string;
    pomFragment: string;
    mainClass?: string;
    artifacts: Array<{ path: string; content: string }>;
}

let templatesCache: AppTemplate[] | null = null;

function loadTemplates(): AppTemplate[] {
    if (templatesCache) {
        return templatesCache;
    }

    const templates: AppTemplate[] = [];

    // Try bundled path first (production), then source path (development)
    let templatesDir: string;
    try {
        templatesDir = path.join(__dirname, 'data', 'templates');
        fs.readdirSync(templatesDir); // Test if path exists
    } catch {
        // Fallback to source path for development
        templatesDir = path.join(__dirname, '..', '..', 'src', 'data', 'templates');
    }

    try {
        const templateFiles = fs.readdirSync(templatesDir).filter(file => file.endsWith('.json'));

        for (const file of templateFiles) {
            try {
                const filePath = path.join(templatesDir, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const template = JSON.parse(content) as AppTemplate;
                templates.push(template);
            } catch (error) {
                console.error(t('error.templateLoadFailed', { file }), error);
            }
        }
    } catch (error) {
        console.error(t('error.templatesDirectoryLoadFailed'), error);
    }

    templatesCache = templates;
    return templates;
}

export function getAppTemplates(): AppTemplate[] {
    return loadTemplates();
}

export function getTemplateById(id: AppTemplateId): AppTemplate | undefined {
    return loadTemplates().find((template) => template.id === id);
}

/**
 * Detect project type based on project structure and files
 * NOTE: This function is deprecated. Use ProjectDetector from projectDetector.ts for project detection.
 * This function is only kept for template creation compatibility.
 */
export function detectProjectType(_projectPath: string): AppTemplateId | null {
    // This is now handled by ProjectDetector - keeping for backward compatibility
    // Template creation should not depend on existing project detection
    return null;
}
