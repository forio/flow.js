'use strict';
(function () {

    var Channel = require('src/channels/variables-channel');

    describe('Variables Channel', function () {
        var core, channel, server, mockVariables, mockRun;

        before(function () {
            server = sinon.fakeServer.create();
            server.respondWith('PATCH',  /(.*)\/run\/(.*)\/(.*)/, function (xhr, id) {
                xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ url: xhr.url }));
            });
            server.respondWith('GET',  /(.*)\/run\/(.*)\/variables/, function (xhr, id) {
                xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ url: xhr.url,
                    price: 1,
                    sales: 30,
                    priceArray: [20, 30]
                }));
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

            mockVariables = {
                query: sinon.spy(function (variables) {
                    if (!variables) {
                        variables = [];
                    }
                    var response = {};
                    variables.forEach(function (v) {
                        response[v] = 1;
                    });
                    return $.Deferred().resolve(response).promise();
                }),
                save: sinon.spy(function () {
                    return $.Deferred().resolve().promise();
                })
            };
            mockRun = {
                variables: function () {
                    return mockVariables;
                }
            };
            channel = new Channel({ vent: {}, run: mockRun });
            core = channel.private;
        });

        after(function () {
            server.restore();
            mockVariables = null;
            mockRun = null;
            channel = null;
            core = null;
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
                    var result = core.interpolate(['price[<time>]'], { time: 1 });
                    var interpolated = result.interpolated;

                    interpolated.should.eql(['price[1]']);
                });
                it('should interpolate multiple variables', function () {
                    var result = core.interpolate(['price[<time>,2,<step>]'], { time: 1, step: 4 });
                    var interpolated = result.interpolated;

                    interpolated.should.eql(['price[1,2,4]']);
                });
                it('should not interpolate if it finds nothing', function () {
                    var result = core.interpolate(['price[<time>,2,<step>]'], {});
                    var interpolated = result.interpolated;

                    interpolated.should.eql(['price[<time>,2,<step>]']);
                });

                it('should not interpolate if there\'s nothing to interpolate', function () {
                    var result = core.interpolate(['price[<time>]', 'sales[1]', 'cost[<x>]'], { time: 1 });
                    var interpolated = result.interpolated;

                    interpolated.should.eql(['price[1]',  'sales[1]', 'cost[<x>]']);
                });
                it('should not do substrings', function () {
                    var result = core.interpolate(['price[<time>,2,<times>]'], { time: 1, times: 2 });
                    var interpolated = result.interpolated;

                    interpolated.should.eql(['price[1,2,2]']);
                });
                it('should do multiples', function () {
                    var result = core.interpolate(['price[<time>,2,<times>]', 'sales[<time>]'], { time: 1, times: 2 });
                    var interpolated = result.interpolated;

                    interpolated.should.eql(['price[1,2,2]', 'sales[1]']);
                });
            });
            describe('.interpolationMap', function () {
                it('should interpolate single variable', function () {
                    var result = core.interpolate(['price[<time>]'], { time: 1 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1]': 'price[<time>]' });
                });
                it('should interpolate multiple variables', function () {
                    var result = core.interpolate(['price[<time>,2,<step>]'], { time: 1, step: 4 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1,2,4]': 'price[<time>,2,<step>]' });
                });
                it('should not interpolate if it finds nothing', function () {
                    var result = core.interpolate(['price[<time>,2,<step>]'], {});
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[<time>,2,<step>]': 'price[<time>,2,<step>]' });
                });
                it('should not interpolate if there\'s nothing to interpolate', function () {
                    var result = core.interpolate(['price[<time>]', 'sales[1]', 'cost[<x>]'], { time: 1 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1]': 'price[<time>]', 'cost[<x>]': 'cost[<x>]' });
                });

                it('should not do substrings', function () {
                    var result = core.interpolate(['price[<time>,2,<times>]'], { time: 1, times: 2 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1,2,2]': 'price[<time>,2,<times>]' });
                });
                it('should do multiples', function () {
                    var result = core.interpolate(['price[<time>,2,<times>]', 'sales[<time>]'], { time: 1, times: 2 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1,2,2]': 'price[<time>,2,<times>]', 'sales[1]': 'sales[<time>]' });
                });

                it('should handle mixed items', function () {
                    var result = core.interpolate(['price[<time>]', 'price[1]'], { time: 1 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1]': 'price[<time>]' });
                });

                it('should handle a variable being interpolated with different items with same value', function () {
                    var result = core.interpolate(['price[<time>]', 'price[1]', 'price[<stuff>]'], { time: 1, stuff: 1 });
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
                channel.getTopicDependencies().should.eql([]);
                channel.subscriptions.should.eql([]);
            });

        });

        describe('#subscribe', function () {
            afterEach(function () {
                channel.unsubscribeAll();
            });
            it('should update variable listeners', function () {
                channel.subscribe(['price'], {});

                channel.getSubscribers('price').length.should.equal(1);
            });
            it('should update inner variable dependencies for single items', function () {
                channel.subscribe(['price[<time>]'], {});

                var subs = channel.getSubscribers('price[<time>]');
                subs.length.should.equal(1);
                channel.getTopicDependencies().should.eql(['time']);
            });

            it('should update inner variable dependencies for multiple items', function () {
                channel.subscribe(['price[<time>]', 'apples', 'sales[<step>]'], {});

                channel.getSubscribers('price[<time>]').length.should.equal(1);
                channel.getSubscribers('apples').length.should.equal(1);
                channel.getSubscribers('sales[<step>]').length.should.equal(1);

                channel.getTopicDependencies().should.eql(['time', 'step']);
            });
            it('should generate a token', function () {
                var dummyObject = { a: 1 };
                var token = channel.subscribe(['price[<time>]', 'apples', 'sales[<step>]'], dummyObject);
                token.should.exist;
            });

            describe('functions', function () {
               it('should allow subscribing functions to single variables', function () {
                   var cb = sinon.spy();
                   channel.subscribe('price', cb);
                   channel.getSubscribers('price').length.should.equal(1);

                   channel.publish('price', 32);
                   cb.should.have.been.called.calledOnce;
                   cb.should.have.been.calledWith({ price: 1 }); // mock server always returns 1

               });

               //TODO: this will be called twice because the channel can't tell if things have changed or not
               it.skip('should allow subscribing functions to multi variables', function () {
                   var cb = sinon.spy();
                   channel.subscribe(['price', 'sales'], cb);

                   channel.getSubscribers('price').length.should.equal(1);
                   channel.getSubscribers('sales').length.should.equal(1);

                   channel.publish('price', 32);

                   cb.should.have.been.called.calledOnce;
                   cb.should.have.been.calledWith({ price: 1 }); // mock server always returns 1

               });
            });
        });

        describe('#publish', function () {
            it('should publish values to the variables service', function () {
                channel.publish({ price: 1 });
                mockVariables.save.should.have.been.calledWith({ price: 1 });

            });
            //Skipping till we figure out a way to set the interpolation map
            it.skip('should interpolate variables', function () {
                // channel.interpolationMap.time = 1;
                channel.publish({ 'price[<time>]': 1 });
                mockVariables.save.should.have.been.calledWith({ 'price[1]': 1 });

            });
            it('should call refresh after publish', function () {
                var originalRefresh = channel.refresh;
                var refSpy = sinon.spy(originalRefresh);
                channel.refresh = refSpy;

                channel.publish({ price: 1 });
                refSpy.should.have.been.called;

                channel.refresh = originalRefresh;
            });
            it('should not call refresh if silenced', function () {
                var originalRefresh = channel.refresh;
                var refSpy = sinon.spy(originalRefresh);
                channel.refresh = refSpy;

                channel.publish({ price: 1 }, { silent: true });
                refSpy.should.not.have.been.called;

                channel.refresh = originalRefresh;
            });
        });

        describe('#refresh', function () {
            it('should call if no rules are specified', function () {
                var channel = new Channel({ vent: {}, run: mockRun });
                var modelChangeSpy = sinon.spy();

                var $sink = $({ a:1 });
                channel.subscribe('price', $sink);
                $sink.on('update.f.model', modelChangeSpy);

                channel.publish({ price: 24 });

                modelChangeSpy.should.have.been.called;
            });

            it('should not call refresh if silent is true', function () {
                var channel = new Channel({ vent: {}, run: mockRun, silent: true });
                var modelChangeSpy = sinon.spy();

                var $sink = $({ a:1 });
                channel.subscribe('price', $sink);
                $sink.on('update.f.model', modelChangeSpy);

                channel.publish({ price: 24 });
                modelChangeSpy.should.not.have.been.called;
            });

            it('should call refresh if forced', function () {
                var channel = new Channel({ vent: {}, run: mockRun, silent: true });
                var modelChangeSpy = sinon.spy();

                var $sink = $({ a:1 });
                channel.subscribe('price', $sink);
                $sink.on('update.f.model', modelChangeSpy);

                channel.publish({ price: 24 });
                modelChangeSpy.should.not.have.been.called;

                channel.refresh({ price: 1 }, true);
                modelChangeSpy.should.have.been.calledOnce;
            });


            it('should call refresh if silent is false', function () {
                var channel = new Channel({ vent: {}, run: mockRun, silent: false });

                var modelChangeSpy = sinon.spy();

                var $sink = $({ a:1 });
                channel.subscribe('price', $sink);
                $sink.on('update.f.model', modelChangeSpy);

                channel.publish({ price: 24 });
                modelChangeSpy.should.have.been.calledOnce;

                channel.publish({ stuff: 24 });
                modelChangeSpy.should.have.been.calledTwice;

            });

            it('should not call refresh if silent whitelist match', function () {
                var channel = new Channel({ vent: {}, run: mockRun, silent: ['price'] });

                var modelChangeSpy = sinon.spy();

                var $sink = $({ a:1 });
                channel.subscribe('price', $sink);
                channel.subscribe('stuff', $sink);
                $sink.on('update.f.model', modelChangeSpy);

                channel.publish({ price: 24 });
                modelChangeSpy.should.not.have.been.called;

                channel.publish({ stuff: 24 });
                modelChangeSpy.should.have.been.calledOnce;
            });

            it('should call refresh if silent blacklist match', function () {
                var channel = new Channel({ vent: {}, run: mockRun, silent: {
                    except: ['price']
                } });

                var modelChangeSpy = sinon.spy();

                var $sink = $({ a:1 });
                channel.subscribe('price', $sink);
                channel.subscribe('stuff', $sink);
                $sink.on('update.f.model', modelChangeSpy);

                channel.publish({ price: 24 });
                modelChangeSpy.should.have.been.calledOnce;

                channel.publish({ stuff: 24 });
                modelChangeSpy.should.have.been.calledOnce;
            });
        });

        describe('#notify', function () {
            afterEach(function () {
                channel.unsubscribeAll();
            });
            it('should notify listeners when provided a variable and value', function () {
                var channel = new Channel({ run: mockRun });
                var spy = sinon.spy();
                channel.subscribe('price', spy);
                channel.subscribe('stuff', spy);

                channel.notify('price', 2);

                spy.should.have.been.calledOnce;

            });

            it('should notify listeners with the changed value if listener is a function', function () {
                var channel = new Channel({ run: mockRun });
                var spy = sinon.spy();
                channel.subscribe('price', spy);

                channel.notify('price', 2);

                spy.should.have.been.calledWith({ price: 2 });

            });
            it('should trigger an event if listener is a sink', function () {
                var channel = new Channel({ run: mockRun });
                var modelChangeSpy = sinon.spy();

                var $sink = $({ a:1 });
                channel.subscribe('price', $sink);
                channel.subscribe('stuff', $sink);
                $sink.on('update.f.model', modelChangeSpy);

                channel.notify('price', 2);

                modelChangeSpy.should.have.been.calledOnce;
                modelChangeSpy.getCall(0).args[1].should.eql({ price: 2 });
            });
            it('should notify multiple times if passed an object', function () {
                var channel = new Channel({ run: mockRun });
                var spy1 = sinon.spy();
                var spy2 = sinon.spy();
                channel.subscribe('price', spy1);
                channel.subscribe('stuff', spy2);

                channel.notify({ price: 2, stuff: 1 });

                spy1.should.have.been.calledWith({ price: 2 });
                spy2.should.have.been.calledWith({ stuff: 1 });
            });
            describe('batch', function () {
                it('should batch calls if subscribe is called with batch:true', function () {
                    var channel = new Channel({ run: mockRun });
                    var spy1 = sinon.spy();
                    var spy2 = sinon.spy();
                    channel.subscribe(['price', 'cost'], spy1, { batch: true });
                    channel.subscribe(['price', 'cost'], spy2, { batch: false });

                    channel.notify({ price: 2, cost: 1 });

                    spy1.should.have.been.calledOnce;
                    spy2.should.have.been.calledTwice;
                });
                it('should pass the correct parameters to batched calls', function () {
                    var channel = new Channel({ run: mockRun });
                    var spy1 = sinon.spy();
                    var spy2 = sinon.spy();
                    channel.subscribe(['price', 'cost'], spy1, { batch: true });
                    channel.subscribe(['price', 'cost'], spy2, { batch: false });

                    channel.notify({ price: 2, cost: 1 });

                    spy1.should.have.been.calledWith({ price: 2, cost: 1 });
                    spy2.getCall(0).args[0].should.eql({ price: 2 });
                    spy2.getCall(1).args[0].should.eql({ cost: 1 });
                });

                it('should not re-tigger non-batched calls', function () {
                    var channel = new Channel({ run: mockRun });
                    var spy1 = sinon.spy();
                    channel.subscribe(['price', 'cost'], spy1, { batch: true });
                    channel.subscribe(['something', 'else'], spy1, { batch: false });

                    channel.notify({ price: 2, cost: 1 });

                    spy1.should.have.been.calledOnce;
                });
            });
        });
        describe('#unsubscribe', function () {
            afterEach(function () {
                channel.unsubscribeAll();
            });

            it('should use the token to unsubscribe', function () {
                var dummyObject = { a: 1 };
                var token = channel.subscribe(['price[<time>]', 'apples', 'sales[<step>]'], dummyObject);

                channel.getSubscribers('apples').length.should.equal(1);

                channel.unsubscribe(token);
                channel.getSubscribers().should.eql([]);
            });
        });

        describe('options', function () {
            describe('autoFetch', function () {
                describe('.items', function () {
                    it('should get new values every time we have more than X many unfetched items', function () {
                        var channel = new Channel({
                            vent: {},
                            run: mockRun,
                            autoFetch: {
                                interval: false,
                                items: 5
                            } });

                        var spy = sinon.spy();
                        channel.subscribe(['a', 'b', 'c', 'd'], spy, { batch: true });

                        spy.should.not.have.been.called;
                        var spy2 = sinon.spy();
                        channel.subscribe(['e', 'f'], spy2, { batch: true });

                        spy.should.have.been.calledOnce;
                        spy2.should.have.been.calledOnce;
                    });
                });
            });
        });
    });
}());
