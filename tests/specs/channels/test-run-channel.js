'use strict';
(function () {

    var Channel = require('src/channels/run-channel');

    var dummyChannel = function () {
        return {
            publish: sinon.spy(function () {
                return $.Deferred().resolve().promise();
            }),
            subscribe: sinon.spy(),
            unsubscribe: sinon.spy()
        };
    };

    describe('Run Channel', function () {
        var refreshOptions = {
            on: 'stuff',
            except: ['otherStuff']
        };

        var server;
        before(function () {
            server = sinon.fakeServer.create();
            server.respondWith(/(.*)\/run\/(.*)\/(.*)/, function (xhr, id) {
                xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ url: xhr.url }));
            });
        });

        after(function () {
            server.restore();
        });

        describe('options', function () {
            it('should pass options to the variables service', function () {
                var options = {
                    refresh: refreshOptions
                };
                var c = new Channel({
                    variables: options
                });
                c.variables.private.options.refresh.should.eql(refreshOptions);
            });
            it('should pass options to the operations service', function () {
                var options = {
                    refresh: refreshOptions
                };
                var c = new Channel({
                    operations: options
                });
                c.operations.private.options.refresh.should.eql(refreshOptions);
            });

            describe('#autoFetch', function () {
                it('should autofetch by default', function () {
                    var c = new Channel();
                    expect(c.variables.private.options.autoFetch.start).to.equal(true);
                });
                it('should not auto-fetch if there\'s an initial operation', function () {
                    var c = new Channel({}, 'my-init-fun');
                    expect(c.variables.private.options.autoFetch.start).to.equal(false);
                });
                it('should  auto-fetch if the initial operation is silent', function () {
                    var c = new Channel({
                        operations: {
                            silent: ['my-init-fun']
                        }
                    }, 'my-init-fun');
                    expect(c.variables.private.options.autoFetch.start).to.equal(true);
                });
            });
        });

        describe.only('#publish', function () {
            var c, varPubStub, opPubStub;
            beforeEach(()=> {
                c = new Channel();
                varPubStub = sinon.stub(c.variables, 'publish', ()=> {
                    return $.Deferred().resolve().promise();
                });
                opPubStub = sinon.stub(c.operations, 'publish', ()=> {
                    return $.Deferred().resolve().promise();
                });
            });
            it('should call pick the variables channel based on context', function () {
                //FIXME: This will obviously be more robust later
                c.publish({}, {}, { type: 'variables' });
                expect(varPubStub).to.have.been.calledOnce;
                expect(opPubStub).to.not.have.been.called;
            }); 
            it('should call pick the operations channel based on context', function () {
                c.publish({}, {}, { type: 'operations' });
                expect(opPubStub).to.have.been.calledOnce;
                expect(varPubStub).to.not.have.been.called;
            });
            it('should support key, value arguments', ()=> {
                c.publish('key', 'value', { batch: true }, { type: 'variables' });

                var args = varPubStub.getCall(0).args;
                expect(args[0]).to.eql({ key: 'value' });
                expect(args[1]).to.eql({ batch: true });
            });
            it('should support object arguments', ()=> {
                c.publish({ key: 'value' }, { batch: true }, { type: 'variables' });

                var args = varPubStub.getCall(0).args;
                expect(args[0]).to.eql({ key: 'value' });
                expect(args[1]).to.eql({ batch: true });
            });
        });
    });
}());
