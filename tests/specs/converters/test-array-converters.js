'use strict';
module.exports = (function () {
    var cm = require('../../../src/converters/converter-manager.js');

    describe('#last', function () {
        it('should return the last item in array with multiple items', function () {
            cm.convert([1,2,3], 'last').should.equal(3);
        });
        it('should return the only item in array with single items', function () {
            cm.convert([1], 'last').should.equal(1);
        });
        it('should nothing for empty arrays', function () {
            should.not.exist(cm.convert([], 'last'));
            should.not.exist(cm.convert(null, 'last'));
        });
    });

    describe('#first', function () {
        it('should return the first item in array with multiple items', function () {
            cm.convert([1,2,3], 'first').should.equal(1);
        });
        it('should return the only item in array with single items', function () {
            cm.convert([1], 'first').should.equal(1);
        });
        it('should nothing for empty arrays', function () {
            should.not.exist(cm.convert([], 'first'));
            should.not.exist(cm.convert(null, 'first'));
        });
    });

    describe('#previous', function () {
        it('should return the previous item in array with multiple items', function () {
            cm.convert([1,2,3], 'previous').should.equal(2);
        });
        it('should return the only item in array with single items', function () {
            cm.convert([1], 'previous').should.equal(1);
        });
        it('should nothing for empty arrays', function () {
            should.not.exist(cm.convert([], 'previous'));
            should.not.exist(cm.convert(null, 'previous'));
        });
    });

}());
