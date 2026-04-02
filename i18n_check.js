const fs = require('fs');
const path = require('path');

const i18nDir = path.join(__dirname);
const i18nFiles = fs.readdirSync(i18nDir).filter(f => f.startsWith('package.nls') && f.endsWith('.json'));
if (i18nFiles.length === 0) {
  console.error('No JSON localization files found in', i18nDir);
  process.exit(1);
}

const baseKey = 'package.nls.json';
const baseFile = i18nFiles.includes(baseKey) ? baseKey : i18nFiles[0];
const baseData = JSON.parse(fs.readFileSync(path.join(i18nDir, baseFile), 'utf-8'));
const baseKeys = Object.keys(baseData).sort();

function collectPackageJsonI18nKeys(obj, set = new Set()) {
  if (typeof obj === 'string') {
    const keyPattern = /%([^%]+)%/g;
    let match;
    while ((match = keyPattern.exec(obj)) !== null) {
      set.add(match[1]);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach(item => collectPackageJsonI18nKeys(item, set));
  } else if (obj && typeof obj === 'object') {
    Object.values(obj).forEach(value => collectPackageJsonI18nKeys(value, set));
  }
  return set;
}

const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('package.json not found at', packageJsonPath);
  process.exit(1);
}

const packageContent = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const packageKeys = Array.from(collectPackageJsonI18nKeys(packageContent)).sort();

console.log('Localization summary');
console.log('--------------------');
console.log('Base i18n file:', baseFile);
console.log('Base i18n key count:', baseKeys.length);
console.log('package.json referenced i18n keys count:', packageKeys.length);
console.log('Referenced keys:', packageKeys.join(', ') || '(none)');

const packageKeysNotInBase = packageKeys.filter(k => !baseKeys.includes(k));
const unusedBaseKeys = baseKeys.filter(k => !packageKeys.includes(k));
console.log('package.json keys not in base keyset:', packageKeysNotInBase.length);
if (packageKeysNotInBase.length > 0) console.log('  keys:', packageKeysNotInBase.join(', '));
console.log('package.nls keys not referenced by package.json:', unusedBaseKeys.length);
if (unusedBaseKeys.length > 0) console.log('  keys:', unusedBaseKeys.join(', '));

// Check runtime translations in src/data/i18n/
let runtimeHasMismatch = false;
const runtimeDir = path.join(__dirname, 'src', 'data', 'i18n');
let runtimeFiles = [];
if (fs.existsSync(runtimeDir)) {
  runtimeFiles = fs.readdirSync(runtimeDir).filter(f => f.endsWith('.json'));
}

if (runtimeFiles.length > 0) {
  console.log('');
  console.log('Runtime translations (src/data/i18n/)');
  console.log('----------------------------------');
  const runtimeBaseKey = 'en.json';
  const runtimeBaseFile = runtimeFiles.includes(runtimeBaseKey) ? runtimeBaseKey : runtimeFiles[0];
  const runtimeBasePath = path.join(runtimeDir, runtimeBaseFile);
  let runtimeBaseData;
  try {
    runtimeBaseData = JSON.parse(fs.readFileSync(runtimeBasePath, 'utf-8'));
  } catch (err) {
    console.error(`Error parsing runtime base JSON ${runtimeBaseFile}:`, err.message);
    runtimeHasMismatch = true;
    runtimeBaseData = {};
  }
  const runtimeBaseKeys = Object.keys(runtimeBaseData).sort();
  console.log('Runtime base file:', runtimeBaseFile);
  console.log('Runtime base key count:', runtimeBaseKeys.length);

  console.log('Runtime locale files found:', runtimeFiles.join(', '));
  console.log('');

  // Check each runtime locale file
  runtimeFiles.forEach(file => {
    const filePath = path.join(runtimeDir, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
      console.error(`Error parsing JSON for runtime ${file}:`, err.message);
      runtimeHasMismatch = true;
      return;
    }

    const keys = Object.keys(data).sort();
    const missingFromBase = runtimeBaseKeys.filter(k => !keys.includes(k));
    const extraInFile = keys.filter(k => !runtimeBaseKeys.includes(k));
    const lang = file === runtimeBaseKey ? 'base' : file.replace(/\.json$/, '');

    const sameCount = keys.length === runtimeBaseKeys.length;
    const sameKeys = missingFromBase.length === 0 && extraInFile.length === 0;

    if (!sameCount || !sameKeys) {
      runtimeHasMismatch = true;
    }

    console.log(`file: ${file}`);
    console.log(` locale: ${lang}`);
    console.log(` key count: ${keys.length}`);
    console.log(` key consistency with base: ${sameKeys ? 'OK' : 'MISMATCH'}`);
    console.log(` count consistency with base: ${sameCount ? 'OK' : 'MISMATCH'}`);
    console.log(` missing keys from base: ${missingFromBase.length}`);
    console.log(` extra keys in file: ${extraInFile.length}`);

    if (missingFromBase.length > 0) {
      console.log(`  missing from base keys: ${missingFromBase.join(', ')}`);
    }
    if (extraInFile.length > 0) {
      console.log(`  extra keys: ${extraInFile.join(', ')}`);
    }

    if (!sameKeys || !sameCount) {
      const common = runtimeBaseKeys.filter(k => keys.includes(k));
      const diff = runtimeBaseKeys.filter(k => !keys.includes(k)).concat(keys.filter(k => !runtimeBaseKeys.includes(k))).sort();
      console.log(`  diff keys: ${diff.join(', ')}`);
      console.log(`  common keys with base: ${common.length}`);
    }

    console.log('');
  });
}

