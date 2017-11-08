'use strict';
module.exports = (function () {
    var domManager = require('src/dom/dom-manager');
    var utils = require('../../../testing-utils');

    describe('Toggleable Attributes', function () {
        describe('show if', function () {
            it('should hide node by default', ()=> {
                return utils.initWithNode('<div data-f-showif="stuff | greaterThan(10)"/></div>', domManager).then(function ($node) {
                    $node.is(':visible').should.equal(false);
                });
            });
            it('should show node if condition is true', ()=> {
                const channel = utils.createDummyChannel();
                return utils.initWithNode('<div data-f-showif="stuff | greaterThan(10)"/></div>', domManager, channel).then(function ($node) {
                    return channel.publish({ stuff: 100 }).then(()=> {
                        $node.attr('style').should.equal('');
                    });
                });
            });
            it('should hide node if condition is false', ()=> {
                const channel = utils.createDummyChannel();
                return utils.initWithNode('<div data-f-showif="stuff | greaterThan(10)"></div>', domManager, channel).then(function ($node) {
                    return channel.publish({ stuff: 1 }).then(()=> {
                        $node.is(':visible').should.equal(false);
                    });
                });
            });
        });
        describe('hide if', function () {
            it('should hide node by default', ()=> {
                return utils.initWithNode('<div data-f-hideif="stuff | greaterThan(10)"/></div>', domManager).then(function ($node) {
                    $node.is(':visible').should.equal(false);
                });
            });
            it('should show node if condition is true', ()=> {
                const channel = utils.createDummyChannel();
                return utils.initWithNode('<div data-f-hideif="stuff | greaterThan(10)"/></div>', domManager, channel).then(function ($node) {
                    return channel.publish({ stuff: 1 }).then(()=> {
                        $node.attr('style').should.equal('');
                    });
                });
            });
            it('should hide node if condition is false', ()=> {
                const channel = utils.createDummyChannel();
                return utils.initWithNode('<div data-f-hideif="stuff | greaterThan(10)"></div>', domManager, channel).then(function ($node) {
                    return channel.publish({ stuff: 100 }).then(()=> {
                        $node.is(':visible').should.equal(false);
                    });
                });
            });
        });
    });
}());
