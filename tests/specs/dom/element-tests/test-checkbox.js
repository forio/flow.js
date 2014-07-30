module.exports = (function() {
    'use strict';
    var utils = require('../../../testing-utils');
    var domManager = require('../../../../src/dom/dom-manager');

    describe(':checkbox', function () {
        var initWithNode, createSpy;
        before(function () {
            initWithNode = function (str) {
                var $node = $(utils.create(str));
                domManager.initialize({
                    root: $node,
                    channel: utils.createDummyChannel()
                });
                return $node;
            };
            createSpy = function ($node) {
                var spy = sinon.spy();
                $node.on('update.f.ui', function(){
                    //sinon doesn't like passing the spy directly with 'this' as context.
                    spy.apply(null, arguments);
                });
                return spy;
            };
        });

        describe('input handlers', function () {
            it('should trigger the right event on ui change', function () {
                var $node = initWithNode('<input type="checkbox" data-f-bind="stuff"/>');
                var spy = createSpy($node);
                $node.trigger('change');
                spy.should.have.been.called.once;
            });

            describe('On Check', function () {
                it('should pass the right value on check - no default', function () {
                    var $node = initWithNode('<input type="checkbox" data-f-bind="stuff"/>');
                    var spy = createSpy($node);

                    $node.prop('checked', true);
                    $node.trigger('change');

                    spy.getCall(0).args[1].should.eql({stuff: 1});
                });

                it('should pass the right value on check - default on', function () {
                    var $node = initWithNode('<input type="checkbox" data-f-bind="stuff" value="4"/>');
                    var spy = createSpy($node);

                    $node.prop('checked', true);
                    $node.trigger('change');

                    spy.getCall(0).args[1].should.eql({stuff: '4'});
                });
            });
            describe('On UnCheck', function () {
                it('should pass the right value on check - no default', function () {
                    var $node = initWithNode('<input type="checkbox" data-f-bind="stuff" checked/>');
                    var spy = createSpy($node);

                    $node.prop('checked', false);
                    $node.trigger('change');

                    spy.getCall(0).args[1].should.eql({stuff: 0});
                });

                it('should pass the right value on check - default off', function () {
                    var $node = initWithNode('<input type="checkbox" data-f-bind="stuff" data-f-off="5" checked/>');
                    var spy = createSpy($node);

                    $node.prop('checked', false);
                    $node.trigger('change');

                    spy.getCall(0).args[1].should.eql({stuff: 5});
                });
            });
        });
    });
}());
