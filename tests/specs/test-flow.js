'use strict';
module.exports = (function () {
    var Flow = require('src/flow');

    describe('Flow Epicenter integration', function () {
        var server;
        var channelOpts;
        var $elWithoutInit;
        var clock;

        before(function () {
            server = sinon.fakeServer.create();
            // clock = sinon.useFakeTimers();

            server.respondWith('PATCH', /(.*)\/run\/(.*)\/variables\/(.*)/, function (xhr, id) {
                xhr.respond(201, {
                    'Content-Type': 'application/json'
                }, JSON.stringify({
                    url: xhr.url
                }));
            });
            server.respondWith('POST', /(.*)\/run/, function (xhr, id) {
                // console.log('POST');
                var resp = {
                    id: '065dfe50-d29d-4b55-a0fd-30868d7dd26c',
                    model: 'model.vmf',
                    account: 'mit',
                    project: 'afv',
                    saved: false,
                    lastModified: '2014-06-20T04:09:45.738Z',
                    created: '2014-06-20T04:09:45.738Z'
                };
                xhr.respond(201, {
                    'Content-Type': 'application/json'
                }, JSON.stringify(resp));
            });
            server.respondWith('GET', /(.*)/, function (xhr, id) {
                // console.log('GET');
                xhr.respond(200, {
                    'Content-Type': 'application/json'
                }, JSON.stringify({
                    price: 1
                }));
            });
            server.respondImmediately = true;

            $elWithoutInit = $([
                '<div>',
                '   <input type="text" data-f-bind="price" />',
                '</div>'
            ].join(''));
        });

        var cookey;
        beforeEach(function () {
            _ = _.runInContext(window);//eslint-disable-line
            cookey = 'flowtest' + Math.random();
            channelOpts = {
                runManager: {
                    strategy: 'always-new',
                    sessionKey: cookey,
                    run: {
                        account: 'flow',
                        project: 'test',
                        model: 'model.vmf'
                    }
                }
            };
        });
        afterEach(function () {
            //TODO: Fix this after making run-manager get path from urlservice
            var urlService = new F.service.URL();
            var path = '/' + [urlService.appPath, urlService.accountPath, urlService.projectPath].join('/');
            path = path.replace(/\/{2,}/g, '/');
            var c = new F.store.Cookie({ root: path });
            c.remove(cookey);
            cookey = null;
            server.requests = [];

        });

        after(function () {
            server.restore();
        });

        it.only('should create a new run on initialize', function () {
            return Flow.initialize({
                channel: channelOpts
            }).then(function () {
                var req = server.requests.pop();
                req.method.toUpperCase().should.equal('POST');
                req.url.should.equal('https://api.forio.com/v2/run/flow/test/');
                req.requestBody.should.equal(JSON.stringify({
                    scope: {},
                    model: 'model.vmf'
                }));
            });
        });

        describe('Setting variables', function () {
            it('should PATCH variables API on change', function () {
                Flow.initialize({
                    channel: channelOpts,
                    dom: {
                        root: $elWithoutInit
                    }
                }).then(function () {
                    $elWithoutInit.find(':text').val('32').trigger('change');
                    var req = server.requests[2];//POST, GET, PATCH, GET
                    req.method.toUpperCase().should.equal('PATCH');
                    req.requestBody.should.equal(JSON.stringify({
                        price: 32
                    }));
                });
            });

            it('should re-fetch variables after change', function () {
                Flow.initialize({
                    channel: channelOpts,
                    dom: {
                        root: $elWithoutInit
                    }
                }).then(function () {
                    $elWithoutInit.find(':text').val('33').trigger('change');
                    var req = server.requests[server.requests.length - 1];
                    req.method.toUpperCase().should.equal('GET');
                });
            });

            it('should not re-fetch variables after change if set to silent mode', function () {
                Flow.initialize({
                    channel: $.extend(true, {
                        run: {
                            variables: {
                                silent: true
                            }
                        }
                    }, channelOpts),
                    dom: {
                        root: $elWithoutInit
                    }
                }).then(function () {
                    $elWithoutInit.find(':text').val('34').trigger('change');

                    server.requests.length.should.equal(3); //POST, GET, PATCH
                });
            });
        });

        describe('Fetch variables on load', function () {
            it('should fetch variables if there is no default init operation', function () {
                Flow.initialize({
                    channel: $.extend(true, {}, channelOpts),
                    dom: {
                        root: $elWithoutInit
                    }
                }).then(function () {
                    server.requests.length.should.equal(2); //POST, GET

                    server.requests[0].method.toUpperCase().should.equal('POST');
                    server.requests[1].method.toUpperCase().should.equal('GET');
                });
            });
            it('should fetch variables if operations is set to silent', function () {
                Flow.initialize({
                    channel: $.extend(true, {
                        run: {
                            operations: {
                                silent: true
                            }
                        }
                    }, channelOpts),
                    dom: {
                        root: $elWithoutInit
                    }
                }).then(function () {
                    server.requests.length.should.equal(2); //POST, GET

                    server.requests[0].method.toUpperCase().should.equal('POST');
                    server.requests[1].method.toUpperCase().should.equal('GET');
                });
            });

            describe('with on-init', function () {
                var $elWithInit;
                beforeEach(function () {
                    $elWithInit = $([
                        '<div data-f-on-init="stuff">',
                        '   <span data-f-bind="price"> X </span>',
                        '</div>'
                    ].join(''));
                });

                it('should not fetch variables if there is an init operation', function () {
                    Flow.initialize({
                        channel: $.extend(true, {}, channelOpts),
                        dom: {
                            root: $elWithInit
                        }
                    }).then(function () {
                        // server.respond();
                        clock.tick(500);
                        server.requests.length.should.equal(3); //POST, POST, GET

                        server.requests[0].method.toUpperCase().should.equal('POST');
                        server.requests[1].method.toUpperCase().should.equal('POST');
                        server.requests[2].method.toUpperCase().should.equal('GET');
                    });
                });

                //Skipping this because the sion server is failing because of a timing issue, not sure where. Maybe in runchannel debounce?
                it.skip('should auto-fetch after initial operation', function () {
                    Flow.initialize({
                        channel: $.extend(true, {}, channelOpts),
                        dom: {
                            root: $elWithInit
                        }
                    }).then(function () {
                        server.requests.length.should.equal(3); //POST, POST, GET

                        $elWithInit.append('<span data-f-bind="sales">Y</span>');
                        server.requests.length.should.equal(4); //POST, POST, GET, GET
                    });
                });
            });
        });
    });
}());
