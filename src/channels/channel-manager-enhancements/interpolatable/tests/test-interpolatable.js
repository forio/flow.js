import ChannelManager from 'channels/channel-manager';
import interpolatable from '../index';

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
    });

    describe.only('#unsubscribe', ()=> {
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
        
    });
});
