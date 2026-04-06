/**
 * Internationalization utilities for the Tomcat extension.
 *
 * Loads translations from JSON files in data/i18n and supports locale fallback.
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
type Dictionary = Record<string, string>;

let dictionaries: Record<string, Dictionary> = {};
let availableLocales: string[] = [];
let currentLocale: Locale = 'en';
let fallbackLocale: Locale = 'en';
let initialized = false;
let extensionPathHint = '';
const reportedMissingKeys = new Set<string>();
const reportedWarnings = new Set<string>();

/**
 * Normalize locale ids for matching.
 */
function normalizeLocale(locale: string): string {
  return locale.replace(/_/g, '-').toLowerCase();
}

/**
 * Resolve the user-requested locale from extension settings.
 */
function getRequestedLocale(): string {
  const config = vscode.workspace.getConfiguration('tomcat');
  const languageSetting = config.get<LanguageSetting>('language', 'auto');

  if (languageSetting === 'auto') {
    return vscode.env.language || 'en';
  }

  return languageSetting;
}

/**
 * Resolve an existing locale from available locale files.
 */
function resolveLocale(requested: string, locales: string[]): string {
  if (locales.length === 0) {
    return 'en';
  }

  const exact = locales.find((l) => l === requested);
  if (exact) {
    return exact;
  }

  const normalizedRequested = normalizeLocale(requested);
  const byNormalized = new Map<string, string>(locales.map((locale) => [normalizeLocale(locale), locale]));

  const normalizedExact = byNormalized.get(normalizedRequested);
  if (normalizedExact) {
    return normalizedExact;
  }

  const base = normalizedRequested.split('-')[0];
  if (base === 'zh') {
    const zhLocale = locales.find((locale) => normalizeLocale(locale).startsWith('zh'));
    if (zhLocale) {
      return zhLocale;
    }
  }

  const sameBase = locales.find((locale) => normalizeLocale(locale).startsWith(`${base}-`) || normalizeLocale(locale) === base);
  if (sameBase) {
    return sameBase;
  }

  const enLocale = byNormalized.get('en');
  if (enLocale) {
    return enLocale;
  }

  return locales[0];
}

/**
 * Emit warning only once.
 */
function warnOnce(key: string, message: string): void {
  if (reportedWarnings.has(key)) {
    return;
  }
  reportedWarnings.add(key);
  console.warn(message);
}

/**
 * Build candidate directories for runtime i18n files.
 */
function getI18nDirectoryCandidates(): string[] {
  const candidates = new Set<string>();

  if (extensionPathHint) {
    candidates.add(path.join(extensionPathHint, 'out', 'data', 'i18n'));
    candidates.add(path.join(extensionPathHint, 'data', 'i18n'));
    candidates.add(path.join(extensionPathHint, 'src', 'data', 'i18n'));
  }

  candidates.add(path.join(__dirname, 'data', 'i18n'));
  candidates.add(path.join(__dirname, '..', 'data', 'i18n'));
  candidates.add(path.join(__dirname, '..', '..', 'data', 'i18n'));
  candidates.add(path.join(process.cwd(), 'out', 'data', 'i18n'));
  candidates.add(path.join(process.cwd(), 'data', 'i18n'));
  candidates.add(path.join(process.cwd(), 'src', 'data', 'i18n'));

  return Array.from(candidates);
}

/**
 * Resolve the first existing i18n directory containing JSON files.
 */
function resolveI18nDirectory(): string | undefined {
  const candidates = getI18nDirectoryCandidates();
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }
    try {
      const hasJson = fs.readdirSync(candidate).some((f) => f.endsWith('.json'));
      if (hasJson) {
        return candidate;
      }
    } catch {
      // Continue trying next candidate.
    }
  }
  return undefined;
}

/**
 * Load all locale dictionaries once and resolve current locale.
 */
