module.exports = (function () {
    'use strict';
    // var domManager = require('src/dom/dom-manager');
    // var utils = require('../../../testing-utils');

    var repeatHandler = require('src/dom/attributes/repeat-attr');

    describe('Repeat', function () {
        describe('#handle', function () {
            describe('Arrays', function () {
                it('should clone children for arrays', function () {
                    var $rootNode = $('<ul> <li> </li> </ul>');

                    repeatHandler.handle.call($rootNode.find('li:first'), [1,2,3,4]);
                    var newChildren = $rootNode.children();
                    newChildren.length.should.equal(4);
                });
                it('should put the value inside the element if it`s not templated', function () {
                    var $rootNode = $('<ul> <li> </li> </ul>');

                    var data = [1,2,3,4];
                    repeatHandler.handle.call($rootNode.find('li:first'), data);
                    var newChildren = $rootNode.children();

                    for (var i = 0; i< data.length; i++) {
                        $(newChildren[i]).html().should.equal(data[i] + '');
                    }
                });
                it('should treat single values as arrays with 1 iteam', function () {
                    var $rootNode = $('<ul> <li> </li> </ul>');

                    repeatHandler.handle.call($rootNode.find('li:first'), 3);
                    var newChildren = $rootNode.children();
                    newChildren.length.should.equal(1);

                    newChildren.html().trim().should.equal('3');
                });
            });
            describe('Objects', function () {
                it.skip('should clone children for objects', function () {
                    var $rootNode = $('<ul> <li> </li> </ul>');

                    repeatHandler.handle.call($rootNode.find('li:first'), { a:3, b:4, d:6 });
                    var newChildren = $rootNode.children();
                    newChildren.length.should.equal(3);
                });
            });
            describe('Update behavior', function () {
                it('should not grow exponentially when called multiple times', function () {
                    var $rootNode = $('<ul> <li> </li> </ul>');

                    repeatHandler.handle.call($rootNode.find('li:first'), [1,2,3,4]);
                    var newChildren = $rootNode.children();
                    newChildren.length.should.equal(4);

                    repeatHandler.handle.call($rootNode.find('li:first'), [1,2,3,4, 5]);
                    newChildren = $rootNode.children();
                    newChildren.length.should.equal(5);
                });
            });
        });
    });
}());
