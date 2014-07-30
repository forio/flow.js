module.exports = (function() {
    'use strict';
    var utils = require('../../../testing-utils');
    var domManager = require('../../../../src/dom/dom-manager');

    describe('select', function () {
        describe('input handlers', function () {
            it('should trigger the right event on ui change', function () {
                var nodes = [
                    '<select data-f-bind="stuff">',
                    '<option value="1" selected> A </option>',
                    '<option value="2"> B </option>',
                    '</select>'
                ].join('');
                var $node = utils.initWithNode(nodes, domManager);

                var spy = utils.spyOnNode($node);
                $node.trigger('change')
                ;
                spy.should.have.been.called.once;
            });


            it('should pass the right value on change', function () {
                var nodes = [
                    '<select data-f-bind="stuff">',
                    '<option value="1" selected> A </option>',
                    '<option value="2"> B </option>',
                    '</select>'
                ].join('');
                var $node = utils.initWithNode(nodes, domManager);

                var spy = utils.spyOnNode($node);
                $node.val(2);
                $node.trigger('change');

                spy.getCall(0).args[1].should.eql({
                    stuff: '2'
                });
            });
        });
    });
}());
