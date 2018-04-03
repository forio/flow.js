var config = require('src/config');
var foreachHandler = require('src/dom/attributes/loop-attrs/foreach-attr');

describe('Default Foreach', function () {

    describe('#handle', function () {
        describe('Arrays', function () {

            it('should clone children for arrays', function () {
                var $rootNode = $('<ul> <li> </li> </ul>');

                foreachHandler.handle([1, 2, 3, 4], 'foreach', $rootNode);
                var newChildren = $rootNode.children();
                newChildren.length.should.equal(4);
            });
            it('should replace templated data attributes for children', function () {
                var $rootNode = $('<ul> <li data-stuff="<%=value%>"> </li> </ul>');
                var targetData = [5, 3, 6, 1];

                foreachHandler.handle(targetData, 'foreach', $rootNode);
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

                foreachHandler.handle(targetData, 'foreach', $rootNode);
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

                foreachHandler.handle(targetData, 'foreach', $rootNode);
                var newChildren = $rootNode.children();
                newChildren.each(function (index) {
                    var data = $(this).html().trim();
                    data.should.equal(outputdata[index] + '');
                });
            });
            it('should support block conditions in templates with multi children', function () {
                var $rootNode = $('<ul> <li> <% if (index === 0) { %> <span> HI </span> <% } %>  <span> <%= value %> </span> </li> </ul>');
                var targetData = [5, 3, 6, 1];

                foreachHandler.handle(targetData, 'foreach', $rootNode);
                var newChildren = $rootNode.children();
                newChildren.each(function (index, el) {
                    if (index === 0) {
                        $(el).children().length.should.equal(2);
                    } else {
                        $(el).children().length.should.equal(1);
                    }
                });
            });
            it('should support block conditions in templates with top-level children', function () {
                //Maybe deprecate this syntax?
                var $rootNode = $('<ul> <% if (index === 0) { %> <li> HI </li> <% } %>  <li> <%= value %> </li> </ul>');
                var targetData = [5, 3, 6, 1];

                foreachHandler.handle(targetData, 'foreach', $rootNode);
                $rootNode.children().length.should.equal(targetData.length + 1);
            });


            it('should replace templated inner html for children', function () {
                var $rootNode = $('<ul> <li data-stuff="<%=index%>"> <%= value %> </li> </ul>');
                var targetData = [5, 3, 6, 1];

                foreachHandler.handle(targetData, 'foreach', $rootNode);
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

                foreachHandler.handle(3, 'foreach', $rootNode);
                var newChildren = $rootNode.children();
                newChildren.length.should.equal(1);

                newChildren.data('value').should.equal(3);
            });
            it('should print out undefineds in html when passed nothing in', function () {
                var $rootNode = $('<ul> <li data-value="<%= value %>"> <%= value %></li> </ul>');

                foreachHandler.handle(undefined, 'repeat', $rootNode);
                var newChildren = $rootNode.children();
                newChildren.length.should.equal(1);

                newChildren.html().trim().should.equal('undefined');
            });
            it('should set data to blank when passed nothing in', function () {
                var $rootNode = $('<ul> <li data-value="<%= value %>"> <%= value %></li> </ul>');

                foreachHandler.handle(undefined, 'repeat', $rootNode);
                var newChildren = $rootNode.children();
                newChildren.length.should.equal(1);

                newChildren.data('value').should.equal('');
            });

            it('should put the value inside the element if it`s not templated', function () {
                var $rootNode = $('<ul> <li> </li> </ul>');

                var data = [1, 2, 3, 4];
                foreachHandler.handle(data, 'repeat', $rootNode);
                var newChildren = $rootNode.children();

                for (var i = 0; i < data.length; i++) {
                    $(newChildren[i]).html().should.equal(data[i] + '');
                }
            });
        });
        describe('Objects', function () {
            it('should clone children for objects', function () {
                var $rootNode = $('<ul> <li> </li> </ul>');

                foreachHandler.handle({ a: 3, b: 4, d: 6 }, 'repeat', $rootNode);
                var newChildren = $rootNode.children();
                newChildren.length.should.equal(3);
            });
            it('should replace templated inner html for children', function () {
                var $rootNode = $('<ul> <li data-stuff="<%=key%>"> <%= value %> </li> </ul>');
                var targetData = { a: 3, b: 4 };

                foreachHandler.handle(targetData, 'foreach', $rootNode);
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

                foreachHandler.handle([1, 2, 3, 4], 'foreach', $rootNode);
                var newChildren = $rootNode.children();
                newChildren.length.should.equal(4);

                foreachHandler.handle([1, 2, 3, 4], 'foreach', $rootNode);
                newChildren = $rootNode.children();
                newChildren.length.should.equal(4);
            });
            it('should replace older values with new ones', function () {
                var $rootNode = $('<ul> <li data-stuff="<%=index%>"> <%= value %> </li> </ul>');

                foreachHandler.handle([1, 2, 3, 4], 'foreach', $rootNode);
                var targetData = [5, 3, 6, 1];
                foreachHandler.handle(targetData, 'foreach', $rootNode);

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
                    foreachHandler.handle(targetData, 'foreach', $rootNode);

                    var newChildren = $rootNode.children();
                    newChildren.length.should.equal(6);
                });

                it('should process data attributes for all children', function () {
                    var $rootNode = $('<ul> <li> <%= value %> </li> <li data-stuff="<%= index %>"> <%= value %> </li> </ul>');

                    var targetData = [5, 3, 6];
                    foreachHandler.handle(targetData, 'foreach', $rootNode);

                    var newChildren = $rootNode.children();
                    newChildren.eq(1).data('stuff').should.equal(0);
                });
                it('should process innerhtml for all children', function () {
                    var $rootNode = $('<ul> <li> <%= value %> </li> <li data-stuff="<%= index %>"> <%= index %> </li> </ul>');

                    var targetData = [5, 3, 6];
                    foreachHandler.handle(targetData, 'foreach', $rootNode);

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
            var result = foreachHandler.parse('somearray', $el);
            result.should.equal('somearray');
        });
        describe('Key aliases', function () {
            it('should support aliases of form `i in somearray`', function () {
                var $el = $('<div> </div>');
                var result = foreachHandler.parse('i in somearray', $el);
                result.should.equal('somearray');
            });
            it('should support aliases of form `i in somearray` with irregular spaces', function () {
                var $el = $('<div> </div>');
                var result = foreachHandler.parse(' i  in somearray', $el);
                result.should.equal('somearray');
            });
            it('should set the appropriate value data attr', function () {
                var $el = $('<div> </div>');
                foreachHandler.parse(' i  in somearray', $el);
                $el.data(config.attrs.valueAs).should.equal('i');
            });
        });
        describe('key, value aliases', function () {
            it('should support aliases of form `(i,j) in somearray`', function () {
                var $el = $('<div> </div>');
                var result = foreachHandler.parse('(i,j) in somearray', $el);
                result.should.equal('somearray');
            });
            it('should support aliases of form `(i,j) in somearray` with irregular spaces', function () {
                var $el = $('<div> </div>');
                var result = foreachHandler.parse(' ( i, j)  in somearray', $el);
                result.should.equal('somearray');
            });
            it('should set the appropriate value & key data attr', function () {
                var $el = $('<div> </div>');
                foreachHandler.parse(' ( i, j)  in somearray', $el);
                $el.data(config.attrs.keyAs).should.equal('i');
                $el.data(config.attrs.valueAs).should.equal('j');
            });
        });
    });
    describe('Variable aliasing', function () {
        it('should provide "key" and "value" variables for objects by default', function () {
            var $rootNode = $('<ul> <li> <%= key %> <%= value %> </li> </ul>');

            var targetData = { a: 1 };
            foreachHandler.handle(targetData, 'foreach', $rootNode);

            var newChildren = $rootNode.children();
            newChildren.eq(0).html().trim().should.equal('a 1');
        });
        it('should provide "index" and "value" variables for arrays by default', function () {
            var $rootNode = $('<ul> <li> <%= index %> <%= value %> </li> </ul>');

            var targetData = [1];
            foreachHandler.handle(targetData, 'foreach', $rootNode);

            var newChildren = $rootNode.children();
            newChildren.eq(0).html().trim().should.equal('0 1');
        });
        it('should replace \'key\' with value in key-as', function () {
            var $rootNode = $('<ul data-f-foreach-key-as="apples"> <li> <%= apples %> <%= value %> </li> </ul>');

            var targetData = { a: 1 };
            foreachHandler.handle(targetData, 'foreach', $rootNode);

            var newChildren = $rootNode.children();
            newChildren.eq(0).html().trim().should.equal('a 1');
        });
        it('should replace \'index\' with value in key-as', function () {
            var $rootNode = $('<ul data-f-foreach-key-as="apples"> <li> <%= apples %> <%= value %> </li> </ul>');

            var targetData = [1];
            foreachHandler.handle(targetData, 'foreach', $rootNode);

            var newChildren = $rootNode.children();
            newChildren.eq(0).html().trim().should.equal('0 1');
        });
        it('should replace \'value\' with value in value-as', function () {
            var $rootNode = $('<ul data-f-foreach-value-as="oranges"> <li> <%= key %> <%= oranges %> </li> </ul>');

            var targetData = { a: 1 };
            foreachHandler.handle(targetData, 'foreach', $rootNode);

            var newChildren = $rootNode.children();
            newChildren.eq(0).html().trim().should.equal('a 1');
        });
    });
    require('./test-default-foreach-integration.js');
});
