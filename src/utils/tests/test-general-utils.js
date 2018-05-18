//moving this into the specs folder throws errors for some reason, probably because sinon.
import { install } from 'lolex';
import { debounceAndMerge as debounce } from '../general';
import chai from 'chai';
import sinon from 'sinon';

chai.use(require('sinon-chai'));
const { expect } = chai;

describe('Test general utils', ()=> {
    describe('#debounceWithStore', ()=> {
        var clock;
        beforeEach(()=> {
            clock = install();
        });
        afterEach(()=> {
            clock.uninstall();
        });

        it('should not call original function immediately', ()=> {
            var fnToDebounce = sinon.spy();
            var debounced = debounce(fnToDebounce, 200);
            
            debounced();
            expect(fnToDebounce).to.not.have.been.called;
        });
        it('should call function after a timeperid', ()=> {
            var fnToDebounce = sinon.spy();
            var debounced = debounce(fnToDebounce, 200);
           
            debounced();

            clock.tick(201);
            expect(fnToDebounce).to.have.been.calledOnce; 
        });
        it('should only call function once', ()=> {
            var fnToDebounce = sinon.spy();
            var debounced = debounce(fnToDebounce, 200);
            debounced();
            clock.tick(501);
            expect(fnToDebounce).to.have.been.calledOnce; 
        });
        it('should hold the door for multiple calls', ()=> {
            var fnToDebounce = sinon.spy();
            var debounced = debounce(fnToDebounce, 200);

            debounced();
            clock.tick(100);
            debounced();
            clock.tick(100);
            expect(fnToDebounce).to.have.not.have.been.called; 
            clock.tick(100);
            expect(fnToDebounce).to.have.have.been.calledOnce; 
        });
        it('should concatenate multiple arguments with default reducer', ()=> {
            var fnToDebounce = sinon.spy();
            var debounced = debounce(fnToDebounce, 200);

            debounced([1]);
            clock.tick(100);
            debounced([2]);
            clock.tick(200);
            clock.tick(100);
            expect(fnToDebounce).to.have.have.been.calledWith([1, 2]); 
        });
        it('should should allow passing in custom reducers', ()=> {
            var fnToDebounce = sinon.spy(function (a) {
                // console.log('final ip', arguments);
            });
            var customReducer = function (memo, val) {
                // console.log(arguments);
                return val.split('').reverse().join('');
            };
            var debounced = debounce(fnToDebounce, 200, [customReducer]);
            debounced('apple');
            clock.tick(100);
            debounced('sauce');
            clock.tick(200);
            clock.tick(100);
            expect(fnToDebounce).to.have.have.been.calledWith('ecuas'); 
        });
        it('should clear arguments after being called once', ()=> {
            var fnToDebounce = sinon.spy();
            var debounced = debounce(fnToDebounce, 200);

            debounced([1]);
            clock.tick(100);
            debounced([2]);
            clock.tick(200);
            clock.tick(100);
            expect(fnToDebounce).to.have.have.been.calledWith([1, 2]); 
            debounced([3]);
            clock.tick(100);
            debounced([4]);
            clock.tick(200);
            clock.tick(100);
            expect(fnToDebounce).to.have.have.been.calledWith([3, 4]); 
        });
        describe('promise', ()=> {
            it('should return a promise', ()=> {
                var fnToDebounce = sinon.spy();
                var prom = debounce(fnToDebounce, 200)();
                expect(prom.then).to.exist;
            });
            it('should call all chained callbacks in the right order', ()=> {
                var fnToDebounce = sinon.spy((input)=> input.reduce((a, v)=> a + v, 0));
                var spy1 = sinon.spy();
                var spy2 = sinon.spy();
                var spy3 = sinon.spy();
                var debounced = debounce(fnToDebounce, 200);
                debounced([1]).then(spy1);
                clock.tick(100);
                debounced([2]).then(spy2);
                clock.tick(200);
                clock.tick(100);
                expect(fnToDebounce).to.have.have.been.calledWith([1, 2]); 
                expect(spy1).to.have.been.calledOnce;
                expect(spy1).to.have.have.been.calledWith(3); 
                expect(spy2).to.have.been.calledOnce;
                expect(spy2).to.have.have.been.calledWith(3); 

                expect(spy1).to.have.been.calledBefore(spy2);

                debounced([2]).then(spy3);
                clock.tick(201);
                expect(fnToDebounce).to.have.have.been.calledWith([2]); 
                expect(spy3).to.have.have.been.calledWith(2); 
            });
            it.skip('should handle functions which return promises', ()=> {
                //FIXME: the funcationality works but the test is wrong
                var fnToDebounce = sinon.spy((input)=> $.Deferred().resolve(input.reduce((a, v)=> a + v, 0)).promise());
                var spy2 = sinon.spy();
                var spy3 = sinon.spy();
                var debounced = debounce(fnToDebounce, 200);
                debounced([1]).then(spy2);
                clock.tick(100);
                debounced([2]).then(spy2);
                clock.tick(200);
                clock.tick(100);
                expect(fnToDebounce).to.have.have.been.calledWith([1, 2]); 
                expect(spy2).to.have.been.calledOnce;
                expect(spy2).to.have.have.been.calledWith(3); 
                debounced([2]).then(spy3);
                clock.tick(201);
                expect(fnToDebounce).to.have.have.been.calledWith([2]); 
                expect(spy3).to.have.have.been.calledWith(2); 
            });
        });
    });
});
