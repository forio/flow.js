'use strict';
(function() {
    var cm = require('../../../src/converters/converter-manager.js');

    describe('Converter Manager', function () {
        describe('#register', function () {
            it('Allows registering string converters', function () {
                var currentRegisterList = cm.list.length;
                cm.register('abc', $.noop);
                cm.list.length.should.equal(currentRegisterList + 1);
            });
        });
        describe('#getConverter', function () {
            it('matches default handlers', function () {
                var def = cm.getConverter('s');
                def.should.exist;
            });
        });
    });
}());
