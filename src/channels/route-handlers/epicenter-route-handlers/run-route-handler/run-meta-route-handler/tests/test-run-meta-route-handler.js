import Handler from '../index';
import sinon from 'sinon';
import chai from 'chai';
chai.use(require('sinon-chai'));

const { expect } = chai;
describe('Run Meta channel', ()=> {
    describe('#subscribeHandler', ()=> {
        var mockRun, mockNotifier, channel;
        beforeEach(()=> {
            mockRun = {
                load: sinon.spy(function () {
                    return $.Deferred().resolve({ id: 'foo', a: 'apples' }).promise();
                }),
                save: sinon.spy(function (args) {
                    return $.Deferred().resolve(args).promise();
                })
            };
            mockNotifier = sinon.spy();
            var mockRunPromise = $.Deferred().resolve(mockRun).promise();
            channel = new Handler(mockRunPromise, mockNotifier);
        });

        describe('On a clean slate', ()=> {
            it('should try to load from service by default', ()=> {
                return channel.subscribeHandler(['foo', 'barr'], {}).then(()=> {
                    expect(mockRun.load).to.have.been.calledOnce;
                });
            });
        });

        describe('With existing data', ()=> {
            afterEach(()=> {
                delete mockRun.runMeta;
            });
            it('should not fetch if existing data is available ', ()=> {
                mockRun.runMeta = {
                    foo: 'la',
                    barr: 'lala',
                };
                return channel.subscribeHandler(['foo', 'barr'], {}).then((data)=> {
                    expect(mockRun.load).to.not.have.been.called;
                    expect(data).to.eql([{ name: 'foo', value: 'la' }, { name: 'barr', value: 'lala' }]);
                });
            });
            it('should load if there\'s not enough cache to resolve subscriptions', ()=> {
                mockRun.runMeta = {
                    apple: 'sauce',
                };
                return channel.subscribeHandler(['foo', 'bar'], {}).then(()=> {
                    expect(mockRun.load).to.have.been.calledOnce;
                });
            });
        });
        
    });
});
