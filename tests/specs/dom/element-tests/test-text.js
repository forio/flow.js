module.exports = (function () {
    'use strict';
    var utils = require('../../../testing-utils');
    var domManager = require('src/dom/dom-manager');

    describe(':text', function () {
        describe('input handlers', function () {
            it('should trigger the right event on ui change', function () {
                var $node = utils.initWithNode('<input type="text" data-f-bind="stuff"/>', domManager);
                var spy = utils.spyOnNode($node);

                $node.trigger('change');

                spy.should.have.been.called.once;
            });

            it('should pass the right params to the event', function () {
                var $node = utils.initWithNode('<input type="text" data-f-bind="stuff" value="3"/>', domManager);
                var spy = utils.spyOnNode($node);

                $node.val(5);
                $node.trigger('change');

                spy.getCall(0).args[1].should.eql({ stuff: '5' });
            });

            it('should pass the correct converted values to the channel', function () {
                var channel = utils.createDummyChannel();
                var $node = utils.initWithNode('<input type="text" data-f-bind="stuff" value="3"/>', domManager, channel);

                $node.val(5).trigger('change');
                channel.variables.publish.should.have.been.calledWith({ 'stuff': 5 });

                $node.val('5').trigger('change');
                channel.variables.publish.should.have.been.calledWith({ 'stuff': 5 });

                $node.val('"5"').trigger('change');
                channel.variables.publish.should.have.been.calledWith({ 'stuff': '5' });

                $node.val('abc').trigger('change');
                channel.variables.publish.should.have.been.calledWith({ 'stuff': 'abc' });

                $node.val('true').trigger('change');
                channel.variables.publish.should.have.been.calledWith({ 'stuff': true });
            });
        });
        describe('updaters', function () {
            it('should update itself with values passed in', function () {
                var $node = utils.initWithNode('<input type="text" data-f-bind="stuff" value="3"/>', domManager);
                $node.trigger('update.f.model', { stuff: 5 });

                var val = $node.val();
                val.should.equal('5');
            });
            //TODO: make it only take the last element of an array?
        });
    });
}());
