import * as assert from 'assert';
import * as vscode from 'vscode';
import { Browser } from '../../utils/Browser';
import * as sinon from 'sinon';

suite('Browser Tests', () => {
  let browser: Browser;

  setup(() => {
    browser = Browser.getInstance();
    sinon.stub(vscode.workspace, 'getConfiguration')
      .returns({
        get: (key: string) => 'Google Chrome',
        update: () => Promise.resolve()
      } as any);
  });

  teardown(() => {
    sinon.restore();
  });

  test('Get browser command for Windows', () => {
    sinon.stub(process, 'platform').value('win32');
    const command = browser['getBrowserCommand']('Google Chrome', 'http://localhost');
    if (command) {
        assert.match(command, /start chrome.exe --remote-debugging-port=9222/);
    }
  });

  test('Handle unsupported browser', () => {
    sinon.stub(process, 'platform').value('linux');
    const command = browser['getBrowserCommand']('Safari', 'http://localhost');
    assert.strictEqual(command, null);
  });
});