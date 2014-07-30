module.exports = (function() {
    'use strict';
    var utils = require('../../../testing-utils');
    var domManager = require('../../../../src/dom/dom-manager');

    describe(':checkbox', function () {
        describe('input handlers', function () {
            it('should trigger the right event on ui change', function () {
                var $node = utils.initWithNode('<input type="checkbox" data-f-bind="stuff"/>', domManager);
                var spy = utils.spyOnNode($node);
                $node.trigger('change');
                spy.should.have.been.called.once;
            });

            describe('On Check', function () {
                it('should pass the right value on check - no default', function () {
                    var $node = utils.initWithNode('<input type="checkbox" data-f-bind="stuff"/>', domManager);
                    var spy = utils.spyOnNode($node);

                    $node.prop('checked', true);
                    $node.trigger('change');

                    spy.getCall(0).args[1].should.eql({stuff: 1});
                });

                it('should pass the right value on check - default on', function () {
                    var $node = utils.initWithNode('<input type="checkbox" data-f-bind="stuff" value="4"/>', domManager);
                    var spy = utils.spyOnNode($node);

                    $node.prop('checked', true);
                    $node.trigger('change');

                    spy.getCall(0).args[1].should.eql({stuff: '4'});
                });
            });
            describe('On UnCheck', function () {
                it('should pass the right value on check - no default', function () {
                    var $node = utils.initWithNode('<input type="checkbox" data-f-bind="stuff" checked/>', domManager);
                    var spy = utils.spyOnNode($node);

                    $node.prop('checked', false);
                    $node.trigger('change');

                    spy.getCall(0).args[1].should.eql({stuff: 0});
                });

                it('should pass the right value on check - default off', function () {
                    var $node = utils.initWithNode('<input type="checkbox" data-f-bind="stuff" data-f-off="5" checked/>', domManager);
                    var spy = utils.spyOnNode($node);

                    $node.prop('checked', false);
                    $node.trigger('change');

                    spy.getCall(0).args[1].should.eql({stuff: 5});
                });
            });
        });
    });
}());
