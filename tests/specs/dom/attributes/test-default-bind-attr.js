module.exports = (function () {
    'use strict';
    var domManager = require('src/dom/dom-manager');
    var utils = require('../../../testing-utils');

    var bindHandler = require('src/dom/attributes/binds/default-bind-attr');

    describe('Default Bind', function () {
        describe('#handle', function () {
            describe('Non-templated', function () {
                it('should replace innerhtml if target is blank', function () {
                    var $rootNode = $('<div> </div>');
                    bindHandler.handle.call($rootNode, 'Hello');
                    $rootNode.html().should.equal('Hello');
                });
                it('should replace innerhtml if target has random text', function () {
                    var $rootNode = $('<div> Loading </div>');
                    bindHandler.handle.call($rootNode, 'Hello');
                    $rootNode.html().should.equal('Hello');
                });
                it('should show the last item if given an array', function () {
                    it('should replace innerhtml if target has random text', function () {
                        var $rootNode = $('<div> Loading </div>');
                        bindHandler.handle.call($rootNode, [1,3,5,6]);
                        $rootNode.html().should.equal('6');
                    });
                });
            });
            describe('Templated', function () {
                it('should show values for single items', function () {
                    var $rootNode = $('<div><%= value %> World</div>');
                    bindHandler.handle.call($rootNode, 'Hello');
                    $rootNode.html().should.equal('Hello World');
                });
                it('should show templatize Objects', function () {
                    var $rootNode = $('<div><%= a %> <%= b %></div>');
                    bindHandler.handle.call($rootNode, { a: 'Hello', b: 'World' });
                    $rootNode.html().should.equal('Hello World');
                });
                it('should show templatize Arrays', function () {
                    var $rootNode = $('<div><%= value[value.length - 1] %></div>');
                    bindHandler.handle.call($rootNode, ['Hello']);
                    $rootNode.html().should.equal('Hello');
                });
            });
        });
    });

        // describe('integration', function () {
        //     it('should loop through children for elems with foreach=variableArray', function () {
        //         var targetData = [5,3,6,1];

        //         var $node = utils.initWithNode('<ul data-f-foreach="somearray"> <li data-stuff="<%=index%>"> <%= value %> </li> </ul>', domManager);
        //         $node.trigger('update.f.model', { somearray: targetData });

        //         var newChildren = $node.children();
        //         newChildren.each(function (index) {
        //            var data = $(this).html().trim();
        //            data.should.equal(targetData[index] + '');

        //            var indexVal = $(this).data('stuff');
        //            indexVal.should.equal(index);
        //         });
        //     });
        //     it('should loop through children for elems with foreach=variableObject', function () {
        //         var targetData = { a:3, b:4 };

        //         var $node = utils.initWithNode('<ul data-f-foreach="someobject"> <li data-stuff="<%=index%>"> <%= value %> </li> </ul>', domManager);
        //         $node.trigger('update.f.model', { someobject: targetData });

        //         var newChildren = $node.children();
        //         newChildren.each(function (index) {
        //            var val = $(this).html().trim();
        //            var key = $(this).data('stuff');

        //            targetData[key].should.equal(+val);
        //         });
        //     });
        // });

}());
