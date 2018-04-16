var domManager = require('src/dom/dom-manager');
var utils = require('../../testing-utils');
var config = require('config');

describe('On Variable updates', function () {
    it('should trigger f.convert with multiple attributes if provided an object with multiple keys', function () {
        const channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-stuff="apple" data-f-other="orange"/>', domManager, channel).then(function ($node) {
            var spy = sinon.spy();
            $node.on('f.convert', spy);

            return channel.publish({
                apple: 'sauce',
                orange: 'pie'
            }).then(()=> {
                spy.should.have.been.calledTwice;
                spy.getCall(0).args[1].should.eql({
                    stuff: 'sauce',
                });
                spy.getCall(1).args[1].should.eql({
                    other: 'pie',
                });
            });
        });
    });
    it('should trigger f.convert with single attribute if provided an object with same keys', function () {
        const channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-stuff="apple" data-f-other="apple"/>', domManager, channel).then(function ($node) {
            var spy = sinon.spy();
            $node.on('f.convert', spy);

            return channel.publish({
                apple: 'sauce'
            }).then(()=> {
                spy.should.have.been.calledTwice;
                spy.getCall(0).args[1].should.eql({
                    stuff: 'sauce',
                });
                spy.getCall(1).args[1].should.eql({
                    other: 'sauce',
                });
            });
        });
    });
    it('should trigger f.convert with an object if provided an object with multiple keys', function () {
        const channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-stuff="apple, orange"/>', domManager, channel).then(function ($node) {
            var spy = sinon.spy();
            $node.on('f.convert', spy);

            var data = {
                apple: 'sauce',
                orange: 'pie'
            };
            return channel.publish(data).then(()=> {
                spy.getCall(0).args[1].should.eql({
                    stuff: data
                });
            });
        });
    });
    describe('De-prefix variables', ()=> {
        it('should leave single vars as-is', ()=> {
            const channel = utils.createDummyChannel();
            return utils.initWithNode('<input type="text" data-f-stuff="c1:apple"/>', domManager, channel).then(function ($node) {
                var spy = sinon.spy();
                $node.on('f.convert', spy);

                var data = {
                    'c1:apple': 'sauce',
                };
                return channel.publish(data).then(()=> {
                    spy.getCall(0).args[1].should.eql({
                        stuff: 'sauce'
                    });
                });
            });
        });
        it('should deprefix multivariables if channel provided externally', ()=> {
            const channel = utils.createDummyChannel();
            return utils.initWithNode('<input type="text" data-f-stuff="apple,bread" data-f-channel="c1" />', domManager, channel).then(function ($node) {
                var spy = sinon.spy();
                $node.on('f.convert', spy);

                var data = {
                    'c1:apple': 'sauce',
                    'c1:bread': 'pudding',
                };
                return channel.publish(data).then(()=> {
                    spy.getCall(0).args[1].should.eql({
                        stuff: {
                            apple: 'sauce',
                            bread: 'pudding'
                        }
                    });
                });
            });
        });
        it('should not deprefix multivariables if channel provided inline', ()=> {
            const channel = utils.createDummyChannel();
            return utils.initWithNode('<input type="text" data-f-stuff="c1:apple,c1:bread" />', domManager, channel).then(function ($node) {
                var spy = sinon.spy();
                $node.on('f.convert', spy);

                var data = {
                    'c1:apple': 'sauce',
                    'c1:bread': 'pudding',
                };
                return channel.publish(data).then(()=> {
                    spy.getCall(0).args[1].should.eql({
                        stuff: data
                    });
                });
            });
        });
    });
});
describe('f.convert', function () {
    it('should work if triggered with objects', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-bind="price" data-f-stuff="43 | $0.00" />', domManager, channel).then(function ($node) {
            $node.trigger('f.convert', { stuff: '43' });
            $node.prop('stuff').should.equal('$43.00');
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
            $node.prop('stuff').should.eql(data);
        });
    });
    it('should work if triggered with value objects piped to converters', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-bind="price" data-f-stuff="a,b | s" />', domManager, channel).then(function ($node) {
            var data = { a: 1, b: 2 };
            $node.trigger('f.convert', { stuff: data });
            $node.prop('stuff').should.eql({ a: '1', b: '2' });
        });
    });
});

