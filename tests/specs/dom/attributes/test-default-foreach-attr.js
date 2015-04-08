module.exports = (function () {
    'use strict';
    // var domManager = require('src/dom/dom-manager');
    // var utils = require('../../../testing-utils');

    var foreachHandler = require('src/dom/attributes/foreach/default-foreach-attr');

    describe('Default Foreach', function () {
        describe('Arrays', function () {
            it('should clone itself for arrays and attach to parent', function () {
                var $rootNode = $('<ul> <li> </li> </ul>');

                foreachHandler.handle.call($rootNode.find('li:first'), [1,2,3,4]);
                var newChildren = $rootNode.children();
                newChildren.length.should.equal(4);
            });
        });
    });
}());
