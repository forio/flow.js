var domManager = require('src/dom/dom-manager');
var utils = require('../../../testing-utils');

describe('Negative Booleans', function () {
    it('should set property to false for truthy values', function () {
        const channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-disabled="canAdvance" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            return channel.publish({ canAdvance: '1' }).then(()=> {
                $node.prop('disabled').should.equal(false);
            });
        });
    });
    it('should set property to true for falsy values', function () {
        const channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-disabled="canAdvance" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            return channel.publish({ canAdvance: 0 }).then(()=> {
                $node.prop('disabled').should.equal(true);
            });
        });
    });
    it('should use the last item if it\'s an array', function () {
        const channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-disabled="canAdvance" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            return channel.publish({ canAdvance: [0, 0, 3] }).then(()=> {
                $node.prop('disabled').should.equal(false);
            });
        });
    });
});
