module.exports = (function() {
    'use strict';
    var make = require('../../../testing-utils').create;
    var domManager = require('../../../../src/dom/dom-manager');

    describe(':text', function () {
        var dummyChannelManager;
        before(function (){
            var dummyChannel = {
                publish: $.noop,
                subscribe: $.noop,
                unsubscribe:  $.noop
            };

            dummyChannelManager = {
                variables: (dummyChannel),
                operations: (dummyChannel)
            };

        });

        after(function (){

        });

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
