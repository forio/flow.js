module.exports = (function() {
    'use strict';
    var make = require('../../../testing-utils').create;
    var domManager = require('../../../../src/dom/dom-manager');

    describe(':checkbox', function () {
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
                var $node = $(make('<input type="checkbox" data-f-bind="stuff"/>'));
                domManager.initialize({
                    root: $node,
                    channel: dummyChannelManager
                });

                var spy = sinon.spy();
                $node.on('update.f.ui', function(){
                    //sinon doesn't like passing the spy directly with 'this' as context.
                    spy.apply(null, arguments);
                });
                $node.trigger('change');
                spy.should.have.been.called.once;
            });

            it('should pass the right value on check', function () {
                var $node = $(make('<input type="checkbox" data-f-bind="stuff"/>'));
                domManager.initialize({
                    root: $node,
                    channel: dummyChannelManager
                });

                var spy = sinon.spy();
                $node.on('update.f.ui', function(){
                    spy.apply(null, arguments);
                });
                $node.prop('checked', true);
                $node.trigger('change');

                spy.getCall(0).args[1].should.eql({stuff: 1});
            });
        });
    });

}());
