import { initWithNode, createDummyChannel, spyOnNode } from '../../../tests/testing-utils';
import domManager from '../dom-manager';

import sinon from 'sinon';
import chai from 'chai';
chai.use(require('sinon-chai'));

import { expect } from 'chai';

describe('UI Change Event', ()=> {
    var channel;
    beforeEach(()=> {
        channel = createDummyChannel();
    });
    describe('Bound element change', ()=> {
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
