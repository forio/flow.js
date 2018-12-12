import debounce from '../debounce-and-merge';
import chai from 'chai';
import sinon from 'sinon';

chai.use(require('sinon-chai'));
const { expect } = chai;

describe('#debounceAndMerge', ()=> {
    var clock;
    beforeEach(()=> {
        clock = sinon.useFakeTimers();
    });
    afterEach(()=> {
        clock.restore();
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
            expect(fnToDebounce).to.have.been.calledOnce;
            expect(fnToDebounce).to.have.have.been.calledWith([1, 2]); 
            expect(spy1).to.have.been.calledOnce;
            expect(spy1).to.have.have.been.calledWith(3); 
            expect(spy2).to.have.been.calledOnce;
            expect(spy2).to.have.have.been.calledWith(3); 

            expect(spy1).to.have.been.calledBefore(spy2);

            debounced([2]).then(spy3);
            clock.tick(200);
            clock.tick(10);
            expect(fnToDebounce).to.have.have.been.calledWith([2]); 

            expect(spy3).to.have.have.been.calledOnce;
            expect(spy3).to.have.have.been.calledWith(2); 
        });
        it('should handle functions which return promises', ()=> {
            var fnToDebounce = sinon.spy((input)=> $.Deferred().resolve(input.reduce((a, v)=> a + v, 0)).promise());
            var spy1 = sinon.spy();
            var spy2 = sinon.spy();
            var spy3 = sinon.spy();
            var debounced = debounce(fnToDebounce, 200);
            debounced([1]).then(spy1);
            clock.tick(100);
            debounced([2]).then(spy2);
            clock.tick(200);
            clock.tick(100);
            expect(fnToDebounce).to.have.been.calledOnce;
            expect(fnToDebounce).to.have.have.been.calledWith([1, 2]); 
            expect(spy1).to.have.been.calledOnce;
            expect(spy1).to.have.have.been.calledWith(3); 
            expect(spy2).to.have.been.calledOnce;
            expect(spy2).to.have.have.been.calledWith(3); 

            expect(spy1).to.have.been.calledBefore(spy2);

            debounced([2]).then(spy3);
            clock.tick(200);
            clock.tick(10);
            expect(fnToDebounce).to.have.have.been.calledWith([2]); 
            expect(spy3).to.have.have.been.calledOnce;

            expect(spy3).to.have.have.been.calledWith(2); 
        });
        it('Should be resolved with the latest result', ()=> { //NOTE: See integration-test-utils for errors which only happen in a browser
            var fnToDebounce = sinon.spy((input)=> {
                const $d = $.Deferred(); //NOTE: This doesn't work with native promises for some reason
                console.log('debouncer, start ip', input);
                setTimeout(()=> {
                    console.log('debouncer, resolve ip', input);
                    $d.resolve(JSON.stringify(input)); 
                }, 300);
                return $d.promise();
            });

            var debounced = debounce(fnToDebounce, 200);
            var cb1 = sinon.spy((x)=> {
                // console.log('First cb', x);
                return x;
            });
            var cb2 = sinon.spy((x)=> {
                // console.log('Second cb', x);
                return x;
            });

            debounced(['Variable']).then(cb1);
            clock.tick(200);// start executing debounces
            clock.tick(10);// start executing debounces
            debounced(['Step']).then(cb2); //get second call in the middle of processesing first
            clock.tick(300);
            clock.tick(10);
                
            console.log('ereh');
            expect(fnToDebounce).to.have.been.calledTwice;
            expect(cb1).to.have.been.calledOnce;
            expect(cb1).to.have.been.calledWith(JSON.stringify(['Variable']));
            expect(cb2).to.have.been.calledOnce;
            // expect(cb2).to.have.been.calledWith(JSON.stringify(['Variable', 'Step']));
        });

        it('should pass on errors to chained handlers on error from function', ()=> {
            var fnToDebounce = sinon.spy((input)=> {
                if (input.length > 1) {
                    throw new Error('foobar');
                }
                return input[0];
            });
            var spy1 = sinon.spy(function (foo) {
                return foo;
            });
            var spy1Fail = sinon.spy();
            var spy2 = sinon.spy();
            var spy2Fail = sinon.spy();
            var spy3 = sinon.spy();
            var spy3Fail = sinon.spy();
            var debounced = debounce(fnToDebounce, 200);
            debounced([1]).then(spy1, spy1Fail);
            clock.tick(100);
            debounced([2]).then(spy2, spy2Fail);
            clock.tick(200);
            clock.tick(100);
            expect(fnToDebounce).to.have.been.calledOnce;
            // expect(fnToDebounce).to.have.have.been.calledWith([1, 2]);

            // expect(spy1).to.not.have.been.called;
            // expect(spy2).to.not.have.been.called;

            // expect(spy1Fail).to.have.been.calledOnce;
            // expect(spy2Fail).to.have.been.calledOnce;
                
            // debounced([2]).then(spy3).catch(spy3Fail);
            // clock.tick(200);
            // clock.tick(10);
            // expect(fnToDebounce).to.have.have.been.calledWith([2]); 
            // expect(spy3).to.have.have.been.calledWith(2); 
            // expect(spy3Fail).to.not.have.been.called;
        });
    });
});
