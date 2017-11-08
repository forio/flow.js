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

            expect(spy).to.have.been.called;
        });

        it('should only trigger one operation per event', function () {
            var $node = $('<button data-f-on-click="stuff"> Click </button>');
            defaultEventAttr.init.call($node, 'on-click', 'stuff');

            var spy = sinon.spy();
            $node.on(config.events.operate, spy);
            $node.trigger('click');

            expect(spy).to.have.been.calledOnce;

            $node.trigger('click');

            expect(spy).to.have.been.calledTwice;
        });

        it('should pass the right parameters to operate', function () {
            var $node = $('<button data-f-on-click="stuff"> Click </button>');
            defaultEventAttr.init.call($node, 'on-click', 'stuff');

            var spy = sinon.spy();
            $node.on(config.events.operate, spy);
            $node.trigger('click');

            spy.getCall(0).args[1].should.eql({ data: [{ name: 'stuff', value: [] }], source: 'on-click' });

        });

        it('should pass parameters in the right order for multiples', function () {
            var $node = $('<button data-f-on-click="stuff"> Click </button>');
            defaultEventAttr.init.call($node, 'on-click', 'stuff(1)| reset(0)');

            var spy = sinon.spy();
            $node.on(config.events.operate, spy);
            $node.trigger('click');

            spy.getCall(0).args[1].should.eql({
                data: [{ name: 'stuff', value: ['1'] }, { name: 'reset', value: ['0'] }],
                source: 'on-click'
            });

        });
    });

    describe('#unbind', function () {
        it('should remove event listeners', ()=> {
            var $node = $('<button data-f-on-click="stuff"> Click </button>');
            defaultEventAttr.init.call($node, 'on-click', 'stuff');

            var spy = sinon.spy();
            $node.on(config.events.operate, spy);
            $node.trigger('click');

            expect(spy).to.have.been.calledOnce;

            defaultEventAttr.unbind.call($node, 'on-click');
            $node.trigger('click');

            expect(spy).to.have.been.calledOnce;
        });
    });
});
