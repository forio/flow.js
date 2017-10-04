var domManager = require('src/dom/dom-manager');
var utils = require('../../../testing-utils');

describe('Default Attributes', function () {
    it('should copy attributes for anything it doesn\'t understand', function () {
        return utils.initWithNode('<input type="text" data-f-fruit="apple" data-f-bind="stuff"/>', domManager).then(function ($node) {
            $node.trigger('update.f.model', { apple: 'sauce' });
            $node.prop('fruit').should.equal('sauce');
        });
    });

    it('should copy attributes as arrays for arrays', function () {
        return utils.initWithNode('<input type="text" data-f-fruit="apple" data-f-bind="stuff"/>', domManager).then(function ($node) {
            $node.trigger('update.f.model', { apple: [1, 2, 3] });
            $node.prop('fruit').should.eql([1, 2, 3]);
        });
    });
});
