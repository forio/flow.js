module.exports = (function() {
    'use strict';
    var utils = require('../../../testing-utils');
    var make = utils.create;
    var dummyChannelManager = utils.createDummyChannel();
    var domManager = require('../../../../src/dom/dom-manager');

    describe(':text', function () {
        describe('input handlers', function () {
            it('should trigger the right event on ui change', function () {
                var $textNode = $(make('<input type="text" data-f-bind="stuff"/>'));
                domManager.initialize({
                    root: $textNode,
                    channel: dummyChannelManager
                });

                var spy = sinon.spy();
                $textNode.on('update.f.ui', spy);
                $textNode.trigger('change');

                spy.should.have.been.called.once;
            });

            it('should pass the right params to the event', function () {
                var $textNode = $(make('<input type="text" data-f-bind="stuff"/>'));
                domManager.initialize({
                    root: $textNode,
                    channel: dummyChannelManager
                });
                var spy = sinon.spy();
                $textNode.on('update.f.ui', spy);
                $textNode.val(5);
                $textNode.trigger('change');
                spy.getCall(0).args[1].should.eql({stuff: '5'});
            });
        });
    });
}());
