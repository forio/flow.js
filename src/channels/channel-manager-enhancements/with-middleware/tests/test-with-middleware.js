import ChannelManager from 'channels/channel-manager';
import withMidddleware from '../index';

var ChannelWithMiddleware = withMidddleware(ChannelManager);
function noop() {}

describe('Middleware', ()=> {
    describe('Publish Middleware', ()=> {
        var m1, echoMiddleware, rejecterMiddleware, emptyMiddleware, channel;
        beforeEach(()=> {
            m1 = sinon.spy(function (params) {
                return params.map((p)=> {
                    return { name: p.name + '-oh', value: p.value + '-yeah' };
                });
            });
            echoMiddleware = sinon.spy((a)=> a);
            emptyMiddleware = sinon.spy();
            rejecterMiddleware = sinon.spy(function () {
                return $.Deferred().reject().promise();
            });
            channel = new ChannelWithMiddleware({
                middlewares: [{ publishHandler: m1 }, { publishHandler: echoMiddleware }]
            });
        });
        it('should be settable in the constructor', ()=> {
            expect(channel.middlewares.filter('publish')).to.eql([m1, echoMiddleware]);
        });
        it('should be called in the right order each time there\'s a publish call', ()=> {
            return channel.publish({ foo: 'bar' }).then(()=> {
                expect(m1).to.have.been.calledOnce;
                expect(echoMiddleware).to.have.been.calledOnce;

                expect(m1).to.have.been.calledBefore(echoMiddleware);
            });
        });
        it('should allow middleware to modify parameters', ()=> {
            return channel.publish({ foo: 'bar' }).then(()=> {
                var m1args = m1.getCall(0).args;
                expect(m1args[0]).to.eql([{ name: 'foo', value: 'bar' }]);

                var echoMiddlewareargs = echoMiddleware.getCall(0).args;
                expect(echoMiddlewareargs[0]).to.eql([{ name: 'foo-oh', value: 'bar-yeah' }]);
            });
        });
        it('should allow pass in last known data if middleware doesn\'t return anything', ()=> {
            var channel = new ChannelWithMiddleware({
                middlewares: [{ publishHandler: m1 }, { publishHandler: emptyMiddleware }, { publishHandler: echoMiddleware }]
            });
            return channel.publish({ foo: 'bar' }).then(()=> {
                expect(m1).to.have.been.calledOnce;
                expect(emptyMiddleware).to.have.been.calledOnce;
                expect(echoMiddleware).to.have.been.calledOnce;

                var echoArgs = echoMiddleware.getCall(0).args;
                expect(echoArgs[0]).to.eql([{ name: 'foo-oh', value: 'bar-yeah' }]);
            });
        });
        it('should reject the publish call each time one of the intermediate middleware fails', ()=> {
            var channel = new ChannelWithMiddleware({
                middlewares: [{ publishHandler: m1 }, { publishHandler: rejecterMiddleware }, { publishHandler: echoMiddleware }]
            });
            var successSpy = sinon.spy();
            var failSpy = sinon.spy();
            return channel.publish({ foo: 'bar' }).then(successSpy).catch(failSpy).then(function () {
                expect(successSpy).to.not.have.been.called;
                expect(failSpy).to.have.been.called;

                expect(m1).to.have.been.called;
                expect(echoMiddleware).to.not.have.been.called;
            });
        });
        describe('notification', ()=> {
            it('should call notify with the final result of all the middleware if everything works', ()=> {
                var channel = new ChannelWithMiddleware({
                    middlewares: [{ publishHandler: m1 }, { publishHandler: echoMiddleware }]
                });
                var notifyStub = sinon.stub(channel, 'notify');
                return channel.publish({ foo: 'bar' }).then(()=> {
                    expect(notifyStub).to.have.been.calledOnce;
                    var args = notifyStub.getCall(0).args;
                    expect(args[0]).to.eql([{ name: 'foo-oh', value: 'bar-yeah' }]);
                });
            });
            it('should not call notify if any of the intermediate middlewares fails', ()=> {
                var channel = new ChannelWithMiddleware({
                    middlewares: [{ publishHandler: m1 }, { publishHandler: rejecterMiddleware }, { publishHandler: echoMiddleware }]
                });
                var notifyStub = sinon.stub(channel, 'notify');
                var successSpy = sinon.spy();
                var failSpy = sinon.spy();
                return channel.publish({ foo: 'bar' }).then(successSpy).catch(failSpy).then(function () {
                    expect(notifyStub).to.have.not.been.called;
                });
            });
        });
    });
    describe('Subscribe Middleware', ()=> {
        var m1, m2, channel;
        beforeEach(()=> {
            m1 = sinon.spy();
            m2 = sinon.spy();

            channel = new ChannelWithMiddleware({
                middlewares: [{ subscribeHandler: m1 }, { subscribeHandler: m2 }]
            });
        });
        afterEach(()=> {
            channel.unsubscribeAll();
        });

        it('should be settable in the constructor', ()=> {
            expect(channel.middlewares.filter('subscribe')).to.eql([m1, m2]);
        });
        it('should be called in the right order each time there\'s a subscribe call', ()=> {
            channel.subscribe(['Foo', 'Bar'], noop);
            expect(m1).to.have.been.calledOnce;
            expect(m2).to.have.been.calledOnce;

            expect(m1).to.have.been.calledBefore(m2);
        });
        it('should call each middleware with a list of subscribed topics', ()=> {
            var topics = ['Foo', 'Bar'];
            channel.subscribe(['Foo', 'Bar'], noop);
            expect(m1).to.have.been.calledWith(topics);
            expect(m2).to.have.been.calledWith(topics);
        });
        it('should not change response type', ()=> {
            const plainChannel = new ChannelManager();
            const result1 = plainChannel.subscribe('foo', noop);
            const result2 = channel.subscribe('foo', noop);

            expect(typeof result1).to.eql(typeof result2);
        });
    });
    describe('Unsubscribe Middleware', ()=> {
        var m1, m2, channel;
        beforeEach(()=> {
            m1 = sinon.spy();
            m2 = sinon.spy();

            channel = new ChannelWithMiddleware({
                middlewares: [{ unsubscribeHandler: m1 }, { unsubscribeHandler: m2 }]
            });
        });
        afterEach(()=> {
            channel.unsubscribeAll();
        });
        it('should be settable in the constructor', ()=> {
            expect(channel.middlewares.filter('unsubscribe')).to.eql([m1, m2]);
        });
        it('should be called in the right order each time there\'s a unsubscribed call', ()=> {
            var token = channel.subscribe(['Foo', 'Bar'], noop);
            channel.unsubscribe(token);

            expect(m1).to.have.been.calledOnce;
            expect(m2).to.have.been.calledOnce;

            expect(m1).to.have.been.calledBefore(m2);
        });
        it('should call each middleware with a list of unsubscribed & remaining topics', ()=> {
            var token1 = channel.subscribe(['Foo', 'Bar'], noop);
            var token2 = channel.subscribe(['Adam', 'West'], noop);

            channel.unsubscribe(token1);
            var m1Args = m1.getCall(0).args;
            expect(m1Args[0]).to.eql(['Foo', 'Bar']);
            expect(m1Args[1]).to.eql(['Adam', 'West']);


            channel.unsubscribe(token2);
            var m2Args = m2.getCall(1).args;
            expect(m2Args[0]).to.eql(['Adam', 'West']);
            expect(m2Args[1]).to.eql([]);
        });

        it('should be called after unsubscribeall', ()=> {
            channel.subscribe(['Foo', 'Bar'], noop);
            channel.subscribe(['Adam', 'West'], noop);
            channel.unsubscribeAll();

            var m1Args = m1.getCall(0).args;
            expect(m1Args[0]).to.eql(['Foo', 'Bar', 'Adam', 'West']);
            expect(m1Args[1]).to.eql([]);
        });
    });
});
