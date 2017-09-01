import ChannelManager from 'channels/channel-manager';
import interpolatable from '../index';

function makeMockChannelManager(pubSpy, subsSpy) {
    return class MockChannelManager {
        constructor() {
            this.publish = pubSpy;
            this.subscribe = subsSpy;
            this.unsubscribe = ()=> {};
        }
    };
}
var InterpolatableChannelManager = interpolatable(ChannelManager);
describe('Interpolatable - Integration Test', ()=> {
    var icm;
    beforeEach(()=> {
        icm = new InterpolatableChannelManager();
    });

    describe('#subscribe', ()=> {
        afterEach(()=> {
            icm.unsubscribeAll();
        });

        it('should return an string id', ()=> {
            var id = icm.subscribe(['price[<time>]', 'sales'], ()=> {});
            expect(id).to.be.a('string');
        });
        it('should not subscribe outer variables till dependencies are resolved', ()=> {
            var cb = sinon.spy();
            icm.subscribe(['price[<time>]', 'sales'], cb);

            var subscribed = icm.getSubscribedTopics();
            expect(subscribed).to.eql(['time']);

            icm.notify({ time: 4 });
            var subs2 = icm.getSubscribedTopics();
            expect(subs2).to.eql(['time', 'price[4]', 'sales']);
        });
        it('should callback on changes to dependents', ()=> {
            var cb = sinon.spy();
            icm.subscribe(['price[<time>]', 'sales'], cb);

            icm.notify({ time: 4 });
            expect(cb).to.not.have.been.called;
            icm.notify({ 'price[5]': 4 });
            expect(cb).to.not.have.been.called;

            icm.notify({ 'price[4]': 4 });
            expect(cb).to.have.been.calledWith({ 'price[<time>]': 4 });
        });
        it('should pass through batch options', ()=> {
            var cb = sinon.spy();
            icm.subscribe(['price[<time>]', 'sales'], cb, { batch: true });
            icm.notify({ time: 4 });

            icm.notify({ 'price[4]': 4 });
            expect(cb).to.not.have.been.called;

            icm.notify({ sales: 5, foo: 6 });
            expect(cb).to.have.been.calledWith({ 'price[<time>]': 4, sales: 5 });
        });
        
        it('should keep listening for changes on dependents', ()=> {
            var cb = sinon.spy();
            icm.subscribe(['price[<time>]', 'sales'], cb);
            icm.notify({ time: 4 });

            icm.notify({ 'price[4]': 4 });
            expect(cb).to.have.callCount(1);
            icm.notify({ sales: 4 });
            expect(cb).to.have.callCount(2);
            icm.notify({ foo: 6 });
            expect(cb).to.have.callCount(2);
            icm.notify({ 'price[5]': 4 });
            expect(cb).to.have.callCount(2);
            icm.notify({ 'price[4]': 14 });
            expect(cb).to.have.callCount(3);
        });
        it('should stop listening to older dependents when dependencies change', ()=> {
            var cb = sinon.spy();
            icm.subscribe(['price[<time>]', 'sales'], cb);
            icm.notify({ time: 4 });

            icm.notify({ 'price[4]': 4 });
            expect(cb).to.have.callCount(1);
            icm.notify({ time: 5 });
            icm.notify({ 'price[4]': 4 });
            expect(cb).to.have.callCount(1);
            icm.notify({ 'price[5]': 14 });
            expect(cb).to.have.callCount(2);
            var args = cb.getCall(1).args;
            expect(args[0]).to.eql({ 'price[<time>]': 14 });
        });

        it('should not change response type', ()=> {
            const plainChannel = new ChannelManager();
            const noop = ()=> {};
            const result1 = plainChannel.subscribe('foo', noop);
            const result2 = icm.subscribe('foo', noop);
            expect(typeof result1).to.eql(typeof result2);
        });
    });

    describe('#unsubscribe', ()=> {
        afterEach(()=> {
            icm.unsubscribeAll();
        });
        it('should unsubscribe both dependents and dependencies', ()=> {
            var cb = sinon.spy();
            var subs1 = icm.subscribe(['price[<time>]', 'sales'], cb);
            icm.notify({ time: 4 });
            icm.notify({ 'price[4]': 4 });
            
            expect(cb).to.have.been.calledOnce;

            icm.unsubscribe(subs1);
            icm.notify({ 'price[4]': 4 });
            expect(cb).to.have.been.calledOnce;
            icm.notify({ time: 5 });
            icm.notify({ 'price[5]': 4 });
            expect(cb).to.have.been.calledOnce;
        });
        it('should pass through unknown subs requests', ()=> {
            var cb = sinon.spy();
            var subs1 = icm.subscribe(['price', 'sales'], cb);
            icm.notify({ 'price': 4 });
            
            expect(cb).to.have.been.calledOnce;
            icm.unsubscribe(subs1);
            icm.notify({ 'price': 5 });
            expect(cb).to.have.been.calledOnce;
        });
    });
    describe('#unsubscribeAll', ()=> {
        it('should unsubscribe all outer and inner dependencies', ()=> {
            var cb = sinon.spy();
            icm.subscribe(['price', 'sales'], cb);
            icm.subscribe(['price<time>', 'sales'], cb);
            icm.subscribe(['apples<time>'], cb);

            icm.notify({ 'time': 4 });
            expect(icm.getSubscribedTopics().length).to.eql(5);
            
            icm.unsubscribeAll();
            expect(icm.subscriptions.length).to.eql(0);
            expect(icm.getSubscribedTopics().length).to.eql(0);
            
        });
    });
    describe('#publish', ()=> {
        it('should return a promise', ()=> {
            var p = icm.publish('booo', 'yes');
            expect(p.then).to.be.a('function');

            var p2 = icm.publish('booo<time>', 'yes');
            expect(p2.then).to.be.a('function');
        });
        it('should pass through uninterpolated values', ()=> {
            var subsSpy = sinon.spy(()=> 'subsid');
            var pubSpy = sinon.spy(()=> $.Deferred().resolve().promise());

            var MockCM = makeMockChannelManager(pubSpy, subsSpy);
            var InterpolatableMockCM = interpolatable(MockCM);
            var icm2 = new InterpolatableMockCM();

            var ip = [{ name: 'boo', value: 'yes' }];
            var opts = { silent: true };
            return icm2.publish(ip, opts).then(()=> {
                expect(subsSpy).to.not.have.been.called;
                expect(pubSpy).to.have.been.calledOnce;

                var args = pubSpy.getCall(0).args;
                expect(args[0]).to.eql(ip);
                expect(args[1]).to.eql(opts);
            });
        });
        it('should interpolate before calling publish on channel manager', ()=> {
            var count = 0;
            var subsSpy = sinon.spy((toSubs, cb)=> {
                count++;
                var subsid = 'subsid' + count;
                cb(toSubs.reduce((accum, topic, index)=> {
                    accum[topic] = index + 1;
                    return accum;
                }, {}), { id: subsid });
                return subsid;
            });

            var pubSpy = sinon.spy(()=> $.Deferred().resolve().promise());
            
            var MockCM = makeMockChannelManager(pubSpy, subsSpy);
            MockCM.prototype.subscribe = subsSpy;

            var InterpolatableMockCM = interpolatable(MockCM);
            var icm2 = new InterpolatableMockCM();

            var ip = [{ name: 'boo<time>', value: 'yes' }, { name: 'bar<a>', value: 3 }, { name: 'test', value: 'er' }];
            var opts = { silent: true };
            return icm2.publish(ip, opts).then(()=> {
                expect(subsSpy).to.have.been.calledWith(['time', 'a']);
                expect(pubSpy).to.have.been.calledOnce;

                var args = pubSpy.getCall(0).args;
                expect(args[0]).to.eql([
                    { name: 'boo1', value: 'yes' },
                    { name: 'bar2', value: 3 },
                    { name: 'test', value: 'er' },
                ]);
                expect(args[1]).to.eql(opts);
            });
        });
    });
});
