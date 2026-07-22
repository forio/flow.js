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

        it('should preserve edits to the element`s own attributes instead of reverting them (TEMPLATE-570)', ()=> {
            var $rootNode = $('<ul> <li data-f-repeat="oldVar"> <%= value %> </li> </ul>');
            const topics = [{ name: 'oldVar' }];
            const $el = $rootNode.find('li:first');
            const originalNode = $el.get(0);

            // First render captures the template snapshot and generates sibling clones.
            repeatHandler.handle([1, 2, 3], 'repeat', $el, topics);
            $rootNode.children().length.should.equal(3);

            // Simulate an interface-builder edit of the bound variable.
            $el.attr('data-f-repeat', 'newVar');

            repeatHandler.unbind('repeat', $el);

            // Generated siblings are cleaned up, leaving only the template element...
            $rootNode.children().length.should.equal(1);
            // ...the same node stays in the DOM (not detached/replaced)...
            $rootNode.children().get(0).should.equal(originalNode);
            // ...and the edited attribute survives rather than reverting to "oldVar".
            // NOTE: read the node actually left in the DOM, not the $el handle. Under the old
            // buggy replaceWith the $el handle pointed at the *detached* node (which still carried
            // "newVar"), so asserting on $el would pass even against the bug.
            $($rootNode.children().get(0)).attr('data-f-repeat').should.equal('newVar');
            // ...and the inner content is restored to the template, not left as rendered data.
            // Use .text(): serializing a text node via .html() would HTML-escape the < and >.
            $($rootNode.children().get(0)).text().trim().should.equal('<%= value %>');
        });

        it('should preserve attribute edits on table elements (data-f-repeat on <td>) (TEMPLATE-570)', ()=> {
            var $rootNode = $('<table><tbody><tr><td data-f-repeat="oldVar"> <%= value %> </td></tr></tbody></table>');
            const topics = [{ name: 'oldVar' }];
            const $el = $rootNode.find('td:first');
            const originalNode = $el.get(0);

            repeatHandler.handle([1, 2, 3], 'repeat', $el, topics);
            // The template td plus its two generated sibling clones.
            $rootNode.find('tr:first').children().length.should.equal(3);

            $el.attr('data-f-repeat', 'newVar');
            repeatHandler.unbind('repeat', $el);

            const $cells = $rootNode.find('tr:first').children();
            // Siblings cleaned up, same node kept, edit preserved, inner template restored.
            $cells.length.should.equal(1);
            $cells.get(0).should.equal(originalNode);
            $($cells.get(0)).attr('data-f-repeat').should.equal('newVar');
            $($cells.get(0)).text().trim().should.equal('<%= value %>');
        });

        it('should stay idempotent across repeated handle/unbind cycles (no row growth)', ()=> {
            var $rootNode = $('<ul> <li data-f-repeat="somearray"> <%= value %> </li> </ul>');
            const topics = [{ name: 'somearray' }];
            const $el = $rootNode.find('li:first');
            const data = [1, 2, 3];

            for (var i = 0; i < 3; i++) {
                repeatHandler.handle(data, 'repeat', $el, topics);
                // One template element + one clone per data item.
                $rootNode.children().length.should.equal(data.length);

                repeatHandler.unbind('repeat', $el);
                // Back down to just the template element; clones fully cleaned up.
                $rootNode.children().length.should.equal(1);
            }
        });

        it('should remove the hidden attribute set by the empty-value path on unbind', ()=> {
            var $rootNode = $('<ul> <li data-f-repeat="somearray"> <%= value %> </li> </ul>');
            const topics = [{ name: 'somearray' }];
            const $el = $rootNode.find('li:first');

            // A first render establishes the template snapshot...
            repeatHandler.handle([1, 2], 'repeat', $el, topics);
            // ...then an empty value hides the element.
            repeatHandler.handle([], 'repeat', $el, topics);
            $el.is('[hidden]').should.equal(true);

            repeatHandler.unbind('repeat', $el);
            $el.is('[hidden]').should.equal(false);
        });
    });
});
