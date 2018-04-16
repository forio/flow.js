import { initWithNode, createDummyChannel } from 'tests/testing-utils';
import domManager from 'src/dom/dom-manager';
import CManager from 'src/channels/channel-manager';

describe('integration', function () {
    it('should loop through children for elems with foreach=variableArray', function () {
        var targetData = [5, 3, 6, 1];

        var str = `
            <ul data-f-foreach="somearray">
                <li data-stuff="<%=index%>"> <%= value %> </li>
            </ul>
        `;
        const channel = new CManager();
        return initWithNode(str, domManager, channel).then(function ($node) {
            return channel.publish({ somearray: targetData }).then(()=> {
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
    it('should loop through children for elems with foreach=variableObject', function () {
        var targetData = { a: 3, b: 4 };

        var str = `
            <ul data-f-foreach="someobject">
                <li data-stuff="<%=key%>"> <%= value %> </li>
            </ul>
        `;
        const channel = createDummyChannel();
        return initWithNode(str, domManager, channel).then(function ($node) {
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
    it('should support inline functions in templates', function () {
        var targetData = [5, 3, 6, 1];
        var outputdata = ['first', 3, 6, 1];
        
        var str = `
            <ul data-f-foreach="somearray">
                <li> <%= (index === 0) ? "first" : value %> <%= value %></li>
            </ul>
        `;
        const channel = createDummyChannel();
        return initWithNode(str, domManager, channel).then(function ($node) {
            return channel.publish({ somearray: targetData }).then(()=> {
                var newChildren = $node.children();
                var childrenCount = newChildren.length;
                newChildren.each(function (index) {
                    var data = $(this).html().trim();
                    data.should.equal(outputdata[index] + ' ' + targetData[index]);
                });
                return channel.publish({ somearray: targetData }).then(()=> {
                    $node.children().length.should.equal(childrenCount);
                });
            });
        });
    });

    describe('Nested Loops', function () {
        function matchChildContents($node, toMatch) {
            $node.children().each((index, el)=> {
                $(el).children().length.should.equal(toMatch.length);
                $(el).children().each((cindex, childEl)=> {
                    $(childEl).html().should.equal(`${toMatch[cindex]}`);
                });
            });
        }

        it('should support nested loops', function () {
            var targetData = [5, 3, 6, 1];
            var targetData2 = [5, 3];

            const channel = createDummyChannel();
            return initWithNode(`
                <ul data-f-foreach="somearray">
                    <li data-f-foreach="somethingElse"> <span> </span> </li>
                </ul>
            `, domManager, channel).then(function ($node) {
                return channel.publish({ somearray: targetData }).then(()=> {
                    $node.children().length.should.equal(targetData.length);

                    return channel.publish({ somethingElse: targetData2 }).then(()=> {
                        var c = $node.children();
                        c.length.should.equal(targetData.length);
                        matchChildContents($node, targetData2);
                    });
                });
               
            });
        });
        it.skip('should handle cases where children get data before parent', ()=> {
            /* 
                FIXME: originally had this code on subscribe callback, but this assumes children will be removed. Showif doesn't
                Maybe allow each converter to specify if it templates or no? *shrug* not super sure this is a valid use-case anyway
                
                const boundChildren = $el.find(`:${config.prefix}`).get();
                if (boundChildren.length) {
                    //Unbind children so loops etc pick the right template. 
                    //FIXME: Nope - 
                    // me.unbindAll(boundChildren);
                }
            */
            var targetData = [5, 3, 6, 1];
            var targetData2 = [5, 3];
            var targetData3 = [1, 2, 4];

            const channel = createDummyChannel();
            return initWithNode(`
                <ul data-f-foreach="somearray">
                    <li data-f-foreach="somethingElse"> <span> </span> </li>
                </ul>
            `, domManager, channel).then(function ($node) {
                return channel.publish({ somethingElse: targetData2 }).then(()=> {
                    matchChildContents($node, targetData2);
                    return channel.publish({ somearray: targetData }).then(()=> {
                        var c = $node.children();
                        c.length.should.equal(targetData.length);
                        matchChildContents($node, targetData2);

                        return channel.publish({ somethingElse: targetData3 }).then(()=> {
                            matchChildContents($node, targetData3);
                        });
                    });
                });
            });
        });
        it('should support nested loops with aliases', function () {
            var targetData = [1, 2];
            var targetData2 = [3, 4];

            const channel = new CManager();
            return initWithNode(`
                <ul data-f-foreach="(v1) in somearray">
                    <li data-f-foreach="(v2) in somethingElse"> 
                        <div> <%= v1 %> <%= v2 %> </div>
                    </li>
                </ul>
            `, domManager, channel).then(function ($node) {
                return channel.publish({ somearray: targetData }).then(()=> {
                    return channel.publish({ somethingElse: targetData2 }).then(()=> {
                        var c1 = $node.children();
                        c1.length.should.equal(targetData.length);
                        c1.each(function (index1, el) {
                            var c2 = $(el).children();
                            (c2.length).should.equal(targetData2.length);
                            c2.each(function (index2, el2) {
                                $(el2).text().trim().should.equal(targetData[index1] + ' ' + targetData2[index2]);
                            });
                        });
                    });
                });
               
            });
        });

        it('should support inline templates with multi variables', function () {
            var targetData = [1, 3];
            var targetData2 = [2, 4];

            var html = `
                <ul data-f-foreach="(v1) in somearray">
                    <li data-f-foreach="(v2) in somethingElse">
                        <div> <%= (v1 > v2 ) ? "greater" : "smaller"%> </div>
                    </li>
                </ul>
            `;
            const channel = createDummyChannel();
            return initWithNode(html, domManager, channel).then(function ($node) {
                return channel.publish({ somearray: targetData, somethingElse: targetData2 }).then(()=> {
                    var op = ['smaller', 'smaller', 'greater', 'smaller'];
                    var c1 = $node.children();
                    (c1.length).should.equal(targetData.length);

                    var i = 0;
                    c1.each(function (index1, el) {
                        var c2 = $(el).children();
                        (c2.length).should.equal(targetData2.length);
                        c2.each(function (index2, el2) {
                            $(el2).text().trim().should.equal(op[i]);
                            i++;
                        });
                    });
                });
            });
        });

        it('should support nested loops with partial aliases', function () {
            var targetData = [1, 2];
            var targetData2 = [3, 4];

            const channel = createDummyChannel();
            return initWithNode(`
                <ul data-f-foreach="(v1) in somearray">
                    <li data-f-foreach="somethingElse">
                        <div> <%= v1 %> <%= value %> </div>
                    </li>
                </ul>
            `, domManager, channel).then(function ($node) {
                return channel.publish({ somearray: targetData, somethingElse: targetData2 }).then(()=> {
                    var c1 = $node.children();
                    c1.length.should.equal(targetData.length);
                    c1.each(function (index1, el) {
                        var c2 = $(el).children();
                        (c2.length).should.equal(targetData2.length);

                        c2.each(function (index2, el2) {
                            $(el2).text().trim().should.equal(targetData[index1] + ' ' + targetData2[index2]);
                        });
                    });
                });
            });
        });

        it('should support nested loops with siblings', function () {
            var targetData = [1, 2];
            var targetData2 = [3, 4];
            var targetData3 = [5, 6];

            var channel = createDummyChannel();
            return initWithNode(`
                <ul data-f-foreach="(v1) in somearray">
                    <li class="p">
                        <ul class="ul1" data-f-foreach="(v2) in somethingElse"> <li> <%= v1 %> <%= v2 %></li></ul>
                        <ul class="ul2" data-f-foreach="(v3) in somethingElse2"> <li> <%= v1 %> <%= v3 %></li></ul>
                    </li>
                </ul>
            `, domManager, channel).then(function ($node) {
                return channel.publish({ 
                    somearray: targetData, 
                    somethingElse: targetData2,
                    somethingElse2: targetData3,
                }).then(()=> {
                    expect($node.children().length).to.equal(targetData.length);
                    $node.children().each(function (index1, el) {
                        const $c1 = $(el).find('.ul1').children();
                        expect($c1.length).to.equal(targetData2.length);
                        $c1.each(function (index2, el2) {
                            $(el2).html().trim().should.equal(targetData[index1] + ' ' + targetData2[index2]);
                        });

                        const $c2 = $(el).find('.ul2').children();
                        expect($c2.length).to.equal(targetData3.length);
                        $c2.each(function (index2, el2) {
                            $(el2).html().trim().should.equal(targetData[index1] + ' ' + targetData3[index2]);
                        });
                    });
                });
            });
        });
        it('should not be confused by siblings sharing same alias', function () {
            var targetData = [1, 2];
            var targetData2 = [3, 4];
            var targetData3 = [5, 6];

            var channel = createDummyChannel();
            return initWithNode(`
                <ul data-f-foreach="(v1) in somearray"> 
                    <li class="p">
                        <ul class="ul1" data-f-foreach="(v2) in somethingElse"> 
                            <li> <%= v1 %> <%= v2 %></li>
                        </ul>
                        <ul class="ul2" data-f-foreach="(v2) in somethingElse2"> 
                            <li> <%= v1 %> <%= v2 %></li>
                        </ul>
                    </li>
                </ul>
            `.trim(), domManager, channel).then(function ($node) {
                return channel.publish({ 
                    somearray: targetData, 
                    somethingElse: targetData2,
                    somethingElse2: targetData3,
                }).then(()=> {
                    expect($node.children().length).to.equal(targetData.length);
                    $node.find('.p').each(function (index1, el) {
                        const $c1 = $(el).find('.ul1').children();
                        expect($c1.length).to.equal(targetData2.length);
                        $c1.each(function (index2, el2) {
                            $(el2).html().trim().should.equal(targetData[index1] + ' ' + targetData2[index2]);
                        });

                        const $c2 = $(el).find('.ul2').children();
                        expect($c2.length).to.equal(targetData3.length);
                        $c2.each(function (index2, el2) {
                            $(el2).html().trim().should.equal(targetData[index1] + ' ' + targetData3[index2]);
                        });
                    });
                });
            });
        });
    });
});
