(function() {
    'use strict';

    var nodeClass = require('../../../src/dom/nodes/default-node');

    describe('Input node', function () {
        var textNode;
        before(function (){
            var div = document.createElement('div');
            div.innerHTML = '<input type="text" data-f-bind="stuff" id="testNode"/>';

            textNode = div.testNode;
        });

        describe('claim', function () {
            it('should claim input nodes', function () {

            });
        });
    });

}());
