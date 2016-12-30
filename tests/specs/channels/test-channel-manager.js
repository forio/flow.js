var ChannelManager = require('src/channels/channel-manager');

describe('Subscription Manager', ()=> {
    var channel;
    beforeEach(()=> {
        channel = new ChannelManager();
    });

    describe('Constructor', ()=> {
        it('should have the right instance', ()=> {
            var sm = new ChannelManager();
            expect(sm).to.be.instanceof(ChannelManager);
            expect(sm.subscribe).to.be.a('function');
        });
    });


    describe('#getSubscribers', ()=> {
        afterEach(function () {
            channel.unsubscribeAll();
        });
        it('should allow single subscriptions', ()=> {
            channel.subscribe('price', {});
            expect(channel.getSubscribers('price').length).to.equal(1);
        });
        it('should allow single subscriptions', ()=> {
            channel.subscribe(['price', 'sales'], {});
            expect(channel.getSubscribers('price').length).to.equal(1);
            expect(channel.getSubscribers('sales').length).to.equal(1);
        });
    });

    describe('Publish', ()=> {
        it('should return a promise', ()=> {
            var p = channel.publish('booo', 'yes');
            expect(p.then).to.be.a('function');
        });
        it('should notify subscribed listeners', ()=> {
            var spy1 = sinon.spy();
            var spy2 = sinon.spy();
            channel.subscribe(['price', 'cost'], spy1);
            channel.subscribe(['blah', 'blew'], spy2);
            return channel.publish({ price: 2, cost: 1 }).then(()=> {
                spy1.should.have.been.calledTwice;
                spy2.should.not.have.been.called;
            });
        });
        it('should alert subscribers on *', ()=> {
            var spy2 = sinon.spy();
            channel.subscribe('*', spy2);
            return channel.publish({ price: 2, cost: 1 }).then(()=> {
                spy2.should.have.been.calledTwice;
            });
        });

        it('should pass the right arguments to listeners', ()=> {
            var spy1 = sinon.spy();
            channel.subscribe(['price', 'cost'], spy1);
            return channel.publish({ price: 2, cost: 1 }).then(()=> {
                var args1 = spy1.getCall(0).args[0];
                var args2 = spy1.getCall(1).args[0];

                expect(args1).to.eql({ price: 2 });
                expect(args2).to.eql({ cost: 1 });
            });
        });
    });

    describe('Publish Middleware', ()=> {
        var m1, m2, channel;
        beforeEach(()=> {
            m1 = sinon.spy(function () {
                return 'lol';
            });
            m2 = sinon.spy();
            channel = new ChannelManager({
                publishMiddlewares: [m1, m2]
            });
        });
        it('should be settable in the constructor', ()=> {
            expect(channel.publishMiddlewares).to.eql([m1, m2]);
        });
        it('should be called in the right order each time there\'s a publish call', ()=> {
            return channel.publish({ foo: 'bar' }).then(()=> {
                expect(m1).to.have.been.calledOnce;
                expect(m2).to.have.been.calledOnce;

                expect(m1).to.have.been.calledBefore(m2);
            });
        });
        it('should be called with the right arguments', ()=> {
            return channel.publish({ foo: 'bar' }).then(()=> {
                expect(m1).to.have.been.calledWith({ foo: 'bar' });
                expect(m2).to.have.been.calledWith('lol');
            });
        });
        it('should reject the publish call each time one of the intermediate middleware fails', ()=> {
            var m1 = sinon.spy(function () {
                return 'lol';
            });
            var m2 = sinon.spy(function () {
                return $.Deferred().reject().promise();
            });
            var m3 = sinon.spy();
            var channel = new ChannelManager({
                publishMiddlewares: [m1, m2, m3]
            });
            var successSpy = sinon.spy();
            var failSpy = sinon.spy();
            return channel.publish({ foo: 'bar' }).then(successSpy).catch(failSpy).then(function () {
                expect(successSpy).to.not.have.been.called;
                expect(failSpy).to.have.been.called;

                expect(m2).to.have.been.called;
                expect(m3).to.not.have.been.called;
            });
        });
    });

    describe('batch', ()=> {
        var spy1, spy2;
        beforeEach(()=> {
            spy1 = sinon.spy();
            spy2 = sinon.spy();

            channel.subscribe(['price', 'cost'], spy1, { batch: true });
            channel.subscribe(['price', 'cost'], spy2, { batch: false });
        });
        afterEach(function () {
            channel.unsubscribeAll();
        });
        it('should batch calls if subscribe is called with batch:true', function () {
            return channel.publish({ price: 2, cost: 1 }).then(()=> {
                spy1.should.have.been.calledOnce;
                spy2.should.have.been.calledTwice;
            });
        });
        it('should pass the correct parameters to batched calls', function () {
            return channel.publish({ price: 2, cost: 1 }).then(()=> {
                spy1.should.have.been.calledWith({ price: 2, cost: 1 });
                spy2.getCall(0).args[0].should.eql({ price: 2 });
                spy2.getCall(1).args[0].should.eql({ cost: 1 });
            });
        });
        it('should call batch if it was provided more info than it asked for', function () {
            return channel.publish({ price: 2, cost: 1, blah: 3 }).then(()=> {
                spy1.should.have.been.calledWith({ price: 2, cost: 1 });
            });
        });

        it('should not re-trigger non-batched calls', function () {
            var spy1 = sinon.spy();
            channel.subscribe(['price', 'cost'], spy1, { batch: true });
            channel.subscribe(['something', 'else'], spy1, { batch: false });

            return channel.publish({ price: 2, cost: 1 }).then(()=> {
                spy1.should.have.been.calledOnce;
            });
        });

        it('should not call batch for partial matches', ()=> {
            var spy1 = sinon.spy();
            var spy2 = sinon.spy();
            channel.subscribe(['price', 'cost'], spy1, { batch: true });
            channel.subscribe(['price', 'something', 'else'], spy2, { batch: false });

            return channel.publish({ price: 2 }).then(()=> {
                spy2.should.have.been.calledOnce;
                spy1.should.not.have.been.called;
            });
        });
        describe('Cache', ()=> {
            describe('When on', ()=> {
                it('should call batch if existing data is available', ()=> {
                    var spy1 = sinon.spy();
                    channel.subscribe(['price', 'cost'], spy1, { batch: true });

                    return channel.publish({ price: 2 }).then(()=> {
                        spy1.should.not.have.been.called;
                        return channel.publish({ cost: 4 }).then(()=> {
                            spy1.should.have.been.calledOnce;
                            spy1.should.have.been.calledWith({
                                price: 2,
                                cost: 4,
                            });
                        });
                    });
                });
            });
            describe('When off', ()=> {
                it('should call batch if existing data is available', ()=> {
                    var spy1 = sinon.spy();
                    channel.subscribe(['price', 'cost'], spy1, { batch: true, cache: false });
                    return channel.publish({ price: 2 }).then(()=> {
                        spy1.should.not.have.been.called;
                        return channel.publish({ cost: 4 }).then(()=> {
                            spy1.should.not.have.been.called;
                        });
                    });
                });
            });
            
        });
    });
    describe('#subscribe', function () {
        afterEach(function () {
            channel.unsubscribeAll();
        });
        it('to register subscribers if called with a single topic', function () {
            channel.subscribe('price', {});
            expect(channel.subscriptions.length).to.equal(1);
        });
        it('count multiple topics as a single subscription', function () {
            channel.subscribe(['price', 'sales'], {});
            expect(channel.subscriptions.length).to.equal(1);
        });
        // it('to update inner variable dependencies for single items', function () {
        //     expect(channel.subscribe(['price[<time>]'], {});

        //     var subs = expect(channel.getSubscribers('price[<time>]');
        //     subs.length).to.equal(1);
        //     expect(channel.getTopicDependencies().to.eql(['time']);
        // });

        // it('to update inner variable dependencies for multiple items', function () {
        //     expect(channel.subscribe(['price[<time>]', 'apples', 'sales[<step>]'], {});

        //     expect(channel.getSubscribers('price[<time>]').length).to.equal(1);
        //     expect(channel.getSubscribers('apples').length).to.equal(1);
        //     expect(channel.getSubscribers('sales[<step>]').length).to.equal(1);

        //     expect(channel.getTopicDependencies().to.eql(['time', 'step']);
        // });
        it('should generate a token', function () {
            var dummyObject = { a: 1 };
            var token = channel.subscribe(['price', 'apples'], dummyObject);
            expect(token).to.be.a('string');
        });
    });


    describe('#unsubscribe', function () {
        afterEach(function () {
            channel.unsubscribeAll();
        });

        it('should use the token to unsubscribe', function () {
            var dummyObject = { a: 1 };
            var token = channel.subscribe(['apples', 'sales'], dummyObject);

            expect(channel.getSubscribers('apples').length).to.equal(1);

            channel.unsubscribe(token);
            expect(channel.getSubscribers()).to.eql([]);
        });
        it('should throw an error if invalid token is provided', function () {
            expect(()=> channel.unsubscribe('token')).to.throw(Error);
        });
    });
    describe('#unsubscribeAll', function () {
        it('should clear out state variables', function () {
            channel.subscribe(['price'], {});
            channel.subscribe(['target'], {});
            expect(channel.getSubscribers().length).to.eql(2);

            channel.unsubscribeAll();
            expect(channel.getSubscribers()).to.eql([]);
        });

    });
});
