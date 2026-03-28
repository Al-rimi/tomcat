/// <reference types="mocha" />

import * as assert from 'assert';
import * as vscode from 'vscode';
import { Tomcat } from '../../services/Tomcat';
import * as sinon from 'sinon';
import { promises as fsp } from 'fs';

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

  test('External instances are enriched with persisted app metadata', async () => {
    const fakePersisted = [{ port: 8080, app: 'sample-app', workspace: 'C:/fake-workspace', home: 'C:/fake-tomcat', version: '9.0.0' }];
    const readFileStub = sinon.stub(fsp, 'readFile').resolves(JSON.stringify(fakePersisted));
    const mkdirStub = sinon.stub(fsp, 'mkdir').resolves();
    const writeFileStub = sinon.stub(fsp, 'writeFile').resolves();

    sinon.stub(tomcat as any, 'detectExternalInstances').resolves([{ pid: 9999, port: 8080, source: 'external' }]);

    const snapshot = await tomcat.getInstanceSnapshot();

    assert.strictEqual(snapshot.length, 1);
    assert.strictEqual(snapshot[0].app, 'sample-app');

    readFileStub.restore();
    mkdirStub.restore();
    writeFileStub.restore();
  });
});