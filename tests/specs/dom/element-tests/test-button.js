'use strict';
module.exports = (function () {
    var utils = require('../../../testing-utils');
    var domManager = require('src/dom/dom-manager');

    describe('button', function () {
        describe('click', function () {
            it('should call operation with single params', function () {
                var channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="button" data-f-on-click="step(1)"/>', domManager, channel).then(function ($node) {
                    $node.trigger('click');
                    channel.publish.should.have.been.calledWith([{ 'operation:step': [1] }]);
                });
            });

            it('should call operation with double params', function () {
                var channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="button" data-f-on-click="step(1, 2)"/>', domManager, channel).then(function ($node) {
                    $node.trigger('click');
                    channel.publish.should.have.been.calledWith([{ 'operation:step': [1, 2] }]);
                });
            });

            it('should call operation with double params with no, string ', function () {
                var channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="button" data-f-on-click="step(1, abc)"/>', domManager, channel).then(function ($node) {
                    $node.trigger('click');
                    channel.publish.should.have.been.calledWith([{ 'operation:step': [1, 'abc'] }]);
                });
            });

            it('should call operation with double params with no, implied string ', function () {
                var channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="button" data-f-on-click="step(1,\'2\')"/>', domManager, channel).then(function ($node) {
                    $node.trigger('click');
                    channel.publish.should.have.been.calledWith([{ 'operation:step': [1, '2'] }]);
                });
            });

            it('should call operations in serial with |', function () {
                var channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="button" data-f-on-click="step(1, 2) | reset()"/>', domManager, channel).then(function ($node) {
                    $node.trigger('click');
                    channel.publish.should.have.been.calledWith([
                        { 'operation:step': [1, 2] },
                        { 'operation:reset': [] }]);
                });
            });

            it('should call operation with double params with no, object', function () {
                var channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="button" data-f-on-click=\'step(1, {\"hello\": \"world\" })\'/>', domManager, channel).then(function ($node) {
                    $node.trigger('click');
                    channel.publish.should.have.been.calledWith([{ 'operation:step': [1, { hello: 'world' }] }]);
                });
            });
        });
    });
}());
