'use strict';
module.exports = (function () {
    var Flow = require('src/flow');
    describe('Flow Epicenter integration', function () {
        var server, channelOpts, $elWithoutInit;
        before(function () {
            server = sinon.fakeServer.create();

            server.respondWith('GET', /(.*)/, function (xhr, id) {
                xhr.respond(200, {
                    'Content-Type': 'application/json'
                }, JSON.stringify({
                    price: 1
                }));
            });
            server.respondWith('PATCH', /(.*)\/run\/(.*)\/variables\/(.*)/, function (xhr, id) {
                xhr.respond(201, {
                    'Content-Type': 'application/json'
                }, JSON.stringify({
                    url: xhr.url
                }));
            });
            server.respondWith('POST', /(.*)\/run/, function (xhr, id) {
                var resp = {
                    'id': '065dfe50-d29d-4b55-a0fd-30868d7dd26c',
                    'model': 'model.vmf',
                    'account': 'mit',
                    'project': 'afv',
                    'saved': false,
                    'lastModified': '2014-06-20T04:09:45.738Z',
                    'created': '2014-06-20T04:09:45.738Z'
                };
                xhr.respond(201, {
                    'Content-Type': 'application/json'
                }, JSON.stringify(resp));
            });
            server.autoRespond = true;

            $elWithoutInit = $([
                '<div>',
                '   <input type="text" data-f-bind="price" />',
                '</div>'
            ].join(''));
        });

        var cookey;
        beforeEach(function () {
            cookey = 'flowtest' + Math.random();
            channelOpts = {
                strategy: 'always-new',
                sessionKey: cookey,
                run: {
                    account: 'flow',
                    project: 'test',
                    model: 'model.vmf',
                    variables: {
                        autoFetch: {
                            debounce: 0
                        }
                    }
                }
            };
        });
        afterEach(function () {
            //TODO: Fix this after making run-manager get path from urlservice
            var urlService = new F.service.URL();
            var path = '/' + [urlService.appPath, urlService.accountPath, urlService.projectPath].join('/');
            path = path.replace(/\/{2,}/g,'/');
            var c = new F.store.Cookie({ root: path });
            c.remove(cookey);
            cookey = null;
        });

        after(function () {
            server.restore();
        });

        it('should create a new run on initialize', function () {
            // var fakeRunService = F.service.Run();

            Flow.initialize({
                channel: channelOpts
            });

            var req = server.requests.pop();
            req.method.toUpperCase().should.equal('POST');
            req.url.should.equal('https://api.forio.com/run/flow/test/');
            req.requestBody.should.equal(JSON.stringify({
                scope: {},
                model: 'model.vmf'
            }));
        });

        describe('Setting variables', function () {
            afterEach(function () {
                server.requests = [];
            });
            it('should PATCH variables API on change', function () {
                Flow.initialize({
                    channel: channelOpts,
                    dom: {
                        root: $elWithoutInit
                    }
                });

                $elWithoutInit.find(':text').val('32').trigger('change');
                server.respond();
                var req = server.requests[server.requests.length - 1];
                req.method.toUpperCase().should.equal('PATCH');
                req.requestBody.should.equal(JSON.stringify({
                    price: 32
                }));
            });

            it('should re-fetch variables after change', function () {
                Flow.initialize({
                    channel: channelOpts,
                    dom: {
                        root: $elWithoutInit
                    }
                });
                server.respond();
                $elWithoutInit.find(':text').val('33').trigger('change');
                server.respond();
                server.respond();

                var req = server.requests[server.requests.length - 1];
                req.method.toUpperCase().should.equal('GET');
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
                });
                $elWithoutInit.find(':text').val('34').trigger('change');

                server.respond();
                console.log(_.pluck(server.requests, 'method'));
                server.requests.length.should.equal(3); //POST, GET, PATCH
            });
        });

        describe('Fetch variables on load', function () {
            it('should fetch variables if there is no default init operation', function () {
                Flow.initialize({
                    channel: $.extend(true, {}, channelOpts),
                    dom: {
                        root: $elWithoutInit
                    }
                });

                server.respond();
                server.requests.length.should.equal(2); //POST, GET

                server.requests[0].method.toUpperCase().should.equal('POST');
                server.requests[1].method.toUpperCase().should.equal('GET');
            });
            it('should fetch variables if operations is set to silent', function () {
                server.requests = [];

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
                });

                server.respond();
                server.requests.length.should.equal(2); //POST, GET

                server.requests[0].method.toUpperCase().should.equal('POST');
                server.requests[1].method.toUpperCase().should.equal('GET');
            });

            it('should not fetch variables if there is an init operation', function () {
                var $elWithoutInit = $([
                '<div data-f-on-init="stuff">',
                '   <input type="text" data-f-bind="price" />',
                '   <span data-f-bind="price"> X </span>',
                '</div>'].join(''));
                server.requests = [];

                Flow.initialize({
                    channel: $.extend(true, {}, channelOpts),
                    dom: {
                        root: $elWithoutInit
                    }
                });

                server.respond();
                server.respond();
                server.requests.length.should.equal(3); //POST, POST, GET

                server.requests[0].method.toUpperCase().should.equal('POST');
                server.requests[1].method.toUpperCase().should.equal('POST');
                server.requests[2].method.toUpperCase().should.equal('GET');
            });
        });
    });
}());
