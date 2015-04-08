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
            it('should replace templated data attributes', function () {
                var $rootNode = $('<ul> <li data-stuff="<%=i%>" data-y="4"> </li> </ul>');
                var targetData = [5,3,6,1];

                foreachHandler.handle.call($rootNode.find('li:first'), targetData);
                var newChildren = $rootNode.children();
                newChildren.each(function (index) {
                   var data = $(this).data('stuff');
                   data.should.equal(targetData[index] + '');
                });
            });
        });
    });
}());
