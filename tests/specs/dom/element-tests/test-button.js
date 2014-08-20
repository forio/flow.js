module.exports = (function() {
    'use strict';
    var utils = require('../../../testing-utils');
    var domManager = require('../../../../src/dom/dom-manager');

    describe('button', function () {
        describe('click', function () {
            it('should call operation with single params', function () {
                var channel = utils.createDummyChannel();
                var $node = utils.initWithNode('<input type="button" data-f-on-click="step(1)"/>', domManager, channel);

                $node.trigger('click');

                channel.operations.publish.should.have.been.calledWith('step', [1]);
            });

            it('should call operation with double params', function () {
                var channel = utils.createDummyChannel();
                var $node = utils.initWithNode('<input type="button" data-f-on-click="step(1, 2)"/>', domManager, channel);

                $node.trigger('click');

                channel.operations.publish.should.have.been.calledWith('step', [1, 2]);
            });

            it('should call operation with double params with no, string ', function () {
                var channel = utils.createDummyChannel();
                var $node = utils.initWithNode('<input type="button" data-f-on-click="step(1, abc)"/>', domManager, channel);

                $node.trigger('click');

                channel.operations.publish.should.have.been.calledWith('step', [1, 'abc']);
            });

            it('should call operation with double params with no, implied string ', function () {
                var channel = utils.createDummyChannel();
                var $node = utils.initWithNode('<input type="button" data-f-on-click="step(1,\'2\')"/>', domManager, channel);

                $node.trigger('click');

                channel.operations.publish.should.have.been.calledWith('step', [1, '2']);
            });

            //FIXME: this work won't yet
            it.skip('should call operation with double params with no, object', function () {
                var channel = utils.createDummyChannel();
                var $node = utils.initWithNode('<input type="button" data-f-on-click="step(1, {\"hello\": \'world\'})"/>', domManager, channel);

                $node.trigger('click');

                channel.operations.publish.should.have.been.calledWith('step', [1, {hello: 'world'}]);
            });
        });
    });
}());
