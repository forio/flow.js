import { notifySubscribeHandlers, notifyUnsubscribeHandlers, passthroughPublishInterceptors } from '../index';
import sinon from 'sinon';
import chai from 'chai';
chai.use(require('sinon-chai'));

const { expect } = chai;
describe('Channel Router', ()=> {
    describe('notifySubscribeHandlers', ()=> {
        it('should call the right handler matches', ()=> {
            const handler1 = sinon.spy();
            const handler2 = sinon.spy();
            const handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'a' : false, subscribeHandler: handler1 },
                { match: (v)=> v.indexOf('b') === 0 ? 'b' : false, subscribeHandler: handler2 },
            ]; 
            const topics = ['apple', 'ball'];
            notifySubscribeHandlers(handlers, topics);
            expect(handler1).to.have.been.calledWith(['pple'], {}, 'a');
            expect(handler2).to.have.been.calledWith(['all'], {}, 'b');
        });
        it('should merge options', ()=> {
            const handler1 = sinon.spy();
            const handler2 = sinon.spy();
            const handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'a' : false, subscribeHandler: handler1, options: { a: 1, b: 2 } },
                { match: (v)=> v.indexOf('b') === 0 ? 'b' : false, subscribeHandler: handler2, options: { b: 2 } },
            ]; 
            const topics = ['apple', 'ball'];
            notifySubscribeHandlers(handlers, topics, { b: 4, c: 3 });
            expect(handler1).to.have.been.calledWith(['pple'], { a: 1, b: 4, c: 3 }, 'a');
            expect(handler2).to.have.been.calledWith(['all'], { b: 4, c: 3 }, 'b');
        });
        it('should ignore subscribe requests with no matches', ()=> {
            const handler1 = sinon.spy();
            const handler2 = sinon.spy();
            const handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'a' : false, subscribeHandler: handler1 },
                { match: (v)=> v.indexOf('b') === 0 ? 'b' : false, subscribeHandler: handler2 },
            ]; 
            const topics = ['jungle'];
            notifySubscribeHandlers(handlers, topics);
            expect(handler1).to.have.not.been.called;
            expect(handler2).to.have.not.been.called;
        });

        describe('Promises', ()=> {
            it('should resolve promise with combined values', ()=> {
                const handler1 = sinon.spy((r)=> '1');
                const handler2 = sinon.spy((r)=> 2);

                const sucessSpy = sinon.spy(((r)=> r));
                const failSpy = sinon.spy(((r)=> r));
                const handlers = [
                    { match: (v)=> v.indexOf('a') === 0 ? 'a' : false, subscribeHandler: handler1, options: {} },
                    { match: (v)=> v.indexOf('b') === 0 ? 'b' : false, subscribeHandler: handler2, options: {} },
                ]; 
                const topics = ['apple', 'ball'];
                return notifySubscribeHandlers(handlers, topics, {}).then(sucessSpy).catch(failSpy).then((e)=> {
                    expect(failSpy).to.not.have.been.called;  
                    expect(sucessSpy).to.have.been.calledOnce;  
                    expect(sucessSpy).to.have.been.calledWith([{ name: 'apple', value: '1' }, { name: 'ball', value: 2 }]);
                });
            });
            it('should reject promise if any of the handlers fail', ()=> {
                const handler1 = sinon.spy();
                const handler2 = sinon.spy(()=> {
                    throw new Error('foo');
                });

                const sucessSpy = sinon.spy(((r)=> r));
                const failSpy = sinon.spy(((r)=> r));
                const handlers = [
                    { match: (v)=> v.indexOf('a') === 0 ? 'a' : false, subscribeHandler: handler1, options: {} },
                    { match: (v)=> v.indexOf('b') === 0 ? 'b' : false, subscribeHandler: handler2, options: {} },
                ]; 
                const topics = ['apple', 'ball'];
                return notifySubscribeHandlers(handlers, topics, {}).then(sucessSpy).catch(failSpy).then((e)=> {
                    expect(sucessSpy).to.not.have.been.called;  
                    expect(failSpy).to.have.been.calledOnce;  
                    expect(e.message).to.equal('foo');
                });
            });
        });
        
    });

    describe('notifyUnsubscribeHandlers', ()=> {
        it('should call the right handler matches', ()=> {
            const handler1 = sinon.spy();
            const handler2 = sinon.spy();
            const handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'a' : false, unsubscribeHandler: handler1 },
                { match: (v)=> v.indexOf('b') === 0 ? 'b' : false, unsubscribeHandler: handler2 },
            ]; 
            const unsubscribed = ['apple', 'ball'];
            const remainingTopics = ['bat', 'man', 'super'];

            notifyUnsubscribeHandlers(handlers, unsubscribed, remainingTopics);
            expect(handler1).to.have.been.calledOnce;
            expect(handler2).to.have.been.calledOnce;

            expect(handler1).to.have.been.calledWith(['pple'], []);
            expect(handler2).to.have.been.calledWith(['all'], ['at']);
        });
        it('should ignore unsubsribe requests with no matches', ()=> {
            const handler1 = sinon.spy();
            const handler2 = sinon.spy();
            const handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'a' : false, unsubscribeHandler: handler1 },
                { match: (v)=> v.indexOf('b') === 0 ? 'b' : false, unsubscribeHandler: handler2 },
            ]; 
            const unsubscribed = ['cat'];
            const remainingTopics = ['bat', 'man', 'super'];

            notifyUnsubscribeHandlers(handlers, unsubscribed, remainingTopics);
            expect(handler1).to.have.not.been.called;
            expect(handler2).to.have.not.been.called;
        });
    });

    describe('passthroughPublishInterceptors', ()=> {
        let ohyeahAdder, echoPublisher, handlers, emptyPublisher, promiseHandler;
        beforeEach(()=> {
            ohyeahAdder = sinon.spy(function (params) {
                return params.map((p)=> {
                    return { name: p.name + '-oh', value: p.value + '-yeah' };
                });
            });
            echoPublisher = sinon.spy((a)=> a);
            emptyPublisher = sinon.spy();
            promiseHandler = { 
                match: (v)=> v.indexOf('promise') === 0 ? '' : false, 
                publishHandler: sinon.spy((params)=> {
                    const ret = params.map((p)=> ({ name: `${p.name}-kept`, value: p.value }));
                    return Promise.resolve(ret);
                })
            };

            handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'a' : false, publishHandler: echoPublisher },
                { match: (v)=> v.indexOf('b') === 0 ? 'b' : false, publishHandler: ohyeahAdder },
                { match: (v)=> v.indexOf('x') === 0 ? 'x' : false, publishHandler: emptyPublisher },
                promiseHandler
            ]; 
        });

        it('should not mutate the input', ()=> {
            const toPublish = [{ name: 'apple', value: 1 }];
            const pubCopy = JSON.parse(JSON.stringify(toPublish));
            return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                expect(pubCopy).to.eql(toPublish);
            });
        });
        describe('Only Match', ()=> {
            it('should call only the right handler matches', ()=> {
                const toPublish = [{ name: 'apple', value: 1 }];
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(echoPublisher).to.have.been.calledOnce;
                    expect(ohyeahAdder).to.not.have.been.called;
                    expect(emptyPublisher).to.not.have.been.called;
                });
            });
            it('should return the response from publish function', ()=> {
                const toPublish = [{ name: 'ball', value: 1 }];
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(data).to.eql([{ name: 'ball-oh', value: '1-yeah' }]);
                });
            });
            it('should handle publish function returning promises', ()=> {
                const toPublish = [{ name: 'promiseMe', value: 1 }];
                return passthroughPublishInterceptors([promiseHandler], toPublish).then((data)=> {
                    expect(data).to.eql([{ name: 'promiseMe-kept', value: 1 }]);
                });
            });
        });
        describe('multi match', ()=> {
            it('should call matches in sequence', ()=> {
                const toPublish = [{ name: 'apple', value: 1 }, { name: 'ball', value: 1 }];
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(echoPublisher).to.have.been.calledOnce;
                    expect(ohyeahAdder).to.have.been.calledOnce;
                    expect(ohyeahAdder).to.have.been.calledAfter(echoPublisher);

                    expect(emptyPublisher).to.not.have.been.called;
                });
            });
            it('should pass through original values', ()=> {
                const toPublish = [{ name: 'ball', value: 1 }, { name: 'apple', value: 1 }];
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(ohyeahAdder).to.have.been.calledWith([{ name: 'all', value: 1 }]);
                    expect(echoPublisher).to.have.been.calledWith([{ name: 'pple', value: 1 }]);
                });
            });
            it('should merge responses together', ()=> {
                const toPublish = [{ name: 'ball', value: 1 }, { name: 'apple', value: 1 }, { name: 'promiseMe', value: 1 }];
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(data).to.eql([
                        { name: 'ball-oh', value: '1-yeah' },
                        { name: 'apple', value: 1 },
                        { name: 'promiseMe-kept', value: 1 }
                    ]);
                });
            });
        });
        describe('Partial matches', ()=> {
            it('should pass through original values', ()=> {
                const toPublish = [{ name: 'ball', value: 1 }, { name: 'apple', value: 1 }, { name: 'foo', value: 2 }];
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(ohyeahAdder).to.have.been.calledWith([{ name: 'all', value: 1 }]);
                    expect(echoPublisher).to.have.been.calledWith([{ name: 'pple', value: 1 }]);
                });
            });
            it('should ignore datasets it can\'t match', ()=> {
                const toPublish = [{ name: 'ball', value: 1 }, { name: 'apple', value: 1 }, { name: 'promiseMe', value: 1 }, { name: 'foo', value: 2 }];
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(data).to.eql([
                        { name: 'ball-oh', value: '1-yeah' },
                        { name: 'apple', value: 1 },
                        { name: 'promiseMe-kept', value: 1 },
                        { name: 'foo', value: 2 },
                    ]);
                });
            });
        });
        describe('grouping inputs', ()=> {
            let toPublish;
            beforeEach(()=> {
                toPublish = [
                    { name: 'ball', value: 1 }, 
                    { name: 'boop', value: 2 }, 
                    { name: 'foo', value: 2 },
                    { name: 'apple', value: 3 }, 
                    { name: 'amazon', value: 4 }, 
                ];
            }); 
            it('should not duplicate interceptor calls', ()=> {
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(ohyeahAdder).to.have.been.calledOnce;
                    expect(echoPublisher).to.have.been.calledOnce;
                    expect(emptyPublisher).to.not.have.been.called;
                });

            });
            it('should call interceptors with grouped inputs', ()=> {
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(ohyeahAdder).to.have.been.calledWith([{ name: 'all', value: 1 }, { name: 'oop', value: 2 }]);
                    expect(echoPublisher).to.have.been.calledWith([{ name: 'pple', value: 3 }, { name: 'mazon', value: 4 }]);
                });
            });
            it('should have outputs in the right order', ()=> {
                return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                    expect(data).to.eql([
                        { name: 'ball-oh', value: '1-yeah' }, 
                        { name: 'boop-oh', value: '2-yeah' }, 
                        { name: 'foo', value: 2 },
                        { name: 'apple', value: 3 }, 
                        { name: 'amazon', value: 4 }, 
                    ]);
                });
            });
        });

        describe('Options', ()=> {
            let toPublish;
            beforeEach(()=> {
                toPublish = [
                    { name: 'ball', value: 1 }, 
                    { name: 'foo', value: 2 },
                    { name: 'amazon', value: 4 }, 
                ];
            }); 
            describe('Readonly', ()=> {
                it('should not publish if called with readonly', ()=> {
                    return passthroughPublishInterceptors(handlers, toPublish, { readOnly: true }).then((data)=> {
                        expect(data).to.eql([]);
                        expect(ohyeahAdder).to.not.have.been.called;
                        expect(echoPublisher).to.not.have.been.called;
                    });
                });
                it('should not publish if readonly is specified in handler options', ()=> {
                    const handlers = [
                        { 
                            match: (v)=> v.indexOf('a') === 0 ? 'a' : false, 
                            publishHandler: ohyeahAdder,
                            options: { readOnly: true },
                        },
                        { match: (v)=> v.indexOf('b') === 0 ? 'b' : false, publishHandler: echoPublisher },
                    ]; 
                    return passthroughPublishInterceptors(handlers, toPublish).then((data)=> {
                        expect(data).to.eql([
                            { name: 'ball', value: 1 }, 
                            { name: 'foo', value: 2 },
                        ]);
                        expect(ohyeahAdder).to.not.have.been.called;
                        expect(echoPublisher).to.have.been.calledOnce;
                    });
                });
            });
            describe('Silent', ()=> {
                it('should not return response if called with silent', ()=> {
                    return passthroughPublishInterceptors(handlers, toPublish, { silent: true }).then((data)=> {
                        expect(data).to.eql([]);
                        expect(ohyeahAdder).to.have.been.calledOnce;
                        expect(echoPublisher).to.have.been.calledOnce;
                    });
                });
                it('should not return silenced data if called with silent array', ()=> {
                    return passthroughPublishInterceptors(handlers, toPublish, { silent: ['foo'] }).then((data)=> {
                        expect(data).to.eql([
                            { name: 'ball-oh', value: '1-yeah' }, 
                            { name: 'amazon', value: 4 }, 
                        ]);
                    });
                });
                it('should not return silenced data if called with silent object', ()=> {
                    //technically the inputs to this should be 'all' instead of 'all-oh', but changing the name is an edge-case i'm choosing to ignore
                    return passthroughPublishInterceptors(handlers, toPublish, { silent: { except: ['all-oh'] } }).then((data)=> {
                        expect(data).to.eql([
                            { name: 'ball-oh', value: '1-yeah' }, 
                        ]);
                    });
                });
            });
        });
    });
});
