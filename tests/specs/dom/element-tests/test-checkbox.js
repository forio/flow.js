var utils = require('../../../testing-utils');
var domManager = require('src/dom/dom-manager');
var config = require('src/config');

describe(':checkbox', function () {
    describe('input handlers', function () {
        it('should trigger the right event on ui change', function () {
            const channel = utils.createDummyChannel();
            return utils.initWithNode('<input type="checkbox" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
                var spy = utils.spyOnNode($node);
                $node.trigger('change');
                spy.should.have.been.calledOnce;
            });
        });

        describe('On Check', function () {
            it('should pass the right value on check - no default', function () {
                const channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="checkbox" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
                    var spy = sinon.spy();
                    $node.on(config.events.trigger, spy);
                    $node.prop('checked', true).trigger('change');

                    const args = spy.getCall(0).args[1];
                    args.data.should.eql([{ name: 'stuff', value: true }]);
                });
            });

            it('should pass the right value on check - default on', function () {
                const channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="checkbox" data-f-bind="stuff" value="4"/>', domManager, channel).then(function ($node) {
                    var spy = sinon.spy();
                    $node.on(config.events.trigger, spy);
                    $node.prop('checked', true).trigger('change');

                    const args = spy.getCall(0).args[1];
                    args.data.should.eql([{ name: 'stuff', value: '4' }]);
                });
            });
        });
        describe('On UnCheck', function () {
            it('should pass the right value on uncheck - no default', function () {
                const channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="checkbox" data-f-bind="stuff" checked/>', domManager, channel).then(function ($node) {
                    var spy = sinon.spy();
                    $node.on(config.events.trigger, spy);

                    $node.prop('checked', false).trigger('change');
                    const args = spy.getCall(0).args[1];
                    args.data.should.eql([{ name: 'stuff', value: false }]);
                });
            });

            it('should pass the right value on uncheck - default off', function () {
                const channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="checkbox" data-f-bind="stuff" data-f-off="5" checked/>', domManager, channel).then(function ($node) {
                    var spy = sinon.spy();
                    $node.on(config.events.trigger, spy);

                    $node.prop('checked', false).trigger('change');

                    const args = spy.getCall(0).args[1];
                    args.data.should.eql([{ name: 'stuff', value: 5 }]);
                });
            });
        });
    });

    describe('updaters', function () {
        describe('with default value', function () {
            it('should check itself if the value matches', function () {
                const channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="checkbox" data-f-bind="stuff" value="3"/>', domManager, channel).then(function ($node) {
                    return channel.publish({ stuff: 3 }).then(()=> {
                        expect($node.prop('checked')).to.equal(true);
                    });
                });
            });
            it('should not check itself if the value doesn\'t match', function () {
                const channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="checkbox" data-f-bind="stuff" value="3"/>', domManager, channel).then(function ($node) {
                    return channel.publish({ stuff: 4 }).then(()=> {
                        expect($node.prop('checked')).to.equal(false);
                    });
                });
            });
            it('should uncheck itself if the value doesn\'t match', function () {
                const channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="checkbox" data-f-bind="stuff" value="3" checked/>', domManager, channel).then(function ($node) {
                    return channel.publish({ stuff: 4 }).then(()=> {
                        expect($node.prop('checked')).to.equal(false);
                    });
                });
            });
        });
        describe('without default value', function () {
            it('should check itself if the value is truthy', function () {
                const channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="checkbox" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
                    return channel.publish({ stuff: 3 }).then(()=> {
                        expect($node.prop('checked')).to.equal(true);
                    });
                });
            });
            it('should not check itself if the value isn\'t truthy', function () {
                const channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="checkbox" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
                    return channel.publish({ stuff: 0 }).then(()=> {
                        expect($node.prop('checked')).to.equal(false);
                    });
                });
            });
            it('should uncheck itself if the value isn\'t truthy', function () {
                const channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="checkbox" data-f-bind="stuff" checked/>', domManager, channel).then(function ($node) {
                    return channel.publish({ stuff: 0 }).then(()=> {
                        expect($node.prop('checked')).to.equal(false);
                    });
                });
            });
        });
    });
});
