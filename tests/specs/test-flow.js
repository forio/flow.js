'use strict';
module.exports = (function() {
    var Flow = require('../../src/flow');

    describe('Flow Epicenter integration', function() {
        var server, channelOpts, $el;
        before(function() {
            server = sinon.fakeServer.create();
            server.respondWith('PATCH', /(.*)\/run\/(.*)\/variables\/(.*)/, function(xhr, id) {
                xhr.respond(201, {
                    'Content-Type': 'application/json'
                }, JSON.stringify({
                    url: xhr.url
                }));
            });
            server.respondWith('GET', /(.*)\/run\/(.*)\/variables\/(.*)/, function(xhr, id) {
                xhr.respond(200, {
                    'Content-Type': 'application/json'
                }, JSON.stringify({
                    url: xhr.url
                }));
            });
            server.respondWith('POST', /(.*)\/run/, function(xhr, id) {
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

            channelOpts = {
                run: {
                    account: 'flow',
                    project: 'test',
                    model: 'model.vmf'
                }
            };

            $el = $([
                '<div>',
                '   <input type="text" data-f-bind="price" />',
                '   <span data-f-bind="price"> X </span>',
                '</div>'
            ].join(''));
        });

        after(function() {
            server.restore();
        });

        it('should create a new run on initialize', function() {
            Flow.initialize({
                channel: channelOpts
            });

            var req = server.requests.pop();
            req.method.toUpperCase().should.equal('POST');
            req.url.should.equal('https://api.forio.com/run/flow/test/');
            req.requestBody.should.equal(JSON.stringify({
                model: 'model.vmf'
            }));
        });

        describe('Setting variables', function() {
            afterEach(function() {
                server.requests = [];
            });
            it('should PATCH variables API on change', function() {
                Flow.initialize({
                    channel: channelOpts,
                    dom: {
                        root: $el
                    }
                });

                $el.find(':text').val('32').trigger('change');
                server.respond();
                var req = server.requests[server.requests.length - 1];
                req.method.toUpperCase().should.equal('PATCH');
                req.requestBody.should.equal(JSON.stringify({
                    price: 32
                }));
            });

            it('should re-fetch variables after change', function() {
                Flow.initialize({
                    channel: channelOpts,
                    dom: {
                        root: $el
                    }
                });
                server.respond();
                $el.find(':text').val('33').trigger('change');
                server.respond();
                server.respond();

                var req = server.requests[server.requests.length - 1];
                req.method.toUpperCase().should.equal('GET');
            });

            it('should not re-fetch variables after change if set to silent mode', function() {
                Flow.initialize({
                    channel: $.extend(true, {
                        run: {
                            variables: {
                                silent: true
                            }
                        }
                    }, channelOpts),
                    dom: {
                        root: $el
                    }
                });
                $el.find(':text').val('34').trigger('change');

                server.respond();
                server.requests.length.should.equal(3); //POST, GET, PATCH
            });
        });
    });
}());
