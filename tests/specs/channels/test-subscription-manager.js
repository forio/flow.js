var SubsManager = require('src/channels/subscription-manager');

describe.only('Subscription Manager', ()=> {
    
    describe('Constructor', ()=> {
        it('should have the right instance', ()=> {
            var sm = new SubsManager();
            expect(sm).to.be.instanceof(SubsManager);
            expect(sm.subscribe).to.be.a('function');
        });
    });

    describe('#subscribe', function () {
        var channel;
        beforeEach(()=> {
            channel = new SubsManager();
        });
        afterEach(function () {
            channel.unsubscribeAll();
        });
        it('should register subscribers if called with a single topic', function () {
            channel.subscribe('price', {});
            channel.getSubscribers('price').length.should.equal(1);
        });
        it('should register subscribers if called with multiple topics', function () {
            channel.subscribe(['price', 'sales'], {});
            channel.getSubscribers('price').length.should.equal(1);
            channel.getSubscribers('sales').length.should.equal(1);
        });
        // it('should update inner variable dependencies for single items', function () {
        //     channel.subscribe(['price[<time>]'], {});

        //     var subs = channel.getSubscribers('price[<time>]');
        //     subs.length.should.equal(1);
        //     channel.getTopicDependencies().should.eql(['time']);
        // });

        // it('should update inner variable dependencies for multiple items', function () {
        //     channel.subscribe(['price[<time>]', 'apples', 'sales[<step>]'], {});

        //     channel.getSubscribers('price[<time>]').length.should.equal(1);
        //     channel.getSubscribers('apples').length.should.equal(1);
        //     channel.getSubscribers('sales[<step>]').length.should.equal(1);

        //     channel.getTopicDependencies().should.eql(['time', 'step']);
        // });
        it('should generate a token', function () {
            var dummyObject = { a: 1 };
            var token = channel.subscribe(['price[<time>]', 'apples', 'sales[<step>]'], dummyObject);
            token.should.exist;
        });

        describe.skip('functions', function () {
            it('should allow subscribing functions to single variables', function () {
                var cb = sinon.spy();
                channel.subscribe('price', cb);
                channel.getSubscribers('price').length.should.equal(1);

                channel.publish('price', 32).then(function () {
                    cb.should.have.been.called.calledOnce;
                    cb.should.have.been.calledWith({ price: 1 }); // mock server always returns 1
                });
            });

           //TODO: this will be called twice because the channel can't tell if things have changed or not
            it.skip('should allow subscribing functions to multi variables', function () {
                var cb = sinon.spy();
                channel.subscribe(['price', 'sales'], cb);

                channel.getSubscribers('price').length.should.equal(1);
                channel.getSubscribers('sales').length.should.equal(1);

                channel.publish('price', 32).then(function () {
                    cb.should.have.been.called.calledOnce;
                    cb.should.have.been.calledWith({ price: 1 }); // mock server always returns 1
                });
            });
        });
    });
    describe('#subscribe', ()=> {
        it('returns a token', ()=> {
            
        });
    });
});
