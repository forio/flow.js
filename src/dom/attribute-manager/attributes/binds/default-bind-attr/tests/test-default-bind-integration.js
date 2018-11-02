import { initWithNode, createDummyChannel } from 'tests/testing-utils';
import domManager from 'dom/dom-manager';
import { expect } from 'chai';

describe('Default Bind', function () {
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

        it('should replace existing values', function () {
            var targetData = { Price: 43 };
            const channel = createDummyChannel();
            return initWithNode('<div data-f-bind="Price">Hello there</div>', domManager, channel).then(function ($node) {
                return channel.publish(targetData).then(()=> {
                    $node.html().trim().should.equal('43');
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

        describe('Aliases', ()=> {
            it('should alias single variables', function () {
                var targetData = { Price: '20' };

                const channel = createDummyChannel();
                return initWithNode('<div data-f-bind="Price as (p)"> <%= p %> </div>', domManager, channel).then(function ($node) {
                    return channel.publish(targetData).then(()=> {
                        $node.html().trim().should.equal('20');
                    });
                });
            });
            it('should alias multi variables', function () {
                var targetData = { Price: 20, sales: 30 };

                const channel = createDummyChannel();
                return initWithNode('<div data-f-bind="Price as (p), sales as (s)"> <%= p + s %> </div>', domManager, channel).then(function ($node) {
                    return channel.publish(targetData).then(()=> {
                        $node.html().trim().should.equal('50');
                    });
                });
            });
            it('should run through converters before aliasing', function () {
                var targetData = { Price: [10, 30] };

                const channel = createDummyChannel();
                return initWithNode('<div data-f-bind="Price as (p) |first"> <%= value %> </div>', domManager, channel).then(function ($node) {
                    return channel.publish(targetData).then(()=> {
                        $node.html().trim().should.equal('10');
                    });
                });
            });
        });
    });

    describe('Animation hooks', ()=> {
        function publishAndVerify(channel, data, el, checks) {
            return channel.publish(data).then(()=> {
                const $d = $.Deferred();
                setTimeout(()=> {
                    Object.keys(checks).forEach((attr)=> {
                        expect(el.hasAttribute(attr)).to.equal(checks[attr]);
                    });
                    $d.resolve();
                }, 1);
                return $d.promise();
            });
        }
        describe('without templates', ()=> {
            it('should animate if value changed', ()=> {
                const channel = createDummyChannel();
                return initWithNode('<div data-f-bind="Price"></div>', domManager, channel).then(function ($node) {
                    const el = $node.get(0);
                    expect(el.hasAttribute('data-update')).to.equal(false);
                    expect(el.hasAttribute('data-initial')).to.equal(false);

                    return publishAndVerify(channel, { Price: 30 }, el, { 'data-update': true, 'data-initial': true });
                });
            });
            it('should not animate if initial value doesn\'t change', ()=> {
                const channel = createDummyChannel();
                return initWithNode('<div data-f-bind="Price">30</div>', domManager, channel).then(function ($node) {
                    const el = $node.get(0);
                    expect(el.hasAttribute('data-update')).to.equal(false);
                    expect(el.hasAttribute('data-initial')).to.equal(false);

                    return publishAndVerify(channel, { Price: 30 }, el, { 'data-update': false, 'data-initial': false });
                });
            });
            it('should not animate if later value doesn\'t change', ()=> {
                const channel = createDummyChannel();

                return initWithNode('<div data-f-bind="Price">30</div>', domManager, channel).then(function ($node) {
                    const el = $node.get(0);
                    expect(el.hasAttribute('data-update')).to.equal(false);
                    expect(el.hasAttribute('data-initial')).to.equal(false);

                    return publishAndVerify(channel, { Price: 40 }, el, { 'data-update': true, 'data-initial': true }).then(()=> {
                        return publishAndVerify(channel, { Price: 40 }, el, { 'data-update': false, 'data-initial': false }).then(()=> {
                            return publishAndVerify(channel, { Price: 50 }, el, { 'data-update': true, 'data-initial': false });
                        });
                    });
                });
            });
        });
        it('should add change attr if templated', ()=> {
            const channel = createDummyChannel();
            return initWithNode('<div data-f-bind="Price"><%= value %></div>', domManager, channel).then(function ($node) {
                const el = $node.get(0);
                expect(el.hasAttribute('data-update')).to.equal(false);
                expect(el.hasAttribute('data-initial')).to.equal(false);

                return publishAndVerify(channel, { Price: 30 }, el, { 'data-update': true, 'data-initial': true }).then(()=> {
                    return publishAndVerify(channel, { Price: 40 }, el, { 'data-update': true, 'data-initial': false });
                });
            });
        });
    });
});
