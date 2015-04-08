module.exports = (function () {
    'use strict';
    var domManager = require('src/dom/dom-manager');
    var utils = require('../../../testing-utils');

    describe('Classes', function () {

        it('should able to add classes if there are none', function () {
            var $node = utils.initWithNode('<input type="text" data-f-class="apple" data-f-bind="stuff"/>', domManager);

            $node.trigger('update.f.model', { apple: 'sauce' });
            $node.hasClass('sauce').should.equal(true);
        });

        it('should able to append classes some already exist', function () {
            var $node = utils.initWithNode('<input type="text" data-f-class="apple" class="exist" data-f-bind="stuff"/>', domManager);

            $node.trigger('update.f.model', { apple: 'sauce' });
            $node.hasClass('sauce').should.equal(true);
            $node.hasClass('exist').should.equal(true);
        });

        it('should able to change value of existing classes when model value changes', function () {
            var $node = utils.initWithNode('<input type="text" data-f-class="apple" class="exist" data-f-bind="stuff"/>', domManager);

            $node.trigger('update.f.model', { apple: 'sauce' });
            $node.hasClass('sauce').should.equal(true);

            $node.trigger('update.f.model', { apple: 'pie' });
            $node.hasClass('sauce').should.equal(false);
            $node.hasClass('exist').should.equal(true);
            $node.hasClass('pie').should.equal(true);
        });

        it('should prefix value- if passed in a number', function () {
            var $node = utils.initWithNode('<input type="text" data-f-class="data" data-f-bind="stuff"/>', domManager);

            $node.trigger('update.f.model', { data: 2 });
            $node.hasClass('value-2').should.equal(true);
        });

        it('should use the last item if it\'s an array', function () {
            var $node = utils.initWithNode('<input type="text" data-f-class="data" data-f-bind="stuff"/>', domManager);

            $node.trigger('update.f.model', { data: [1,2,3] });
            $node.hasClass('value-3').should.equal(true);
        });
    });
}());
