import { initWithNode, createDummyChannel } from 'tests/testing-utils';
import domManager from 'src/dom/dom-manager';

describe('Positive Booleans', function () {
    it('should set property to false for truthy values', function () {
        const channel = createDummyChannel();
        return initWithNode('<input type="checkbox" data-f-checked="canAdvance" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            channel.publish({ canAdvance: '1' }).then(()=> {
                $node.prop('checked').should.equal(true);
            });
        });
    });
    it('should set property to true for falsy values', function () {
        const channel = createDummyChannel();
        return initWithNode('<input type="checkbox" data-f-checked="canAdvance" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            channel.publish({ canAdvance: 0 }).then(()=> {
                $node.prop('checked').should.equal(false);
            });
        });
    });
    it('should use the last item if it\'s an array', function () {
        const channel = createDummyChannel();
        return initWithNode('<input type="text" data-f-checked="canAdvance" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            channel.publish({ canAdvance: [0, 0, 3] }).then(()=> {
                $node.prop('checked').should.equal(true);
            });
        });
    });
});
