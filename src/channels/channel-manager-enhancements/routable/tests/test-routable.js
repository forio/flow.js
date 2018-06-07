import OriginalChannelManager from 'channels/channel-manager';

import routable from '../index';

import sinon from 'sinon';
import chai from 'chai';
chai.use(require('sinon-chai'));

const { expect } = chai;

function makeMockChannelManager(pubSpy, subsSpy) {
    function MockChannelManager() {
        this.subscriptions = [];
    }
    MockChannelManager.prototype.subscribe = sinon.spy(()=> 'subsid');
    MockChannelManager.prototype.publish = sinon.spy((ip)=> Promise.resolve(ip));
    MockChannelManager.prototype.notify = sinon.spy();
    MockChannelManager.prototype.unsubscribe = sinon.spy();

    return MockChannelManager;
}

function makeMockRouter(subsSpy, pubSpy, unsubsSpy) {
    const mockRouter = sinon.spy(function () {
        return {
            subscribeHandler: subsSpy || sinon.spy(()=> Promise.resolve([])),
            publishHandler: pubSpy || sinon.spy((ip)=> Promise.resolve(ip)),
            unsubscribeHandler: unsubsSpy || sinon.spy(()=> Promise.resolve()),
        };
    });
    return mockRouter;
}
describe('routable', ()=> {
    describe('options', ()=> {
        it('should pass options in routes to router', ()=> {
            // const cm = 
        });
    });
    describe('#subscribe', ()=> {
        function makeRouter(subsSpy, mockCM) {
            if (!mockCM) {
                mockCM = makeMockChannelManager();
            }
            const mockRouter = makeMockRouter(subsSpy);

            const RoutableCM = routable(mockCM, mockRouter);
            const routableCM = new RoutableCM();
            return routableCM;
        }

        it('should return subs id', ()=> {
            const routableCM = makeRouter();
            const subsid = routableCM.subscribe('foobar', ()=> {});
            expect(subsid).to.equal('subsid');
        });
        it('should call subscribeHandler on the router with topics', ()=> {
            const routableCM = makeRouter();

            const options = { test: 1 };
            routableCM.subscribe('foobar', ()=> {}, options);
            expect(routableCM.router.subscribeHandler).to.have.been.calledOnce;
            expect(routableCM.router.subscribeHandler).to.have.been.calledWith(['foobar'], options);
        });
        it('should call notify if routerSubshandler returns response', (done)=> {
            const mockCM = makeMockChannelManager();
            const response = [{ name: 'foo', value: 'bar' }];
            const subsReturningData = sinon.spy(()=> Promise.resolve(response));
            const routableCM = makeRouter(subsReturningData, mockCM);

            const options = { test: 1 };
            routableCM.subscribe('foobar', ()=> {}, options);
            setTimeout(()=> {
                expect(mockCM.prototype.notify).to.have.been.calledOnce;
                expect(mockCM.prototype.notify).to.have.been.calledWith(response);
                done();
            }, 0);
        });
        it('should unsubscribe if routerSubsHandler throws an error', (done)=> {
            const rejectingSubs = sinon.spy(()=> Promise.reject('foobar'));
            const routableCM = makeRouter(rejectingSubs);
            
            const unsubsSpy = sinon.spy();
            sinon.stub(routableCM, 'unsubscribe').callsFake(unsubsSpy);

            const options = { test: 1 };
            const subsid = routableCM.subscribe('foobar', ()=> {}, options);
            setTimeout(()=> {
                expect(unsubsSpy).to.have.been.calledOnce;
                expect(unsubsSpy).to.have.been.calledWith(subsid);
                done();
            }, 0);
        });
        it('should not call notify if router subshandler returns nothing', (done)=> {
            const mockCM = makeMockChannelManager();
            
            const subsReturningNothing = sinon.spy(()=> Promise.resolve(undefined));
            const routableCM = makeRouter(subsReturningNothing);

            const options = { test: 1, onError: sinon.spy() };
            routableCM.subscribe('foobar', ()=> {}, options);
            setTimeout(()=> {
                expect(mockCM.prototype.notify).to.not.have.been.called;
                expect(options.onError).to.not.have.been.called;
                done();
            }, 0);
        });

        it('should call onError if provided', (done)=> {
            const rejectingSubs = sinon.spy(()=> Promise.reject('foobar'));
            const routableCM = makeRouter(rejectingSubs);
            
            const unsubsSpy = sinon.spy();
            sinon.stub(routableCM, 'unsubscribe').callsFake(unsubsSpy);

            const options = { test: 1, onError: sinon.spy() };
            routableCM.subscribe('foobar', ()=> {}, options);
            setTimeout(()=> {
                expect(options.onError).to.have.been.calledOnce;
                expect(options.onError).to.have.been.calledWith('foobar');
                done();
            }, 0);
        });
    });
    describe('#publish', ()=> {
        function makeRouter(pubSpy, mockCM) {
            if (!mockCM) {
                mockCM = makeMockChannelManager();
            }
            const mockRouter = makeMockRouter(null, pubSpy);
            const RoutableCM = routable(mockCM, mockRouter);
            const routableCM = new RoutableCM();
            return routableCM;
        }

        it('should call router publish handler with normalized inputs', ()=> {
            const toPublish = [{ name: 'foo', value: 'bar' }];
            const options = { silent: true };
            const routableCM = makeRouter();

            return routableCM.publish(toPublish, options).then((d)=> {
                expect(d).to.eql(toPublish);
                expect(routableCM.router.publishHandler).to.have.been.calledOnce;
                expect(routableCM.router.publishHandler).to.have.been.calledWith(toPublish, options);
            });

        });
        it('should call parent publish with response from router', ()=> {
            const mockCM = makeMockChannelManager();
            const toPublish = [{ name: 'foo', value: 'bar' }];
            const publishReponse = [{ name: 'fooBar', value: 'barFoo' }];
            const options = { silent: true };
            const routableCM = makeRouter(sinon.spy(()=> {
                return Promise.resolve(publishReponse);
            }), mockCM);

            return routableCM.publish(toPublish, options).then((d)=> {
                expect(d).to.eql(publishReponse);
                expect(mockCM.prototype.publish).to.have.been.calledOnce;
                expect(mockCM.prototype.publish).to.have.been.calledWith(publishReponse, options);
            });
        });
        it('should reject if router publish fails', ()=> {
            const mockCM = makeMockChannelManager();
            const toPublish = [{ name: 'foo', value: 'bar' }];
            const options = { silent: true };
            const routableCM = makeRouter(sinon.spy(()=> {
                return Promise.reject('foobar');
            }), mockCM);

            const successSpy = sinon.spy();
            const failSpy = sinon.spy();
            return routableCM.publish(toPublish, options).then(successSpy, failSpy).then((d)=> {
                expect(successSpy).to.not.have.been.called;
                expect(failSpy).to.have.been.calledOnce;
                expect(failSpy).to.have.been.calledWith('foobar');
                expect(mockCM.prototype.publish).to.not.have.been.called;
            });
        });
    });
    describe('#unsubscribe', ()=> {
        function makeRouter(unsubsSpy, mockCM) {
            if (!mockCM) {
                mockCM = makeMockChannelManager();
            }
            const mockRouter = makeMockRouter(null, null, unsubsSpy);
            const RoutableCM = routable(mockCM, mockRouter);
            const routableCM = new RoutableCM();
            return routableCM;
        }

        it('should pass token to cm unsubscribe', ()=> {
            const mockCM = makeMockChannelManager();
            const routableCM = makeRouter(sinon.spy(), mockCM); 
            routableCM.unsubscribe('foobar');

            expect(mockCM.prototype.unsubscribe).to.have.been.calledWith('foobar');
        });
        it('should call router with unsubscribed topics', ()=> {
            const routableCM = makeRouter(sinon.spy(), OriginalChannelManager); 
            const cb = ()=> {};
            const subs1 = routableCM.subscribe(['apples', 'bananas'], cb);
            const subs2 = routableCM.subscribe(['carrots', 'bananas'], cb);
            const subs3 = routableCM.subscribe(['donuts', 'eggs'], cb);

            routableCM.unsubscribe(subs2);

            expect(routableCM.router.unsubscribeHandler).to.have.been.calledWith(['carrots'], ['apples', 'bananas', 'donuts', 'eggs']);
            routableCM.unsubscribe(subs1);
            expect(routableCM.router.unsubscribeHandler).to.have.been.calledWith(['apples', 'bananas'], ['donuts', 'eggs']);
            routableCM.unsubscribe(subs3);
            expect(routableCM.router.unsubscribeHandler).to.have.been.calledWith(['donuts', 'eggs'], []);
        });
    });
    describe('#unsubscribeAll', ()=> {
        function makeRouter(unsubsSpy, mockCM) {
            if (!mockCM) {
                mockCM = makeMockChannelManager();
            }
            const mockRouter = makeMockRouter(null, null, unsubsSpy);
            const RoutableCM = routable(mockCM, mockRouter);
            const routableCM = new RoutableCM();
            return routableCM;
        }
        it('should call router will all unsubscribed topics', ()=> {
            const routableCM = makeRouter(sinon.spy(), OriginalChannelManager); 
            const cb = ()=> {};
            
            routableCM.subscribe(['apples', 'bananas'], cb);
            routableCM.subscribe(['carrots', 'bananas'], cb);
            routableCM.subscribe(['donuts', 'eggs'], cb);

            routableCM.unsubscribeAll();
            expect(routableCM.router.unsubscribeHandler).to.have.been.calledWith(['apples', 'bananas', 'carrots', 'donuts', 'eggs'], []);
        });
    });
});
