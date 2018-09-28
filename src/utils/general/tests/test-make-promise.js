import makePromise from '../make-promise';
import chai from 'chai';
import sinon from 'sinon';

chai.use(require('sinon-chai'));
const { expect } = chai;

describe('#makePromise', ()=> {
    it('should make promise from literals', ()=> {
        const ip = 'foo';
        const successSpy = sinon.spy((r)=> r);
        const failSpy = sinon.spy((r)=> r);
        return makePromise(ip).then(successSpy).catch(failSpy).then((r)=> {
            expect(r).to.eql(ip);
            expect(successSpy).to.have.been.calledOnce;
            expect(failSpy).to.not.have.been.called;
            expect(successSpy).to.have.been.calledWith(ip);
        });
    });
    it('should return existing promises', ()=> {
        const ip = 'foo';
        const successSpy = sinon.spy((r)=> r);
        const failSpy = sinon.spy((r)=> r);
        return makePromise(Promise.resolve(ip)).then(successSpy).catch(failSpy).then((r)=> {
            expect(r).to.eql(ip);
            expect(successSpy).to.have.been.calledOnce;
            expect(failSpy).to.not.have.been.called;
            expect(successSpy).to.have.been.calledWith(ip);
        });
    });
    it('should handle functions returning values', ()=> {
        const ip = 'foo';
        const successSpy = sinon.spy((r)=> r);
        const failSpy = sinon.spy((r)=> r);
        return makePromise(()=> ip).then(successSpy).catch(failSpy).then((r)=> {
            expect(r).to.eql(ip);
            expect(successSpy).to.have.been.calledOnce;
            expect(failSpy).to.not.have.been.called;
            expect(successSpy).to.have.been.calledWith(ip);
        });
    });
    it('should handle functions throwing errors', ()=> {
        const ip = ()=> {
            throw new Error('foo');
        };
        const successSpy = sinon.spy((r)=> r);
        const failSpy = sinon.spy((r)=> r);
        return makePromise(ip).then(successSpy).catch(failSpy).then((r)=> {
            expect(successSpy).to.not.have.been.called;
            expect(failSpy).to.have.been.calledOnce;

            const failArgs = failSpy.getCall(0).args[0];
            expect(failArgs.message).to.equal('foo');
        });
    });
    it('should handle functions returning resolved promises', ()=> {
        const ip = 'foo';
        const successSpy = sinon.spy((r)=> {
            return r;
        });
        const failSpy = sinon.spy((r)=> r);
        return makePromise(()=> Promise.resolve(ip)).then(successSpy).catch(failSpy).then((r)=> {
            expect(r).to.eql(ip);
            expect(successSpy).to.have.been.calledOnce;
            expect(failSpy).to.not.have.been.called;
            expect(successSpy).to.have.been.calledWith(ip);
        });
    });
    it('should handle functions returning rejectted promises', ()=> {
        const ip = 'foo';
        const failSpy = sinon.spy((r)=> {
            return r;
        });
        const successSpy = sinon.spy((r)=> r);
        return makePromise(()=> Promise.reject(ip)).then(successSpy).catch(failSpy).then((r)=> {
            expect(r).to.eql(ip);
            expect(successSpy).to.not.have.been.called;

            const failArgs = failSpy.getCall(0).args[0];
            expect(failArgs).to.equal('foo');
        });
    });
});
