var SubsManager = require('src/channels/subscription-manager');

describe.only('Subscription Manager', ()=> {
    
    describe('Constructor', ()=> {
        it('should have the right instance', ()=> {
            var sm = new SubsManager();
            expect(sm).to.be.instanceof(SubsManager);
            expect(sm.subscribe).to.be.a('function');
        });
    });
    describe('#subscribe', ()=> {
        it('returns a token', ()=> {
            
        });
    });
});
