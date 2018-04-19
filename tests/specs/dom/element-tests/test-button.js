import { initWithNode, createDummyChannel, spyOnNode } from 'tests/testing-utils';
import domManager from 'src/dom/dom-manager';

import sinon from 'sinon';
import chai from 'chai';
chai.use(require('sinon-chai'));

const { expect } = chai;

describe('button', function () {
    it('should call operation with single params', function () {
        var channel = createDummyChannel();
        return initWithNode('<input type="button" data-f-on-click="step(1)"/>', domManager, channel).then(function ($node) {
            $node.trigger('click');
            channel.publish.should.have.been.calledWith([{ name: 'operations:step', value: [1] }]);
        });
    });

    it('should call operation with double params', function () {
        var channel = createDummyChannel();
        return initWithNode('<input type="button" data-f-on-click="step(1, 2)"/>', domManager, channel).then(function ($node) {
            $node.trigger('click');
            channel.publish.should.have.been.calledWith([{ name: 'operations:step', value: [1, 2] }]);
        });
    });

    it('should call operation with double params with no, string ', function () {
        var channel = createDummyChannel();
        return initWithNode('<input type="button" data-f-on-click="step(1, abc)"/>', domManager, channel).then(function ($node) {
            $node.trigger('click');
            channel.publish.should.have.been.calledWith([{ name: 'operations:step', value: [1, 'abc'] }]);
        });
    });

    it('should call operation with double params with no, implied string ', function () {
        var channel = createDummyChannel();
        return initWithNode('<input type="button" data-f-on-click="step(1,\'2\')"/>', domManager, channel).then(function ($node) {
            $node.trigger('click');
            channel.publish.should.have.been.calledWith([{ name: 'operations:step', value: [1, '2'] }]);
        });
    });

    it('should call multiple operations with &&', function () {
        var channel = createDummyChannel();
        return initWithNode('<input type="button" data-f-on-click="step(1, 2) && reset()"/>', domManager, channel).then(function ($node) {
            $node.trigger('click');
            channel.publish.should.have.been.calledWith([
                { name: 'operations:step', value: [1, 2] },
                { name: 'operations:reset', value: [] }]);
        });
    });

    it('should call operation with double params with no object', function () {
        var channel = createDummyChannel();
        return initWithNode(`
                <input type="button" data-f-on-click='step(1, {"hello": "world" })'/>
            `, domManager, channel).then(function ($node) {
            $node.trigger('click');
            channel.publish.should.have.been.calledWith([{ name: 'operations:step', value: [1, { hello: 'world' }] }]);
        });
    });

    describe('Converter passthroughs', ()=> {
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
                it('should call parser once for single publish', (done)=> {
                    const channel = createDummyChannel();
                    initWithNode('<input type="text" data-f-bind="Price | $#,###.00"/>', domManager, channel).then(function ($node) {
                        $node.val('$500').trigger('change');

                        expect(channel.publish).to.have.been.calledWith([
                            { name: 'Price', value: 500 },
                        ]);
                        setTimeout(()=> {
                            expect($node.val()).to.equal('$500.00');
                            done();
                        }, 0);
                    });
                });
                
                it('should call parser once for single publish', ()=> {
                    const channel = createDummyChannel();
                    return initWithNode('<input type="button" data-f-on-click="step(1, 2) | reverseArray"/>', domManager, channel).then(function ($node) {
                        $node.trigger('click');
                        expect(reverseParser.parse).to.have.been.calledOnce;
                    });
                });
                it('should pass through published value for single publish', ()=> {
                    const channel = createDummyChannel();
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
                    const channel = createDummyChannel();
                    return initWithNode('<input type="button" data-f-on-click="step(1, 2) && reset | reverseArray"/>', domManager, channel).then(function ($node) {
                        $node.trigger('click');
                        expect(reverseParser.parse).to.have.been.calledTwice;
                    });
                });
                it('should pass through last published value for single publish', ()=> {
                    const channel = createDummyChannel();
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
                    const channel = createDummyChannel();
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
                    const channel = createDummyChannel();
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
                    const channel = createDummyChannel();
                    initWithNode('<input type="button" data-f-on-click="step(1, 2) && reset | reverseArray"/>', domManager, channel).then(function ($node) {
                        $node.trigger('click');
                        setTimeout(()=> {
                            expect(reverseConverter).to.have.been.calledOnce;
                            done();
                        }, 0);
                    });
                });
                it('should pass through last published value for single publish', (done)=> {
                    const channel = createDummyChannel();
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
