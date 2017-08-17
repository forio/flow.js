import Middleware from '../index.js';

describe('JSON Parse middleware', ()=> {
    var notifier, jp;
    beforeEach(()=> {
        notifier = sinon.spy();
        jp = new Middleware({}, notifier);
    });
    it('should pass through topics which aren\'t json', ()=> {
        const ret = jp.subscribeHandler(['a', 'b', 'c']);

        expect(notifier).to.not.have.been.called;
        expect(ret).to.eql(['a', 'b', 'c']);
    });

    it('should intercept arrays', ()=> {
        const ret = jp.subscribeHandler(['a', '[1,"a", b]', 'c']);

        expect(notifier).to.have.been.calledOnce;
        expect(ret).to.eql(['a', 'c']);

        const args = notifier.getCall(0).args;
        expect(args[0]).to.eql([{
            name: '[1,"a", b]',
            value: [1, 'a', 'b'],
        }]);
    });
    it('should intercept objecys', ()=> {
        const ret = jp.subscribeHandler(['a', '{ "a": 1, "b": 2 }', 'c']);

        expect(notifier).to.have.been.calledOnce;
        expect(ret).to.eql(['a', 'c']);

        const args = notifier.getCall(0).args;
        expect(args[0]).to.eql([{
            name: '{ "a": 1, "b": 2 }',
            value: { a: 1, b: 2 },
        }]);
    });
    it('should intercept literals', ()=> {
        const ret = jp.subscribeHandler(['a', 4, 'c']);

        expect(notifier).to.have.been.calledOnce;
        expect(ret).to.eql(['a', 'c']);

        const args = notifier.getCall(0).args;
        expect(args[0]).to.eql([{
            name: 4,
            value: 4,
        }]);
    });
});
