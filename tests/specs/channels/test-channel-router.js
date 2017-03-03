import { notifySubscribeHandlers } from 'src/channels/middleware/channel-router';

describe('Channel Router', ()=> {
    describe('notifySubscribeHandlers', ()=> {
        it('should call the right handler matches', ()=> {
            var handler1 = sinon.spy();
            var handler2 = sinon.spy();
            var handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'a' : false, subscribeHandler: handler1 },
                { match: (v)=> v.indexOf('b') === 0 ? 'b' : false, subscribeHandler: handler2 },
            ]; 
            var topics = ['apple', 'ball'];
            notifySubscribeHandlers(handlers, topics);
            expect(handler1).to.have.been.calledWith(['pple'], 'a');
        });
    });
});
