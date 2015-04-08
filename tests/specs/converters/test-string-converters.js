'use strict';
module.exports = (function () {
    var cm = require('src/converters/converter-manager.js');

    describe('upperCase', function () {
        it('should convert strings to upper case', function () {
            cm.convert('abc', 'upperCase').should.equal('ABC');
        });
    });
    describe('lowerCase', function () {
        it('should convert strings to upper case', function () {
            cm.convert('ABC', 'lowerCase').should.equal('abc');
        });
    });
    describe('titleCase', function () {
        it('should convert strings to title case', function () {
            cm.convert('abc', 'titleCase').should.equal('Abc');
        });
        it('should convert sentences to title case', function () {
            cm.convert('he lived long', 'titleCase').should.equal('He Lived Long');
        });
    });
}());
