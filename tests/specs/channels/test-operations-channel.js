(function() {
    'use strict';

    var Channel = require('../../../src/channels/operations-channel');

    describe('Flow Channel', function () {
        var core, channel, server, mockRun;
        var sampleResponse = {
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
                xhr.respond(200, { 'Content-Type': 'application/json'}, JSON.stringify(sampleResponse));
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
                    return $.Deferred().resolve(sampleResponse).promise();
                }),
                serial: sinon.spy(function () {
                    return $.Deferred().resolve(sampleResponse).promise();
                }),
                parallel: sinon.spy(function () {
                    return $.Deferred().resolve(sampleResponse).promise();
                })
            };
            channel = new Channel({vent: {}, run: mockRun});
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


            // it('should call refresh after publish', function () {
            //     var originalRefresh = channel.refresh;
            //     var refSpy = sinon.spy(originalRefresh);
            //     channel.refresh = refSpy;

            //     channel.publish({price: 23});
            //     refSpy.should.have.been.called;

            //     channel.refresh = originalRefresh;
            // });
        });


        // describe('#unsubscribeAll', function () {
        //     it('should clear out state variables', function() {
        //         channel.subscribe(['price'], {});
        //         channel.subscribe(['target'], {});

        //         channel.unsubscribeAll();
        //         channel.listenerMap.should.eql({});
        //         channel.innerVariablesList.should.eql([]);

        //     });

        // });

        // describe('#subscribe', function () {
        //     afterEach(function() {
        //         channel.unsubscribeAll();
        //     });
        //     it('should update operation listeners', function () {
        //         channel.subscribe(['reset'], {});
        //         channel.listenerMap.should.have.key('reset');
        //     });
        //     // it('should update inner operation dependencies for single items', function () {
        //     //     channel.subscribe(['price[<time>]'], {});

        //     //     channel.listenerMap.should.have.key('price[<time>]');
        //     //     channel.innerVariablesList.should.eql(['time']);
        //     // });

        //     // it('should update inner operation dependencies for multiple items', function () {
        //     //     channel.subscribe(['price[<time>]', 'apples', 'sales[<step>]'], {});

        //     //     channel.listenerMap.should.have.keys('price[<time>]', 'apples', 'sales[<step>]');
        //     //     channel.innerVariablesList.should.eql(['time', 'step']);
        //     // });

        // });


        // describe('tokens', function () {
        //     afterEach(function() {
        //         channel.unsubscribeAll();
        //     });

        //     it('should generate a token', function () {
        //         var dummyObject = {a: 1};
        //         var token = channel.subscribe(['price[<time>]', 'apples', 'sales[<step>]'], dummyObject);
        //         token.should.exist;
        //     });

        //     it('should use the token to unsubscribe', function () {
        //         var dummyObject = {a: 1};
        //         var token = channel.subscribe(['price[<time>]', 'apples', 'sales[<step>]'], dummyObject);
        //         channel.listenerMap.apples.should.exist;

        //         channel.unsubscribe(token);
        //         // channel.listenerMap.apples.should.eql([]);

        //     });
        // });
    });
}());
