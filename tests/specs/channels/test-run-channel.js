(function() {
    'use strict';

    var Channel = require('../../../src/channels/run-channel');
    describe('Run Channel', function () {
        describe('options', function () {

            it('should pass options to the variables service', function () {
                var options = {
                    refresh: {
                        on: 'stuff',
                        except: ['otherStuff']
                    }
                };
                var c = new Channel({
                    run: { variables: options }
                });
                c.variables.private.options.refresh.should.eql({
                        on: 'stuff',
                        except: ['otherStuff']
                    });
            });
            it('should pass options to the operations service', function () {
                var options = {
                    refresh: {
                        on: 'stuff',
                        except: ['otherStuff']
                    }
                };
                var c = new Channel({
                    run: {operations: options}
                });
                c.operations.private.options.refresh.should.eql({
                        on: 'stuff',
                        except: ['otherStuff']
                    });
            });
        });
    });

    describe('run', function () {

    });
}());
