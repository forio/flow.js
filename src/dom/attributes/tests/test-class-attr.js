import { initWithNode, createDummyChannel } from 'tests/testing-utils';
import domManager from 'src/dom/dom-manager';

describe('Classes Integration', function () {
    it('should able to add classes if there are none', function () {
        const channel = createDummyChannel();
        return initWithNode('<input type="text" data-f-class="apple" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            return channel.publish({ apple: 'sauce' }).then(()=> {
                $node.hasClass('sauce').should.equal(true);
            });
        });
    });

    it('should able to append classes some already exist', function () {
        const channel = createDummyChannel();
        return initWithNode('<input type="text" data-f-class="apple" class="exist" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            return channel.publish({ apple: 'sauce' }).then(()=> {
                $node.hasClass('sauce').should.equal(true);
                $node.hasClass('exist').should.equal(true);
            });
        });
    });

    it('should able to change value of existing classes when model value changes', function () {
        const channel = createDummyChannel();
        return initWithNode('<input type="text" data-f-class="apple" class="exist" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            return channel.publish({ apple: 'sauce' }).then(()=> {
                $node.hasClass('sauce').should.equal(true);
                return channel.publish({ apple: 'pie' }).then(()=> {
                    $node.hasClass('sauce').should.equal(false);
                    $node.hasClass('exist').should.equal(true);
                    $node.hasClass('pie').should.equal(true);
                });
            });
        });
    });

    it('should prefix value- if passed in a number', function () {
        const channel = createDummyChannel();
        return initWithNode('<input type="text" data-f-class="data" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            return channel.publish({ data: 2 }).then(()=> {
                $node.hasClass('value-2').should.equal(true);
            });
        });
    });

    it('should use the last item if it\'s an array', function () {
        const channel = createDummyChannel();
        return initWithNode('<input type="text" data-f-class="data" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            return channel.publish({ data: [1, 2, 3] }).then(()=> {
                $node.hasClass('value-3').should.equal(true);
            });
        });
    });
});
