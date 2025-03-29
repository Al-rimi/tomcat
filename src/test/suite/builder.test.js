"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) {k2 = k;}
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) {k2 = k;}
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) {if (Object.prototype.hasOwnProperty.call(o, k)) {ar[ar.length] = k;}}
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) {return mod;}
        var result = {};
        if (mod !== null) {for (var k = ownKeys(mod), i = 0; i < k.length; i++) {if (k[i] !== "default") {__createBinding(result, mod, k[i]);}}}
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const sinon = __importStar(require("sinon"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const Builder_1 = require("../../src/utils/Builder");
const Browser_1 = require("../../src/utils/Browser");
const Logger_1 = require("../../src/utils/Logger");
const Tomcat_1 = require("../../src/utils/Tomcat");
describe('Builder Tests', () => {
    let builder;
    let logger;
    let sandbox;
    let mockContext;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        logger = Logger_1.Logger.getInstance();
        builder = Builder_1.Builder.getInstance();
        mockContext = {
            subscriptions: [],
            workspaceState: { get: () => { }, update: () => Promise.resolve() },
            globalState: { get: () => { }, update: () => Promise.resolve() },
        };
        Builder_1.Builder.instance = null;
        Tomcat_1.Tomcat.instance = null;
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
            sandbox.stub(fs, 'existsSync').callsFake((p) => {
                const webInfPath = path.join(path.dirname(p.toString()), 'WEB-INF');
                return fs.existsSync(webInfPath);
            });
            assert.strictEqual(Builder_1.Builder.isJavaEEProject(), true);
        });
        it('should detect Maven WAR project', () => {
            sandbox.stub(fs, 'existsSync').callsFake((p) => {
                const fileName = path.basename(p.toString());
                return fileName.endsWith('pom.xml');
            });
            sandbox.stub(fs, 'readFileSync').returns('<packaging>war</packaging>');
            assert.strictEqual(Builder_1.Builder.isJavaEEProject(), true);
        });
        it('should return false for non-JavaEE projects', () => {
            sandbox.stub(fs, 'existsSync').returns(false);
            assert.strictEqual(Builder_1.Builder.isJavaEEProject(), false);
        });
    });
    describe('deploy()', () => {
        let execStub;
        let showProgressStub;
        beforeEach(() => {
            execStub = sandbox.stub(require('child_process'), 'exec');
            showProgressStub = sandbox.stub(vscode.window, 'withProgress');
            showProgressStub.callsFake((_, task) => task());
            sandbox.stub(Tomcat_1.Tomcat.getInstance(), 'findTomcatHome').resolves('/tomcat');
            sandbox.stub(Tomcat_1.Tomcat.getInstance(), 'reload').resolves();
            sandbox.stub(Browser_1.Browser.getInstance(), 'run').resolves();
        });
        it('should perform Fast deploy', async () => {
            sandbox.stub(fs, 'existsSync').returns(true);
            const cpSyncStub = sandbox.stub(fs, 'cpSync');
            const rmSyncStub = sandbox.stub(fs, 'rmSync');
            await builder.deploy('Fast');
            assert.ok(cpSyncStub.calledWith(sinon.match(/webapp/), 'Should copy webapp'));
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
    });
    describe('createNewProject()', () => {
        it('should prompt for project creation', async () => {
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves('Yes');
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
            const deployStub = sandbox.stub(builder, 'deploy').resolves();
            await builder.autoDeploy(vscode.TextDocumentSaveReason.Manual);
            assert.ok(deployStub.called);
        });
        it('should skip deploy when already deploying', async () => {
            builder.isDeploying = true;
            const deployStub = sandbox.stub(builder, 'deploy').resolves();
            await builder.autoDeploy(vscode.TextDocumentSaveReason.Manual);
            assert.ok(deployStub.notCalled);
        });
    });
});
//# sourceMappingURL=builder.test.js.map