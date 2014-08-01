'use strict';
(function() {
    var cm = require('../../../src/converters/converter-manager.js');

    describe('Converter Manager', function () {
        describe('#register', function () {
            it('Allows registering string converters', function () {
                var currentRegisterList = Object.keys(cm.list).length;
                cm.register('abc', $.noop);
                console.log(cm.list);
                Object.keys(cm.list).length.should.equal(currentRegisterList + 1);
            });
        });
    });
}());
