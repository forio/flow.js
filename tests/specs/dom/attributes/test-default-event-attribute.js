module.exports = (function () {
    'use strict';
    var domManager = require('src/dom/dom-manager');
    var utils = require('../../../testing-utils');

    describe('Default Event attribute', function () {
       describe('#init', function () {
           it('should attach event listeners for properties prefixed with on-', function () {
                var $node = utils.initWithNode('<button data-f-on-click="stuff"> Click </button>', domManager);
                var spy = sinon.spy();
                $node.on('f.ui.operate', spy);
                $node.trigger('click');

                spy.should.have.been.called;
           });
       });

    });
}());
