module.exports = (function() {
    'use strict';
    var domManager = require('../../../../src/dom/dom-manager');
    var utils = require('../../../testing-utils');

    describe('Classes', function () {
        it('should able to add classes if there are none', function () {
            var $node = utils.initWithNode('<input type="text" data-f-class="apple" data-f-bind="stuff"/>', domManager);

            $node.trigger('update.f.model', {apple: 'sauce'});
            $node.hasClass('sauce').should.equal(true);
        });
    });
}());
