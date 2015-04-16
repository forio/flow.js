module.exports = (function () {
    'use strict';
    var domManager = require('src/dom/dom-manager');
    var utils = require('../../testing-utils');

    describe('update.f.model', function () {
        it('should trigger f.convert with multiple attributes if provided an object with multiple keys', function () {
            var $node = utils.initWithNode('<input type="text" data-f-stuff="apple" data-f-other="orange"/>', domManager);
            var spy = sinon.spy();
            $node.on('f.convert', spy);

            $node.trigger('update.f.model', {
                apple: 'sauce',
                orange: 'pie'
            });

            spy.should.have.been.calledOnce;
            spy.getCall(0).args[1].should.eql({
                'stuff': 'sauce',
                'other': 'pie'
            });
        });
        it('should trigger f.convert with single attribute if provided an object with same keys', function () {
            var $node = utils.initWithNode('<input type="text" data-f-stuff="apple" data-f-other="apple"/>', domManager);
            var spy = sinon.spy();
            $node.on('f.convert', spy);

            $node.trigger('update.f.model', {
                apple: 'sauce'
            });
            spy.getCall(0).args[1].should.eql({
                'stuff': 'sauce',
                'other': 'sauce'
            });
        });
        it('should trigger f.convert with an object if provided an object with multiple keys', function () {
            var $node = utils.initWithNode('<input type="text" data-f-stuff="apple, orange"/>', domManager);
            var spy = sinon.spy();
            $node.on('f.convert', spy);

            var data = {
                apple: 'sauce',
                orange: 'pie'
            };
            $node.trigger('update.f.model', data);
            spy.getCall(0).args[1].should.eql({
                'stuff': data
            });
        });
    });
    describe('f.convert', function () {
        it('should work if triggered with objects', function () {
            var channel = utils.createDummyChannel();
            var $node = utils.initWithNode('<input type="text" data-f-bind="price" data-f-stuff="43 | $0.00" />', domManager, channel);

            $node.trigger('f.convert', { stuff: '43' });
            $node.prop('stuff').should.equal('$43.00');
        });
        it('should work if triggered with value directly', function () {
            var channel = utils.createDummyChannel();
            var $node = utils.initWithNode('<input type="text" data-f-bind="43 | $0.00"/>', domManager, channel);

            $node.trigger('f.convert', 43);
            $node.val().should.equal('$43.00');
        });
        it('should work if triggered with value objects', function () {
            var channel = utils.createDummyChannel();
            var $node = utils.initWithNode('<input type="text" data-f-bind="price" data-f-stuff="a,b" />', domManager, channel);

            var data = { a: 1, b: 2 };
            $node.trigger('f.convert', { stuff: data });
            $node.prop('stuff').should.eql(data);
        });
        it('should work if triggered with value objects piped to converters', function () {
            var channel = utils.createDummyChannel();
            var $node = utils.initWithNode('<input type="text" data-f-bind="price" data-f-stuff="a,b | s" />', domManager, channel);

            var data = { a: 1, b: 2 };
            $node.trigger('f.convert', { stuff: data });
            $node.prop('stuff').should.eql({ a: '1', b: '2' });
        });
    });

    describe('f.ui.operate', function () {
        it('should call the operations channel', function () {
            var channel = utils.createDummyChannel();
            var $node = utils.initWithNode('<button data-f-on-click="reset"> Click </button>', domManager, channel);

            $node.trigger('f.ui.operate', { operations: [{ name: 'stuff', params: [] }], serial: true });
            channel.operations.publish.should.have.been.calledOnce;
        });
        it('should pass the right parameters to the operations channel', function () {
            var channel = utils.createDummyChannel();
            var $node = utils.initWithNode('<button data-f-on-click="reset"> Click </button>', domManager, channel);

            var payload = { operations: [{ name: 'stuff', params: [] }], serial: true };
            $node.trigger('f.ui.operate', payload);
            channel.operations.publish.should.have.been.calledWith(payload);
        });
        it('should implicitly convert parameters to send to the operations channel', function () {
            var channel = utils.createDummyChannel();
            var $node = utils.initWithNode('<button data-f-on-click="reset"> Click </button>', domManager, channel);

            var payload = { operations: [{ name: 'stuff', params: ['1', 0] }], serial: true };
            $node.trigger('f.ui.operate', payload);
            channel.operations.publish.should.have.been.calledWith({ operations: [{ name: 'stuff', params: [1, 0] }], serial: true });
        });
    });
}());
