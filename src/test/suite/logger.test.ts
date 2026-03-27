/// <reference types="mocha" />

import * as assert from 'assert';
import * as vscode from 'vscode';
import { Logger } from '../../services/Logger';

suite('Logger Tests', () => {
  let logger: Logger;

  setup(() => {
    logger = Logger.getInstance();
    vscode.workspace.getConfiguration('tomcat').update('loggingLevel', 'WARN', true);
  });

  test('Logging level configuration', async () => {
    await vscode.workspace.getConfiguration('tomcat').update('tomcat.logLevel', 'ERROR', true);
    logger.updateConfig();
    assert.strictEqual(logger.getLogEncoding().length > 0, true); // config refresh should not throw
  });

  test('Status bar updates', () => {
    const mockContext = {
      subscriptions: [] as vscode.Disposable[]
    } as vscode.ExtensionContext;

    logger.init(mockContext);
    logger.updateStatusBar('Testing');

    assert.strictEqual(logger['statusBarItem']?.text.startsWith('$(circle-outline)'), true);
    assert.strictEqual(mockContext.subscriptions.length, 3);
  });
});