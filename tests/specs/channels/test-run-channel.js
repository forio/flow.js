(function() {
    'use strict';

    var Channel = require('../../../src/channels/run-channel');
    describe('Run Channel', function () {
        describe('options', function () {

            it('should pass options to the variables service', function () {
                var options = {
                    refresh: {
                        on: 'stuff'
                    }
                };
                var c = new Channel({
                    run: { variables: options }
                });
                c.variables.private.options.should.eql(options);
            });
            it('should pass options to the operations service', function () {
                var options = {
                    refresh: {
                        on: 'stuff'
                    }
                };
                var c = new Channel({
                    run: {operations: options}
                });
                c.operations.private.options.should.eql(options);
            });
        });
    });

    describe('run', function () {

    });
}());
