'use strict';
(function () {

    var Channel = require('src/channels/variables-channel');
    var lolex = require('lolex');

    describe('Variables Channel', function () {
        var channel;
        var server;
        var mockVariables;
        var mockRun;
        var clock;

        beforeEach(function () {
            //Needed to make _.debounce work correctly with fakeTimers
            clock = lolex.install();
            _ = _.runInContext(window);//eslint-disable-line
            mockVariables = {
                query: sinon.spy(function (variables) {
                    if (!variables) {
                        variables = [];
                    }
                    var response = {};
                    variables.forEach(function (v) {
                        response[v] = 1;
                    });
                    var prom = $.Deferred().resolve(response).promise();
                    clock.tick(1);
                    return prom;
                }),
                save: sinon.spy(function () {
                    var prom = $.Deferred().resolve().promise();
                    clock.tick(1);
                    return prom;
                })
            };
            mockRun = {
                variables: function () {
                    return mockVariables;
                }
            };
            channel = new Channel({ run: mockRun });
            core = channel.private;
        });
        before(function () {
            server = sinon.fakeServer.create();
            server.respondWith('PATCH', /(.*)\/run\/(.*)\/(.*)/, function (xhr, id) {
                xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ url: xhr.url }));
            });
            server.respondWith('GET', /(.*)\/run\/(.*)\/variables/, function (xhr, id) {
                xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ url: xhr.url,
                    price: 1,
                    sales: 30,
                    priceArray: [20, 30]
                }));
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

        afterEach(function () {
            mockVariables = null;
            mockRun = null;
            channel = null;
            core = null;
            clock.uninstall();
        });
        after(function () {
            server.restore();
        });

        describe('#startAutoFetch', function () {
            it('should start auto-fetching after #startAutoFetch is called', function () {
                var channel = new Channel({
                    run: mockRun,
                    autoFetch: {
                        enable: true,
                        debounce: 200,
                        start: false
                    }
                });

                var spy = sinon.spy();
                channel.subscribe(['a', 'b', 'd'], spy, { batch: true });

                clock.tick(201);

                var spy2 = sinon.spy();
                channel.subscribe(['e'], spy2, { batch: true });

                channel.startAutoFetch();
                clock.tick(201);

                spy.should.have.been.calledOnce;
                // spy2.should.have.been.calledOnce;

                // var spy3 = sinon.spy();
                // channel.subscribe(['f'], spy3, { batch: true });
                // clock.tick(201);
                // spy3.should.have.been.calledOnce;
            });

            it('should not start if auto-fetch is disabled', function () {
                var channel = new Channel({
                    run: mockRun,
                    autoFetch: {
                        enable: false,
                        debounce: 200,
                        start: false
                    }
                });

                var spy = sinon.spy();
                channel.subscribe(['a', 'b', 'd'], spy, { batch: true });

                clock.tick(201);

                var spy2 = sinon.spy();
                channel.subscribe(['e'], spy2, { batch: true });

                channel.startAutoFetch();
                clock.tick(201);

                spy.should.not.have.been.called;
                spy2.should.not.have.been.called;
            });
        });

        describe('#stopAutoFetch', function () {
            it('should not keep fetching after #stopAutoFetch is called', function () {
                var channel = new Channel({
                    run: mockRun,
                    autoFetch: {
                        enable: true,
                        debounce: 200
                    }
                });

                var spy = sinon.spy();
                channel.subscribe(['a', 'b', 'd'], spy, { batch: true });
                clock.tick(201);
                spy.should.have.been.called;
                channel.stopAutoFetch();

                var spy2 = sinon.spy();
                channel.subscribe(['x'], spy2, { batch: true });

                clock.tick(201);

                spy2.should.not.have.been.called;

            });
        });
        describe('options', function () {
            describe('autoFetch.debounce', function () {
                it('should fetch within given time if everything is subscribed to at once', function () {
                    var channel = new Channel({
                        run: mockRun,
                        autoFetch: {
                            enable: true,
                            debounce: 200
                        }
                    });

                    var spy = sinon.spy();
                    channel.subscribe(['a', 'b', 'd'], spy, { batch: true });
                    spy.should.not.have.been.called;

                    clock.tick(201);

                    spy.should.have.been.calledOnce;
                });
                it('should keep waiting if things are being added', function () {
                    var channel = new Channel({
                        run: mockRun,
                        autoFetch: {
                            enable: true,
                            debounce: 200
                        }
                    });

                    var spy = sinon.spy();
                    channel.subscribe(['a', 'b', 'd'], spy, { batch: true });
                    spy.should.not.have.been.called;

                    clock.tick(199);

                    var spy2 = sinon.spy();
                    channel.subscribe(['e', 'f'], spy2, { batch: true });

                    clock.tick(3);

                    spy.should.not.have.been.called;
                    spy2.should.not.have.been.called;

                    clock.tick(201);

                    spy.should.have.been.calledOnce;
                    spy2.should.have.been.calledOnce;
                });
            });
            describe('autoFetch.start', function () {
                it('should not start fetching until start is set', function () {
                    var channel = new Channel({
                        run: mockRun,
                        autoFetch: {
                            enable: true,
                            debounce: 200,
                            start: false
                        }
                    });

                    var spy = sinon.spy();
                    channel.subscribe(['a', 'b', 'd'], spy, { batch: true });
                    spy.should.not.have.been.called;

                    clock.tick(201);
                    spy.should.not.have.been.called;
                });
                it('should not start fetching until enable is set', function () {
                    var channel = new Channel({
                        run: mockRun,
                        autoFetch: {
                            enable: false,
                            debounce: 200,
                            start: true
                        }
                    });

                    var spy = sinon.spy();
                    channel.subscribe(['a', 'b', 'd'], spy, { batch: true });
                    spy.should.not.have.been.called;

                    clock.tick(201);
                    spy.should.not.have.been.called;
                });
            });
        });
    });
}());
