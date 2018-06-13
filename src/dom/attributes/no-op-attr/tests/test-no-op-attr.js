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
    it('should handle f-convert variants', ()=> {
        const channel = createDummyChannel();
        return initWithNode('<input type="text" data-f-convert-class="greaterThan(3, foo, bar)" data-f-class="apple"/>', domManager, channel).then(function ($node) {
            return channel.publish({ apple: 4 }).then(()=> {
                expect($node.hasClass('foo')).to.equal(true);
                expect($node.hasClass('bar')).to.equal(false);
                return channel.publish({ apple: 2 }).then(()=> {
                    expect($node.hasClass('foo')).to.equal(false);
                    expect($node.hasClass('bar')).to.equal(true);
                });
            });
        });
    });
});
