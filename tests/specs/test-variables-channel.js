(function () {
    'use strict';

    var Channel = require('../../src/channels/variables-channel');

    describe('Flow Channel', function () {
        var core, channel, server;

        before(function () {
            server = sinon.fakeServer.create();
            server.respondWith('PATCH',  /(.*)\/run\/(.*)\/(.*)/, function (xhr, id) {
                xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ url: xhr.url }));
            });
            server.respondWith('GET',  /(.*)\/run\/(.*)\/(.*)/, function (xhr, id) {
                xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ url: xhr.url }));
            });
            server.respondWith('POST',  /(.*)\/run\/(.*)\/(.*)/,  function (xhr, id) {
                var resp = {
                    'id': '065dfe50-d29d-4b55-a0fd-30868d7dd26c',
                    'model': 'model.vmf',
                    'account': 'mit',
                    'project': 'afv',
                    'saved': false,
                    'lastModified': '2014-06-20T04:09:45.738Z',
                    'created': '2014-06-20T04:09:45.738Z'
                };
                xhr.respond(201, { 'Content-Type': 'application/json' }, JSON.stringify(resp));
            });

            channel = new Channel({ vent: {}, run: {
                variables: function () {
                    return {
                        query: $.noop,
                        save: $.noop
                    };
                }
            } });
            core = channel.private;
        });

        after(function () {
            server.restore();
        });

        describe('#getInnerVariables', function () {
            it('should extract single variable within limiters', function () {
                var result = core.getInnerVariables('price[<time>]');
                result.should.eql(['time']);
            });

            it('should extract multiple variable within limiters', function () {
                var result = core.getInnerVariables('price[<time>,<step>]');
                result.should.eql(['time', 'step']);
            });

            it('should return nothing if nothing to interpolate', function () {
                var result = core.getInnerVariables('price');
                result.should.eql([]);
            });
        });

        describe('#interpolate', function () {
            describe('.interpolated', function () {
                it('should interpolate single variable', function () {
                    var result = core.interpolate({ 'price[<time>]': 1 }, { time: 1 });
                    var interpolated = result.interpolated;

                    interpolated.should.eql({ 'price[1]': 1 });
                });
                it('should interpolate multiple variables', function () {
                    var result = core.interpolate({ 'price[<time>,2,<step>]': 1 }, { time: 1, step: 4 });
                    var interpolated = result.interpolated;

                    interpolated.should.eql({ 'price[1,2,4]': 1 });
                });
                it('should not interpolate if it finds nothing', function () {
                    var result = core.interpolate({ 'price[<time>,2,<step>]': 1 }, {});
                    var interpolated = result.interpolated;

                    interpolated.should.eql({ 'price[<time>,2,<step>]': 1 });
                });
                it('should not do substrings', function () {
                    var result = core.interpolate({ 'price[<time>,2,<times>]': 1 }, { time: 1, times: 2 });
                    var interpolated = result.interpolated;

                    interpolated.should.eql({ 'price[1,2,2]': 1 });
                });
                it('should do multiples', function () {
                    var result = core.interpolate({ 'price[<time>,2,<times>]': 1, 'sales[<time>]': 1 }, { time: 1, times: 2 });
                    var interpolated = result.interpolated;

                    interpolated.should.eql({ 'price[1,2,2]': 1, 'sales[1]': 1 });
                });
            });
            describe('.interpolationMap', function () {
                it('should interpolate single variable', function () {
                    var result = core.interpolate({ 'price[<time>]': 1 }, { time: 1 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1]': 'price[<time>]' });
                });
                it('should interpolate multiple variables', function () {
                    var result = core.interpolate({ 'price[<time>,2,<step>]': 1 }, { time: 1, step: 4 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1,2,4]': 'price[<time>,2,<step>]' });
                });
                it('should not interpolate if it finds nothing', function () {
                    var result = core.interpolate({ 'price[<time>,2,<step>]': 1 }, {});
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[<time>,2,<step>]': 'price[<time>,2,<step>]' });
                });
                it('should not do substrings', function () {
                    var result = core.interpolate({ 'price[<time>,2,<times>]': 1 }, { time: 1, times: 2 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1,2,2]': 'price[<time>,2,<times>]' });
                });
                it('should do multiples', function () {
                    var result = core.interpolate({ 'price[<time>,2,<times>]': 1, 'sales[<time>]': 1 }, { time: 1, times: 2 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1,2,2]': 'price[<time>,2,<times>]', 'sales[1]': 'sales[<time>]' });
                });

                it('should handle mixed items', function () {
                    var result = core.interpolate({ 'price[<time>]': 1, 'price[1]': 1 }, { time: 1 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1]': 'price[<time>]' });
                });

                it('should handle a variable being interpolated with different items with same value', function () {
                    var result = core.interpolate({ 'price[<time>]': 1, 'price[1]': 1, 'price[<stuff>]': 1 }, { time: 1, stuff: 1 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1]': ['price[<stuff>]', 'price[<time>]'] });
                });

            });

        });

        describe('#unsubscribeAll', function () {
            it('should clear out state variables', function () {
                channel.subscribe(['price'], {});
                channel.subscribe(['target'], {});

                channel.unsubscribeAll();
                channel.variableListenerMap.should.eql({});
                channel.innerVariablesList.should.eql([]);

            });

        });

        describe('#subscribe', function () {
            afterEach(function () {
                channel.unsubscribeAll();
            });
            it('should update variable listeners', function () {
                channel.subscribe(['price'], {});
                channel.variableListenerMap.should.have.key('price');
            });
            it('should update inner variable dependencies for single items', function () {
                channel.subscribe(['price[<time>]'], {});

                channel.variableListenerMap.should.have.key('price[<time>]');
                channel.innerVariablesList.should.eql(['time']);
            });

            it('should update inner variable dependencies for multiple items', function () {
                channel.subscribe(['price[<time>]', 'apples', 'sales[<step>]'], {});

                channel.variableListenerMap.should.have.keys('price[<time>]', 'apples', 'sales[<step>]');
                channel.innerVariablesList.should.eql(['time', 'step']);
            });

        });

        describe('tokens', function () {
            afterEach(function () {
                channel.unsubscribeAll();
            });

            it('should generate a token', function () {
                var dummyObject = { a: 1 };
                var token = channel.subscribe(['price[<time>]', 'apples', 'sales[<step>]'], dummyObject);
                token.should.exist;
            });

            it('should use the token to unsubscribe', function () {
                var dummyObject = { a: 1 };
                var token = channel.subscribe(['price[<time>]', 'apples', 'sales[<step>]'], dummyObject);
                channel.variableListenerMap.apples.should.exist;

                channel.unsubscribe(token);
                // channel.variableListenerMap.apples.should.eql([]);

            });
        });
    });
}());
