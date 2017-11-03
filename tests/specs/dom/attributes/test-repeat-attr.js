var domManager = require('src/dom/dom-manager');
var utils = require('../../../testing-utils');

var repeatHandler = require('src/dom/attributes/repeat-attr');

describe('Repeat', function () {
    describe('#handle', function () {
        describe('Arrays', function () {
            it('should clone children for arrays', function () {
                var $rootNode = $('<ul> <li> </li> </ul>');

                repeatHandler.handle([1, 2, 3, 4], 'repeat', $rootNode.find('li:first'));
                var newChildren = $rootNode.children();
                newChildren.length.should.equal(4);
            });
            it('should put the value inside the element if it`s not templated', function () {
                var $rootNode = $('<ul> <li> </li> </ul>');

                var data = [0, 1, 2, 3, 4];
                repeatHandler.handle(data, 'repeat', $rootNode.find('li:first'));
                var newChildren = $rootNode.children();

                for (var i = 0; i < data.length; i++) {
                    $(newChildren[i]).html().should.equal(data[i] + '');
                }
            });
            it('should replace existing content', function () {
                var $rootNode = $('<ul> <li>stuff</li> </ul>');

                var data = [0, 1, 2, 3, 4];
                repeatHandler.handle(data, 'repeat', $rootNode.find('li:first'));
                var newChildren = $rootNode.children();

                for (var i = 0; i < data.length; i++) {
                    $(newChildren[i]).html().should.equal(data[i] + '');
                }
            });
            it('should not replace existing content with nulls', function () {
                var $rootNode = $('<ul> <li>stuff</li> </ul>');

                var data = [undefined, undefined, undefined];
                repeatHandler.handle(data, 'repeat', $rootNode.find('li:first'));
                var newChildren = $rootNode.children();

                for (var i = 0; i < data.length; i++) {
                    $(newChildren[i]).html().should.equal('stuff');
                }
            });
            it('should treat single values as arrays with 1 iteam', function () {
                var $rootNode = $('<ul> <li> </li> </ul>');

                repeatHandler.handle(3, 'repeat', $rootNode.find('li:first'));
                var newChildren = $rootNode.children();
                newChildren.length.should.equal(1);

                newChildren.html().trim().should.equal('3');
            });
        });
        describe('Objects', function () {
            it('should clone children for objects', function () {
                var $rootNode = $('<ul> <li> </li> </ul>');

                repeatHandler.handle({ a: 3, b: 4, d: 6 }, 'repeat', $rootNode.find('li:first'));
                var newChildren = $rootNode.children();
                newChildren.length.should.equal(3);
            });
        });
        describe('Update behavior', function () {
            it('should not grow exponentially when called multiple times', function () {
                var $rootNode = $('<ul> <li> </li> </ul>');

                repeatHandler.handle([1, 2, 3, 4], 'repeat', $rootNode.find('li:first'));
                var newChildren = $rootNode.children();
                newChildren.length.should.equal(4);

                repeatHandler.handle([1, 2, 3, 4, 5], 'repeat', $rootNode.find('li:first'));
                newChildren = $rootNode.children();
                newChildren.length.should.equal(5);
            });
            it('should replace older values with new ones', function () {
                var $rootNode = $('<ul> <li data-stuff="<%=index%>"> <%= value %> </li> </ul>');

                repeatHandler.handle([1, 2, 3, 4], 'repeat', $rootNode.find('li:first'));
                var targetData = [5, 3, 6, 1];
                repeatHandler.handle(targetData, 'repeat', $rootNode.find('li:first'));

                var newChildren = $rootNode.children();
                newChildren.each(function (index) {
                    var data = $(this).html().trim();
                    data.should.equal(targetData[index] + '');

                    var indexVal = $(this).data('stuff');
                    indexVal.should.equal(index);
                });
            });
        });

        describe('Templated', function () {
            describe('Arrays', function () {
                it('should replace templated data attributes for children', function () {
                    var $rootNode = $('<ul> <li data-stuff="<%=value%>"> </li> </ul>');
                    var targetData = [5, 3, 6, 1];

                    repeatHandler.handle(targetData, 'repeat', $rootNode.find('li:first'));
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

                    repeatHandler.handle(targetData, 'repeat', $rootNode.find('li:first'));
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

                    repeatHandler.handle(targetData, 'repeat', $rootNode.find('li:first'));
                    var newChildren = $rootNode.children();
                    newChildren.each(function (index) {
                        var data = $(this).html().trim();
                        data.should.equal(outputdata[index] + '');
                    });
                });
                it('should support block conditions in templates with multi children', function () {
                    var $rootNode = $('<ul> <li> <% if (index === 0) { %> <span> HI </span> <% } %>  <span> <%= value %> </span> </li> </ul>');
                    var targetData = [5, 3, 6, 1];

                    repeatHandler.handle(targetData, 'repeat', $rootNode.find('li:first'));
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
                    var $rootNode = $('<ul> <% if (index === 0) { %> <li> HI </li> <% } %>  <li> <%= value %> </li> </ul>');
                    var targetData = [5, 3, 6, 1];

                    repeatHandler.handle(targetData, 'repeat', $rootNode.find('li:first'));
                    $rootNode.children().length.should.equal(targetData.length + 1);
                });


                it('should replace templated inner html for children', function () {
                    var $rootNode = $('<ul> <li data-stuff="<%=index%>"> <%= value %> </li> </ul>');
                    var targetData = [5, 3, 6, 1];

                    repeatHandler.handle(targetData, 'repeat', $rootNode.find('li:first'));
                    var newChildren = $rootNode.children();
                    newChildren.each(function (index) {
                        var data = $(this).html().trim();
                        data.should.equal(targetData[index] + '');

                        var indexVal = $(this).data('stuff');
                        indexVal.should.equal(index);
                    });
                });
            });
            describe('Objects', function () {
                it('should replace templated inner html for children', function () {
                    var $rootNode = $('<ul> <li data-stuff="<%=key%>"> <%= value %> </li> </ul>');
                    var targetData = { a: 3, b: 4 };

                    repeatHandler.handle(targetData, 'repeat', $rootNode.find('li:first'));
                    var newChildren = $rootNode.children();
                    newChildren.each(function () {
                        var val = $(this).html().trim();
                        var key = $(this).data('stuff');

                        targetData[key].should.equal(+val);
                    });
                });
            });
        });
    });
    describe('Parallel repeats', function () {
        it('should not affect siblings on first render', function () {
            var $rootNode = $('<ul> <li class="first"> </li> <li class="second"> </li> </ul>');

            repeatHandler.handle([1, 2, 3, 4], 'repeat', $rootNode.find('li.first'));
            repeatHandler.handle(['a', 'b', 'c', 'd'], 'repeat', $rootNode.find('li.second'));
            var newChildren = $rootNode.children();
            newChildren.length.should.equal(8);
        });

        it('should not affect siblings on update', function () {
            var $rootNode = $('<ul> <li class="first"> </li> <li class="second"> </li> </ul>');

            repeatHandler.handle([1, 2, 3, 4], 'repeat', $rootNode.find('li.first'));
            repeatHandler.handle(['a', 'b', 'c', 'd'], 'repeat', $rootNode.find('li.second'));
            var newChildren = $rootNode.children();
            newChildren.length.should.equal(8);

            var opdata = [1, 2, 3, 4, 5, 6, 'a', 'b', 'c', 'd'];
            repeatHandler.handle([1, 2, 3, 4, 5, 6], 'repeat', $rootNode.find('li.first'));
            newChildren = $rootNode.children();
            newChildren.each(function (index) {
                var data = $(this).html().trim();
                data.should.equal(opdata[index] + '');
            });

        });
    });
    describe('Nested Repeats', function () {
        it('should not affect children', function () {
            var $rootNode = $('<ul> <li class="first"> <div class="second"> </div> </li> </ul>');

            repeatHandler.handle([1, 2, 3, 4], 'repeat', $rootNode.find('.first'));
            repeatHandler.handle(['a', 'b', 'c', 'd'], 'repeat', $rootNode.find('.second'));
            var newChildren = $rootNode.children();
            newChildren.length.should.equal(4);
            $rootNode.find('.second').length.should.equal(4 * 4);
        });
    });

    describe('unbind', ()=> {
        it('should cleanup existing bound nodes', ()=> {
            var html = '<ul> <li data-f-repeat="somearray" data-repeat-template-id="repeat-1"></li>' +
                '<li data-repeat-1="true"></li><li data-repeat-1="true"></li>' +
                '<li data-repeat-2="true"></li><li data-repeat-4="true"></li>' +
            '</ul>';

            var $rootNode = $(html);
            repeatHandler.unbind('repeat', $rootNode.find('li:first'));
            $rootNode.children().length.should.equal(3);
        });
    });
    describe('integration', function () {
        it('should loop through children for elems with repeat=variableArray', function () {
            var targetData = [5, 3, 6, 1];

            return utils.initWithNode('<ul> <li data-f-repeat="somearray" data-stuff="<%=index%>"> <%= value %> </li> </ul>', domManager).then(function ($node) {
                $node.find('li:first').trigger('update.f.model', { somearray: targetData });

                var newChildren = $node.children();
                var childrenCount = newChildren.length;

                newChildren.each(function (index) {
                    var data = $(this).html().trim();
                    data.should.equal(targetData[index] + '');

                    var indexVal = $(this).data('stuff');
                    indexVal.should.equal(index);
                });

                $node.find('li:first').trigger('update.f.model', { somearray: targetData });
                $node.children().length.should.equal(childrenCount);
            });
        });
        it('should clean-up explicitly dirty nodes', function () {
            var targetData = [1, 2];
            var html = '<ul> <li data-f-repeat="somearray" data-repeat-template-id="repeat-1"></li>' +
                '<li data-repeat-1="true"></li><li data-repeat-1="true"></li>' +
                '<li data-repeat-2="true"></li><li data-repeat-4="true"></li>' +
            '</ul>';
            return utils.initWithNode(html, domManager).then(function ($node) {
                $node.find('li:first').trigger('update.f.model', { somearray: targetData });
                $node.children().length.should.equal(4);
            });
        });

        it('should loop through children for elems with repeat=variableObject', function () {
            var targetData = { a: 3, b: 4 };

            return utils.initWithNode('<ul> <li data-f-repeat="someobject" data-stuff="<%=index%>"> <%= value %> </li> </ul>', domManager).then(function ($node) {
                $node.find('li:first').trigger('update.f.model', { someobject: targetData });

                var newChildren = $node.children();
                var childrenCount = newChildren.length;

                newChildren.each(function () {
                    var val = $(this).html().trim();
                    var key = $(this).data('stuff');

                    targetData[key].should.equal(+val);
                });

                $node.find('li:first').trigger('update.f.model', { someobject: targetData });
                $node.children().length.should.equal(childrenCount);
            });
        });
        it('should support nested repeats', function () {
            var targetData = [5, 3, 6, 1];
            var targetData2 = ['a', 'b', 'c'];

            return utils.initWithNode('<ul> <li data-f-repeat="somearray"> <div class="children" data-f-repeat="somethingElse"> </div> </li> </ul>', domManager).then(function ($node) {
                $node.find('li:first').trigger('update.f.model', { somearray: targetData });

                domManager.bindAll();

                $node.find('div').trigger('update.f.model', { somethingElse: targetData2 });

                var newChildren = $node.children();
                newChildren.length.should.equal(targetData.length);
                newChildren.each(function (index, el) {
                    $(el).children().length.should.equal(targetData2.length);
                    $(el).children().each(function (i2) {
                        var data = $(this).html().trim();
                        data.should.equal(targetData2[i2]);
                    });
                });
            });
        });
    });
});
