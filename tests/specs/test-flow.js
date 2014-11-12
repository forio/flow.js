'use strict';
module.exports = (function () {
    var Flow = require('../../src/flow');

    describe('silent mode', function () {
        var server, channelOpts;
        before(function () {
            server = sinon.fakeServer.create();
            server.respondWith('PATCH',  /(.*)\/run\/variables\/(.*)/, function (xhr, id) {
                xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ url: xhr.url }));
            });
            server.respondWith('GET',  /(.*)\/run\/variables\/(.*)/, function (xhr, id) {
                xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ url: xhr.url }));
            });
            server.respondWith('POST',  /(.*)\/run/, function (xhr, id) {
                xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ url: xhr.url }));
            });

            channelOpts =  {
                run: {
                    account: 'flow',
                    project: 'test',
                    model: 'model.vmf'
                }
            };
        });

        after(function () {
            server.restore();
        });

        it('should create a new run on initialize', function () {
             Flow.initialize({ channel: channelOpts });

             var req = server.requests.pop();
             req.method.toUpperCase().should.equal('POST');
             req.url.should.equal('https://api.forio.com/run/flow/test/');
             req.requestBody.should.equal(JSON.stringify({ model: 'model.vmf' }));
        });

    });
}());
