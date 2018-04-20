import { initWithNode, createDummyChannel, spyOnNode } from 'tests/testing-utils';
import domManager from 'src/dom/dom-manager';

import { expect } from 'chai';

describe('button', function () {
    it('should call operation with single params', function () {
        var channel = createDummyChannel();
        return initWithNode('<input type="button" data-f-on-click="step(1)"/>', domManager, channel).then(function ($node) {
            $node.trigger('click');
            channel.publish.should.have.been.calledWith([{ name: 'operations:step', value: [1] }]);
        });
    });

    it('should call operation with double params', function () {
        var channel = createDummyChannel();
        return initWithNode('<input type="button" data-f-on-click="step(1, 2)"/>', domManager, channel).then(function ($node) {
            $node.trigger('click');
            channel.publish.should.have.been.calledWith([{ name: 'operations:step', value: [1, 2] }]);
        });
    });

    it('should call operation with double params with no, string ', function () {
        var channel = createDummyChannel();
        return initWithNode('<input type="button" data-f-on-click="step(1, abc)"/>', domManager, channel).then(function ($node) {
            $node.trigger('click');
            channel.publish.should.have.been.calledWith([{ name: 'operations:step', value: [1, 'abc'] }]);
        });
    });

    it('should call operation with double params with no, implied string ', function () {
        var channel = createDummyChannel();
        return initWithNode('<input type="button" data-f-on-click="step(1,\'2\')"/>', domManager, channel).then(function ($node) {
            $node.trigger('click');
            channel.publish.should.have.been.calledWith([{ name: 'operations:step', value: [1, '2'] }]);
        });
    });

    it('should call multiple operations with &&', function () {
        var channel = createDummyChannel();
        return initWithNode('<input type="button" data-f-on-click="step(1, 2) && reset()"/>', domManager, channel).then(function ($node) {
            $node.trigger('click');
            channel.publish.should.have.been.calledWith([
                { name: 'operations:step', value: [1, 2] },
                { name: 'operations:reset', value: [] }]);
        });
    });

    it('should call operation with double params with no object', function () {
        var channel = createDummyChannel();
        return initWithNode(`
                <input type="button" data-f-on-click='step(1, {"hello": "world" })'/>
            `, domManager, channel).then(function ($node) {
            $node.trigger('click');
            channel.publish.should.have.been.calledWith([{ name: 'operations:step', value: [1, { hello: 'world' }] }]);
        });
    });
});
