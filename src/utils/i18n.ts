/**
 * Internationalization utilities for the Tomcat extension.
 *
 * Provides:
 * - Translations for both English and Chinese (simplified)
 * - Locale detection and user preference resolution
 * - Runtime lookup of translation keys with variable interpolation
 * - Convenience mapping for deploy mode/build type/browser names
 *
 * Input: user/workspace language settings, translation key + vars
 * Output: localized string messages for UI and logs
 */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Supported locale identifiers.
 */
export type Locale = string;
export type LanguageSetting = 'auto' | Locale;
export type DeployMode = 'Disable' | 'On Save' | 'On Shortcut';
export type BuildType = 'Auto' | 'Local' | 'Maven' | 'Gradle' | 'Eclipse';
export type BrowserName = 'Disable' | 'Google Chrome' | 'Microsoft Edge' | 'Firefox' | 'Safari' | 'Brave' | 'Opera';

type TranslationKey = string;

const LANGUAGE_FLAG_KEY = 'tomcat.languageInitialized';

let translations: Record<string, Record<string, string>> = {};

let currentLocale: Locale = 'en';
let initialized = false;
const reportedMissingKeys = new Set<string>();

function getDataDir(extensionPath: string): string {
    let dataDir = path.join(extensionPath, 'out', 'data', 'i18n');
    if (!fs.existsSync(dataDir)) {
        dataDir = path.join(extensionPath, 'src', 'data', 'i18n');
    }
    return dataDir;
}

function loadTranslations(extensionPath: string): void {
    const dataDir = getDataDir(extensionPath);
    const locales = getAllLocales(dataDir);

    for (const locale of locales) {
        const filePath = path.join(dataDir, `${locale}.json`);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            translations[locale] = JSON.parse(content);
        } catch (error) {
            console.error(`Failed to load translations for ${locale}:`, error);
            // Fallback to empty object
            translations[locale] = {};
        }
    }
}

function getAllLocales(dataDir: string): string[] {
    return fs.readdirSync(dataDir)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
}

function validateTranslationCoverage(extensionPath: string): void {
    const dataDir = getDataDir(extensionPath);
    const baseKeys = Object.keys(translations.en) as Array<TranslationKey>;
    const missingList: Array<{ locale: Locale; key: string }> = [];

    for (const locale of getAllLocales(dataDir)) {
        if (locale === 'en') { continue; }
        const localeStrings = (translations as Record<string, any>)[locale] || {};
        for (const key of baseKeys) {
            if (!(key in localeStrings)) {
                missingList.push({ locale, key });
            }
        }
    }

    if (missingList.length > 0) {
        const firstBlank = missingList.slice(0, 20).map((m) => `${m.locale}:${m.key}`).join(', ');
        const msg = `Tomcat i18n coverage error: missing keys (${missingList.length}) in other locales: ${firstBlank}${missingList.length > 20 ? ', ...' : ''}`;
        console.error(msg);
        vscode.window.showErrorMessage(msg);

        // do not throw, to avoid extension activation failure during exercises and debugging;
        // missing translations fallback to English at runtime.
    }
}

/**
 * Initialize localization state once per extension activation.
 *
 * Input: extension context for persistent global state.
 * Output: sets `currentLocale` and `initialized`.
 */
export function initializeLocalization(context: vscode.ExtensionContext): void {
    if (initialized) { return; }

    loadTranslations(context.extensionPath);
    validateTranslationCoverage(context.extensionPath);

    const cfg = vscode.workspace.getConfiguration('tomcat');
    const configured = cfg.get<LanguageSetting>('language', 'auto');
    const envLocale = detectLocale();
    const stored = context.globalState.get<boolean>(LANGUAGE_FLAG_KEY, false);

    if (!stored && configured === 'auto') {
        const target = envLocale;
        void cfg.update('language', target, true);
        void context.globalState.update(LANGUAGE_FLAG_KEY, true);
        currentLocale = target;
    } else {
        currentLocale = resolveLocale(configured, envLocale);
    }

    initialized = true;
}

/**
 * Refresh locale setting from configuration without extension reload.
 *
 * Input: current workspace language setting
 * Output: updates `currentLocale`.
 */
