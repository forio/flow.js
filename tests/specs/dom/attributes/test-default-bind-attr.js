var domManager = require('src/dom/dom-manager');
var utils = require('../../../testing-utils');

var bindHandler = require('src/dom/attributes/binds/default-bind-attr');

describe('Default Bind', function () {
    describe('#handle', function () {
        describe('Non-templated', function () {
            it('should replace innerhtml if target is blank', function () {
                var $rootNode = $('<div> </div>');
                bindHandler.handle('Hello', 'bind', $rootNode);
                $rootNode.html().should.equal('Hello');
            });
            it('should replace innerhtml if target has random text', function () {
                var $rootNode = $('<div> Loading </div>');
                bindHandler.handle('Hello', 'bind', $rootNode);
                $rootNode.html().should.equal('Hello');
            });
            it('should show the last item if given an array', function () {
                it('should replace innerhtml if target has random text', function () {
                    var $rootNode = $('<div> Loading </div>');
                    bindHandler.handle([1, 3, 5, 6], 'bind', $rootNode);
                    $rootNode.html().should.equal('6');
                });
            });
            it('should stringify objects if passed in', function () {
                var $rootNode = $('<div> Loading </div>');
                var data = { hello: 'world' };
                bindHandler.handle(data, 'bind', $rootNode);
                $rootNode.html().should.equal(JSON.stringify(data));
            });

        });
        describe('Templated', function () {
            it('should show values for single items', function () {
                var $rootNode = $('<div><%= value %> World</div>');
                bindHandler.handle('Hello', 'bind', $rootNode);
                $rootNode.html().should.equal('Hello World');
            });
            it('should show templatize Objects', function () {
                var $rootNode = $('<div><%= a %> <%= b %></div>');
                bindHandler.handle({ a: 'Hello', b: 'World' }, 'bind', $rootNode);
                $rootNode.html().should.equal('Hello World');
            });
            it('should show handle variables with spaces', function () {
                var $rootNode = $('<div><%= a %> <%= value["b c"] %></div>');
                bindHandler.handle({ a: 'Hello', 'b c': 'World' }, 'bind', $rootNode);
                $rootNode.html().should.equal('Hello World');
            });
            it('should show templatize Arrays', function () {
                var $rootNode = $('<div><%= value[value.length - 1] %></div>');
                bindHandler.handle(['Hello'], 'bind', $rootNode);
                $rootNode.html().should.equal('Hello');
            });
            it('should show stringified Arrays', function () {
                var $rootNode = $('<div><%= value %></div>');
                bindHandler.handle(['Hello', 'there', 'world'], 'bind', $rootNode);
                $rootNode.html().should.equal('Hello,there,world');
            });
            it('should treat items as js objects', function () {
                var $rootNode = $('<div><%= words.join(",") %></div>');
                bindHandler.handle({ words: ['Hello', 'there', 'world'] }, 'bind', $rootNode);
                $rootNode.html().should.equal('Hello,there,world', 'bind', $rootNode);
            });

            it('should update templates when called multiple times', function () {
                var $rootNode = $('<div><%= value %> World</div>');
                bindHandler.handle('Hello', 'bind', $rootNode);
                $rootNode.html().should.equal('Hello World');
                bindHandler.handle('Mario', 'bind', $rootNode);
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

    describe('Animation hooks', ()=> {
        function verifyChangeValue(el, condition, callback) {
            setTimeout(()=> {
                expect(el.hasAttribute('data-change')).to.equal(condition);
                callback();
            }, 0);
        }
        describe('without templates', ()=> {
            it('should animate if value changed', (done)=> {
                utils.initWithNode('<div data-f-bind="Price"></div>', domManager).then(function ($node) {
                    const el = $node.get(0);
                    expect(el.hasAttribute('data-change')).to.equal(false);

                    $node.trigger('update.f.model', { Price: 30 });
                    verifyChangeValue(el, true, done);
                });
            });
            it('should not animate if initial value doesn\'t change', (done)=> {
                utils.initWithNode('<div data-f-bind="Price">30</div>', domManager).then(function ($node) {
                    const el = $node.get(0);
                    expect(el.hasAttribute('data-change')).to.equal(false);

                    $node.trigger('update.f.model', { Price: 30 });
                    verifyChangeValue(el, false, done);
                });
            });
            it('should not animate if later value doesn\'t change', (done)=> {
                utils.initWithNode('<div data-f-bind="Price">30</div>', domManager).then(function ($node) {
                    const el = $node.get(0);
                    expect(el.hasAttribute('data-change')).to.equal(false);

                    $node.trigger('update.f.model', { Price: 40 });
                    verifyChangeValue(el, true, ()=> {
                        $node.trigger('update.f.model', { Price: 40 });
                        verifyChangeValue(el, false, ()=> {
                            $node.trigger('update.f.model', { Price: 50 });
                            verifyChangeValue(el, true, done);
                        });
                    });
                });
            });
        });
        it('should not add change attr if templated', (done)=> {
            utils.initWithNode('<div data-f-bind="Price"><%= value %></div>', domManager).then(function ($node) {
                const el = $node.get(0);
                expect(el.hasAttribute('data-change')).to.equal(false);

                $node.trigger('update.f.model', { Price: 30 });
                verifyChangeValue(el, false, ()=> {
                    $node.trigger('update.f.model', { Price: 40 });
                    verifyChangeValue(el, false, done);
                });
            });
        });
    });
});
