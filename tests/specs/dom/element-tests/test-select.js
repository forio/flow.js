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
        describe('updaters', function () {
            it('should select the right value on match', function () {
                var nodes = [
                    '<select data-f-bind="stuff">',
                    '<option value="1"> A </option>',
                    '<option value="2"> B </option>',
                    '</select>'
                ].join('');
                var $node = utils.initWithNode(nodes, domManager);
                $node.trigger('update.f.model', {stuff: 1});

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
                $node.trigger('update.f.model', {stuff: true});
                //NOTE: what should the right behavior be? right now node.val is null
                // console.log($node.val(), $node);
                // $node.val().should.equal('2');
            });
        });
    });
}());
