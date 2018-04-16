import { initWithNode, createDummyChannel } from 'tests/testing-utils';
import domManager from 'src/dom/dom-manager';

describe('show if', function () {
    it('should hide node by default', ()=> {
        return initWithNode('<div data-f-showif="stuff"/></div>', domManager).then(function ($node) {
            $node.is(':visible').should.equal(false);
        });
    });
    it('should show node if condition is true', ()=> {
        const channel = createDummyChannel();
        return initWithNode('<div data-f-showif="stuff"/></div>', domManager, channel).then(function ($node) {
            return channel.publish({ stuff: true }).then(()=> {
                $node.attr('style').should.equal('');
            });
        });
    });
    it('should show if condition is truthy', ()=> {
        const channel = createDummyChannel();
        return initWithNode('<div data-f-showif="stuff"/></div>', domManager, channel).then(function ($node) {
            return channel.publish({ stuff: 'foobar' }).then(()=> {
                $node.attr('style').should.equal('');
            });
        });
    });
    it('should hide node if condition is false', ()=> {
        const channel = createDummyChannel();
        return initWithNode('<div data-f-showif="stuff"></div>', domManager, channel).then(function ($node) {
            return channel.publish({ stuff: false }).then(()=> {
                $node.is(':visible').should.equal(false);
            });
        });
    });
    it('should hide node if condition is falsy', ()=> {
        const channel = createDummyChannel();
        return initWithNode('<div data-f-showif="stuff"></div>', domManager, channel).then(function ($node) {
            return channel.publish({ stuff: '' }).then(()=> {
                $node.is(':visible').should.equal(false);
            });
        });
    });
});
