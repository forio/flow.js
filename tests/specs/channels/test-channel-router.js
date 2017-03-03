import { notifySubscribeHandlers, notifyUnsubscribeHandlers, passthroughPublishInterceptors } from 'src/channels/middleware/channel-router';

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

    describe.only('passthroughPublishInterceptors', ()=> {
        var ohyeahMiddleware, echoMiddleware, handlers, rejecterMiddleware, emptyMiddleware, channel;
        beforeEach(()=> {
            ohyeahMiddleware = sinon.spy(function (params) {
                return params.map((p)=> {
                    return { name: p.name + '-oh', value: p.value + '-yeah' };
                });
            });
            echoMiddleware = sinon.spy((a)=> a);
            emptyMiddleware = sinon.spy();
            rejecterMiddleware = sinon.spy(function () {
                return $.Deferred().reject().promise();
            });

            handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'a' : false, publishHandler: echoMiddleware },
                { match: (v)=> v.indexOf('b') === 0 ? 'b' : false, publishHandler: ohyeahMiddleware },
            ]; 
        });

        it('should not mutate the input', ()=> {
            var toPublish = [{ name: 'apple', value: 1 }];
            var pubCopy = JSON.parse(JSON.stringify(toPublish));
            return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                expect(pubCopy).to.eql(toPublish);
            });
        });
        describe('Only Match', ()=> {
            it('should call only the right handler matches', ()=> {
                var toPublish = [{ name: 'apple', value: 1 }];
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(echoMiddleware).to.have.been.calledOnce;
                    expect(ohyeahMiddleware).to.not.have.been.called;
                });
            });
            it('should return the return from middleware', ()=> {
                var toPublish = [{ name: 'apple', value: 1 }];
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(data).to.eql(toPublish);
                });
            });
        });
        describe('multi match', ()=> {
            it('should call matches in sequence', ()=> {
                var toPublish = [{ name: 'apple', value: 1 }, { name: 'ball', value: 1 }];
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(echoMiddleware).to.have.been.calledOnce;
                    expect(ohyeahMiddleware).to.have.been.calledOnce;
                    expect(ohyeahMiddleware).to.have.been.calledAfter(echoMiddleware);
                });
            });
            it('should pass through original values', ()=> {
                var toPublish = [{ name: 'ball', value: 1 }, { name: 'apple', value: 1 }];
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(ohyeahMiddleware).to.have.been.calledWith([{ name: 'all', value: 1 }]);
                    expect(echoMiddleware).to.have.been.calledWith([{ name: 'pple', value: 1 }]);
                });
            });
            it('should merge responses together', ()=> {
                var toPublish = [{ name: 'ball', value: 1 }, { name: 'apple', value: 1 }];
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(data).to.eql([
                        { name: 'ball-oh', value: '1-yeah' },
                        { name: 'apple', value: 1 },
                    ]);
                });
            });
        });
        describe('Partial matches', ()=> {
            it('should pass through original values', ()=> {
                var toPublish = [{ name: 'ball', value: 1 }, { name: 'apple', value: 1 }, { name: 'foo', value: 2 }];
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(ohyeahMiddleware).to.have.been.calledWith([{ name: 'all', value: 1 }]);
                    expect(echoMiddleware).to.have.been.calledWith([{ name: 'pple', value: 1 }]);
                });
            });
            it('should ignore datasets it can\'t match', ()=> {
                var toPublish = [{ name: 'ball', value: 1 }, { name: 'apple', value: 1 }, { name: 'foo', value: 2 }];
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(data).to.eql([
                        { name: 'ball-oh', value: '1-yeah' },
                        { name: 'apple', value: 1 },
                        { name: 'foo', value: 2 },
                    ]);
                });
            });
        });

    });
});