describe(config.events.operate, function () {
    var channel;
    beforeEach(()=> {
        channel = utils.createDummyChannel();
    });
    it('should call publish', function () {
        return utils.initWithNode('<div data-f-on-click="somethingrandom"></div>', domManager, channel).then(function ($node) {
            $node.trigger(config.events.operate, { data: [{ name: 'stuff', value: [] }], source: 'on-click' });
            channel.publish.should.have.been.calledOnce;
        });
    });
    it('should pass the right parameters to publish', function () {
        return utils.initWithNode('<div data-f-on-click="somethingrandom"></div>', domManager, channel).then(function ($node) {
            var payload = { data: [{ name: 'stuff', value: [] }], source: 'on-click' };
            $node.trigger(config.events.operate, payload);
            channel.publish.should.have.been.calledWith([{ name: 'operations:stuff', value: [] }]);
        });
    });
    it('should implicitly convert parameters to send to publish', function () {
        return utils.initWithNode('<div data-f-on-click="somethingrandom"></div>', domManager, channel).then(function ($node) {
            var payload = { data: [{ name: 'stuff', value: ['1', 0] }], source: 'on-click' };
            $node.trigger(config.events.operate, payload);
            channel.publish.should.have.been.calledWith([{ name: 'operations:stuff', value: [1, 0] }]);
        });
    });
    describe('Operations prefix', ()=> {
        it('should add operations prefix if not provided', ()=> {
            return utils.initWithNode('<div data-f-on-click="somethingrandom"></div>', domManager, channel).then(function ($node) {
                var payload = { data: [{ name: 'stuff', value: ['1', 0] }], source: 'on-click' };
                $node.trigger(config.events.operate, payload);
                channel.publish.should.have.been.calledWith([{ name: 'operations:stuff', value: [1, 0] }]);
            });
        });
        it('should not add operations prefix if provided', ()=> {
            return utils.initWithNode('<div data-f-on-click="somethingrandom"></div>', domManager, channel).then(function ($node) {
                var payload = { data: [{ name: 'variables:stuff', value: ['1', 0] }], source: 'on-click' };
                $node.trigger(config.events.operate, payload);
                channel.publish.should.have.been.calledWith([{ name: 'variables:stuff', value: [1, 0] }]);
            });
        });
        describe('Channel Prefix', ()=> {
            it('should add channel prefix if provided on element', ()=> {
                return utils.initWithNode('<div data-f-on-click="somethingrandom" data-f-channel="foo"></div>', domManager, channel).then(function ($node) {
                    var payload = { data: [{ name: 'stuff', value: ['1', 0] }], source: 'on-click' };
                    $node.trigger(config.events.operate, payload);
                    channel.publish.should.have.been.calledWith([{ name: 'foo:operations:stuff', value: [1, 0] }]);
                });
            });
            it('should add channel prefix if provided on parent', ()=> {
                return utils.initWithNode(`
                    <div data-f-channel="foo">
                        <div data-f-on-click="somethingrandom"></div>
                    </div>
                `, domManager, channel).then(function ($node) {
                    var payload = { data: [{ name: 'stuff', value: ['1', 0] }], source: 'on-click' };
                    $node.find('div').trigger(config.events.operate, payload);
                    channel.publish.should.have.been.calledWith([{ name: 'foo:operations:stuff', value: [1, 0] }]);
                });
            });
            it('should not add prefix if el already has one', ()=> {
                return utils.initWithNode('<div data-f-on-click="somethingrandom"></div>', domManager, channel).then(function ($node) {
                    var payload = { data: [{ name: 'bar:stuff', value: ['1', 0] }], source: 'on-click' };
                    $node.trigger(config.events.operate, payload);
                    channel.publish.should.have.been.calledWith([{ name: 'bar:stuff', value: [1, 0] }]);
                });
            });
        });
    });
});

