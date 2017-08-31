var utils = require('../../../testing-utils');
var domManager = require('src/dom/dom-manager');

describe('all dom nodes', function () {
    it('should update itself with values passed in', function () {
        return utils.initWithNode('<div data-f-bind="stuff" value="3"> </div>', domManager).then(function ($node) {
            $node.trigger('update.f.model', { stuff: 5 });
            $node.html().should.equal('5');
        });
    });

    it('should replace existing values', function () {
        return utils.initWithNode('<div data-f-bind="stuff" value="3"> asdasdas </div>', domManager).then(function ($node) {
            $node.trigger('update.f.model', { stuff: 5 });
            $node.html().should.equal('5');
        });
    });
});
