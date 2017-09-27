var domManager = require('src/dom/dom-manager');
var utils = require('../../testing-utils');
var config = require('config');

describe('update.f.model', function () {
    it('should trigger f.convert with multiple attributes if provided an object with multiple keys', function () {
        return utils.initWithNode('<input type="text" data-f-stuff="apple" data-f-other="orange"/>', domManager).then(function ($node) {
            var spy = sinon.spy();
            $node.on('f.convert', spy);

            $node.trigger('update.f.model', {
                apple: 'sauce',
                orange: 'pie'
            });

            spy.should.have.been.calledOnce;
            spy.getCall(0).args[1].should.eql({
                stuff: 'sauce',
                other: 'pie'
            });
        });
    });
    it('should trigger f.convert with single attribute if provided an object with same keys', function () {
        return utils.initWithNode('<input type="text" data-f-stuff="apple" data-f-other="apple"/>', domManager).then(function ($node) {
            var spy = sinon.spy();
            $node.on('f.convert', spy);

            $node.trigger('update.f.model', {
                apple: 'sauce'
            });
            spy.getCall(0).args[1].should.eql({
                stuff: 'sauce',
                other: 'sauce'
            });
        });
    });
    it('should trigger f.convert with an object if provided an object with multiple keys', function () {
        return utils.initWithNode('<input type="text" data-f-stuff="apple, orange"/>', domManager).then(function ($node) {
            var spy = sinon.spy();
            $node.on('f.convert', spy);

            var data = {
                apple: 'sauce',
                orange: 'pie'
            };
            $node.trigger('update.f.model', data);
            spy.getCall(0).args[1].should.eql({
                stuff: data
            });
        });
    });
});
describe('f.convert', function () {
    it('should work if triggered with objects', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-bind="price" data-f-stuff="43 | $0.00" />', domManager, channel).then(function ($node) {
            $node.trigger('f.convert', { stuff: '43' });
            $node.attr('stuff').should.equal('$43.00');
        });
    });
    it('should work if triggered with value directly', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-bind="43 | $0.00"/>', domManager, channel).then(function ($node) {
            $node.trigger('f.convert', 43);
            $node.val().should.equal('$43.00');
        });
    });
    it('should work if triggered with value objects', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-bind="price" data-f-stuff="a,b" />', domManager, channel).then(function ($node) {
            var data = { a: 1, b: 2 };
            $node.trigger('f.convert', { stuff: data });
            JSON.parse($node.attr('stuff')).should.eql(data);
        });
    });
    it('should work if triggered with value objects piped to converters', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-bind="price" data-f-stuff="a,b | s" />', domManager, channel).then(function ($node) {
            var data = { a: 1, b: 2 };
            $node.trigger('f.convert', { stuff: data });
            JSON.parse($node.attr('stuff')).should.eql({ a: '1', b: '2' });
        });
    });
});

describe(config.events.operate, function () {
    it('should call publish', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<button data-f-on-click="reset"> Click </button>', domManager, channel).then(function ($node) {
            $node.trigger(config.events.operate, { operations: [{ name: 'stuff', value: [] }] });
            channel.publish.should.have.been.calledOnce;
        });
    });
    it('should pass the right parameters to publish', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<button data-f-on-click="reset"> Click </button>', domManager, channel).then(function ($node) {
            var payload = { operations: [{ name: 'stuff', value: [] }] };
            $node.trigger(config.events.operate, payload);
            channel.publish.should.have.been.calledWith([{ name: 'operations:stuff', value: [] }]);
        });
    });
    it('should implicitly convert parameters to send to publish', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<button data-f-on-click="reset"> Click </button>', domManager, channel).then(function ($node) {
            var payload = { operations: [{ name: 'stuff', value: ['1', 0] }] };
            $node.trigger(config.events.operate, payload);
            channel.publish.should.have.been.calledWith([{ name: 'operations:stuff', value: [1, 0] }]);
        });
    });
});

describe('update.f.ui', function () {
    it('should call publish on the channel', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-bind="apple"/>', domManager, channel).then(function ($node) {
            $node.trigger('update.f.ui', { apple: 2 });
            channel.publish.should.have.been.calledOnce;
        });
    });
    it('should pass the right parameters to publish', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-bind="apple"/>', domManager, channel).then(function ($node) {
            var payload = { apple: 2 };
            $node.trigger('update.f.ui', payload);
            channel.publish.should.have.been.calledWith(payload);
        });
    });
    it('should implicitly convert parameters to send to tpublish', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-bind="apple"/>', domManager, channel).then(function ($node) {
            var payload = { apple: '2' };
            $node.trigger('update.f.ui', payload);
            channel.publish.should.have.been.calledWith({ apple: 2 });
        });
    });

    it('should run values through parsers before sending to publish', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-bind="apple | $#,###.00"/>', domManager, channel).then(function ($node) {
            var payload = { apple: '$20,000.00' };
            $node.trigger('update.f.ui', payload);
            channel.publish.should.have.been.calledWith({ apple: 20000 });
        });
    });
    it('should trigger f.convert to convert values', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-bind="apple | $#,###.00"/>', domManager, channel).then(function ($node) {
            var spy = sinon.spy();
            $node.on('f.convert', spy);
            var payload = { apple: '20000' };
            $node.trigger('update.f.ui', payload);

            spy.should.have.been.calledOnce;
            spy.getCall(0).args[1].should.eql({ bind: 20000 });
        });
    });
});
