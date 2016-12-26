'use strict';
var lolex = require('lolex');

var debounce = require('src/utils/general').debounceAndMerge;

describe('Test general utils', ()=> {
    describe('#debounceWithStore', ()=> {
        var clock;
        beforeEach(()=> {
            clock = lolex.install();
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
        it('should concatenate multiple arguments', ()=> {
            var fnToDebounce = sinon.spy();
            var debounced = debounce(fnToDebounce, 200);

            debounced([1]);
            clock.tick(100);
            debounced([2]);
            clock.tick(200);
            clock.tick(100);
            expect(fnToDebounce).to.have.have.been.calledWith([1, 2]); 
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
            debounced([2]);
            clock.tick(200);
            expect(fnToDebounce).to.have.have.been.calledWith([2]); 
        });
        describe('promise', ()=> {
            it('should return a promise', ()=> {
                var fnToDebounce = sinon.spy();
                var prom = debounce(fnToDebounce, 200)();
                expect(prom.then).to.exist;
            });
            it('should resolve when debounced function is called', ()=> {
                var fnToDebounce = sinon.spy((input)=> input.reduce((a, v)=> a + v, 0));
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
