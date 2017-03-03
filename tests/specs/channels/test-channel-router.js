import { notifySubscribeHandlers, notifyUnsubscribeHandlers } from 'src/channels/middleware/channel-router';

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
            expect(handler2).to.have.been.calledWith(['all'], 'b');
        });
        it('should ignore subsribe requests with matches', ()=> {
            var handler1 = sinon.spy();
            var handler2 = sinon.spy();
            var handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'a' : false, subscribeHandler: handler1 },
                { match: (v)=> v.indexOf('b') === 0 ? 'b' : false, subscribeHandler: handler2 },
            ]; 
            var topics = ['jungle'];
            notifySubscribeHandlers(handlers, topics);
            expect(handler1).to.have.not.been.called;
            expect(handler2).to.have.not.been.called;
        });
    });

    describe('notifyUnsubscribeHandlers', ()=> {
        it('should call the right handler matches', ()=> {
            var handler1 = sinon.spy();
            var handler2 = sinon.spy();
            var handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'a' : false, unsubscribeHandler: handler1 },
                { match: (v)=> v.indexOf('b') === 0 ? 'b' : false, unsubscribeHandler: handler2 },
            ]; 
            var unsubscribed = ['apple', 'ball'];
            var remainingTopics = ['bat', 'man', 'super'];

            notifyUnsubscribeHandlers(handlers, unsubscribed, remainingTopics);
            expect(handler1).to.have.been.calledWith(['pple'], []);
            expect(handler2).to.have.been.calledWith(['all'], ['at']);
        });
        it('should ignore unsubsribe requests with no matches', ()=> {
            var handler1 = sinon.spy();
            var handler2 = sinon.spy();
            var handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'a' : false, unsubscribeHandler: handler1 },
                { match: (v)=> v.indexOf('b') === 0 ? 'b' : false, unsubscribeHandler: handler2 },
            ]; 
            var unsubscribed = ['cat'];
            var remainingTopics = ['bat', 'man', 'super'];

            notifyUnsubscribeHandlers(handlers, unsubscribed, remainingTopics);
            expect(handler1).to.have.not.been.called;
            expect(handler2).to.have.not.been.called;
        });
    });
});
