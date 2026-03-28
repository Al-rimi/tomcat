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

  test('killManagedInstanceByPort stops only one instance', async () => {
    const fakePid = 1234;
    const fakeMeta = { appName: 'sample-app', workspace: 'C:/fake', home: 'C:/fake-tomcat', port: 8080, shutdownPort: 8005, pid: fakePid, startedAt: Date.now(), version: '9.0.0' };
    tomcat['managedPids'].set(fakePid, fakeMeta as any);
    const stopStub = sinon.stub(tomcat, 'stopInstanceByPid').resolves();

    await tomcat.killManagedInstanceByPort(8080);

    assert(stopStub.calledOnceWithExactly(fakePid, true));
    stopStub.restore();
  });

  test('reload should report instance-specific success by app and port', async () => {
    const mockHome = sinon.stub(tomcat, 'findTomcatHome').resolves('C:/fake-tomcat');
    const mockBase = sinon.stub(tomcat, 'findTomcatBase').resolves('C:/fake-tomcat/base');
    const mockJava = sinon.stub(tomcat, 'findJavaHome').resolves('C:/fake-java');
    const fetchStub = sinon.stub(global as any, 'fetch').resolves({ ok: true });
    const loggerSuccess = sinon.stub(require('../../services/Logger').Logger.getInstance(), 'success');

    await tomcat.reload(8080, 'sample-app');

    assert(fetchStub.calledOnce);
    assert(loggerSuccess.calledWith(sinon.match.string, false));

    mockHome.restore();
    mockBase.restore();
    mockJava.restore();
    fetchStub.restore();
    loggerSuccess.restore();
  });

  test('stop should not stop all managed instances when multiple are running', async () => {
    const meta1 = { appName: 'app1', workspace: 'C:/w1', home: 'C:/t1', port: 8080, shutdownPort: 8005, pid: 11, startedAt: Date.now(), version: '11.0.11' } as any;
    const meta2 = { appName: 'app2', workspace: 'C:/w2', home: 'C:/t2', port: 8081, shutdownPort: 8006, pid: 12, startedAt: Date.now(), version: '11.0.11' } as any;
    tomcat['managedPids'].set(11, meta1);
    tomcat['managedPids'].set(12, meta2);
    sinon.stub(tomcat, 'findTomcatHome').resolves('C:/fake-tomcat');
    sinon.stub(tomcat, 'findJavaHome').resolves('C:/fake-java');
    const stopStub = sinon.stub(tomcat, 'stopInstanceByPid').resolves();
    const warnStub = sinon.stub(require('../../services/Logger').Logger.getInstance(), 'warn');
    sinon.stub(tomcat, 'isTomcatRunning').resolves(true);

    await tomcat.stop(true);

    assert(stopStub.notCalled);
    assert(warnStub.calledWith(sinon.match.string, true));

    stopStub.restore();
    warnStub.restore();
    tomcat['managedPids'].clear();
  });
});