export function refreshLocalization(): void {
    const cfg = vscode.workspace.getConfiguration('tomcat');
    const configured = cfg.get<LanguageSetting>('language', 'auto');
    currentLocale = resolveLocale(configured, detectLocale());
}

/**
 * Get current locale in use by the extension.
 *
 * If not initialized, resolves from configuration/default and detects environment.
 *
 * @returns {Locale}
 */
export function getCurrentLocale(): Locale {
    if (!initialized) {
        currentLocale = resolveLocale(
            vscode.workspace.getConfiguration('tomcat').get<LanguageSetting>('language', 'auto'),
            detectLocale()
        );
    }
    return currentLocale;
}

/**
 * Translate a key into a localized string with optional replacements.
 *
 * @param key Translation key
 * @param vars Optional replacement variables
 * @returns Localized string
 */
export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    const locale = getCurrentLocale();
    const localeStrings = (translations as Record<string, any>)[locale] || {};
    const template = localeStrings[key as string] ?? translations.en[key];

    if (template === undefined) {
        const missingContext = `${locale}:${key}`;
        if (!reportedMissingKeys.has(missingContext)) {
            reportedMissingKeys.add(missingContext);
            const msg = `Tomcat i18n missing key at runtime: ${missingContext}`;
            console.error(msg);
            vscode.window.showErrorMessage(msg);
        }
        return key;
    }

    return format(template, vars);
}

/**
 * Convert deploy mode to localized deploy label.
 *
 * @param mode DeployMode (Disable/On Save/On Shortcut)
 * @returns Localized string for UI
 */
export function translateDeployMode(mode: DeployMode): string {
    switch (mode) {
        case 'On Save':
            return t('deployMode.onSave');
        case 'On Shortcut':
            return t('deployMode.onShortcut');
        default:
            return t('deployMode.disable');
    }
}

/**
 * Convert build type to localized label.
 *
 * @param type BuildType (Local/Maven/Gradle)
 * @returns Localized build type name
 */
export function translateBuildType(type: BuildType): string {
    const keyMap: Record<BuildType, TranslationKey> = {
        'Auto': 'buildType.auto',
        'Local': 'buildType.local',
        'Maven': 'buildType.maven',
        'Gradle': 'buildType.gradle',
        'Eclipse': 'buildType.eclipse'
    };
    return t(keyMap[type]);
}

/**
 * Convert internal browser name to localized display name.
 *
 * @param browser BrowserName
 * @returns Localized browser name
 */
export function translateBrowserName(browser: BrowserName): string {
    const keyMap: Record<BrowserName, TranslationKey> = {
        'Disable': 'browser.name.disable',
        'Google Chrome': 'browser.name.chrome',
        'Microsoft Edge': 'browser.name.edge',
        'Firefox': 'browser.name.firefox',
        'Safari': 'browser.name.safari',
        'Brave': 'browser.name.brave',
        'Opera': 'browser.name.opera'
    };
    return t(keyMap[browser]);
}

/**
 * Resolve configured language setting to supported locale, with fallback.
 *
 * @param setting The configured tomcat.language setting
 * @param fallback Detected locale fallback
 * @returns Locale ('en' or 'zh-CN')
 */
function resolveLocale(setting: LanguageSetting | undefined, fallback: Locale): Locale {
    if (setting === 'zh-CN') { return 'zh-CN'; }
    if (setting === 'en') { return 'en'; }
    return fallback;
}

/**
 * Detect locale from VS Code environment language.
 *
 * @returns Locale (defaults to 'en' unless zh- prefix)
 */
function detectLocale(): Locale {
    const language = (vscode.env.language || '').toLowerCase();
    if (language.startsWith('zh')) {
        return 'zh-CN';
    }
    return 'en';
}

/**
 * Interpolate variables into template placeholders.
 *
 * e.g. template 'Hello {name}' with vars {name:'Tom'} returns 'Hello Tom'.
 *
 * @param template String with placeholders {var}
 * @param vars Optional object map of replacements
 * @returns Interpolated string
 */
function format(template: string, vars?: Record<string, string | number>): string {
    if (!vars) { return template; }
    return Object.keys(vars).reduce((acc, key) => {
        const value = typeof vars[key] === 'number' ? String(vars[key]) : (vars[key] as string);
        return acc.replace(new RegExp(`\\{${key}\\}`, 'g'), value ?? '');
    }, template);
}
