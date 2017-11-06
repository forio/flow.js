var utils = require('../../../testing-utils');
var domManager = require('src/dom/dom-manager');

describe(':radio', function () {
    describe('input handlers', function () {
        it('should trigger the right event on ui change', function () {
            var nodes = [
                '<input type="radio" name="a" id="x" data-f-bind="stuff" value="1" checked/>',
                '<input type="radio" name="a" id="y" data-f-bind="stuff" value="2"/>'
            ].join('');
            return utils.initWithNode(nodes, domManager).then(function ($node) {
                var $node1 = $node.filter('#x');
                var $node2 = $node.filter('#y');

                var spy = utils.spyOnNode($node1);
                utils.spyOnNode($node2, spy);

                $node1.trigger('change');
                spy.should.have.been.calledOnce;
            });
        });

        describe('On Check', function () {
            it('should pass the right value on check', function () {
                var channel = utils.createDummyChannel();

                var nodes = [
                    '<input type="radio" name="a" id="x" data-f-bind="stuff" value="8"/>',
                    '<input type="radio" name="a" id="y" data-f-bind="stuff" value="2"/>'
                ].join('');
                return utils.initWithNode(nodes, domManager, channel).then(function ($node) {
                    $node = $node.filter('#x');
                    var spy = sinon.spy();
                    $node.on('update.f.ui', spy);

                    $node.prop('checked', true).trigger('change');
                    spy.getCall(0).args[1].should.eql({ stuff: '8' });
                });
            });
        });
        describe('On UnCheck', function () {
            it('should pass the right value on uncheck', function () {
                var channel = utils.createDummyChannel();

                var nodes = [
                    '<input type="radio" name="a" id="x" data-f-bind="stuff" value="8" checked/>',
                    '<input type="radio" name="a" id="y" data-f-bind="stuff" value="2"/>'
                ].join('');
                return utils.initWithNode(nodes, domManager, channel).then(function ($node) {
                    $node = $node.filter('#x');
                    return utils.initWithNode(nodes, domManager, channel).then(function ($othernode) {
                        $othernode = $othernode.filter('#y');

                        var spy = sinon.spy();
                        $othernode.on('update.f.ui', spy);
                        $node.on('update.f.ui', spy);

                        //not entirely sure this is simulating well enough
                        $node.prop('checked', false);
                        $othernode.prop('checked', true).trigger('change');

                        spy.getCall(0).args[1].should.eql({ stuff: '2' });
                        spy.callCount.should.equal(1);
                    });
                });
            });
        });
    });
    describe('Updaters', function () {
        it('should select the right option which matches', function () {
            var channel = utils.createDummyChannel();

            var nodes = [
                '<input type="radio" name="a" id="x" data-f-bind="stuff" value="8"/>',
                '<input type="radio" name="a" id="y" data-f-bind="stuff" value="2"/>'
            ].join('');

            return utils.initWithNode(nodes, domManager, channel).then(function ($nodes) {
                return channel.publish({ stuff: '8' }).then(()=> {
                    $nodes.filter('#x').prop('checked').should.equal(true);
                    $nodes.filter('#y').prop('checked').should.equal(false);
                });
            });
        });

        it('should pick the last item if array', ()=> {
            var channel = utils.createDummyChannel();

            var nodes = [
                '<input type="radio" name="a" id="x" data-f-bind="stuff" value="8"/>',
                '<input type="radio" name="a" id="y" data-f-bind="stuff" value="2"/>'
            ].join('');

            return utils.initWithNode(nodes, domManager, channel).then(function ($nodes) {
                return channel.publish({ stuff: [1, 2, 3, '8'] }).then(()=> {
                    $nodes.filter('#x').prop('checked').should.equal(true);
                    $nodes.filter('#y').prop('checked').should.equal(false);
                });
            });
        });
        it('should not select anything if it doesnt match', function () {
            var channel = utils.createDummyChannel();

            var nodes = [
                '<input type="radio" name="a" id="x" data-f-bind="stuff" value="8"/>',
                '<input type="radio" name="a" id="y" data-f-bind="stuff" value="2"/>'
            ].join('');

            return utils.initWithNode(nodes, domManager, channel).then(function ($nodes) {
                return channel.publish({ stuff: true }).then(()=> {
                    $nodes.filter('#x').prop('checked').should.equal(false);
                    $nodes.filter('#y').prop('checked').should.equal(false);
                });
            });
        });
    });
});
