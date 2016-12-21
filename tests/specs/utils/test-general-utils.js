'use strict';
var lolex = require('lolex');

var debounce = require('src/utils/general').debounceWithStore;

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
            var spy1 = sinon.spy();
            var debounced = debounce(spy1, 200);
            
            debounced();
            expect(spy1).to.not.have.been.called;
        });
        it('should call function after a timeperid', ()=> {
            var spy1 = sinon.spy();
            var debounced = debounce(spy1, 200);
           
            debounced();

            clock.tick(201);
            expect(spy1).to.have.been.calledOnce; 
        });
        it('should only call function once', ()=> {
            var spy1 = sinon.spy();
            var debounced = debounce(spy1, 200);
            debounced();
            clock.tick(501);
            expect(spy1).to.have.been.calledOnce; 
        });
        it('should hold the door for multiple calls', ()=> {
            var spy1 = sinon.spy();
            var debounced = debounce(spy1, 200);

            debounced();
            clock.tick(100);
            debounced();
            clock.tick(100);
            expect(spy1).to.have.not.have.been.called; 
            clock.tick(100);
            expect(spy1).to.have.have.been.calledOnce; 
        });
        it('should concatenate multiple arguments', ()=> {
            var spy1 = sinon.spy();
            var debounced = debounce(spy1, 200);

            debounced([1]);
            clock.tick(100);
            debounced([2]);
            clock.tick(200);
            clock.tick(100);
            expect(spy1).to.have.have.been.calledWith([1, 2]); 
        });
        it('should clear arguments after being called once', ()=> {
            var spy1 = sinon.spy();
            var debounced = debounce(spy1, 200);

            debounced([1]);
            clock.tick(100);
            debounced([2]);
            clock.tick(200);
            clock.tick(100);
            expect(spy1).to.have.have.been.calledWith([1, 2]); 
            debounced([2]);
            clock.tick(200);
            expect(spy1).to.have.have.been.calledWith([2]); 
        });
    });
});
