var domManager = require('src/dom/dom-manager');
var utils = require('../../../testing-utils');

describe('Default Attributes', function () {
    it('should copy attributes for anything it doesn\'t understand', function () {
        const channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-fruit="apple" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            return channel.publish({ apple: 'sauce' }).then(()=> {
                $node.prop('fruit').should.equal('sauce');
            });
        });
    });

    it('should copy attributes as arrays for arrays', function () {
        const channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-fruit="apple" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            return channel.publish({ apple: [1, 2, 3] }).then(()=> {
                $node.prop('fruit').should.eql([1, 2, 3]);
            });
        });
    });
});
