const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const fs = require('fs');

// Custom plugin to extract translations from package.nls files
class ExtractTranslationsPlugin {
  apply(compiler) {
    compiler.hooks.done.tap('ExtractTranslationsPlugin', () => {
      const outDir = path.resolve(__dirname, 'out');
      const i18nDir = path.join(outDir, 'data', 'i18n');

      // Ensure i18n directory exists
      if (!fs.existsSync(i18nDir)) {
        fs.mkdirSync(i18nDir, { recursive: true });
      }

      const nlsFiles = fs
        .readdirSync(__dirname)
        .filter((file) => /^package\.nls(?:\.[^.]+)?\.json$/i.test(file));

      for (const nlsFile of nlsFiles) {
        const locale = nlsFile.toLowerCase() === 'package.nls.json'
          ? 'en'
          : nlsFile.slice('package.nls.'.length, -'.json'.length);

        const nlsPath = path.resolve(__dirname, nlsFile);
        const i18nPath = path.join(i18nDir, `${locale}.json`);

        try {
          const translations = JSON.parse(fs.readFileSync(nlsPath, 'utf8'));
          fs.writeFileSync(i18nPath, JSON.stringify(translations, null, 2));
          console.log(`Extracted ${Object.keys(translations).length} translations to ${i18nPath}`);
        } catch (error) {
          console.warn(`Failed to extract translations from ${nlsFile}:`, error);
        }
      }
    });
  }
}

module.exports = {
  target: 'node',
  entry: './src/core/extension.ts',
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  externals: {
    vscode: 'commonjs vscode',
    'bufferutil': 'commonjs bufferutil',
    'utf-8-validate': 'commonjs utf-8-validate'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [{
      test: /\.ts$/,
      exclude: /node_modules/,
      use: [{
        loader: 'ts-loader'
      }]
    }]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/data', to: 'data' }
      ]
    }),
    new ExtractTranslationsPlugin()
  ]
};