var domManager = require('src/dom/dom-manager');
var utils = require('../../../testing-utils');

describe('No-op attributes', function () {
    it('should not do anything for f-model', function () {
        const channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-model="apple" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            return channel.publish({ apple: 'sauce' }).then(()=> {
                should.not.exist($node.prop('model'));
            });
        });
    });
    it('should not do anything for f-convert', function () {
        const channel = utils.createDummyChannel();
        return utils.initWithNode('<input type="text" data-f-convert="apple" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
            return channel.publish({ apple: 'sauce' }).then(()=> {
                should.not.exist($node.prop('convert'));
            });
        });
    });
});
