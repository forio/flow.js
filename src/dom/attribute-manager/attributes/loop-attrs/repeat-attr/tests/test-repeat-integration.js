import { initWithNode, createDummyChannel } from 'tests/testing-utils';
import domManager from 'dom/dom-manager';

describe('Repeat integration', function () {
    it('should loop through children for elems with repeat=variableArray', function () {
        var targetData = [5, 3, 6, 1];

        const channel = createDummyChannel();
        return initWithNode(`
            <ul> 
                <li data-f-repeat="somearray" data-stuff="<%=index%>"> <%= value %> </li> 
            </ul>
        `, domManager, channel).then(function ($node) {
            return channel.publish({
                somearray: targetData 
            }).then(()=> {
                var newChildren = $node.children();
                var childrenCount = newChildren.length;

                newChildren.each(function (index) {
                    var data = $(this).html().trim();
                    data.should.equal(targetData[index] + '');

                    var indexVal = $(this).data('stuff');
                    indexVal.should.equal(index);
                });
                return channel.publish({ somearray: targetData }).then(()=> {
                    $node.children().length.should.equal(childrenCount);
                });
            });
        });
    });
    it('should clean-up explicitly dirty nodes', function () {
        var targetData = [1, 2];
        var html = `
            <ul> 
                <li data-f-repeat="somearray" data-repeat-template-id="repeat-1"></li>
                <li data-repeat-1="true"></li><li data-repeat-1="true"></li>
                <li data-repeat-2="true"></li><li data-repeat-4="true"></li>
            </ul>
        `;
        const channel = createDummyChannel();
        return initWithNode(html, domManager, channel).then(function ($node) {
            return channel.publish({ somearray: targetData }).then(()=> {
                $node.children().length.should.equal(4);
            });
        });
    });

    it('should loop through children for elems with repeat=variableObject', function () {
        var targetData = { a: 3, b: 4 };

        const channel = createDummyChannel();
        return initWithNode(`
            <ul> 
                <li data-f-repeat="someobject" data-stuff="<%=key%>"> <%= value %> </li> 
            </ul>
        `, domManager, channel).then(function ($node) {
            return channel.publish({ someobject: targetData }).then(()=> {
                var newChildren = $node.children();
                var childrenCount = newChildren.length;

                newChildren.each(function () {
                    var val = $(this).html().trim();
                    var key = $(this).data('stuff');

                    targetData[key].should.equal(+val);
                });
                return channel.publish({ someobject: targetData }).then(()=> {
                    $node.children().length.should.equal(childrenCount);
                });
            });
        });
    });
    it('should support nested repeats', function () {
        var targetData = [5, 3, 6, 1];
        var targetData2 = ['a', 'b', 'c'];

        const channel = createDummyChannel();
        return initWithNode(`
            <ul> 
                <li data-f-repeat="somearray"> <div class="children" data-f-repeat="somethingElse"> </div> </li>
            </ul>
        `, domManager, channel).then(function ($node) {
            return channel.publish({
                somearray: targetData,
                somethingElse: targetData2,
            }).then(()=> {
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
