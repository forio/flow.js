(function() {
    'use strict';

    var Channel = require('../../../src/channels/operations-channel');

    describe('Operations Channel', function () {
        var core, channel, server, mockRun, mockRunChannel;
        var mockOperationsResponse = {
                        message: 'operation Complete',
                        stuff: 1,
                        data: [1,2]
                    };
        before(function () {
            server = sinon.fakeServer.create();
            server.respondWith('PATCH',  /(.*)\/run\/(.*)\/(.*)/, function (xhr, id){
                xhr.respond(200, { 'Content-Type': 'application/json'}, JSON.stringify({url: xhr.url}));
            });
            server.respondWith('GET',  /(.*)\/run\/(.*)\/variables/, function (xhr, id){
                xhr.respond(200, { 'Content-Type': 'application/json'}, JSON.stringify({url: xhr.url,
                    price: 23,
                    sales: 30,
                    priceArray: [20, 30]
                }));
            });
            server.respondWith('GET',  /(.*)\/run\/(.*)\/operations/, function (xhr, id){
                xhr.respond(200, { 'Content-Type': 'application/json'}, JSON.stringify(mockOperationsResponse));
            });
            server.respondWith('POST',  /(.*)\/run\/(.*)\/(.*)/,  function (xhr, id){
                var resp = {
                    'id': '065dfe50-d29d-4b55-a0fd-30868d7dd26c',
                    'model': 'model.vmf',
                    'account': 'mit',
                    'project': 'afv',
                    'saved': false,
                    'lastModified': '2014-06-20T04:09:45.738Z',
                    'created': '2014-06-20T04:09:45.738Z'
                };
                xhr.respond(201, { 'Content-Type': 'application/json'}, JSON.stringify(resp));
            });

            mockRun = {
                do: sinon.spy(function () {
                    return $.Deferred().resolve(mockOperationsResponse).promise();
                }),
                serial: sinon.spy(function () {
                    return $.Deferred().resolve(mockOperationsResponse).promise();
                }),
                parallel: sinon.spy(function () {
                    return $.Deferred().resolve(mockOperationsResponse).promise();
                })
            };

            mockRunChannel = {
                variables: {
                    refresh: sinon.spy(),
                    query: sinon.spy(function () {
                        return $.Deferred().resolve({
                            price: 23,
                            sales: 30,
                            priceArray: [20, 30]
                        }).promise();
                    })
                }
            };

            channel = new Channel({vent: mockRunChannel, run: mockRun});
            core = channel.private;
        });

        after(function () {
            server.restore();
        });


        describe('#publish', function () {
            it('should publish single to the run service', function () {
                channel.publish('step', 1);
                mockRun.do.should.have.been.calledWith('step', 1);
            });

            it('should publish multiple parallel values to the run service', function () {
                channel.publish({operations: [{name: 'step', params: ['1']}], serial:false});
                mockRun.parallel.should.have.been.calledWith([{name: 'step', params: ['1']}]);
            });
            it('should publish multiple serial values to the run service', function () {
                channel.publish({operations: [{name: 'step', params: ['1']}], serial:true});
                mockRun.serial.should.have.been.calledWith([{name: 'step', params: ['1']}]);
            });


            it('should call refresh after publish', function () {
                var originalRefresh = channel.refresh;
                var refSpy = sinon.spy(originalRefresh);
                channel.refresh = refSpy;

                channel.publish('step', 1);
                refSpy.should.have.been.called;

                channel.refresh = originalRefresh;
            });
        });

        describe('#refresh', function () {
            var vent = $({});

            afterEach(function() {
                $(vent).off('dirty');
            });


            it('should call if no rules are specified', function () {
                var channel = new Channel({vent: vent, run: mockRun});
                var spy = sinon.spy();
                $(vent).on('dirty', spy);

                channel.publish('step', 1);

                spy.should.have.been.calledOnce;
                spy.getCall(0).args[1].should.eql({opn: ['step'], response: mockOperationsResponse});
            });

            it('should not call refresh if exceptions are noted', function () {
                var channel = new Channel({vent: vent, run: mockRun, silent: {
                    on: ['step']
                }});
                var spy = sinon.spy();
                $(vent).on('dirty', spy);

                channel.publish('step', 1);

                spy.should.not.have.been.called;
            });
            it('should treat \'except\' as a whitelist for single-item arrays', function () {
                var channel = new Channel({vent: vent, run: mockRun, silent: {
                    except: ['step']
                }});
                var spy = sinon.spy();
                $(vent).on('dirty', spy);

                channel.publish('step', 1);
                spy.should.have.been.calledOnce;

                channel.publish('reset');
                spy.should.have.been.calledOnce;
            });
            it('should treat \'except\' as a whitelist for multi-item arrays', function () {
               var channel = new Channel({vent: vent, run: mockRun, silent: {
                    except: ['step', 'somethingelse']
                }});
                var spy = sinon.spy();
                $(vent).on('dirty', spy);

                channel.publish('step', 1);
                spy.should.have.been.calledOnce;

                channel.publish('reset');
                spy.should.have.been.calledOnce;
            });
            it('should treat \'except\' as a whitelist for strings', function () {
                var channel = new Channel({vent: vent, run: mockRun, silent: {
                     except: 'step'
                 }});
                 var spy = sinon.spy();
                 $(vent).on('dirty', spy);

                 channel.publish('step', 1);
                 spy.should.have.been.calledOnce;

                 channel.publish('reset');
                 spy.should.have.been.calledOnce;
             });
        });

        describe('#unsubscribeAll', function () {
            it('should clear out state variables', function() {
                channel.subscribe(['step'], {});
                channel.subscribe(['reset'], {});

                channel.unsubscribeAll();
                channel.listenerMap.should.eql({});
            });

        });

        describe('#subscribe', function () {
            afterEach(function() {
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
        });


        describe('#unsubscribe', function () {
            afterEach(function() {
                channel.unsubscribeAll();
            });

            it('should allow using a token to unsubscribe', function () {
                var dummyObject = {a: 1};
                var token = channel.subscribe(['step', 'something', 'else'], dummyObject);
                channel.listenerMap.step.length.should.equal(1);

                channel.unsubscribe('step', token);
                channel.listenerMap.step.should.eql([]);

            });
        });
    });
}());
