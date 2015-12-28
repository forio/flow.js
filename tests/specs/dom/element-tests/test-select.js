'use strict';
module.exports = (function () {
    var utils = require('../../../testing-utils');
    var domManager = require('src/dom/dom-manager');

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
                $node.trigger('change');
                spy.should.have.been.called.once;
            });


            it('should pass the right value on change', function () {
                var channel = utils.createDummyChannel();

                var nodes = [
                    '<select data-f-bind="stuff">',
                    '<option value="1" selected> A </option>',
                    '<option value="B"> B </option>',
                    '</select>'
                ].join('');
                var $node = utils.initWithNode(nodes, domManager, channel);
                var spy = sinon.spy();
                $node.on('update.f.ui', spy);

                $node.val(1).trigger('change');
                spy.getCall(0).args[1].should.eql({ stuff: '1' });

                $node.val('B').trigger('change');
                spy.getCall(1).args[1].should.eql({ stuff: 'B' });
            });
        });
        describe('updaters', function () {
            it('should select the right value on match', function () {

                var nodes = [
                    '<select data-f-bind="stuff">',
                    '<option value="1"> A </option>',
                    '<option value="2"> B </option>',
                    '</select>'
                ].join('');
                var $node = utils.initWithNode(nodes, domManager);
                $node.trigger('update.f.model', { stuff: 1 });

                $node.val().should.equal('1');
            });

            it('should not change anything if no match', function () {
                var nodes = [
                    '<select data-f-bind="stuff">',
                    '<option value="1"> A </option>',
                    '<option value="2" selected> B </option>',
                    '</select>'
                ].join('');
                var $node = utils.initWithNode(nodes, domManager);
                $node.trigger('update.f.model', { stuff: true });
                should.not.exist($node.val());
            });
        });
    });
}());
