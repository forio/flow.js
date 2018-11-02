import { initWithNode, createDummyChannel, spyOnNode } from 'tests/testing-utils';
import domManager from '../../../../src/dom/dom-manager';

describe('select', function () {
    describe('input handlers', function () {
        it('should trigger the right event on ui change', function () {
            var nodes = [
                '<select data-f-bind="stuff">',
                '<option value="1" selected> A </option>',
                '<option value="2"> B </option>',
                '</select>'
            ].join('');
            const channel = createDummyChannel();
            return initWithNode(nodes, domManager, channel).then(function ($node) {
                var spy = spyOnNode($node);
                $node.trigger('change');
                spy.should.have.been.calledOnce;
            });
        });


        it('should pass the right value on change', function () {
            var channel = createDummyChannel();

            var nodes = [
                '<select data-f-bind="stuff">',
                '<option value="1" selected> A </option>',
                '<option value="B"> B </option>',
                '</select>'
            ].join('');
            return initWithNode(nodes, domManager, channel).then(function ($node) {
                var spy = sinon.spy();
                $node.on('update.f.ui', spy);

                $node.val(1).trigger('change');

                const args = spy.getCall(0).args[1];
                args.data.should.eql([{ name: 'stuff', value: '1' }]);

                $node.val('B').trigger('change');
                const args2 = spy.getCall(1).args[1];
                args2.data.should.eql([{ name: 'stuff', value: 'B' }]);
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
            const channel = createDummyChannel();
            return initWithNode(nodes, domManager, channel).then(function ($node) {
                return channel.publish({ stuff: 1 }).then(()=> {
                    $node.val().should.equal('1');
                });
            });
        });

        it('should not change anything if no match', function () {
            var nodes = [
                '<select data-f-bind="stuff">',
                '<option value="1"> A </option>',
                '<option value="2" selected> B </option>',
                '</select>'
            ].join('');
            const channel = createDummyChannel();
            return initWithNode(nodes, domManager, channel).then(function ($node) {
                return channel.publish({ stuff: true }).then(()=> {
                    expect($node.val()).to.not.exist;
                });
            });
        });
    });
});
