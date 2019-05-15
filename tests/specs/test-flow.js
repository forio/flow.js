var Flow = require('src/flow');
var lolex = require('lolex');

//FIXME: None of the promises work with the timer, but still need the timer for the debounce test
describe.skip('Flow Epicenter integration', function () {
    var server;
    var channelOpts;
    var $elWithoutInit;
    var clock;

    before(function () {
        server = sinon.fakeServer.create();
        clock = lolex.install();

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
            },
            options: {
                runManager: {
                    defaults: {
                        variables: {
                            debounce: false
                        }
                    }
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
        clock.uninstall();
        server.restore();
    });

    it('should create a new run on initialize', function () {
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
        it('should fetch variables if there is no default init operation', function (done) {
            Flow.initialize({
                channel: $.extend(true, {}, channelOpts),
                dom: {
                    root: $elWithoutInit
                }
            }).then(function () {
                setTimeout(function () {
                    server.requests.length.should.equal(2); //POST, GET

                    server.requests[0].method.toUpperCase().should.equal('POST');
                    server.requests[1].method.toUpperCase().should.equal('GET');
                    done();
                }, 1);
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
    });
});
