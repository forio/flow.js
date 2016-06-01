'use strict';
module.exports = (function () {
    var domManager = require('src/dom/dom-manager');
    var utils = require('../../../testing-utils');
    var config = require('src/config');
    var foreachHandler = require('src/dom/attributes/foreach/default-foreach-attr');

    describe('Default Foreach', function () {
        describe('#handle', function () {
            describe('Arrays', function () {
                it('should clone children for arrays', function () {
                    var $rootNode = $('<ul> <li> </li> </ul>');

                    foreachHandler.handle.call($rootNode, [1, 2, 3, 4]);
                    var newChildren = $rootNode.children();
                    newChildren.length.should.equal(4);
                });
                it('should replace templated data attributes for children', function () {
                    var $rootNode = $('<ul> <li data-stuff="<%=value%>"> </li> </ul>');
                    var targetData = [5, 3, 6, 1];

                    foreachHandler.handle.call($rootNode, targetData);
                    var newChildren = $rootNode.children();
                    newChildren.each(function (index) {
                        var data = $(this).data('stuff');
                        data.should.equal(targetData[index]);
                    });
                });
                it('should support inline conditions in templates', function () {
                    var $rootNode = $('<ul> <li> <%= (index === 0) ? "first" : value %> </li> </ul>');
                    var targetData = [5, 3, 6, 1];
                    var outputdata = ['first', 3, 6, 1];

                    foreachHandler.handle.call($rootNode, targetData);
                    var newChildren = $rootNode.children();
                    newChildren.each(function (index) {
                        var data = $(this).html().trim();
                        data.should.equal(outputdata[index] + '');
                    });
                });
                it('should support block conditions in inline templates', function () {
                    var $rootNode = $('<ul> <li> <% if (index === 0) { %> <%= value %> <% } %> </li> </ul>');
                    var targetData = [5, 3, 6, 1];
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
                    var targetData = [5, 3, 6, 1];

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
                    var targetData = [5, 3, 6, 1];

                    foreachHandler.handle.call($rootNode, targetData);
                    $rootNode.children().length.should.equal(targetData.length + 1);
                });


                it('should replace templated inner html for children', function () {
                    var $rootNode = $('<ul> <li data-stuff="<%=index%>"> <%= value %> </li> </ul>');
                    var targetData = [5, 3, 6, 1];

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

                    var data = [1, 2, 3, 4];
                    foreachHandler.handle.call($rootNode, data);
                    var newChildren = $rootNode.children();

                    for (var i = 0; i < data.length; i++) {
                        $(newChildren[i]).html().should.equal(data[i] + '');
                    }
                });
            });
            describe('Objects', function () {
                it('should clone children for objects', function () {
                    var $rootNode = $('<ul> <li> </li> </ul>');

                    foreachHandler.handle.call($rootNode, { a: 3, b: 4, d: 6 });
                    var newChildren = $rootNode.children();
                    newChildren.length.should.equal(3);
                });
                it('should replace templated inner html for children', function () {
                    var $rootNode = $('<ul> <li data-stuff="<%=key%>"> <%= value %> </li> </ul>');
                    var targetData = { a: 3, b: 4 };

                    foreachHandler.handle.call($rootNode, targetData);
                    var newChildren = $rootNode.children();
                    newChildren.each(function () {
                        var val = $(this).html().trim();
                        var key = $(this).data('stuff');

                        targetData[key].should.equal(+val);
                    });
                });
            });

            describe('Update behavior', function () {
                it('should not grow exponentially when called multiple times', function () {
                    var $rootNode = $('<ul> <li> </li> </ul>');

                    foreachHandler.handle.call($rootNode, [1, 2, 3, 4]);
                    var newChildren = $rootNode.children();
                    newChildren.length.should.equal(4);

                    foreachHandler.handle.call($rootNode, [1, 2, 3, 4]);
                    newChildren = $rootNode.children();
                    newChildren.length.should.equal(4);
                });
                it('should replace older values with new ones', function () {
                    var $rootNode = $('<ul> <li data-stuff="<%=index%>"> <%= value %> </li> </ul>');

                    foreachHandler.handle.call($rootNode, [1, 2, 3, 4]);
                    var targetData = [5, 3, 6, 1];
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

                        var targetData = [5, 3, 6];
                        foreachHandler.handle.call($rootNode, targetData);

                        var newChildren = $rootNode.children();
                        newChildren.size().should.equal(6);
                    });

                    it('should process data attributes for all children', function () {
                        var $rootNode = $('<ul> <li> <%= value %> </li> <li data-stuff="<%= index %>"> <%= value %> </li> </ul>');

                        var targetData = [5, 3, 6];
                        foreachHandler.handle.call($rootNode, targetData);

                        var newChildren = $rootNode.children();
                        newChildren.eq(1).data('stuff').should.equal(0);
                    });
                    it('should process innerhtml for all children', function () {
                        var $rootNode = $('<ul> <li> <%= value %> </li> <li data-stuff="<%= index %>"> <%= index %> </li> </ul>');

                        var targetData = [5, 3, 6];
                        foreachHandler.handle.call($rootNode, targetData);

                        var newChildren = $rootNode.children();
                        newChildren.eq(1).html().trim().should.equal('0');
                        newChildren.eq(2).html().trim().should.equal('3');
                    });
                });
            });
        });

        describe('#parse', function () {
            it('should parse un-aliased syntax', function () {
                var $el = $('<div> </div>');
                var result = foreachHandler.parse.call($el, 'somearray');
                result.should.equal('somearray');
            });
            describe('Key aliases', function () {
                it('should support aliases of form `i in somearray`', function () {
                    var $el = $('<div> </div>');
                    var result = foreachHandler.parse.call($el, 'i in somearray');
                    result.should.equal('somearray');
                });
                it('should support aliases of form `i in somearray` with irregular spaces', function () {
                    var $el = $('<div> </div>');
                    var result = foreachHandler.parse.call($el, ' i  in somearray');
                    result.should.equal('somearray');
                });
                it('should set the appropriate value data attr', function () {
                    var $el = $('<div> </div>');
                    foreachHandler.parse.call($el, ' i  in somearray');
                    $el.data(config.attrs.valueAs).should.equal('i');
                });
            });
            describe('key, value aliases', function () {
                it('should support aliases of form `(i,j) in somearray`', function () {
                    var $el = $('<div> </div>');
                    var result = foreachHandler.parse.call($el, '(i,j) in somearray');
                    result.should.equal('somearray');
                });
                it('should support aliases of form `(i,j) in somearray` with irregular spaces', function () {
                    var $el = $('<div> </div>');
                    var result = foreachHandler.parse.call($el, ' ( i, j)  in somearray');
                    result.should.equal('somearray');
                });
                it('should set the appropriate value & key data attr', function () {
                    var $el = $('<div> </div>');
                    foreachHandler.parse.call($el, ' ( i, j)  in somearray');
                    $el.data(config.attrs.keyAs).should.equal('i');
                    $el.data(config.attrs.valueAs).should.equal('j');
                });
            });
        });
        describe('Variable aliasing', function () {
            it('should provide "key" and "value" variables for objects by default', function () {
                var $rootNode = $('<ul> <li> <%= key %> <%= value %> </li> </ul>');

                var targetData = { a: 1 };
                foreachHandler.handle.call($rootNode, targetData);

                var newChildren = $rootNode.children();
                newChildren.eq(0).html().trim().should.equal('a 1');
            });
            it('should provide "index" and "value" variables for arrays by default', function () {
                var $rootNode = $('<ul> <li> <%= index %> <%= value %> </li> </ul>');

                var targetData = [1];
                foreachHandler.handle.call($rootNode, targetData);

                var newChildren = $rootNode.children();
                newChildren.eq(0).html().trim().should.equal('0 1');
            });
            it('should replace \'key\' with value in key-as', function () {
                var $rootNode = $('<ul data-f-foreach-key-as="apples"> <li> <%= apples %> <%= value %> </li> </ul>');

                var targetData = { a: 1 };
                foreachHandler.handle.call($rootNode, targetData);

                var newChildren = $rootNode.children();
                newChildren.eq(0).html().trim().should.equal('a 1');
            });
            it('should replace \'index\' with value in key-as', function () {
                var $rootNode = $('<ul data-f-foreach-key-as="apples"> <li> <%= apples %> <%= value %> </li> </ul>');

                var targetData = [1];
                foreachHandler.handle.call($rootNode, targetData);

                var newChildren = $rootNode.children();
                newChildren.eq(0).html().trim().should.equal('0 1');
            });
            it('should replace \'value\' with value in value-as', function () {
                var $rootNode = $('<ul data-f-foreach-value-as="oranges"> <li> <%= key %> <%= oranges %> </li> </ul>');

                var targetData = { a: 1 };
                foreachHandler.handle.call($rootNode, targetData);

                var newChildren = $rootNode.children();
                newChildren.eq(0).html().trim().should.equal('a 1');
            });
        });

        describe('integration', function () {
            it('should loop through children for elems with foreach=variableArray', function () {
                var targetData = [5, 3, 6, 1];

                var $node = utils.initWithNode('<ul data-f-foreach="somearray"> <li data-stuff="<%=index%>"> <%= value %> </li> </ul>', domManager);
                $node.trigger('update.f.model', { somearray: targetData });

                var newChildren = $node.children();
                var childrenCount = newChildren.size();

                newChildren.each(function (index) {
                    var data = $(this).html().trim();
                    data.should.equal(targetData[index] + '');

                    var indexVal = $(this).data('stuff');
                    indexVal.should.equal(index);
                });

                $node.trigger('update.f.model', { somearray: targetData });
                $node.children().length.should.equal(childrenCount);
            });
            it('should loop through children for elems with foreach=variableObject', function () {
                var targetData = { a: 3, b: 4 };

                var $node = utils.initWithNode('<ul data-f-foreach="someobject"> <li data-stuff="<%=key%>"> <%= value %> </li> </ul>', domManager);
                $node.trigger('update.f.model', { someobject: targetData });

                var newChildren = $node.children();
                var childrenCount = newChildren.size();

                newChildren.each(function () {
                    var val = $(this).html().trim();
                    var key = $(this).data('stuff');

                    targetData[key].should.equal(+val);
                });

                $node.trigger('update.f.model', { someobject: targetData });
                $node.children().length.should.equal(childrenCount);
            });
            it('should support inline functions in templates', function () {
                var targetData = [5, 3, 6, 1];
                var outputdata = ['first', 3, 6, 1];

                var $node = utils.initWithNode('<ul data-f-foreach="somearray"> <li> <%= (index === 0) ? "first" : value %> <%= value %></li> </ul>', domManager);
                $node.trigger('update.f.model', { somearray: targetData });

                var newChildren = $node.children();
                var childrenCount = newChildren.size();
                newChildren.each(function (index) {
                    var data = $(this).html().trim();
                    data.should.equal(outputdata[index] + ' ' + targetData[index]);
                });

                $node.trigger('update.f.model', { somearray: targetData });
                $node.children().length.should.equal(childrenCount);

            });

            describe('Nested Loops', function () {
                it('should support nested loops', function () {
                    var targetData = [5, 3, 6, 1];
                    var targetData2 = [5, 3];

                    var $node = utils.initWithNode('<ul data-f-foreach="somearray">  <li data-f-foreach="somethingElse"> <span> </span> </li></ul>', domManager);
                    $node.trigger('update.f.model', { somearray: targetData });
                    $node.children().length.should.equal(targetData.length);

                    domManager.bindAll();
                    $node.find('li').trigger('update.f.model', { somethingElse: targetData2 });

                    $node.children().each(function (index, el) {
                        $(el).children().length.should.equal(targetData2.length);
                    });

                });

                it('should support nested loops with aliases', function () {
                    var targetData = [1, 2];
                    var targetData2 = [3, 4];

                    var $node = utils.initWithNode('<ul data-f-foreach="v1 in somearray">  <li data-f-foreach="v2 in somethingElse">  <%= v1 %> <%= v2 %>  </li></ul>', domManager);
                    $node.trigger('update.f.model', { somearray: targetData });
                    
                    domManager.bindAll();
                    $node.find('li').trigger('update.f.model', { somethingElse: targetData2 });

                    $node.children().each(function (index1, el) {
                        $(el).children().each(function (index2, el2) {
                            $(el).html().trim().should.equal(targetData[index1] + ' ' + targetData2[index2]);
                        });
                    });
                });

                it('should support inline templates with multi variables', function () {
                    var targetData = [1, 3];
                    var targetData2 = [2, 4];

                    var html = '<ul data-f-foreach="v1 in somearray"><li data-f-foreach="v2 in somethingElse"><%= (v1 > v2 ) ? "greater" : "smaller"%></li></ul>';
                    var $node = utils.initWithNode(html, domManager);
                    $node.trigger('update.f.model', { somearray: targetData });
                    
                    domManager.bindAll();
                    $node.find('li').trigger('update.f.model', { somethingElse: targetData2 });
                    
                    var op = ['smaller', 'smaller', 'greater', 'smaller'];
                    $node.children().each(function (index1, el) {
                        $(el).children().each(function (index2, el2) {
                            var i = index1 + index2;
                            $(el).html().trim().should.equal(op[i]);
                        });
                    });
                });

                it('should support nested loops with partial aliases', function () {
                    var targetData = [1, 2];
                    var targetData2 = [3, 4];

                    var $node = utils.initWithNode('<ul data-f-foreach="v1 in somearray">  <li data-f-foreach="somethingElse">  <%= v1 %> <%= value %>  </li></ul>', domManager);
                    $node.trigger('update.f.model', { somearray: targetData });
                    
                    domManager.bindAll();
                    $node.find('li').trigger('update.f.model', { somethingElse: targetData2 });

                    $node.children().each(function (index1, el) {
                        $(el).children().each(function (index2, el2) {
                            $(el2).html().trim().should.equal(targetData[index1] + ' ' + targetData2[index2]);
                        });
                    });
                });

                it('should support nested loops with siblings', function () {
                    var targetData = [1, 2];
                    var targetData2 = [3, 4];
                    var targetData3 = [5, 6];

                    var $node = utils.initWithNode('<ul class="p" data-f-foreach="v1 in somearray"> <li>'
                        + '<ul class="ul1" data-f-foreach="v2 in somethingElse"> <li> <%= v1 %> <%= v2 %></li></ul>'
                        + '<ul class="ul2" data-f-foreach="v3 in somethingElse2"> <li> <%= v1 %> <%= v3 %></li></ul>'
                        + '</li></ul>', domManager);
                    $node.trigger('update.f.model', { somearray: targetData });
                    
                    domManager.bindAll();
                    $node.find('.ul1').trigger('update.f.model', { somethingElse: targetData2 });

                    domManager.bindAll();
                    $node.find('.ul2').trigger('update.f.model', { somethingElse2: targetData3 });

                    $node.find('.p').each(function (index1, el) {
                        $(el).find('ul').eq(0).each(function (index2, el2) {
                            $(el2).html().trim().should.equal(targetData[index1] + ' ' + targetData2[index2]);
                        });
                        $(el).find('ul').eq(1).each(function (index2, el2) {
                            $(el2).html().trim().should.equal(targetData[index1] + ' ' + targetData3[index2]);
                        });
                    });
                });
                it('should not be confused by siblings sharing same alias', function () {
                    var targetData = [1, 2];
                    var targetData2 = [3, 4];
                    var targetData3 = [5, 6];

                    var $node = utils.initWithNode('<ul class="p" data-f-foreach="v1 in somearray"> <li>'
                        + '<ul class="ul1" data-f-foreach="v2 in somethingElse"> <li> <%= v1 %> <%= v2 %></li></ul>'
                        + '<ul class="ul2" data-f-foreach="v2 in somethingElse2"> <li> <%= v1 %> <%= v2 %></li></ul>'
                        + '</li></ul>', domManager);
                    $node.trigger('update.f.model', { somearray: targetData });
                    
                    domManager.bindAll();
                    $node.find('.ul1').trigger('update.f.model', { somethingElse: targetData2 });

                    domManager.bindAll();
                    $node.find('.ul2').trigger('update.f.model', { somethingElse2: targetData3 });

                    $node.find('.p').each(function (index1, el) {
                        $(el).find('ul').eq(0).each(function (index2, el2) {
                            $(el2).html().trim().should.equal(targetData[index1] + ' ' + targetData2[index2]);
                        });
                        $(el).find('ul').eq(1).each(function (index2, el2) {
                            $(el2).html().trim().should.equal(targetData[index1] + ' ' + targetData3[index2]);
                        });
                    });
                });
            });
        });
    });
}());
