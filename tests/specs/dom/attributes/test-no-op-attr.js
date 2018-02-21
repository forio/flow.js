import { initWithNode, createDummyChannel } from 'tests/testing-utils';
import domManager from 'src/dom/dom-manager';

describe('No-op attributes', function () {
    it('should not do anything for f-model', function () {
        const channel = createDummyChannel();
        return initWithNode('<input type="text" data-f-model="apple" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            return channel.publish({ apple: 'sauce' }).then(()=> {
                should.not.exist($node.prop('model'));
            });
        });
    });
    it('should not do anything for f-convert', function () {
        const channel = createDummyChannel();
        return initWithNode('<input type="text" data-f-convert="apple" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            return channel.publish({ apple: 'sauce' }).then(()=> {
                should.not.exist($node.prop('convert'));
            });
        });
    });
});