//Publish to variables channel
describe(config.events.trigger, function () {
    it('should call publish on the channel', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-bind="apple"/>', domManager, channel).then(function ($node) {
            const payload = { data: [{ name: 'apple', value: 2 }], source: 'bind' };
            $node.trigger(config.events.trigger, payload);
            channel.publish.should.have.been.calledOnce;
        });
    });
    it('should pass the right parameters to publish', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-bind="apple"/>', domManager, channel).then(function ($node) {
            var payload = { data: [{ name: 'apple', value: 2 }], source: 'bind' };
            $node.trigger(config.events.trigger, payload);
            channel.publish.should.have.been.calledWith([{ name: 'apple', value: 2 }]);
        });
    });
    it('should implicitly convert parameters to send to tpublish', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-bind="apple"/>', domManager, channel).then(function ($node) {
            var payload = { data: [{ name: 'apple', value: '2' }], source: 'bind' };
            $node.trigger(config.events.trigger, payload);
            channel.publish.should.have.been.calledWith([{ name: 'apple', value: 2 }]);
        });
    });

    it('should run values through parsers before sending to publish', function () {
        var channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-bind="apple | $#,###.00"/>', domManager, channel).then(function ($node) {
            var payload = { data: [{ name: 'apple', value: '$20,000.00' }], source: 'bind' };
            $node.trigger(config.events.trigger, payload);
            channel.publish.should.have.been.calledWith([{ name: 'apple', value: 20000 }]);
        });
    });
    it('should trigger f.convert to convert values', function (done) {
        const channel = utils.createDummyChannel();
        utils.initWithNode('<input type="text" data-f-bind="apple | $#,###.00"/>', domManager, channel).then(function ($node) {
            var spy = sinon.spy();
            $node.on('f.convert', spy);

            var payload = { data: [{ name: 'apple', value: '20000' }], source: 'bind' };
            $node.trigger(config.events.trigger, payload);
            
            setTimeout(()=> {
                spy.should.have.been.calledOnce;
                spy.getCall(0).args[1].should.eql({ bind: 20000 });
                done();
            }, 0);
        });
    });
    describe('Channel prefix', ()=> {
        var channel;
        beforeEach(()=> {
            channel = utils.createDummyChannel();
        });
        it('should be prefix-less by default', ()=> {
            return utils.initWithNode('<input type="text" data-f-bind="somerandomthing"/>', domManager, channel).then(function ($node) {
                const payload = { data: [{ name: 'apple', value: '20000' }], source: 'bind' };
                $node.trigger(config.events.trigger, payload);

                channel.publish.should.have.been.calledWith([{ name: 'apple', value: 20000 }]);
            });
        });
        it('should add channel prefix if provided on element', ()=> {
            return utils.initWithNode('<input type="text" data-f-bind="somerandomthing" data-f-channel="foo"/>', domManager, channel).then(function ($node) {
                const payload = { data: [{ name: 'apple', value: '20000' }], source: 'bind' };
                $node.trigger(config.events.trigger, payload);

                channel.publish.should.have.been.calledWith([{ name: 'foo:apple', value: 20000 }]);
            });
        });
        it('should add channel prefix if provided on parent', ()=> {
            return utils.initWithNode(`
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
            return utils.initWithNode('<input type="text" data-f-bind="somerandomthing" data-f-channel="foo"/>', domManager, channel).then(function ($node) {
                const payload = { data: [{ name: 'bar:apple', value: '20000' }], source: 'bind' };
                $node.trigger(config.events.trigger, payload);
                channel.publish.should.have.been.calledWith([{ name: 'bar:apple', value: 20000 }]);
            });
        });
    });
});
