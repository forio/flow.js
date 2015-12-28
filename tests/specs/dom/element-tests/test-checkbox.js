'use strict';
module.exports = (function () {
    var utils = require('../../../testing-utils');
    var domManager = require('src/dom/dom-manager');

    describe(':checkbox', function () {
        describe('input handlers', function () {
            it('should trigger the right event on ui change', function () {
                var $node = utils.initWithNode('<input type="checkbox" data-f-bind="stuff"/>', domManager);
                var spy = utils.spyOnNode($node);
                $node.trigger('change');
                spy.should.have.been.called.once;
            });

            describe('On Check', function () {
                it('should pass the right value on check - no default', function () {
                    var channel = utils.createDummyChannel();
                    var $node = utils.initWithNode('<input type="checkbox" data-f-bind="stuff"/>', domManager, channel);
                    var spy = sinon.spy();
                    $node.on('update.f.ui', spy);

                    $node.prop('checked', true).trigger('change');

                    spy.getCall(0).args[1].should.eql({ stuff: 1 });
                });

                it('should pass the right value on check - default on', function () {
                    var channel = utils.createDummyChannel();
                    var $node = utils.initWithNode('<input type="checkbox" data-f-bind="stuff" value="4"/>', domManager, channel);
                    var spy = sinon.spy();
                    $node.on('update.f.ui', spy);

                    $node.prop('checked', true).trigger('change');

                    spy.getCall(0).args[1].should.eql({ stuff: '4' });
                });
            });
            describe('On UnCheck', function () {
                it('should pass the right value on uncheck - no default', function () {
                    var channel = utils.createDummyChannel();
                    var $node = utils.initWithNode('<input type="checkbox" data-f-bind="stuff" checked/>', domManager, channel);
                    var spy = sinon.spy();
                    $node.on('update.f.ui', spy);

                    $node.prop('checked', false).trigger('change');
                    spy.getCall(0).args[1].should.eql({ stuff: 0 });
                });

                it('should pass the right value on uncheck - default off', function () {
                    var channel = utils.createDummyChannel();
                    var $node = utils.initWithNode('<input type="checkbox" data-f-bind="stuff" data-f-off="5" checked/>', domManager, channel);
                    var spy = sinon.spy();
                    $node.on('update.f.ui', spy);

                    $node.prop('checked', false).trigger('change');
                    spy.getCall(0).args[1].should.eql({ stuff: 5 });
                });
            });
        });

        describe('updaters', function () {
            describe('with default value', function () {
                it('should check itself if the value matches', function () {
                    var $node = utils.initWithNode('<input type="checkbox" data-f-bind="stuff" value="3"/>', domManager);
                    $node.trigger('update.f.model', { stuff: 3 });

                    var val = $node.prop('checked');
                    val.should.equal(true);
                });
                it('should not check itself if the value doesn\'t match', function () {
                    var $node = utils.initWithNode('<input type="checkbox" data-f-bind="stuff" value="3"/>', domManager);
                    $node.trigger('update.f.model', { stuff: 4 });

                    var val = $node.prop('checked');
                    val.should.equal(false);
                });
                it('should uncheck itself if the value doesn\'t match', function () {
                    var $node = utils.initWithNode('<input type="checkbox" data-f-bind="stuff" value="3" checked/>', domManager);
                    $node.trigger('update.f.model', { stuff: 5 });

                    var val = $node.prop('checked');
                    val.should.equal(false);
                });
            });
            describe('without default value', function () {
                it('should check itself if the value is truthy', function () {
                    var $node = utils.initWithNode('<input type="checkbox" data-f-bind="stuff"/>', domManager);
                    $node.trigger('update.f.model', { stuff: 3 });

                    var val = $node.prop('checked');
                    val.should.equal(true);
                });
                it('should not check itself if the value isn\'t truthy', function () {
                    var $node = utils.initWithNode('<input type="checkbox" data-f-bind="stuff"/>', domManager);
                    $node.trigger('update.f.model', { stuff: 0 });

                    var val = $node.prop('checked');
                    val.should.equal(false);
                });
                it('should uncheck itself if the value isn\'t truthy', function () {
                    var $node = utils.initWithNode('<input type="checkbox" data-f-bind="stuff" checked/>', domManager);
                    $node.trigger('update.f.model', { stuff: 0 });

                    var val = $node.prop('checked');
                    val.should.equal(false);
                });
            });
        });
    });
}());
