'use strict';
module.exports = (function () {
    var config = require('config');
    var defaultEventAttr = require('src/dom/attributes/events/default-event-attr');
    
    describe('Default Event attribute', function () {
        describe('#init', function () {
            it('should attach event listeners for properties prefixed with on-', function () {
                var $node = $('<button data-f-on-click="stuff"> Click </button>');
                defaultEventAttr.init.call($node, 'on-click', 'stuff');

                var spy = sinon.spy();
                $node.on(config.events.operate, spy);
                $node.trigger('click');

                spy.should.have.been.called;
            });

            it('should only trigger one operation per event', function () {
                var $node = $('<button data-f-on-click="stuff"> Click </button>');
                defaultEventAttr.init.call($node, 'on-click', 'stuff');

                var spy = sinon.spy();
                $node.on(config.events.operate, spy);
                $node.trigger('click');

                spy.should.have.been.calledOnce;

                $node.trigger('click');

                spy.should.have.been.calledTwice;
            });

            it('should pass the right parameters to operate', function () {
                var $node = $('<button data-f-on-click="stuff"> Click </button>');
                defaultEventAttr.init.call($node, 'on-click', 'stuff');

                var spy = sinon.spy();
                $node.on(config.events.operate, spy);
                $node.trigger('click');

                spy.getCall(0).args[1].should.eql({ operations: [{ name: 'stuff', value: [] }] });

            });

            it('should pass parameters in the right order for multiples', function () {
                var $node = $('<button data-f-on-click="stuff"> Click </button>');
                defaultEventAttr.init.call($node, 'on-click', 'stuff(1)| reset(0)');

                var spy = sinon.spy();
                $node.on(config.events.operate, spy);
                $node.trigger('click');

                spy.getCall(0).args[1].should.eql({
                    operations: [{ name: 'stuff', value: ['1'] }, { name: 'reset', value: ['0'] }],
                });

            });
        });

        describe('#unbind', function () {
            var $node = $('<button data-f-on-click="stuff"> Click </button>');
            defaultEventAttr.init.call($node, 'on-click', 'stuff');

            var spy = sinon.spy();
            $node.on(config.events.operate, spy);
            $node.trigger('click');

            spy.should.have.been.calledOnce;

            defaultEventAttr.unbind.call($node, 'on-click');
            $node.trigger('click');

            spy.should.have.been.calledOnce;
        });
    });
}());
