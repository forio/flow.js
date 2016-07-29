'use strict';
module.exports = (function () {
    var domManager = require('src/dom/dom-manager');
    var utils = require('../../../testing-utils');

    describe('Positive Booleans', function () {
        it('should set property to false for truthy values', function () {
            utils.initWithNode('<input type="checkbox" data-f-checked="canAdvance" data-f-bind="stuff"/>', domManager).then(function ($node) {
                $node.trigger('update.f.model', { canAdvance: '1' });
                $node.prop('checked').should.equal(true);
            });
        });
        it('should set property to true for falsy values', function () {
            utils.initWithNode('<input type="checkbox" data-f-checked="canAdvance" data-f-bind="stuff"/>', domManager).then(function ($node) {
                $node.trigger('update.f.model', { canAdvance: 0 });
                $node.prop('checked').should.equal(false);
            });
        });
        it('should use the last item if it\'s an array', function () {
            utils.initWithNode('<input type="text" data-f-checked="canAdvance" data-f-bind="stuff"/>', domManager).then(function ($node) {
                $node.trigger('update.f.model', { canAdvance: [0, 0, 3] });
                $node.prop('checked').should.equal(true);
            });
        });
    });
}());
