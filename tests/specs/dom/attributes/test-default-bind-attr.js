import { initWithNode, createDummyChannel } from 'tests/testing-utils';
import domManager from 'src/dom/dom-manager';
import bindHandler from 'src/dom/attributes/binds/default-bind-attr';

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

            it('should ignore items it doesn\'t know', ()=> {
                var $rootNode = $(`
                    <div><%= value %> World<span><%= foo %></span></div>
                `);
                bindHandler.handle('Hello', 'bind', $rootNode);
                $rootNode.html().trim().should.equal(`
                    Hello World<span>&lt;%= foo %&gt;</span>
                `.trim());
            });
        });
    });

    describe('Integration', function () {
        it('should output last values for arrays', function () {
            var targetData = { Price: [10, 30] };

            const channel = createDummyChannel();
            return initWithNode('<div data-f-bind="Price"> </div>', domManager, channel).then(function ($node) {
                return channel.publish(targetData).then(()=> {
                    $node.html().trim().should.equal('30');
                });
            });
        });

        it('should convert values to strings', function () {
            var targetData = { Price: false };
            const channel = createDummyChannel();
            return initWithNode('<div data-f-bind="Price"> </div>', domManager, channel).then(function ($node) {
                return channel.publish(targetData).then(()=> {
                    $node.html().trim().should.equal('false');
                });
            });
        });
        it('should templatize multiple-bound variables', function () {
            var targetData = { Price: '20', Sales: 30 };

            const channel = createDummyChannel();
            return initWithNode('<div data-f-bind="Price, Sales"> <%= Price %> <%= Sales %> </div>', domManager, channel).then(function ($node) {
                return channel.publish(targetData).then(()=> {
                    $node.html().trim().should.equal('20 30');
                });
            });
        });
        it('should allow combining templated values', ()=> {
            var targetData = { Price: 20, Sales: 30 };

            const channel = createDummyChannel();
            return initWithNode(`
                    <div data-f-bind="Price"> 
                        <%= Price %> 
                        <div data-f-bind="Sales"><%= Sales + Price %></div>
                    </div>
                `, domManager, channel).then(function ($node) {
                return channel.publish(targetData).then(()=> {
                    $node.find('div').html().trim().should.equal('50');
                });
            });
        });
        it('should templatize single variables', function () {
            var targetData = { Price: '20' };

            const channel = createDummyChannel();
            return initWithNode('<div data-f-bind="Price"> <%= Price %> </div>', domManager, channel).then(function ($node) {
                return channel.publish(targetData).then(()=> {
                    $node.html().trim().should.equal('20');
                });
            });
        });
        it('should allow templating by variable name for single items', function () {
            var targetData = { Price: '20', Sales: 30 };

            const channel = createDummyChannel();
            return initWithNode('<div data-f-bind="Price"> <%= value %> </div>', domManager, channel).then(function ($node) {
                return channel.publish(targetData).then(()=> {
                    $node.html().trim().should.equal('20');
                });
            });
        });

        it('should template arrays in accordance with converters', function () {
            var targetData = { Price: [10, 30] };

            const channel = createDummyChannel();
            return initWithNode('<div data-f-bind="Price|last"> <%= value %> </div>', domManager, channel).then(function ($node) {
                return channel.publish(targetData).then(()=> {
                    $node.html().trim().should.equal('30');
                });
            });
        });
        it('should template objects in accordance with converters', function () {
            var targetData = { Price: [10, 3000], Sales: [20, 1100] };

            const channel = createDummyChannel();
            return initWithNode('<div data-f-bind="Price, Sales | #,### |last"> <%= Price %> <%= Sales %> </div>', domManager, channel).then(function ($node) {
                return channel.publish(targetData).then(()=> {
                    $node.html().trim().should.equal('3,000 1,100');
                });
            });
        });
    });

    describe('Animation hooks', ()=> {
        function publishAndVerify(channel, data, el, condition) {
            return channel.publish((data)=> {
                const $d = $.Deferred();
                setTimeout(()=> {
                    expect(el.hasAttribute('data-change')).to.equal(condition);
                    $d.resolve();
                }, 0);
                return $d.promise();
            });
        }
        describe('without templates', ()=> {
            it('should animate if value changed', ()=> {
                const channel = createDummyChannel();
                return initWithNode('<div data-f-bind="Price"></div>', domManager, channel).then(function ($node) {
                    const el = $node.get(0);
                    expect(el.hasAttribute('data-change')).to.equal(false);

                    return publishAndVerify(channel, { Price: 30 }, el, true);
                });
            });
            it('should not animate if initial value doesn\'t change', ()=> {
                const channel = createDummyChannel();
                return initWithNode('<div data-f-bind="Price">30</div>', domManager, channel).then(function ($node) {
                    const el = $node.get(0);
                    expect(el.hasAttribute('data-change')).to.equal(false);

                    return publishAndVerify(channel, { Price: 30 }, el, true);
                });
            });
            it('should not animate if later value doesn\'t change', ()=> {
                const channel = createDummyChannel();

                initWithNode('<div data-f-bind="Price">30</div>', domManager, channel).then(function ($node) {
                    const el = $node.get(0);
                    expect(el.hasAttribute('data-change')).to.equal(false);

                    return publishAndVerify(channel, { Price: 40 }, el, true).then(()=> {
                        return publishAndVerify(channel, { Price: 40 }, el, false).then(()=> {
                            return publishAndVerify(channel, { Price: 50 }, el, false);
                        });
                    });
                });
            });
        });
        it('should not add change attr if templated', ()=> {
            const channel = createDummyChannel();
            initWithNode('<div data-f-bind="Price"><%= value %></div>', domManager, channel).then(function ($node) {
                const el = $node.get(0);
                expect(el.hasAttribute('data-change')).to.equal(false);

                return publishAndVerify(channel, { Price: 30 }, el, false).then(()=> {
                    return publishAndVerify(channel, { Price: 40 }, el, false);
                });
            });
        });
    });
});
