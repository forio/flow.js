(function () {
    'use strict';

    var Channel = require('../../../src/channels/run-channel');
    describe('Run Channel', function () {
        var refreshOptions = {
            on: 'stuff',
            except: ['otherStuff']
        };
        describe('options', function () {

            it('should pass options to the variables service', function () {
                var options = {
                    refresh: refreshOptions
                };
                var c = new Channel({
                    run: { variables: options }
                });
                c.variables.private.options.refresh.should.eql(refreshOptions);
            });
            it('should pass options to the operations service', function () {
                var options = {
                    refresh: refreshOptions
                };
                var c = new Channel({
                    run: { operations: options }
                });
                c.operations.private.options.refresh.should.eql(refreshOptions);
            });
        });
    });

    describe('run', function () {

    });
}());
