/// <reference types="mocha" />

import * as assert from 'assert';
import * as sinon from 'sinon';
import { View } from '../../services/View';
import { Tomcat } from '../../services/Tomcat';

suite('View Tests', () => {
    setup(() => {
        sinon.stub(Tomcat, 'getInstance').returns({
            cleanupStaleManagedInstances: sinon.stub().resolves(),
            getTomcatVersion: sinon.stub().resolves('9.0.0'),
            getInstanceSnapshot: sinon.stub().resolves([])
        } as any);
    });

    teardown(() => {
        sinon.restore();
    });

    test('Refresh should call cleanupStaleManagedInstances', async () => {
        const tomcat = Tomcat.getInstance();
        const cleanupSpy = (tomcat as any).cleanupStaleManagedInstances;
        const view = new View();
        await view.refresh();
        assert.strictEqual(cleanupSpy.called, true);
    });

    test('Translate list groups', async () => {
        const view = new View();
        const children = await view.getChildren();
        assert.ok(Array.isArray(children));
    });
});