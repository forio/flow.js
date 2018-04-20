import { initWithNode, createDummyChannel, spyOnNode } from '../../../tests/testing-utils';
import domManager from '../dom-manager';

import sinon from 'sinon';
import chai from 'chai';
chai.use(require('sinon-chai'));

import { expect } from 'chai';
import config from '../../config';

describe('UI Change Event', ()=> {
    var channel;
    beforeEach(()=> {
        channel = createDummyChannel();
    });
    describe('Bound element change', ()=> {
        it('should call publish on the channel', function () {
            var channel = createDummyChannel();
            return initWithNode('<input type="text" data-f-bind="apple"/>', domManager, channel).then(function ($node) {
                const payload = { data: [{ name: 'apple', value: 2 }], source: 'bind' };
                $node.trigger(config.events.trigger, payload);
                channel.publish.should.have.been.calledOnce;
            });
        });
        it('should pass the right parameters to publish', function () {
            var channel = createDummyChannel();
            return initWithNode('<input type="text" data-f-bind="apple"/>', domManager, channel).then(function ($node) {
                var payload = { data: [{ name: 'apple', value: 2 }], source: 'bind' };
                $node.trigger(config.events.trigger, payload);
                channel.publish.should.have.been.calledWith([{ name: 'apple', value: 2 }]);
            });
        });
        it('should implicitly convert parameters to send to tpublish', function () {
            var channel = createDummyChannel();
            return initWithNode('<input type="text" data-f-bind="apple"/>', domManager, channel).then(function ($node) {
                var payload = { data: [{ name: 'apple', value: '2' }], source: 'bind' };
                $node.trigger(config.events.trigger, payload);
                channel.publish.should.have.been.calledWith([{ name: 'apple', value: 2 }]);
            });
        });
        it('should trigger f.convert to convert values', function (done) {
            const channel = createDummyChannel();
            initWithNode('<input type="text" data-f-bind="apple | $#,###.00"/>', domManager, channel).then(function ($node) {
                var spy = sinon.spy();
                $node.on('f.convert', spy);

                var payload = { data: [{ name: 'apple', value: '20000' }], source: 'bind' };
                $node.trigger(config.events.trigger, payload);
                
                setTimeout(()=> {
                    spy.should.have.been.calledOnce;
                    spy.getCall(0).args[1].should.eql({ bind: 20000 });
                    done();
                }, 0);
            });
        });
        describe('parse: before publish', ()=> {
            it('should call parser once for single publish', ()=> {
                return initWithNode('<input type="text" data-f-bind="Price | $#,###.00"/>', domManager, channel).then(function ($node) {
                    $node.val('$500').trigger('change');
                    expect(channel.publish).to.have.been.calledWith([
                        { name: 'Price', value: 500 },
                    ]);
                });
            });
        });
        describe('convert: after publish', ()=> {
            it('should call parser once for single publish', (done)=> {
                initWithNode('<input type="text" data-f-bind="Price | $#,###.00"/>', domManager, channel).then(function ($node) {
                    $node.val('$500').trigger('change');
                    setTimeout(()=> {
                        expect($node.val()).to.equal('$500.00');
                        done();
                    }, 0);
                });
            });
        });
    });
    describe('on-* element change', ()=> {
        it('should call publish', function () {
            return initWithNode('<div data-f-on-click="somethingrandom"></div>', domManager, channel).then(function ($node) {
                $node.trigger(config.events.trigger, { data: [{ name: 'stuff', value: [] }], source: 'on-click' });
                channel.publish.should.have.been.calledOnce;
            });
        });
        it('should pass the right parameters to publish', function () {
            return initWithNode('<div data-f-on-click="somethingrandom"></div>', domManager, channel).then(function ($node) {
                var payload = { data: [{ name: 'stuff', value: [] }], source: 'on-click' };
                $node.trigger(config.events.trigger, payload);
                channel.publish.should.have.been.calledWith([{ name: 'operations:stuff', value: [] }]);
            });
        });
        it('should implicitly convert parameters to send to publish', function () {
            return initWithNode('<div data-f-on-click="somethingrandom"></div>', domManager, channel).then(function ($node) {
                var payload = { data: [{ name: 'stuff', value: ['1', 0] }], source: 'on-click' };
                $node.trigger(config.events.trigger, payload);
                channel.publish.should.have.been.calledWith([{ name: 'operations:stuff', value: [1, 0] }]);
            });
        });

        describe('Parse: Before Publish', ()=> {
            let reverseParser;
            beforeEach(()=> {
                reverseParser = {
                    parse: sinon.spy(function (val) {
                        return ([].concat(val)).reverse();
                    }),
                    convert: (v)=> v
                };
                domManager.converters.register('reverseArray', reverseParser, true);
            });
            afterEach(()=> {
                domManager.converters.replace('reverseArray', ()=> {});
            });

            describe('single publish operation', ()=> {
                it('should call parser once for single publish', ()=> {
                    return initWithNode('<input type="button" data-f-on-click="step(1, 2) | reverseArray"/>', domManager, channel).then(function ($node) {
                        $node.trigger('click');
                        expect(reverseParser.parse).to.have.been.calledOnce;
                    });
                });
                it('should pass through published value for single publish', ()=> {
                    return initWithNode('<input type="button" data-f-on-click="step(1, 2) | reverseArray"/>', domManager, channel).then(function ($node) {
                        $node.trigger('click');
                        channel.publish.should.have.been.calledWith([
                            { name: 'operations:step', value: [2, 1] },
                        ]);
                    });
                });
            });
            describe('multi publish operations', ()=> {
                it('should call converter once per operation', ()=> {
                    return initWithNode('<input type="button" data-f-on-click="step(1, 2) && reset | reverseArray"/>', domManager, channel).then(function ($node) {
                        $node.trigger('click');
                        expect(reverseParser.parse).to.have.been.calledTwice;
                    });
                });
                it('should pass through last published value for single publish', ()=> {
                    return initWithNode('<input type="button" data-f-on-click="reset && step(1, 2) | reverseArray"/>', domManager, channel).then(function ($node) {
                        $node.trigger('click');
                        channel.publish.should.have.been.calledWith([
                            { name: 'operations:reset', value: [] },
                            { name: 'operations:step', value: [2, 1] },
                        ]);
                    });
                });
            });
        });
        describe('Convert: After publish', ()=> {
            let reverseConverter;
            beforeEach(()=> {
                reverseConverter = sinon.spy(function (val) {
                    return ([].concat(val)).reverse();
                });
                domManager.converters.register('reverseArray', reverseConverter, true);
            });
            afterEach(()=> {
                domManager.converters.replace('reverseArray', ()=> {});
            });
            describe('single publish operation', ()=> {
                it('should call converter once for single publish', (done)=> {
                    initWithNode('<input type="button" data-f-on-click="step(1, 2) | reverseArray"/>', domManager, channel).then(function ($node) {
                        $node.trigger('click');
                        channel.publish.should.have.been.calledWith([
                            { name: 'operations:step', value: [1, 2] },
                        ]);
                        setTimeout(()=> {
                            expect(reverseConverter).to.have.been.calledOnce;
                            done();
                        }, 0);
                    });
                });
                it('should pass through published value for single publish', (done)=> {
                    initWithNode('<input type="button" data-f-on-click="step(1, 2) | reverseArray"/>', domManager, channel).then(function ($node) {
                        $node.trigger('click');
                        setTimeout(()=> {
                            const args = reverseConverter.getCall(0).args[0];
                            expect(args).to.eql([1, 2]);
                            done();
                        }, 0);
                    });
                });
            });
            describe('multi publish operations', ()=> {
                it('should call converter once for last publish result', (done)=> {
                    initWithNode('<input type="button" data-f-on-click="step(1, 2) && reset | reverseArray"/>', domManager, channel).then(function ($node) {
                        $node.trigger('click');
                        setTimeout(()=> {
                            expect(reverseConverter).to.have.been.calledOnce;
                            done();
                        }, 0);
                    });
                });
                it('should pass through last published value for single publish', (done)=> {
                    initWithNode('<input type="button" data-f-on-click="reset && step(1, 2) | reverseArray"/>', domManager, channel).then(function ($node) {
                        $node.trigger('click');
                        setTimeout(()=> {
                            const args = reverseConverter.getCall(0).args[0];
                            expect(args).to.eql([1, 2]);
                            done();
                        }, 0);
                    });
                });
            });
        });
    });
});
