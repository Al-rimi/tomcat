/// <reference types="mocha" />

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { t, translateBuildType, translateBrowserName, translateDeployMode, initializeLocalization, refreshLocalization, getCurrentLocale } from '../../utils/i18n';

suite('i18n Tests', () => {
    let configStub: sinon.SinonStub;

    setup(() => {
        configStub = sinon.stub(vscode.workspace, 'getConfiguration').returns({
            get: (key: string, def?: any) => {
                if (key === 'tomcat.language') {return 'en';}
                return def;
            },
            update: () => Promise.resolve()
        } as any);
    });

    teardown(() => {
        sinon.restore();
    });

    test('Translate deploy mode strings', () => {
        assert.strictEqual(translateDeployMode('Disable'), 'Disable');
        assert.strictEqual(translateDeployMode('On Save'), 'On Save');
        assert.strictEqual(translateDeployMode('On Shortcut'), 'On Shortcut');
    });

    test('Translate build type strings', () => {
        assert.strictEqual(translateBuildType('Local'), 'Local');
        assert.strictEqual(translateBuildType('Maven'), 'Maven');
        assert.strictEqual(translateBuildType('Gradle'), 'Gradle');
    });

    test('Translate browser names', () => {
        assert.strictEqual(translateBrowserName('Disable'), 'Disable');
        assert.strictEqual(translateBrowserName('Google Chrome'), 'Google Chrome');
        assert.strictEqual(translateBrowserName('Firefox'), 'Firefox');
    });

    test('Translate key with substitution', () => {
        assert.strictEqual(t('builder.buildCompleted', { type: 'Local', duration: 100 }), 'Local Build completed in 100ms');
    });

    test('Localization lifecycle functions', () => {
        initializeLocalization({ globalState: { get: () => false, update: () => Promise.resolve() } } as any);
        assert.strictEqual(getCurrentLocale(), 'en');
        refreshLocalization();
        assert.strictEqual(getCurrentLocale(), 'en');
    });
});