function loadTranslations(): void {
  if (initialized) {
    return;
  }

  dictionaries = {};
  availableLocales = [];

  const i18nDir = resolveI18nDirectory();
  if (!i18nDir) {
    warnOnce('i18n:dir-missing', 'Tomcat i18n directory not found. Expected data/i18n JSON files.');
    initialized = true;
    return;
  }

  let files: string[] = [];
  try {
    files = fs.readdirSync(i18nDir).filter((f) => f.endsWith('.json'));
  } catch (error) {
    warnOnce('i18n:dir-read-failed', `Tomcat i18n read failed for ${i18nDir}: ${String(error)}`);
    initialized = true;
    return;
  }

  for (const file of files) {
    const locale = file.replace(/\.json$/i, '');
    const filePath = path.join(i18nDir, file);
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Dictionary;
      dictionaries[locale] = parsed;
      availableLocales.push(locale);
    } catch (error) {
      warnOnce(`i18n:parse:${file}`, `Tomcat i18n parse failed for ${filePath}: ${String(error)}`);
    }
  }

  if (availableLocales.length === 0) {
    warnOnce('i18n:no-locales', `Tomcat i18n found no locale files in ${i18nDir}`);
    initialized = true;
    return;
  }

  fallbackLocale = resolveLocale('en', availableLocales);

  const requested = getRequestedLocale();
  currentLocale = resolveLocale(requested, availableLocales);
  if (normalizeLocale(requested) !== normalizeLocale(currentLocale)) {
    warnOnce(
      `i18n:locale-fallback:${requested}->${currentLocale}`,
      `Tomcat i18n locale fallback: requested="${requested}", resolved="${currentLocale}"`
    );
  }

  initialized = true;
}

/**
 * Get the active locale currently used by runtime translations.
 */
export function getCurrentLocale(): Locale {
  if (!initialized) {
    loadTranslations();
  }
  return currentLocale;
}

/**
 * Get all discovered locale ids.
 */
export function getAvailableLocales(): Locale[] {
  if (!initialized) {
    loadTranslations();
  }
  return [...availableLocales];
}

/**
 * Translate a key into a localized string with optional replacements and fallback.
 *
 * @param key Translation key
 * @param vars Optional replacement variables
 * @returns Localized string
 */
export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  if (!initialized) {
    loadTranslations();
  }

  const localized = dictionaries[currentLocale] || {};
  const fallback = dictionaries[fallbackLocale] || {};

  let text = localized[key];
  if (text === undefined) {
    text = fallback[key];
  }

  if (text === undefined) {
    const reportId = `${currentLocale}:${key}`;
    if (!reportedMissingKeys.has(reportId)) {
      reportedMissingKeys.add(reportId);
      console.warn(`Tomcat i18n missing key: locale="${currentLocale}", key="${key}"`);
    }
    text = key;
  }

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }

  return text;
}

// Legacy alias for backward compatibility
export const localize = t;

/**
 * Refresh localization by reloading translations.
 */
export function refreshLocalization(): void {
  initialized = false;
  loadTranslations();
}

/**
 * Initialize localization.
 *
 * @param context Extension context
 */
export function initializeLocalization(context: vscode.ExtensionContext): void {
  extensionPathHint = context.extensionPath;
  loadTranslations();

  // Listen for configuration changes to reload translations
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('tomcat.language')) {
        refreshLocalization();
      }
    })
  );
}

/**
 * Convert deploy mode to localized deploy label.
 *
 * @param mode DeployMode (Disable/On Save/On Shortcut)
 * @returns Localized string for UI
 */
export function translateDeployMode(mode: DeployMode): string {
  switch (mode) {
    case 'Disable':
      return t('deployMode.disable');
    case 'On Save':
      return t('deployMode.onSave');
    case 'On Shortcut':
      return t('deployMode.onShortcut');
    default:
      return mode;
  }
}

/**
 * Convert build type to localized build label.
 *
 * @param type BuildType
 * @returns Localized string for UI
 */
export function translateBuildType(type: BuildType): string {
  switch (type) {
    case 'Auto':
      return t('buildType.auto');
    case 'Local':
      return t('buildType.local');
    case 'Maven':
      return t('buildType.maven');
    case 'Gradle':
      return t('buildType.gradle');
    case 'Eclipse':
      return t('buildType.eclipse');
    default:
      return type;
  }
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
