const fs = require('fs');
const path = require('path');

const root = __dirname;
const srcDir = path.join(root, 'src');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getLocaleFiles() {
  return fs
    .readdirSync(root)
    .filter((file) => /^package\.nls(?:\.[^.]+)?\.json$/i.test(file))
    .sort();
}

function getLocaleFromFile(file) {
  if (file.toLowerCase() === 'package.nls.json') {
    return 'en';
  }
  return file.slice('package.nls.'.length, -'.json'.length);
}

function walkFiles(dir, ext, out = []) {
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, ext, out);
    } else if (entry.isFile() && full.endsWith(ext)) {
      out.push(full);
    }
  }
  return out;
}

function collectRuntimeKeys() {
  const tsFiles = walkFiles(srcDir, '.ts');
  const keySet = new Set();
  const regex = /\bt\s*\(\s*['"]([^'"]+)['"]/g;

  for (const file of tsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = regex.exec(content)) !== null) {
      keySet.add(match[1]);
    }
  }

  return Array.from(keySet).sort();
}

function main() {
  const localeFiles = getLocaleFiles();
  if (localeFiles.length === 0) {
    console.error('No package.nls*.json files found in project root.');
    process.exit(1);
  }

  const baseFile = localeFiles.find((f) => f.toLowerCase() === 'package.nls.json') || localeFiles[0];
  const baseData = readJson(path.join(root, baseFile));
  const baseKeys = Object.keys(baseData).sort();

  console.log('Localization report');
  console.log('-------------------');
  console.log('Base file:', baseFile);
  console.log('Base key count:', baseKeys.length);
  console.log('Locale files:', localeFiles.join(', '));
  console.log('');

  let hasErrors = false;

  for (const file of localeFiles) {
    const locale = getLocaleFromFile(file);
    const fullPath = path.join(root, file);
    const data = readJson(fullPath);
    const keys = Object.keys(data).sort();

    const missing = baseKeys.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !baseKeys.includes(k));
    const placeholderValues = Object.entries(data)
      .filter(([k, v]) => typeof v === 'string' && v.trim() === k)
      .map(([k]) => k)
      .sort();

    const sameKeyset = missing.length === 0 && extra.length === 0;
    if (!sameKeyset) {
      hasErrors = true;
    }

    console.log(`file: ${file}`);
    console.log(` locale: ${locale}`);
    console.log(` key count: ${keys.length}`);
    console.log(` keyset: ${sameKeyset ? 'OK' : 'MISMATCH'}`);
    console.log(` missing keys: ${missing.length}`);
    console.log(` extra keys: ${extra.length}`);
    console.log(` placeholder-like values: ${placeholderValues.length}`);

    if (missing.length > 0) {
      console.log(`  missing: ${missing.join(', ')}`);
    }
    if (extra.length > 0) {
      console.log(`  extra: ${extra.join(', ')}`);
    }
    if (placeholderValues.length > 0) {
      console.log(`  placeholders: ${placeholderValues.join(', ')}`);
    }
    console.log('');
  }

  const runtimeKeys = collectRuntimeKeys();
  const runtimeMissing = runtimeKeys.filter((k) => !baseKeys.includes(k));

  console.log('Runtime key usage');
  console.log('-----------------');
  console.log('t(...) key count:', runtimeKeys.length);
  console.log('Missing in base locale:', runtimeMissing.length);
  if (runtimeMissing.length > 0) {
    console.log(` missing keys: ${runtimeMissing.join(', ')}`);
    hasErrors = true;
  }

  const outI18nDir = path.join(root, 'out', 'data', 'i18n');
  if (fs.existsSync(outI18nDir)) {
    const outLocales = fs.readdirSync(outI18nDir).filter((f) => f.endsWith('.json')).sort();
    console.log('');
    console.log('Bundled i18n files (out/data/i18n):', outLocales.join(', ') || '(none)');
  }

  console.log('');
  if (hasErrors) {
    console.log('Result: localization issues found.');
    process.exit(1);
  }

  console.log('Result: localization checks passed.');
}

main();
