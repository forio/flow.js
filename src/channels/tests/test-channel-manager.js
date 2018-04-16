import ChannelManager from '../channel-manager';
import { expect } from 'chai';

function noop() {}
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
            channel.subscribe('price', noop);
            expect(channel.getSubscribers('price').length).to.equal(1);
        });
        it('should allow single subscriptions', ()=> {
            channel.subscribe(['price', 'sales'], noop);
            expect(channel.getSubscribers('price').length).to.equal(1);
            expect(channel.getSubscribers('sales').length).to.equal(1);
        });
    });

    describe('#publish', ()=> {
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

        describe('when true', ()=> {
            it('should batch calls if subscribe is called with batch:true', function () {
                return channel.publish({ price: 2, cost: 1 }).then(()=> {
                    spy1.should.have.been.calledOnce;
                });
            });
            it('should pass the correct parameters to batched calls', function () {
                return channel.publish({ price: 2, cost: 1 }).then(()=> {
                    spy1.should.have.been.calledWith({ price: 2, cost: 1 });
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
            it('should only provide what was explicitly subscribed to', ()=> {
                var spy1 = sinon.spy();
                channel.subscribe(['price', 'cost'], spy1, { batch: true });

                return channel.publish({ price: 2, cost: 1, foo: 'bar', p: 'ter' }).then(()=> {
                    spy1.should.have.been.calledWith({ price: 2, cost: 1 });
                });
            });
        });
        describe('When false', ()=> {
            it('should call for multiple matches if subscribe is called with batch:false', function () {
                return channel.publish({ price: 2, cost: 1 }).then(()=> {
                    spy2.should.have.been.calledTwice;
                });
            });
            it('should pass the correct parameters to subscribers', function () {
                return channel.publish({ price: 2, cost: 1 }).then(()=> {
                    spy2.getCall(0).args[0].should.eql({ price: 2 });
                    spy2.getCall(1).args[0].should.eql({ cost: 1 });
                });
            });
            it('should only provide what was explicitly subscribed to', ()=> {
                return channel.publish({ price: 2, cost: 1, foo: 'bar', p: 'ter' }).then(()=> {
                    spy2.should.have.been.calledTwice;

                    spy2.getCall(0).args[0].should.eql({ price: 2 });
                    spy2.getCall(1).args[0].should.eql({ cost: 1 });
                });
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
            channel.subscribe('price', noop);
            expect(channel.subscriptions.length).to.equal(1);
        });
        it('count multiple topics as a single subscription', function () {
            channel.subscribe(['price', 'sales'], noop);
            expect(channel.subscriptions.length).to.equal(1);
        });
        it('should generate a token', function () {
            var token = channel.subscribe(['price', 'apples'], noop);
            expect(token).to.be.a('string');
        });
    });

    describe('#getSubscribedTopics', ()=> {
        afterEach(function () {
            channel.unsubscribeAll();
        });
        it('should update list on subscribe', ()=> {
            channel.subscribe(['apples', 'sales'], noop);
            expect(channel.getSubscribedTopics()).to.eql(['apples', 'sales']);
        });
        it('should update list across multiple subscribes', ()=> {
            channel.subscribe(['apples', 'sales'], noop);
            channel.subscribe(['bat', 'man'], (()=> {}));
            expect(channel.getSubscribedTopics()).to.eql(['apples', 'sales', 'bat', 'man']);
        });
        it('should dedupe', ()=> {
            channel.subscribe(['apples', 'sales'], noop);
            channel.subscribe(['apples', 'bat', 'man'], (()=> {}));
            expect(channel.getSubscribedTopics()).to.eql(['apples', 'sales', 'bat', 'man']);
        });
        it('should remove on subscribed', ()=> {
            channel.subscribe(['apples', 'sales'], noop);
            var token = channel.subscribe(['bat', 'man'], (()=> {}));
            channel.unsubscribe(token);
            expect(channel.getSubscribedTopics()).to.eql(['apples', 'sales']);
        });
        it('should only remove deduped subscriptions', ()=> {
            channel.subscribe(['apples', 'sales'], noop);
            var token = channel.subscribe(['apples', 'bat', 'man'], (()=> {}));
            channel.unsubscribe(token);
            expect(channel.getSubscribedTopics()).to.eql(['apples', 'sales']);
        });
    });
    describe('#unsubscribe', function () {
        afterEach(function () {
            channel.unsubscribeAll();
        });

        it('should use the token to unsubscribe', function () {
            var token = channel.subscribe(['apples', 'sales'], noop);

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
            channel.subscribe(['price'], noop);
            channel.subscribe(['target'], noop);
            expect(channel.getSubscribers().length).to.eql(2);

            channel.unsubscribeAll();
            expect(channel.getSubscribers()).to.eql([]);
        });

    });
    describe('#notify', ()=> {
        it('should notify subscribers of ', ()=> {
            
        }); 
    });
});
