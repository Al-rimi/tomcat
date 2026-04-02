import * as fs from 'fs';
import * as path from 'path';
import { t } from './i18n';

export type AppTemplateId = 'javaee' | 'springboot' | 'struts2' | 'jakartaee';

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
    const templatesDir = path.join(__dirname, '..', 'data', 'templates');

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
