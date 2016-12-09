'use strict';
module.exports = (function () {
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
                        bindHandler.handle.call($rootNode, [1, 3, 5, 6]);
                        $rootNode.html().should.equal('6');
                    });
                });
                it('should stringify objects if passed in', function () {
                    var $rootNode = $('<div> Loading </div>');
                    var data = { hello: 'world' };
                    bindHandler.handle.call($rootNode, data);
                    $rootNode.html().should.equal(JSON.stringify(data));
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
                it('should show handle variables with spaces', function () {
                    var $rootNode = $('<div><%= a %> <%= value["b c"] %></div>');
                    bindHandler.handle.call($rootNode, { a: 'Hello', 'b c': 'World' });
                    $rootNode.html().should.equal('Hello World');
                });
                it('should show templatize Arrays', function () {
                    var $rootNode = $('<div><%= value[value.length - 1] %></div>');
                    bindHandler.handle.call($rootNode, ['Hello']);
                    $rootNode.html().should.equal('Hello');
                });
                it('should show stringified Arrays', function () {
                    var $rootNode = $('<div><%= value %></div>');
                    bindHandler.handle.call($rootNode, ['Hello', 'there', 'world']);
                    $rootNode.html().should.equal('Hello,there,world');
                });
                it('should treat items as js objects', function () {
                    var $rootNode = $('<div><%= words.join(",") %></div>');
                    bindHandler.handle.call($rootNode, { words: ['Hello', 'there', 'world'] });
                    $rootNode.html().should.equal('Hello,there,world');
                });

                it('should update templates when called multiple times', function () {
                    var $rootNode = $('<div><%= value %> World</div>');
                    bindHandler.handle.call($rootNode, 'Hello');
                    $rootNode.html().should.equal('Hello World');
                    bindHandler.handle.call($rootNode, 'Mario');
                    $rootNode.html().should.equal('Mario World');
                });
            });
        });

        describe('Integration', function () {
            it('should output last values for arrays', function () {
                var targetData = { Price: [10, 30] };

                return utils.initWithNode('<div data-f-bind="Price"> </div>', domManager).then(function ($node) {
                    $node.trigger('update.f.model', targetData);
                    $node.html().trim().should.equal('30');
                });
            });

            it('should convert values to strings', function () {
                var targetData = { Price: false };
                return utils.initWithNode('<div data-f-bind="Price"> </div>', domManager).then(function ($node) {
                    $node.trigger('update.f.model', targetData);
                    $node.html().trim().should.equal('false');
                });
            });
            it('should templatize multiple-bound variables', function () {
                var targetData = { Price: '20', Sales: 30 };

                return utils.initWithNode('<div data-f-bind="Price, Sales"> <%= Price %> <%= Sales %> </div>', domManager).then(function ($node) {
                    $node.trigger('update.f.model', targetData);
                    $node.html().trim().should.equal('20 30');
                });
            });
            it('should templatize single variables', function () {
                var targetData = { Price: '20' };

                return utils.initWithNode('<div data-f-bind="Price"> <%= Price %> </div>', domManager).then(function ($node) {
                    $node.trigger('update.f.model', targetData);
                    $node.html().trim().should.equal('20');
                });
            });
            it('should allow templating by variable name for single items', function () {
                var targetData = { Price: '20', Sales: 30 };

                return utils.initWithNode('<div data-f-bind="Price"> <%= value %> </div>', domManager).then(function ($node) {
                    $node.trigger('update.f.model', targetData);
                    $node.html().trim().should.equal('20');
                });
            });

            it('should template arrays in accordance with converters', function () {
                var targetData = { Price: [10, 30] };

                return utils.initWithNode('<div data-f-bind="Price|last"> <%= value %> </div>', domManager).then(function ($node) {
                    $node.trigger('update.f.model', targetData);
                    $node.html().trim().should.equal('30');
                });
            });
            it('should template objects in accordance with converters', function () {
                var targetData = { Price: [10, 3000], Sales: [20, 1100] };

                return utils.initWithNode('<div data-f-bind="Price, Sales | #,### |last"> <%= Price %> <%= Sales %> </div>', domManager).then(function ($node) {
                    $node.trigger('update.f.model', targetData);
                    $node.html().trim().should.equal('3,000 1,100');
                });
            });
        });
    });

}());
