'use strict';
(function() {
    var am = require('../../../src/dom/attributes/attribute-manager.js');

    describe('Attribute Manager', function () {
        describe('#register', function () {
            it('should allow adding new handlers', function () {
                var currentRegisterList = am.list.length;
                am.register('abc', '*', $.noop);
                am.list.length.should.equal(currentRegisterList + 1);
            });
        });
        describe('#getHandler', function () {
            it('matches default handlers', function () {
                am.register('def', '*', {handle: $.noop});

                var def = am.getHandler('*', 'def');
                def.should.exist;
                def.test.should.equal('def');
            });
        });

    });
}());