console.log('Locale files found:', i18nFiles.join(', '));
console.log('');

let hasMismatch = false;

// Check each locale i18n file against base key set and package.json usage.
i18nFiles.forEach(file => {
  const filePath = path.join(i18nDir, file);
  let data;

  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`Error parsing JSON for ${file}:`, err.message);
    hasMismatch = true;
    return;
  }

  const keys = Object.keys(data).sort();
  const missingFromBase = baseKeys.filter(k => !keys.includes(k));
  const extraInFile = keys.filter(k => !baseKeys.includes(k));
  const missingFromPackageJson = packageKeys.filter(k => !keys.includes(k));
  const lang = file === baseKey ? 'base' : file.replace(/^package\.nls\./, '').replace(/\.json$/, '');

  const sameCount = keys.length === baseKeys.length;
  const sameKeys = missingFromBase.length === 0 && extraInFile.length === 0;

  if (!sameCount || !sameKeys || missingFromPackageJson.length > 0) {
    hasMismatch = true;
  }

  console.log(`file: ${file}`);
  console.log(` locale: ${lang}`);
  console.log(` key count: ${keys.length}`);
  console.log(` key consistency with base: ${sameKeys ? 'OK' : 'MISMATCH'}`);
  console.log(` count consistency with base: ${sameCount ? 'OK' : 'MISMATCH'}`);
  console.log(` missing keys from base: ${missingFromBase.length}`);
  console.log(` extra keys in file: ${extraInFile.length}`);
  console.log(` missing package.json references: ${missingFromPackageJson.length}`);

  if (missingFromBase.length > 0) {
    console.log(`  missing from base keys: ${missingFromBase.join(', ')}`);
  }
  if (extraInFile.length > 0) {
    console.log(`  extra keys: ${extraInFile.join(', ')}`);
  }
  if (missingFromPackageJson.length > 0) {
    console.log(`  missing package.json referenced keys: ${missingFromPackageJson.join(', ')}`);
  }

  if (!sameKeys || !sameCount) {
    const common = baseKeys.filter(k => keys.includes(k));
    const diff = baseKeys.filter(k => !keys.includes(k)).concat(keys.filter(k => !baseKeys.includes(k))).sort();
    console.log(`  diff keys: ${diff.join(', ')}`);
    console.log(`  common keys with base: ${common.length}`);
  }

  console.log('');
});

if (hasMismatch || runtimeHasMismatch) {
  console.log('Result: Localization inconsistencies found.');
  process.exitCode = 1;
} else {
  console.log('Result: All locale files are synchronized with base keys and package.json usage.');
  process.exitCode = 0;
}

