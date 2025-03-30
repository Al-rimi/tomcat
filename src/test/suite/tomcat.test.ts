import * as assert from 'assert';
import * as vscode from 'vscode';
import { Tomcat } from '../../utils/Tomcat';
import * as sinon from 'sinon';

suite('Tomcat Tests', () => {
  let tomcat: Tomcat;
  let execStub: sinon.SinonStub;

  setup(() => {
    tomcat = Tomcat.getInstance();
    execStub = sinon.stub(require('child_process'), 'exec');
  });

  teardown(() => {
    sinon.restore();
  });

  test('Port validation', async () => {
    await assert.rejects(
      tomcat['validatePort'](1000),
      /Ports below 1024 require admin privileges/
    );
    
    await assert.rejects(
      tomcat['validatePort'](65536),
      /Maximum allowed port is 65535/
    );
  });

  test('Find Tomcat Home', async () => {
    const mockShowOpenDialog = sinon.stub(vscode.window, 'showOpenDialog')
      .resolves([vscode.Uri.file('/fake/tomcat')] as any);
    
    const result = await tomcat.findTomcatHome();
    assert.strictEqual(result, '/fake/tomcat');
    mockShowOpenDialog.restore();
  });
});