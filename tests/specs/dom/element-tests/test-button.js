'use strict';
module.exports = (function () {
    var utils = require('../../../testing-utils');
    var domManager = require('src/dom/dom-manager');

    describe('button', function () {
        describe('click', function () {
            it('should call operation with single params', function () {
                var channel = utils.createDummyChannel();
                var $node = utils.initWithNode('<input type="button" data-f-on-click="step(1)"/>', domManager, channel);

                $node.trigger('click');

                channel.operations.publish.should.have.been.calledWith({ operations: [{ name: 'step', params: [1] }], serial: true });
            });

            it('should call operation with double params', function () {
                var channel = utils.createDummyChannel();
                var $node = utils.initWithNode('<input type="button" data-f-on-click="step(1, 2)"/>', domManager, channel);

                $node.trigger('click');

                channel.operations.publish.should.have.been.calledWith({ operations: [{ name: 'step', params: [1, 2] }], serial: true });
            });

            it('should call operation with double params with no, string ', function () {
                var channel = utils.createDummyChannel();
                var $node = utils.initWithNode('<input type="button" data-f-on-click="step(1, abc)"/>', domManager, channel);

                $node.trigger('click');

                channel.operations.publish.should.have.been.calledWith({ operations: [{ name: 'step', params: [1, 'abc'] }], serial: true });
            });

            it('should call operation with double params with no, implied string ', function () {
                var channel = utils.createDummyChannel();
                var $node = utils.initWithNode('<input type="button" data-f-on-click="step(1,\'2\')"/>', domManager, channel);

                $node.trigger('click');

                channel.operations.publish.should.have.been.calledWith({ operations: [{ name: 'step', params: [1, '2'] }], serial: true });
            });

            it('should call operations in serial with |', function () {
                var channel = utils.createDummyChannel();
                var $node = utils.initWithNode('<input type="button" data-f-on-click="step(1, 2) | reset()"/>', domManager, channel);

                $node.trigger('click');

                channel.operations.publish.should.have.been.calledWith({ operations: [
                    { name: 'step', params: [1, 2] },
                    { name: 'reset', params: [] }], serial: true });
            });

            it('should call operation with double params with no, object', function () {
                var channel = utils.createDummyChannel();
                var $node = utils.initWithNode('<input type="button" data-f-on-click=\'step(1, {\"hello\": \"world\" })\'/>', domManager, channel);

                $node.trigger('click');

                channel.operations.publish.should.have.been.calledWith({ operations: [{ name: 'step', params: [1, { hello: 'world' }] }], serial: true });
            });
        });
    });
}());
