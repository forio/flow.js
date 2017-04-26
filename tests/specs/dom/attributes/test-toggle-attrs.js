'use strict';
module.exports = (function () {
    var domManager = require('src/dom/dom-manager');
    var utils = require('../../../testing-utils');

    describe('Toggleable Attributes', function () {
        describe('show if', function () {
            it('should show node if condition is true', ()=> {
                return utils.initWithNode('<div data-f-showif="stuff | greaterThan(10)"/></div>', domManager).then(function ($node) {
                    $node.trigger('update.f.model', { stuff: 100 });
                    should.not.exist($node.attr('style'));
                });
            });
            it('should hide node if condition is false', ()=> {
                return utils.initWithNode('<div data-f-showif="stuff | greaterThan(10)"></div>', domManager).then(function ($node) {
                    $node.trigger('update.f.model', { stuff: 1 });
                    $node.is(':visible').should.equal(false);
                });
            });
        });
        describe('hide if', function () {
            it('should show node if condition is true', ()=> {
                return utils.initWithNode('<div data-f-hideif="stuff | greaterThan(10)"/></div>', domManager).then(function ($node) {
                    $node.trigger('update.f.model', { stuff: 1 });
                    should.not.exist($node.attr('style'));
                });
            });
            it('should hide node if condition is false', ()=> {
                return utils.initWithNode('<div data-f-hideif="stuff | greaterThan(10)"></div>', domManager).then(function ($node) {
                    $node.trigger('update.f.model', { stuff: 100 });
                    $node.is(':visible').should.equal(false);
                });
            });
        });
    });
}());
