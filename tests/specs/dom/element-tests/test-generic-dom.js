import { initWithNode, createDummyChannel } from 'tests/testing-utils';
import domManager from 'src/dom/dom-manager';

describe('all dom nodes', function () {
    it('should update itself with values passed in', function () {
        const channel = createDummyChannel();
        return initWithNode('<div data-f-bind="stuff" value="3"> </div>', domManager, channel).then(function ($node) {
            return channel.publish({ stuff: 5 }).then(()=> {
                $node.html().should.equal('5');
            });
        });
    });

    it('should replace existing values', function () {
        const channel = createDummyChannel();
        return initWithNode('<div data-f-bind="stuff" value="3"> asdasdas </div>', domManager, channel).then(function ($node) {
            return channel.publish({ stuff: 5 }).then(()=> {
                $node.html().should.equal('5');
            });
        });
    });
});
