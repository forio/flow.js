import repeatHandler from '../index';

describe('Repeat', function () {
    describe('#handle', function () {
        describe('Arrays', function () {
            it('should clone children for arrays', function () {
                var $rootNode = $('<ul> <li data-f-repeat="something"> </li> </ul>');
                const topics = [{ name: 'something' }];

                repeatHandler.handle([1, 2, 3, 4], 'repeat', $rootNode.find('li:first'), topics);
                var newChildren = $rootNode.children();
                newChildren.length.should.equal(4);
            });
            it('should put the value inside the element if it`s not templated', function () {
                var $rootNode = $('<ul> <li data-f-repeat="something"> </li> </ul>');
                const topics = [{ name: 'something' }];

                var data = [0, 1, 2, 3, 4];
                repeatHandler.handle(data, 'repeat', $rootNode.find('li:first'), topics);
                var newChildren = $rootNode.children();

                for (var i = 0; i < data.length; i++) {
                    $(newChildren[i]).html().should.equal(data[i] + '');
                }
            });
            it('should replace existing content', function () {
                var $rootNode = $('<ul> <li data-f-repeat="something">stuff</li> </ul>');
                const topics = [{ name: 'something' }];

                var data = [0, 1, 2, 3, 4];
                repeatHandler.handle(data, 'repeat', $rootNode.find('li:first'), topics);
                var newChildren = $rootNode.children();

                for (var i = 0; i < data.length; i++) {
                    $(newChildren[i]).html().should.equal(data[i] + '');
                }
            });
            it('should treat single values as arrays with 1 iteam', function () {
                var $rootNode = $('<ul> <li data-f-repeat="something"> </li> </ul>');
                const topics = [{ name: 'something' }];

                repeatHandler.handle(3, 'repeat', $rootNode.find('li:first'), topics);
                var newChildren = $rootNode.children();
                newChildren.length.should.equal(1);

                newChildren.html().trim().should.equal('3');
            });
        });
        describe('Objects', function () {
            it('should clone children for objects', function () {
                var $rootNode = $('<ul> <li data-f-repeat="something"> </li> </ul>');
                const topics = [{ name: 'something' }];

                repeatHandler.handle({ a: 3, b: 4, d: 6 }, 'repeat', $rootNode.find('li:first'), topics);
                var newChildren = $rootNode.children();
                newChildren.length.should.equal(3);
            });
        });
        describe('Update behavior', function () {
            it('should not grow exponentially when called multiple times', function () {
                var $rootNode = $('<ul> <li data-f-repeat="something"> </li> </ul>');
                const topics = [{ name: 'something' }];

                repeatHandler.handle([1, 2, 3, 4], 'repeat', $rootNode.find('li:first'), topics);
                var newChildren = $rootNode.children();
                newChildren.length.should.equal(4);

                repeatHandler.handle([1, 2, 3, 4, 5], 'repeat', $rootNode.find('li:first'), topics);
                newChildren = $rootNode.children();
                newChildren.length.should.equal(5);
            });
            it('should replace older values with new ones', function () {
                var $rootNode = $('<ul> <li data-f-repeat="something" data-stuff="<%=index%>"> <%= value %> </li> </ul>');
                const topics = [{ name: 'something' }];

                repeatHandler.handle([1, 2, 3, 4], 'repeat', $rootNode.find('li:first'), topics);
                var targetData = [5, 3, 6, 1];
                repeatHandler.handle(targetData, 'repeat', $rootNode.find('li:first'), topics);

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
                    var $rootNode = $('<ul> <li data-f-repeat="something" data-stuff="<%=value%>"> </li> </ul>');
                    const topics = [{ name: 'something' }];
                    var targetData = [5, 3, 6, 1];

                    repeatHandler.handle(targetData, 'repeat', $rootNode.find('li:first'), topics);
                    var newChildren = $rootNode.children();
                    newChildren.each(function (index) {
                        var data = $(this).data('stuff');
                        data.should.equal(targetData[index]);
                    });
                });
                it('should support inline conditions in templates', function () {
                    var $rootNode = $('<ul> <li data-f-repeat="something"> <%= (index === 0) ? "first" : value %> </li> </ul>');
                    const topics = [{ name: 'something' }];
                    var targetData = [5, 3, 6, 1];
                    var outputdata = ['first', 3, 6, 1];

                    repeatHandler.handle(targetData, 'repeat', $rootNode.find('li:first'), topics);
                    var newChildren = $rootNode.children();
                    newChildren.each(function (index) {
                        var data = $(this).html().trim();
                        data.should.equal(outputdata[index] + '');
                    });
                });
                it('should support block conditions in inline templates', function () {
                    var $rootNode = $(`
                        <ul> <li data-f-repeat="something"> <% if (index === 0) { %> <%= value %> <% } %> </li> </ul>
                    `);
                    var targetData = [5, 3, 6, 1];
                    var outputdata = [5, '', '', ''];

                    const topics = [{ name: 'something' }];
                    repeatHandler.handle(targetData, 'repeat', $rootNode.find('li:first'), topics);
                    var newChildren = $rootNode.children();
                    newChildren.each(function (index) {
                        var data = $(this).html().trim();
                        data.should.equal(outputdata[index] + '');
                    });
                });
                it('should support block conditions in templates with multi children', function () {
                    var $rootNode = $(`
                            <ul>
                            <li data-f-repeat="something"> <% if (index === 0) { %> <span> HI </span> <% } %>  <span> <%= value %> </span> </li>
                        </ul>
                    `);
                    var targetData = [5, 3, 6, 1];
                    const topics = [{ name: 'something' }];

                    repeatHandler.handle(targetData, 'repeat', $rootNode.find('li:first'), topics);
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
                    var $rootNode = $(`
                        <ul> 
                            <% if (index === 0) { %> <li data-f-repeat="somethingelse"> HI </li> <% } %>
                            <li data-f-repeat="something"> <%= value %> </li> 
                        </ul>
                    `);
                    var targetData = [5, 3, 6, 1];
                    const topics = [{ name: 'somethingElse' }];

                    repeatHandler.handle(targetData, 'repeat', $rootNode.find('li:first'), topics);
                    $rootNode.children().length.should.equal(targetData.length + 1);
                });


                it('should replace templated inner html for children', function () {
                    var $rootNode = $('<ul> <li data-f-repeat="something" data-stuff="<%=index%>"> <%= value %> </li> </ul>');
                    const topics = [{ name: 'something' }];
                    var targetData = [5, 3, 6, 1];

                    repeatHandler.handle(targetData, 'repeat', $rootNode.find('li:first'), topics);
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
                    var $rootNode = $('<ul> <li data-f-repeat="something" data-stuff="<%=key%>"> <%= value %> </li> </ul>');
                    const topics = [{ name: 'something' }];
                    var targetData = { a: 3, b: 4 };

                    repeatHandler.handle(targetData, 'repeat', $rootNode.find('li:first'), topics);
                    var newChildren = $rootNode.children();
                    newChildren.each(function () {
                        var val = $(this).html().trim();
                        var key = $(this).data('stuff');

                        targetData[key].should.equal(+val);
                    });
                });
            });
            describe('Empty values', ()=> {
                it('should hide itself if called with empty object', ()=> {
                    var $rootNode = $(`
                        <ul> 
                            <% if (index === 0) { %> <li data-f-repeat="somethingelse"> HI </li> <% } %>
                            <li data-f-repeat="something"> <%= value %> </li> 
                        </ul>
                    `);
                    const topics = [{ name: 'somethingElse' }];

                    const $el = $rootNode.find('li:first');
                    repeatHandler.handle([], 'repeat', $el, topics);
                    $el.is('[hidden]').should.equal(true);

                    repeatHandler.handle([1, 2], 'repeat', $el, topics);
                    $rootNode.find('[hidden]').length.should.equal(0);

                    repeatHandler.handle([], 'repeat', $el, topics);
                    $el.is('[hidden]').should.equal(true);
                    $rootNode.find('[hidden]').length.should.equal(1);
                });
            });
        });
    });
    describe('Parallel repeats', function () {
        it('should not affect siblings on first render', function () {
            var $rootNode = $('<ul> <li data-f-repeat="something" class="first"> </li> <li data-f-repeat="somethingelse" class="second"> </li> </ul>');
            const topics1 = [{ name: 'something' }];
            const topics2 = [{ name: 'somethingelse' }];

            repeatHandler.handle([1, 2, 3, 4], 'repeat', $rootNode.find('li.first'), topics1);
            repeatHandler.handle(['a', 'b', 'c', 'd'], 'repeat', $rootNode.find('li.second'), topics2);
            var newChildren = $rootNode.children();
            newChildren.length.should.equal(8);
        });

        it('should not affect siblings on update', function () {
            var $rootNode = $('<ul> <li data-f-repeat="something" class="first"> </li> <li data-f-repeat="somethingelse" class="second"> </li> </ul>');
            const topics1 = [{ name: 'something' }];
            const topics2 = [{ name: 'somethingelse' }];

            repeatHandler.handle([1, 2, 3, 4], 'repeat', $rootNode.find('li.first'), topics1);
            repeatHandler.handle(['a', 'b', 'c', 'd'], 'repeat', $rootNode.find('li.second'), topics2);
            var newChildren = $rootNode.children();
            newChildren.length.should.equal(8);

            var opdata = [1, 2, 3, 4, 5, 6, 'a', 'b', 'c', 'd'];
            repeatHandler.handle([1, 2, 3, 4, 5, 6], 'repeat', $rootNode.find('li.first'), topics1);
            newChildren = $rootNode.children();
            newChildren.each(function (index) {
                var data = $(this).html().trim();
                data.should.equal(opdata[index] + '');
            });

        });
    });
    describe('Nested Repeats', function () {
        it('should not affect children', function () {
            var $rootNode = $('<ul> <li data-f-repeat="something" class="first"> <div  data-f-repeat="somethingelse" class="second"> </div> </li> </ul>');
            const topics1 = [{ name: 'something' }];
            const topics2 = [{ name: 'somethingelse' }];

            repeatHandler.handle([1, 2, 3, 4], 'repeat', $rootNode.find('.first'), topics1);
            repeatHandler.handle(['a', 'b', 'c', 'd'], 'repeat', $rootNode.find('.second'), topics2);
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
});
