var config = require('config');
var defaultEventAttr = require('src/dom/attributes/events/default-event-attr').default;

describe('Default Event attribute', function () {
    describe('#init', function () {
        it('should attach event listeners for properties prefixed with on-', function () {
            var $node = $('<button data-f-on-click="stuff"> Click </button>');
            defaultEventAttr.init('on-click', ['stuff'], $node);

            var spy = sinon.spy();
            $node.on(config.events.operate, spy);
            $node.trigger('click');

            expect(spy).to.have.been.called;
        });

        it('should only trigger one operation per event', function () {
            var $node = $('<button data-f-on-click="stuff"> Click </button>');
            defaultEventAttr.init('on-click', ['stuff'], $node);

            var spy = sinon.spy();
            $node.on(config.events.operate, spy);
            $node.trigger('click');

            expect(spy).to.have.been.calledOnce;

            $node.trigger('click');

            expect(spy).to.have.been.calledTwice;
        });

        it('should pass the right parameters to operate', function () {
            var $node = $('<button data-f-on-click="stuff"> Click </button>');
            defaultEventAttr.init('on-click', [{ name: 'stuff' }], $node);

            var spy = sinon.spy();
            $node.on(config.events.operate, spy);
            $node.trigger('click');

            spy.getCall(0).args[1].should.eql({ data: [{ name: 'stuff', value: [] }], source: 'on-click' });
        });
        it('should support name = value format', function () {
            var $node = $('<button data-f-on-click="somevariable = 1"> Click </button>');
            defaultEventAttr.init('on-click', [{ name: 'somevariable = 1' }], $node);

            var spy = sinon.spy();
            $node.on(config.events.operate, spy);
            $node.trigger('click');

            spy.getCall(0).args[1].should.eql({ data: [{ name: 'somevariable', value: '1' }], source: 'on-click' });
        });

        it('should pass parameters in the right order for multiples', function () {
            var $node = $('<button data-f-on-click="stuff"> Click </button>');
            defaultEventAttr.init('on-click', [{ name: 'stuff(1) && foo=bar  && reset(0)' }], $node);

            var spy = sinon.spy();
            $node.on(config.events.operate, spy);
            $node.trigger('click');

            spy.getCall(0).args[1].should.eql({
                data: [{ name: 'stuff', value: ['1'] }, { name: 'foo', value: 'bar' }, { name: 'reset', value: ['0'] }],
                source: 'on-click'
            });
        });
    });

    describe('#unbind', function () {
        it('should remove event listeners', ()=> {
            var $node = $('<button data-f-on-click="stuff"> Click </button>');
            defaultEventAttr.init('on-click', [{ name: 'stuff' }], $node);

            var spy = sinon.spy();
            $node.on(config.events.operate, spy);
            $node.trigger('click');

            expect(spy).to.have.been.calledOnce;

            defaultEventAttr.unbind('on-click', $node);
            $node.trigger('click');

            expect(spy).to.have.been.calledOnce;
        });
    });
});
