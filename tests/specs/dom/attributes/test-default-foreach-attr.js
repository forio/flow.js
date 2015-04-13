module.exports = (function () {
    'use strict';
    var domManager = require('src/dom/dom-manager');
    var utils = require('../../../testing-utils');

    var foreachHandler = require('src/dom/attributes/foreach/default-foreach-attr');

    describe('Default Foreach', function () {
        describe('#handle', function () {
            describe('Arrays', function () {
                it('should clone children for arrays', function () {
                    var $rootNode = $('<ul> <li> </li> </ul>');

                    foreachHandler.handle.call($rootNode, [1,2,3,4]);
                    var newChildren = $rootNode.children();
                    newChildren.length.should.equal(4);
                });
                it('should replace templated data attributes for children', function () {
                    var $rootNode = $('<ul> <li data-stuff="<%=value%>"> </li> </ul>');
                    var targetData = [5,3,6,1];

                    foreachHandler.handle.call($rootNode, targetData);
                    var newChildren = $rootNode.children();
                    newChildren.each(function (index) {
                       var data = $(this).data('stuff');
                       data.should.equal(targetData[index] + '');
                    });
                });

                it('should replace templated inner html for children', function () {
                    var $rootNode = $('<ul> <li data-stuff="<%=index%>"> <%= value %> </li> </ul>');
                    var targetData = [5,3,6,1];

                    foreachHandler.handle.call($rootNode, targetData);
                    var newChildren = $rootNode.children();
                    newChildren.each(function (index) {
                       var data = $(this).html().trim();
                       data.should.equal(targetData[index] + '');

                       var indexVal = $(this).data('stuff');
                       indexVal.should.equal(index + '');
                    });
                });
                it('should treat single values as arrays with 1 iteam', function () {
                    var $rootNode = $('<ul> <li data-value="<%= value %>"> </li> </ul>');

                    foreachHandler.handle.call($rootNode, 3);
                    var newChildren = $rootNode.children();
                    newChildren.length.should.equal(1);

                    newChildren.data('value').should.equal('3');
                });
                it('should print out undefineds when passed those in', function () {
                    var $rootNode = $('<ul> <li data-value="<%= value %>"> </li> </ul>');

                    foreachHandler.handle.call($rootNode, undefined);
                    var newChildren = $rootNode.children();
                    newChildren.length.should.equal(1);

                    newChildren.data('value').should.equal('undefined');
                });
            });
            describe('Objects', function () {
                it('should clone children for objects', function () {
                    var $rootNode = $('<ul> <li> </li> </ul>');

                    foreachHandler.handle.call($rootNode, { a:3, b:4, d:6 });
                    var newChildren = $rootNode.children();
                    newChildren.length.should.equal(3);
                });
                it('should replace templated inner html for children', function () {
                    var $rootNode = $('<ul> <li data-stuff="<%=key%>"> <%= value %> </li> </ul>');
                    var targetData = { a:3, b:4 };

                    foreachHandler.handle.call($rootNode, targetData);
                    var newChildren = $rootNode.children();
                    newChildren.each(function (index) {
                       var val = $(this).html().trim();
                       var key = $(this).data('stuff');

                       targetData[key].should.equal(+val);
                    });
                });
            });

            describe('Update behavior', function () {
                it('should not grow exponentially when called multiple times', function () {
                    var $rootNode = $('<ul> <li> </li> </ul>');

                    foreachHandler.handle.call($rootNode, [1,2,3,4]);
                    var newChildren = $rootNode.children();
                    newChildren.length.should.equal(4);

                    foreachHandler.handle.call($rootNode, [1,2,3,4]);
                    newChildren = $rootNode.children();
                    newChildren.length.should.equal(4);
                });
                it('should replace older values with new ones', function () {
                    var $rootNode = $('<ul> <li data-stuff="<%=index%>"> <%= value %> </li> </ul>');

                    foreachHandler.handle.call($rootNode, [1,2,3,4]);
                    var targetData = [5,3,6,1];
                    foreachHandler.handle.call($rootNode, targetData);

                    var newChildren = $rootNode.children();
                    newChildren.each(function (index) {
                       var data = $(this).html().trim();
                       data.should.equal(targetData[index] + '');

                       var indexVal = $(this).data('stuff');
                       indexVal.should.equal(index + '');
                    });
                });
            });
        });
        describe('integration', function () {
            it('should loop through children for elems with foreach=variableArray', function () {
                var targetData = [5,3,6,1];

                var $node = utils.initWithNode('<ul data-f-foreach="somearray"> <li data-stuff="<%=index%>"> <%= value %> </li> </ul>', domManager);
                $node.trigger('update.f.model', { somearray: targetData });

                var newChildren = $node.children();
                newChildren.each(function (index) {
                   var data = $(this).html().trim();
                   data.should.equal(targetData[index] + '');

                   var indexVal = $(this).data('stuff');
                   indexVal.should.equal(index + '');
                });
            });
            it('should loop through children for elems with foreach=variableObject', function () {
                var targetData = { a:3, b:4 };

                var $node = utils.initWithNode('<ul data-f-foreach="someobject"> <li data-stuff="<%=index%>"> <%= value %> </li> </ul>', domManager);
                $node.trigger('update.f.model', { someobject: targetData });

                var newChildren = $node.children();
                newChildren.each(function (index) {
                   var val = $(this).html().trim();
                   var key = $(this).data('stuff');

                   targetData[key].should.equal(+val);
                });
            });
        });
    });
}());
