'use strict';
module.exports = (function () {
    var domManager = require('src/dom/dom-manager');
    var utils = require('../../../testing-utils');

    describe('No-op attributes', function () {
        it('should not do anything for f-model', function () {
            return utils.initWithNode('<input type="text" data-f-model="apple" data-f-bind="stuff"/>', domManager).then(function ($node) {
                $node.trigger('update.f.model', { apple: 'sauce' });
                should.not.exist($node.prop('model'));
            });
        });
        it('should not do anything for f-convert', function () {
            return utils.initWithNode('<input type="text" data-f-convert="apple" data-f-bind="stuff"/>', domManager).then(function ($node) {
                $node.trigger('update.f.model', { apple: 'sauce' });
                should.not.exist($node.prop('convert'));
            });
        });
    });
}());
