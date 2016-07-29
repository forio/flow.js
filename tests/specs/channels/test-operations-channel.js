'use strict';
(function () {

    var Channel = require('src/channels/operations-channel');

    describe('Operations Channel', function () {
        var channel;
        var server;
        var mockRun;
        var mockOperationsResponse = {
            message: 'operation Complete',
            stuff: 1,
            data: [1, 2]
        };
        beforeEach(function () {
            var spy = sinon.spy(function () {
                return $.Deferred().resolve(mockOperationsResponse).promise();
            });
            mockRun = {
                do: spy,
                serial: spy,
                parallel: spy
            };

            channel = new Channel({ run: mockRun });
        });
        afterEach(function () {
            mockRun = channel = null;
        });
        before(function () {
            server = sinon.fakeServer.create();
            server.respondWith('PATCH', /(.*)\/run\/(.*)\/(.*)/, function (xhr, id) {
                xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ url: xhr.url }));
            });
            server.respondWith('GET', /(.*)\/run\/(.*)\/variables/, function (xhr, id) {
                xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ url: xhr.url,
                    price: 23,
                    sales: 30,
                    priceArray: [20, 30]
                }));
            });
            server.respondWith('GET', /(.*)\/run\/(.*)\/operations/, function (xhr, id) {
                xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(mockOperationsResponse));
            });
            server.respondWith('POST', /(.*)\/run\/(.*)\/(.*)/, function (xhr, id) {
                var resp = {
                    id: '065dfe50-d29d-4b55-a0fd-30868d7dd26c',
                    model: 'model.vmf',
                    account: 'mit',
                    project: 'afv',
                    saved: false,
                    lastModified: '2014-06-20T04:09:45.738Z',
                    created: '2014-06-20T04:09:45.738Z'
                };
                xhr.respond(201, { 'Content-Type': 'application/json' }, JSON.stringify(resp));
            });

        });

        after(function () {
            server.restore();
        });


        describe('#publish', function () {
            it('should publish single to the run service', function () {
                channel.publish('step', 1).then(function () {
                    mockRun.do.should.have.been.calledWith('step', 1);
                });
            });

            it('should publish multiple parallel values to the run service', function () {
                channel.publish({ operations: [{ name: 'step', params: ['1'] }], serial: false }).then(function () {
                    mockRun.parallel.should.have.been.calledWith([{ name: 'step', params: ['1'] }]);
                });
            });
            it('should publish multiple serial values to the run service', function () {
                channel.publish({ operations: [{ name: 'step', params: ['1'] }], serial: true }).then(function () {
                    mockRun.serial.should.have.been.calledWith([{ name: 'step', params: ['1'] }]);
                });
            });

            it('should call the callback multiple times if the same step is executed', function () {
                var channel = new Channel({ run: mockRun });
                var spy = sinon.spy();
                channel.subscribe('step', spy);

                channel.publish({
                    operations: [
                        { name: 'step', params: [] },
                        { name: 'reset', params: [] },
                        { name: 'step', params: [] }
                    ]
                }).then(function () {
                    spy.should.have.been.calledTwice;
                });
            });

            it('should call refresh after publish', function () {
                var originalRefresh = channel.refresh;
                var refSpy = sinon.spy(originalRefresh);
                channel.refresh = refSpy;

                channel.publish('step', 1).then(function () {
                    refSpy.should.have.been.called;
                    refSpy.should.have.been.calledWith(['step']);

                    channel.refresh = originalRefresh;
                });
            });

            describe('silent:true', function () {
                var original;
                var refSpy;
                beforeEach(function () {
                    original = channel.notify;
                    refSpy = sinon.spy(original);
                    channel.notify = refSpy;
                });
                afterEach(function () {
                    channel.notify = original;
                });
                it('should not call refresh after publish as string', function () {
                    channel.publish('step', 1, { silent: true }).then(function () {
                        refSpy.should.not.have.been.called;
                    });
                });
                it('should not call refresh after publish as object', function () {
                    channel.publish({ step: 1 }, { silent: true }).then(function () {
                        refSpy.should.not.have.been.called;
                    });
                });
                it('should not call refresh after publish as object with operations', function () {
                    channel.publish({ operations: [{ name: 'step', params: ['1'] }], serial: false }, { silent: true }).then(function () {
                        refSpy.should.not.have.been.called;
                    });
                });
            });

            describe('readonly: true', function () {
                it('should not call `do` if readonly true', function () {
                    var c = new Channel({ run: mockRun, readOnly: true });
                    c.publish({ step: 1 }).then(function () {
                        mockRun.do.should.not.have.been.called;
                    });
                });
                it('should call `do` if readonly false', function () {
                    var c = new Channel({ run: mockRun, readOnly: false });
                    c.publish({ step: 1 }).then(function () {
                        mockRun.do.should.have.been.called;
                    });
                });
                it('should allow passing a function for true', function () {
                    var c = new Channel({ run: mockRun, readOnly: function () { return true; } });
                    c.publish({ step: 1 }).then(function () {
                        mockRun.do.should.not.have.been.called;
                    });
                });
                it('should allow passing a function for false', function () {
                    var c = new Channel({ run: mockRun, readOnly: function () { return false; } });
                    c.publish({ step: 1 }).then(function () {
                        mockRun.do.should.have.been.called;
                    });
                });
                it('should return a rejected promise when published to readonly channel ', function () {
                    var c = new Channel({ run: mockRun, readOnly: true });
                    var prom = c.publish({ step: 1 });
                    prom.state().should.equal('rejected');
                });
            });
        });

        describe('interpolate', function () {
            it('allow specifying an interpolation map', function () {

            });
        });

        describe('#refresh', function () {
            it('should call if no rules are specified', function () {
                var channel = new Channel({ run: mockRun });
                var spy = sinon.spy();
                channel.subscribe('*', spy);

                channel.publish('step', 1).then(function () {
                    spy.should.have.been.calledOnce;
                    spy.getCall(0).args[1].should.eql(mockOperationsResponse);
                    spy.getCall(0).args[2].should.eql('step');
                });
            });


            it('should not call refresh if silent is true', function () {
                var channel = new Channel({ run: mockRun, silent: true });
                var spy = sinon.spy();
                channel.subscribe('*', spy);

                channel.publish('step', 1).then(function () {
                    spy.should.not.have.been.called;
                });
            });

            it('should call refresh if silent is true', function () {
                var channel = new Channel({ run: mockRun, silent: false });
                var spy = sinon.spy();
                channel.subscribe('*', spy);

                channel.publish('step', 1).then(function () {
                    spy.should.have.been.calledOnce;
                });
            });

            it('should not call refresh if exceptions are noted', function () {
                var channel = new Channel({ run: mockRun, silent: ['step'] });
                var spy = sinon.spy();
                channel.subscribe('*', spy);

                channel.publish('step', 1).then(function () {
                    spy.should.not.have.been.called;
                });
            });

            it('should refresh when the force flag is sent regardless of options', function () {
                var channel = new Channel({ run: mockRun, silent: ['step'] });
                var spy = sinon.spy();
                channel.subscribe('*', spy);

                channel.publish('step', 1).then(function () {
                    spy.should.not.have.been.called;

                    channel.refresh(['step'], null, true);
                    spy.should.have.been.calledOnce;
                });
            });

            it('should treat \'except\' as a whitelist for single-item arrays', function () {
                var channel = new Channel({ run: mockRun, silent: {
                    except: ['step']
                } });
                var spy = sinon.spy();
                channel.subscribe('*', spy);

                channel.publish('step', 1).then(function () {
                    spy.should.have.been.calledOnce;

                    channel.publish('reset').then(function () {
                        spy.should.have.been.calledOnce;
                    });
                });
            });
            it('should not be silent if even one of the executed opns isn\'t whitelisted', function () {
                var channel = new Channel({ run: mockRun, silent: {
                    except: ['a', 'b', 'c']
                } });
                var spy = sinon.spy();
                channel.subscribe('*', spy);

                channel.publish({
                    operations: [
                        { name: 'c', params: [] },
                        { name: 'd', params: [] },
                        { name: '2', params: [] }
                    ]
                }).then(function () {
                    spy.should.have.been.calledOnce;
                });
            });
        });

        describe('#unsubscribeAll', function () {
            it('should clear out state variables', function () {
                channel.subscribe(['step'], {});
                channel.subscribe(['reset'], {});

                channel.unsubscribeAll();
                channel.listenerMap.should.eql({});
            });

        });

        describe('#subscribe', function () {
            afterEach(function () {
                channel.unsubscribeAll();
            });
            it('should update operation listeners', function () {
                channel.subscribe('reset', {});
                channel.listenerMap.should.have.key('reset');
            });
            it('should return a token', function () {
                var token = channel.subscribe('reset', {});
                should.exist(token);
                channel.listenerMap.should.have.key('reset');
            });

            describe('functions', function () {
                it('should allow subscribing functions to single variables', function () {
                    var cb = sinon.spy();
                    channel.subscribe('step', cb);
                    channel.listenerMap.should.have.key('step');

                    channel.publish('step', 32).then(function () {
                        cb.should.have.been.called.calledOnce;
                        cb.should.have.been.calledWith({ step: mockOperationsResponse });
                    });
                });
            });

            it('should allow subscribing to all operations with a wildcard', function () {
                var cb = sinon.spy();
                channel.subscribe('*', cb);

                channel.publish('step', 32).then(function () {
                    cb.should.have.been.called.calledOnce;
                    cb.should.have.been.calledWith({ step: mockOperationsResponse });
                });
            });
        });


        describe('#unsubscribe', function () {
            afterEach(function () {
                channel.unsubscribeAll();
            });

            it('should allow using a token to unsubscribe', function () {
                var dummyObject = { a: 1 };
                var token = channel.subscribe(['step', 'something', 'else'], dummyObject);
                channel.listenerMap.step.length.should.equal(1);

                channel.unsubscribe('step', token);
                channel.listenerMap.step.should.eql([]);

            });
        });
    });
}());
