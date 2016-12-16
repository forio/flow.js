var SubsManager = require('src/channels/subscription-manager');

describe.only('Subscription Manager', ()=> {
    var channel;
    beforeEach(()=> {
        channel = new SubsManager();
    });

    describe('Constructor', ()=> {
        it('should have the right instance', ()=> {
            var sm = new SubsManager();
            expect(sm).to.be.instanceof(SubsManager);
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
        it('should notify listeners', ()=> {
            var spy1 = sinon.spy();
            channel.subscribe(['price', 'cost'], spy1);
            channel.publish({ price: 2, cost: 1 });
            spy1.should.have.been.calledTwice;
        });
        it('should pass the right arguments to listeners', ()=> {
            var spy1 = sinon.spy();
            channel.subscribe(['price', 'cost'], spy1);
            channel.publish({ price: 2, cost: 1 });

            var args1 = spy1.getCall(0).args[0];
            var args2 = spy1.getCall(1).args[0];

            expect(args1).to.eql({ price: 2 });
            expect(args2).to.eql({ cost: 1 });
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
