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
const Browser_1 = require("../../src/utils/Browser");
const sinon = require("sinon");
suite('Browser Tests', () => {
    let browser;
    setup(() => {
        browser = Browser_1.Browser.getInstance();
        sinon.stub(vscode.workspace, 'getConfiguration')
            .returns({
            get: (key) => 'Google Chrome',
            update: () => Promise.resolve()
        });
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
//# sourceMappingURL=browser.test.js.map