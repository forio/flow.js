import domManager from '../dom-manager';
import { createDummyChannel, initWithNode } from '../../../tests/testing-utils';
import config from '../../config';

import chai from 'chai';
const { expect } = chai;

describe('UI change prefixes', ()=> {
    describe('On on-* actions', function () {
        var channel;
        beforeEach(()=> {
            channel = createDummyChannel();
        });
       
        it('should add operations prefix if not provided', ()=> {
            return initWithNode('<div data-f-on-click="somethingrandom"></div>', domManager, channel).then(function ($node) {
                var payload = { data: [{ name: 'stuff', value: ['1', 0] }], source: 'on-click' };
                $node.trigger(config.events.trigger, payload);
                channel.publish.should.have.been.calledWith([{ name: 'operations:stuff', value: [1, 0] }]);
            });
        });
        it('should not add operations prefix if provided', ()=> {
            return initWithNode('<div data-f-on-click="somethingrandom"></div>', domManager, channel).then(function ($node) {
                var payload = { data: [{ name: 'variables:stuff', value: ['1', 0] }], source: 'on-click' };
                $node.trigger(config.events.trigger, payload);
                channel.publish.should.have.been.calledWith([{ name: 'variables:stuff', value: [1, 0] }]);
            });
        });
        describe('Channel Prefix', ()=> {
            it('should add channel prefix if provided on element', ()=> {
                return initWithNode('<div data-f-on-click="somethingrandom" data-f-channel="foo"></div>', domManager, channel).then(function ($node) {
                    var payload = { data: [{ name: 'stuff', value: ['1', 0] }], source: 'on-click' };
                    $node.trigger(config.events.trigger, payload);
                    channel.publish.should.have.been.calledWith([{ name: 'foo:operations:stuff', value: [1, 0] }]);
                });
            });
            it('should add channel prefix if provided on parent', ()=> {
                return initWithNode(`
                        <div data-f-channel="foo">
                            <div data-f-on-click="somethingrandom"></div>
                        </div>
                    `, domManager, channel).then(function ($node) {
                    var payload = { data: [{ name: 'stuff', value: ['1', 0] }], source: 'on-click' };
                    $node.find('div').trigger(config.events.trigger, payload);
                    channel.publish.should.have.been.calledWith([{ name: 'foo:operations:stuff', value: [1, 0] }]);
                });
            });
            it('should not add prefix if el already has one', ()=> {
                return initWithNode('<div data-f-on-click="somethingrandom"></div>', domManager, channel).then(function ($node) {
                    var payload = { data: [{ name: 'bar:stuff', value: ['1', 0] }], source: 'on-click' };
                    $node.trigger(config.events.trigger, payload);
                    channel.publish.should.have.been.calledWith([{ name: 'bar:stuff', value: [1, 0] }]);
                });
            });
        });
    });

    //Publish to variables channel
    describe('On bind inputs', function () {
        var channel;
        beforeEach(()=> {
            channel = createDummyChannel();
        });
        it('should be prefix-less by default', ()=> {
            return initWithNode('<input type="text" data-f-bind="somerandomthing"/>', domManager, channel).then(function ($node) {
                const payload = { data: [{ name: 'apple', value: '20000' }], source: 'bind' };
                $node.trigger(config.events.trigger, payload);

                channel.publish.should.have.been.calledWith([{ name: 'apple', value: 20000 }]);
            });
        });
        it('should add channel prefix if provided on element', ()=> {
            return initWithNode('<input type="text" data-f-bind="somerandomthing" data-f-channel="foo"/>', domManager, channel).then(function ($node) {
                const payload = { data: [{ name: 'apple', value: '20000' }], source: 'bind' };
                $node.trigger(config.events.trigger, payload);

                channel.publish.should.have.been.calledWith([{ name: 'foo:apple', value: 20000 }]);
            });
        });
        it('should add channel prefix if provided on parent', ()=> {
            return initWithNode(`
                    <div data-f-channel="foo">
                        <input type="text" data-f-bind="somerandomthing"/>
                    </div>
                `, domManager, channel).then(function ($node) {
                const payload = { data: [{ name: 'apple', value: '20000' }], source: 'bind' };
                $node.find('input').trigger(config.events.trigger, payload);
                channel.publish.should.have.been.calledWith([{ name: 'foo:apple', value: 20000 }]);
            });
        });
        it('should not add prefix if el already has one', ()=> {
            return initWithNode('<input type="text" data-f-bind="somerandomthing" data-f-channel="foo"/>', domManager, channel).then(function ($node) {
                const payload = { data: [{ name: 'bar:apple', value: '20000' }], source: 'bind' };
                $node.trigger(config.events.trigger, payload);
                channel.publish.should.have.been.calledWith([{ name: 'bar:apple', value: 20000 }]);
            });
        });
    });
});
