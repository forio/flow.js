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
                       data.should.equal(targetData[index]);
                    });
                });
                it('should support inline conditions in templates', function () {
                    var $rootNode = $('<ul> <li> <%= (index === 0) ? "first" : value %> </li> </ul>');
                    var targetData = [5,3,6,1];
                    var outputdata = ['first',3,6,1];

                    foreachHandler.handle.call($rootNode, targetData);
                    var newChildren = $rootNode.children();
                    newChildren.each(function (index) {
                       var data = $(this).html().trim();
                       data.should.equal(outputdata[index] + '');
                    });
                });
                it('should support block conditions in inline templates', function () {
                    var $rootNode = $('<ul> <li> <% if (index === 0) { %> <%= value %> <% } %> </li> </ul>');
                    var targetData = [5,3,6,1];
                    var outputdata = [5, '', '', ''];

                    foreachHandler.handle.call($rootNode, targetData);
                    var newChildren = $rootNode.children();
                    newChildren.each(function (index) {
                       var data = $(this).html().trim();
                       data.should.equal(outputdata[index] + '');
                    });
                });
                it('should support block conditions in templates with multi children', function () {
                    var $rootNode = $('<ul> <li> <% if (index === 0) { %> <span> HI </span> <% } %>  <span> <%= value %> </span> </li> </ul>');
                    var targetData = [5,3,6,1];

                    foreachHandler.handle.call($rootNode, targetData);
                    var newChildren = $rootNode.children();
                    newChildren.each(function (index, el) {
                        if (index === 0) {
                            $(el).children().length.should.equal(2);
                        } else {
                            $(el).children().length.should.equal(1);
                        }
                    });
                });
                it.skip('should support block conditions in templates with top-level children', function () {
                    var $rootNode = $('<ul> <% if (index === 0) { %> <li> HI </li> <% } %>  <li> <%= value %> </li> </ul>');
                    var targetData = [5,3,6,1];

                    foreachHandler.handle.call($rootNode, targetData);
                    $rootNode.children().length.should.equal(targetData.length + 1);
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
                       indexVal.should.equal(index);
                    });
                });
                it('should treat single values as arrays with 1 iteam', function () {
                    var $rootNode = $('<ul> <li data-value="<%= value %>"> </li> </ul>');

                    foreachHandler.handle.call($rootNode, 3);
                    var newChildren = $rootNode.children();
                    newChildren.length.should.equal(1);

                    newChildren.data('value').should.equal(3);
                });
                it('should print out undefineds in html when passed nothing in', function () {
                    var $rootNode = $('<ul> <li data-value="<%= value %>"> <%= value %></li> </ul>');

                    foreachHandler.handle.call($rootNode, undefined);
                    var newChildren = $rootNode.children();
                    newChildren.length.should.equal(1);

                    newChildren.html().trim().should.equal('undefined');
                });
                it('should set data to blank when passed nothing in', function () {
                    var $rootNode = $('<ul> <li data-value="<%= value %>"> <%= value %></li> </ul>');

                    foreachHandler.handle.call($rootNode, undefined);
                    var newChildren = $rootNode.children();
                    newChildren.length.should.equal(1);

                    newChildren.data('value').should.equal('');
                });

                it('should put the value inside the element if it`s not templated', function () {
                    var $rootNode = $('<ul> <li> </li> </ul>');

                    var data = [1,2,3,4];
                    foreachHandler.handle.call($rootNode, data);
                    var newChildren = $rootNode.children();

                    for (var i = 0; i< data.length; i++) {
                        $(newChildren[i]).html().should.equal(data[i] + '');
                    }
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
                       indexVal.should.equal(index);
                    });
                });
                describe('Multiple children', function () {
                    it('should append the right number for children for templates with multiple children', function () {
                        var $rootNode = $('<ul> <li> <%= value %> </li> <li data-stuff="<%= index %>"> <%= value %> </li> </ul>');

                        var targetData = [5,3,6];
                        foreachHandler.handle.call($rootNode, targetData);

                        var newChildren = $rootNode.children();
                        newChildren.size().should.equal(6);
                    });

                    it('should process data attributes for all children', function () {
                        var $rootNode = $('<ul> <li> <%= value %> </li> <li data-stuff="<%= index %>"> <%= value %> </li> </ul>');

                        var targetData = [5,3,6];
                        foreachHandler.handle.call($rootNode, targetData);

                        var newChildren = $rootNode.children();
                        newChildren.eq(1).data('stuff').should.equal(0);
                    });
                    it('should process innerhtml for all children', function () {
                        var $rootNode = $('<ul> <li> <%= value %> </li> <li data-stuff="<%= index %>"> <%= index %> </li> </ul>');

                        var targetData = [5,3,6];
                        foreachHandler.handle.call($rootNode, targetData);

                        var newChildren = $rootNode.children();
                        newChildren.eq(1).html().trim().should.equal('0');
                        newChildren.eq(2).html().trim().should.equal('3');
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
                   indexVal.should.equal(index);
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
            it('should support inline functions in templates', function () {
                var targetData = [5,3,6,1];
                var outputdata = ['first',3,6,1];

                var $node = utils.initWithNode('<ul data-f-foreach="somearray"> <li> <%= (index === 0) ? "first" : value %> <%= value %></li> </ul>', domManager);
                $node.trigger('update.f.model', { somearray: targetData });

                var newChildren = $node.children();
                newChildren.each(function (index) {
                   var data = $(this).html().trim();
                   data.should.equal(outputdata[index] + ' ' + targetData[index]);
                });
            });

            it.skip('should loop itself if there are no children', function () {
                var targetData = [5,3,6,1];

                var $node = utils.initWithNode('<ul> <li data-f-foreach="somearray"> </li> </ul>', domManager);
                $node.find('li').trigger('update.f.model', { somearray: targetData });

                var newChildren = $node.children();
                newChildren.each(function (index) {
                   var data = $(this).html().trim();
                   data.should.equal(targetData[index] + '');
                });
            });
        });
    });
}());
