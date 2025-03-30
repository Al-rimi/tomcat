import * as assert from 'assert';
import * as vscode from 'vscode';
import { Logger } from '../../utils/Logger';

suite('Logger Tests', () => {
  let logger: Logger;

  setup(() => {
    logger = Logger.getInstance();
    vscode.workspace.getConfiguration('tomcat').update('loggingLevel', 'WARN', true);
  });

  test('Logging level configuration', async () => {
    await vscode.workspace.getConfiguration('tomcat').update('loggingLevel', 'ERROR', true);
    assert.strictEqual(logger['getCurrentLogLevel'](), 3); // ERROR level
  });

  test('Status bar updates', () => {
    const mockContext = {
      subscriptions: [] as vscode.Disposable[]
    } as vscode.ExtensionContext;
    
    logger.initStatusBar(mockContext);
    logger.updateStatusBar('Testing');
    
    assert.strictEqual(logger['statusBarItem']?.text, '$(sync~spin) Testing');
    assert.strictEqual(mockContext.subscriptions.length, 1);
  });
});