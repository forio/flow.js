import { makePromise, promisify } from '../promise-utils';
import chai from 'chai';
import sinon from 'sinon';

chai.use(require('sinon-chai'));
const { expect } = chai;

describe('Promise utils', ()=> {
    describe('#makePromise', ()=> {
        it('should handle undefineds', ()=> {
            const successSpy = sinon.spy((r)=> r);
            const failSpy = sinon.spy((r)=> r);
            return makePromise(undefined).then(successSpy).catch(failSpy).then((r)=> {
                expect(r).to.eql(undefined);
                expect(successSpy).to.have.been.calledOnce;
                expect(failSpy).to.not.have.been.called;
                expect(successSpy).to.have.been.calledWith(undefined);
            });
        });
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
    describe('promisify', ()=> {
        it('should throw an error if not called with a fn', ()=> {
            expect(()=> promisify('foo')).to.throw(/requires a function/);
        });
        describe('Promise returning fns', ()=> {
            it('should handle successful promises', ()=> {
                const original = sinon.spy(()=> Promise.resolve('result'));
                const promisified = promisify(original);
    
                const successSpy = sinon.spy((r)=> {
                    return r;
                });
                const failSpy = sinon.spy();
    
                return promisified('foo', 2).then(successSpy, failSpy).then((r)=> {
                    expect(original).to.have.been.calledOnce;
                    expect(original).to.have.been.calledWith('foo', 2);
    
                    expect(successSpy).to.have.been.calledOnce;
                    expect(successSpy).to.have.been.calledWith('result');

                    expect(failSpy).to.not.have.been.called;
                });
            });
            it('should handle reject promises', ()=> {
                const original = sinon.spy(()=> Promise.reject('error'));
                const promisified = promisify(original);
    
                const successSpy = sinon.spy((r)=> r);
                const failSpy = sinon.spy((e)=> e);
    
                return promisified('foo', 2).then(successSpy, failSpy).then((r)=> {
                    expect(original).to.have.been.calledOnce;
                    expect(original).to.have.been.calledWith('foo', 2);
    
                    expect(failSpy).to.have.been.calledOnce;
                    expect(r).to.equal('error');
                    expect(successSpy).to.not.have.been.called;
                });
            });
        });
        
        describe('Value returning fns', ()=> {
            it('should handle successful returns', ()=> {
                const original = sinon.spy(()=> 'result');
                const promisified = promisify(original);
    
                const successSpy = sinon.spy((r)=> r);
                const failSpy = sinon.spy();
    
                return promisified('foo', 2).then(successSpy, failSpy).then((r)=> {
                    expect(original).to.have.been.calledOnce;
                    expect(original).to.have.been.calledWith('foo', 2);
    
                    expect(successSpy).to.have.been.calledOnce;
                    expect(r).to.equal('result');
                    expect(failSpy).to.not.have.been.called;
                });
            });
            it('should handle reject promises', ()=> {
                const original = sinon.spy(()=> {
                    throw new Error('error');
                });
                const promisified = promisify(original);
    
                const successSpy = sinon.spy((r)=> r);
                const failSpy = sinon.spy((e)=> e.message);
    
                return promisified('foo', 2).then(successSpy, failSpy).then((r)=> {
                    expect(original).to.have.been.calledOnce;
                    expect(original).to.have.been.calledWith('foo', 2);
    
                    expect(failSpy).to.have.been.calledOnce;
                    expect(r).to.equal('error');
                    expect(successSpy).to.not.have.been.called;
                });
            });
        });
    });    
});