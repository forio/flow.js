import ChannelManager from 'channels/channel-manager';
import routable from '../index';

import sinon from 'sinon';
import chai from 'chai';
chai.use(require('sinon-chai'));

const { expect } = chai;

function makeMockChannelManager(pubSpy, subsSpy) {
    return class MockChannelManager {
        constructor() {
            this.publish = pubSpy || sinon.spy((p)=> Promise.resolve(p));
            this.subscribe = subsSpy || sinon.spy(()=> 'subsid');
            this.unsubscribe = ()=> {};
            this.notify = ()=> {};
        }
    };
}

function makeMockRouter() {
    const mockRouter = sinon.spy(function () {
        return {
            subscribeHandler: sinon.spy(()=> Promise.resolve([])),
            publishHandler: sinon.spy((ip)=> Promise.resolve(ip)),
            unsubscribeHandler: sinon.spy(()=> Promise.resolve()),
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
    
});
