'use strict';
(function () {

    var Channel = require('src/channels/run-channel');
    describe('Run Channel', function () {
        var refreshOptions = {
            on: 'stuff',
            except: ['otherStuff']
        };

        var server;
        before(function () {
            server = sinon.fakeServer.create();
            server.respondWith(/(.*)\/run\/(.*)\/(.*)/, function (xhr, id) {
                xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ url: xhr.url }));
            });
        });

        after(function () {
            server.restore();
        });

        describe('options', function () {
            it('should pass options to the variables service', function () {
                var options = {
                    refresh: refreshOptions
                };
                var c = new Channel({
                    variables: options
                });
                c.variables.private.options.refresh.should.eql(refreshOptions);
            });
            it('should pass options to the operations service', function () {
                var options = {
                    refresh: refreshOptions
                };
                var c = new Channel({
                    operations: options
                });
                c.operations.private.options.refresh.should.eql(refreshOptions);
            });
        });
    });

    describe('run', function () {

    });
}());
