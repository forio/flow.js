var utils = require('../../../testing-utils');
var domManager = require('src/dom/dom-manager');

describe('all dom nodes', function () {
    it('should update itself with values passed in', function () {
        const channel = utils.createDummyChannel();
        return utils.initWithNode('<div data-f-bind="stuff" value="3"> </div>', domManager, channel).then(function ($node) {
            return channel.publish({ stuff: 5 }).then(()=> {
                $node.html().should.equal('5');
            });
        });
    });

    it('should replace existing values', function () {
        const channel = utils.createDummyChannel();
        return utils.initWithNode('<div data-f-bind="stuff" value="3"> asdasdas </div>', domManager, channel).then(function ($node) {
            return channel.publish({ stuff: 5 }).then(()=> {
                $node.html().should.equal('5');
            });
        });
    });
});
