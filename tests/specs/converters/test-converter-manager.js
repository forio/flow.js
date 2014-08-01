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
        describe('#replace', function () {
            it('should replace existing string converters with new ones', function () {
                var conv = cm.getConverter('s');
                conv.convert(1).should.equal('1');

                cm.replace('s', function () {
                    return 'applesauce';
                });

                conv = cm.getConverter('s');
                conv.convert(1).should.equal('applesauce');
            });
        });
    });
}());
