'use strict';
module.exports = (function () {
    var cm = require('../../../src/converters/converter-manager.js');

    describe('#parse', function () {
        it('should convert plain strings to numbers', function () {
            cm.parse('1', '$###.00').should.equal(1);
        });

        it('should convert strings with commas to numbers', function () {
            cm.parse('1,000,000', '$###.00').should.equal(1000000);
        });

        it('should convert strings with periods to numbers', function () {
            cm.parse('1,000,000.01', '$###.00').should.equal(1000000.01);
        });

        it('should convert percents to decimals', function () {
            cm.parse('1%', '$###').should.equal(0.01);
            cm.parse('1.5%', '$###').should.equal(0.015);
        });

        it('should convert strings with short units', function () {
            cm.parse('1K', '$###.00').should.equal(1000);
            cm.parse('1k', '$###.00').should.equal(1000);
            cm.parse('1m', '$###.00').should.equal(1000000);
            cm.parse('1M', '$###.00').should.equal(1000000);
            cm.parse('1B', '$###.00').should.equal(1000000000);
            cm.parse('1b', '$###.00').should.equal(1000000000);
        });

        it('should convert strings with short units and commas', function () {
            cm.parse('1,000K', '$###.00').should.equal(1000000);
            cm.parse('1,123.01k', '$###.00').should.equal(1123010);
        });
    });

    describe('#convert', function () {
        it('should convert strings to formatted strings', function () {
            cm.convert('1000000', '$###.00').should.equal('$1,000,000.00');
        });
        it('should convert numbers to formatted strings', function () {
            cm.convert(1000000, '$###.00').should.equal('$1,000,000.00');
        });
    });
}());
