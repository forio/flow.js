module.exports = (function() {
    'use strict';
    var utils = require('../../../testing-utils');
    var domManager = require('../../../../src/dom/dom-manager');

    describe(':radio', function () {
        describe('input handlers', function () {
            it('should trigger the right event on ui change', function () {
                var nodes = [
                    '<input type="radio" name="a" id="x" data-f-bind="stuff" value="1" checked/>',
                    '<input type="radio" name="a" id="y" data-f-bind="stuff" value="2"/>'
                ].join('');
                var $node1 = utils.initWithNode(nodes, domManager).filter('#x');
                var $node2 = utils.initWithNode(nodes, domManager).filter('#y');

                var spy = utils.spyOnNode($node1);
                utils.spyOnNode($node2, spy);

                $node1.trigger('change');
                spy.should.have.been.called.once;
            });

            describe('On Check', function () {
                it('should pass the right value on check', function () {
                    var nodes = [
                        '<input type="radio" name="a" id="x" data-f-bind="stuff" value="8"/>',
                        '<input type="radio" name="a" id="y" data-f-bind="stuff" value="2"/>'
                    ].join('');
                    var $node = utils.initWithNode(nodes, domManager).filter('#x');

                    var spy = utils.spyOnNode($node);
                    $node.prop('checked', true);
                    $node.trigger('change');

                    spy.getCall(0).args[1].should.eql({stuff: '8'});
                });
            });
            describe('On UnCheck', function () {
                it('should pass the right value on uncheck', function () {
                    var nodes = [
                        '<input type="radio" name="a" id="x" data-f-bind="stuff" value="8" checked/>',
                        '<input type="radio" name="a" id="y" data-f-bind="stuff" value="2"/>'
                    ].join('');
                    var $node = utils.initWithNode(nodes, domManager).filter('#x');
                    var $othernode = utils.initWithNode(nodes, domManager).filter('#y');

                    //not entirely sure this is simulating well enough
                    var spy = utils.spyOnNode($othernode);
                    $node.prop('checked', false);
                    $othernode.prop('checked', true);

                    $othernode.trigger('change');

                    spy.getCall(0).args[1].should.eql({stuff: '2'});
                });
            });
        });
        describe('Updaters', function () {
            it('should select the right option which matches', function () {
                var nodes = [
                    '<input type="radio" name="a" id="x" data-f-bind="stuff" value="8"/>',
                    '<input type="radio" name="a" id="y" data-f-bind="stuff" value="2"/>'
                ].join('');

                var $nodes = utils.initWithNode(nodes, domManager);
                $nodes.trigger('update.f.model', {stuff: '8'});

                $nodes.filter('#x').prop('checked').should.equal(true);
                $nodes.filter('#y').prop('checked').should.equal(false);
            });

            it('should not select anything if it doesnt match', function () {
                var nodes = [
                    '<input type="radio" name="a" id="x" data-f-bind="stuff" value="8"/>',
                    '<input type="radio" name="a" id="y" data-f-bind="stuff" value="2"/>'
                ].join('');

                var $nodes = utils.initWithNode(nodes, domManager);
                $nodes.trigger('update.f.model', {stuff: true});

                $nodes.filter('#x').prop('checked').should.equal(false);
                $nodes.filter('#y').prop('checked').should.equal(false);
            });
        });
    });
}());
