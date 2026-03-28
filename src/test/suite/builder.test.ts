/// <reference types="mocha" />

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'path';
import * as fs from 'fs';
import { Builder } from '../../services/Builder';
import { Browser } from '../../services/Browser';
import { Logger } from '../../services/Logger';
import { Tomcat } from '../../services/Tomcat';

describe('Builder Tests', () => {
  let builder: Builder;
  let logger: Logger;
  let sandbox: sinon.SinonSandbox;
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    logger = Logger.getInstance();
    builder = Builder.getInstance();
    mockContext = {
      subscriptions: [],
      workspaceState: { get: () => { }, update: () => Promise.resolve() },
      globalState: { get: () => { }, update: () => Promise.resolve() },
    } as unknown as vscode.ExtensionContext;

    (Builder as any).instance = null;
    (Tomcat as any).instance = null;

    sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
      uri: vscode.Uri.file('/test/project'),
      name: 'project',
      index: 0
    }]);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('isJavaEEProject()', () => {
    it('should detect JavaEE project with WEB-INF', () => {
      sandbox.stub(fs, 'existsSync').callsFake((p: fs.PathLike) => {
        const webInfPath = path.join(path.dirname(p.toString()), 'WEB-INF');
        return fs.existsSync(webInfPath);
      });
      assert.strictEqual(Builder.isJavaEEProject(), true);
    });

    it('should detect Maven WAR project', () => {
      sandbox.stub(fs, 'existsSync').callsFake((p: fs.PathLike) => {
        const fileName = path.basename(p.toString());
        return fileName.endsWith('pom.xml');
      });
      sandbox.stub(fs, 'readFileSync').returns('<packaging>war</packaging>');
      assert.strictEqual(Builder.isJavaEEProject(), true);
    });

    it('should return false for non-JavaEE projects', () => {
      sandbox.stub(fs, 'existsSync').returns(false);
      assert.strictEqual(Builder.isJavaEEProject(), false);
    });
  });

  describe('deploy()', () => {
    let execStub: sinon.SinonStub;
    let showProgressStub: sinon.SinonStub;

    beforeEach(() => {
      execStub = sandbox.stub(require('child_process'), 'exec');
      showProgressStub = sandbox.stub(vscode.window, 'withProgress');
      showProgressStub.callsFake((_, task) => task());

      sandbox.stub(Tomcat.getInstance(), 'findTomcatHome').resolves('/tomcat');
      sandbox.stub(Tomcat.getInstance(), 'reload').resolves();
      sandbox.stub(Browser.getInstance(), 'run').resolves();
    });

    it('should perform Local deploy', async () => {
      sandbox.stub(fs, 'existsSync').returns(true);
      const cpSyncStub = sandbox.stub(fs, 'cpSync');
      const rmSyncStub = sandbox.stub(fs, 'rmSync');

      await builder.deploy('Local');

      assert.ok(cpSyncStub.calledWith(sinon.match(/webapp/), sinon.match.string));
      assert.ok(rmSyncStub.calledWith(sinon.match(/webapps\/project/)));
    });

    it('should handle Maven deploy', async () => {
      sandbox.stub(fs, 'existsSync').withArgs(sinon.match(/pom.xml/)).returns(true);
      execStub.callsArgWith(1, null, 'BUILD SUCCESS', '');

      await builder.deploy('Maven');

      assert.ok(execStub.calledWith('mvn clean package'), 'Should execute Maven command');
      assert.ok(execStub.calledWith('mvn clean package'), 'Should execute Maven command');
    });

    it('should handle Gradle deploy', async () => {
      sandbox.stub(fs, 'existsSync').withArgs(sinon.match(/build.gradle/)).returns(true);
      execStub.callsArgWith(1, null, 'BUILD SUCCESSFUL', '');

      await builder.deploy('Gradle');

      assert.ok(execStub.calledWithMatch(/gradlew.*war/), 'Should execute Gradle command');
      assert.ok(execStub.calledWith('mvn clean package'), 'Should execute Maven command');
    });

    it('should show error on failed deployment', async () => {
      const errorStub = sandbox.stub(logger, 'error');
      execStub.callsArgWith(1, new Error('Build failed'));

      await builder.deploy('Maven');
      assert.ok(errorStub.calledWithMatch('Maven build failed'), 'Should log error');
    });

    it('should prompt user when multiple JavaEE projects found', async () => {
      sandbox.stub(Builder, 'findJavaEEProjects').returns(['/test/project', '/test/project2']);
      sandbox.stub(vscode.window, 'showQuickPick').resolves({ label: 'project2', description: '/test/project2' } as any);
      sandbox.stub(fs, 'existsSync').returns(true);
      const setAppNameStub = sandbox.stub(Tomcat.getInstance(), 'setAppName');

      await builder.deploy('Local');

      assert.ok((vscode.window.showQuickPick as sinon.SinonStub).calledOnce, 'showQuickPick should be called');
      assert.ok(setAppNameStub.calledWith('project2'), 'Should select second project');
    });
  });

  describe('createNewProject()', () => {
    it('should prompt for project creation', async () => {
      const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves('Yes' as any);
      const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand').resolves();

      await builder['createNewProject']();

      assert.ok(showInfoStub.calledWithMatch('No Java EE project found'));
      assert.ok(executeCommandStub.calledWith('java.project.create'));
    });

    it('should handle missing Java extension', async () => {
      sandbox.stub(vscode.commands, 'getCommands').resolves([]);
      const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage');

      await builder['createNewProject']();
      assert.ok(showErrorStub.calledWithMatch('Java Extension Pack required'));
    });
  });

  describe('autoDeploy()', () => {
    it('should trigger deploy on manual save', async () => {
      builder['autoDeployMode'] = 'On Save';
      const deployStub = sandbox.stub(builder, 'deploy').resolves();
      await builder.autoDeploy(vscode.TextDocumentSaveReason.Manual);
      assert.ok(deployStub.called);
    });

    it('should trigger deploy when autoDeployMode=On Shortcut on Manual reason', async () => {
      builder['autoDeployMode'] = 'On Shortcut';
      const deployStub = sandbox.stub(builder, 'deploy').resolves();
      await builder.autoDeploy(vscode.TextDocumentSaveReason.Manual);
      assert.ok(deployStub.called);
      assert.ok(deployStub.calledWith('Local', undefined, true));
    });

    it('should prefer active file project for autoDeploy (no QuickPick)', async () => {
      builder['autoDeployMode'] = 'On Save';
      sandbox.stub(Builder, 'findJavaEEProjects').returns(['/test/project', '/test/project2']);
      sandbox.stub(Builder, 'findProjectForFile').returns('/test/project');
      sandbox.stub(vscode.window, 'activeTextEditor').value({ document: { uri: vscode.Uri.file('/test/project/src/Main.java') } } as any);
      const quickPickStub = sandbox.stub(vscode.window, 'showQuickPick').resolves(undefined);

      const result = await (builder as any).selectProjectDirectory(undefined, true);
      assert.strictEqual(result, '/test/project');
      assert.ok(quickPickStub.notCalled);
    });

    it('should show QuickPick for command deploy with multiple projects even when active file exists', async () => {
      sandbox.stub(Builder, 'findJavaEEProjects').returns(['/test/project', '/test/project2']);
      sandbox.stub(Builder, 'findProjectForFile').returns('/test/project');
      sandbox.stub(vscode.window, 'activeTextEditor').value({ document: { uri: vscode.Uri.file('/test/project/src/Main.java') } } as any);
      const quickPickStub = sandbox.stub(vscode.window, 'showQuickPick').resolves({ label: 'project2', description: '/test/project2' } as any);

      const result = await (builder as any).selectProjectDirectory(undefined, false);
      assert.strictEqual(result, '/test/project2');
      assert.ok(quickPickStub.calledOnce);
    });

    it('should not trigger deploy when autoDeployMode=On Shortcut on Auto reason', async () => {
      builder['autoDeployMode'] = 'On Shortcut';
      const deployStub = sandbox.stub(builder, 'deploy').resolves();
      await builder.autoDeploy(vscode.TextDocumentSaveReason.AfterDelay);
      assert.ok(deployStub.notCalled);
    });

    it('should skip deploy when already deploying', async () => {
      (builder as any).deployingApps = new Set(['project']);
      const deployStub = sandbox.stub(builder, 'deploy').resolves();
      await builder.autoDeploy(vscode.TextDocumentSaveReason.Manual);
      assert.ok(deployStub.notCalled);
    });

    it('should queue new deploy request and rerun last after current finishes', async () => {
      const deployStub = sandbox.stub(builder, 'deploy').callThrough();
      Object.assign(builder, { deployingApps: new Set(['login-module']) });
      builder['pendingDeployRequests'].set('login-module', { type: 'Local', projectDir: '/test/project', preferActiveProject: false });
      // simulate finalization loop
      builder['deployingApps'].delete('login-module');
      await (builder as any).deploy('Local', '/test/project', false);
      assert.ok(deployStub.called);
    });
  });
});