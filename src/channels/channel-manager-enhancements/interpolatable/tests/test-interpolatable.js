import ChannelManager from 'channels/channel-manager';
import interpolatable from '../index';

describe('Interpolatable - Integration Test', ()=> {
    var icm;
    beforeEach(()=> {
        var cm = new ChannelManager();
        icm = interpolatable(cm);
    });

    describe('#subscribe', ()=> {
        afterEach(()=> {
            icm.unsubscribeAll();
        });

        it('should return an string id', ()=> {
            var id = icm.subscribe(['price[<time>]', 'sales'], ()=> {});
            expect(id).to.be.a('string');
        });
        it.skip('should not subscribe outer variables till inner ones are resolved', ()=> {
            var cb = sinon.spy();
            icm.subscribe(['price[<time>]', 'sales'], cb);

            var subscribed = icm.getSubscribedTopics();
            expect(subscribed).to.eql(['time', 'sales']);
        });

    });
});
