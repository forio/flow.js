(function() {
    'use strict';

    var nodeClass = require('../../../src/dom/nodes/default-input-node');
    var utils = require('../../testing-utils');

    describe('Input node', function () {
        var textNode;
        before(function (){
            textNode = utils.create('<input type="text" data-f-bind="stuff"/>');
        });

        describe('claim', function () {
            it('should claim input nodes', function () {
                var claimed = $(textNode).is(nodeClass.selector);
                claimed.should.be.true;
            });
        });
    });

}());
