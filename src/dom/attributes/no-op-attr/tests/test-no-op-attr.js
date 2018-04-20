import { initWithNode, createDummyChannel } from '../../../../../tests/testing-utils';
import domManager from 'dom/dom-manager';
import { expect } from 'chai';


describe('No-op attributes Integration', function () {
    it('should not set props', function () {
        const channel = createDummyChannel();
        return initWithNode('<input type="text" data-f-model="apple" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            return channel.publish({ apple: 'sauce' }).then(()=> {
                expect($node.prop('model')).to.equal(undefined);
            });
        });
    });
});
