'use strict';
module.exports = (function () {
    var cm = require('src/converters/converter-manager.js');

    describe('#list', function () {
        it('should strings to arrays', function () {
            cm.convert(1, 'list').should.eql([1]);
        });
        it('should leave arrays as-is', function () {
            cm.convert([1, 2], 'list').should.eql([1, 2]);
        });
        it('should convert objects', function () {
            cm.convert({ a: [1, 2], b: [2, 4] }, 'list').should.eql({ a: [1, 2], b: [2, 4] });
        });
    });

    describe('#last', function () {
        it('should return the last item in array with multiple items', function () {
            cm.convert([1, 2, 3], 'last').should.equal(3);
        });
        it('should return the only item in array with single items', function () {
            cm.convert([1], 'last').should.equal(1);
        });
        it('should nothing for empty arrays', function () {
            should.not.exist(cm.convert([], 'last'));
            should.not.exist(cm.convert(null, 'last'));
        });
        it('should convert objects', function () {
            cm.convert({ a: [1, 2], b: [2, 4] }, 'last').should.eql({ a: 2, b: 4 });
        });
    });

    describe('#first', function () {
        it('should return the first item in array with multiple items', function () {
            cm.convert([1, 2, 3], 'first').should.equal(1);
        });
        it('should return the only item in array with single items', function () {
            cm.convert([1], 'first').should.equal(1);
        });
        it('should nothing for empty arrays', function () {
            should.not.exist(cm.convert([], 'first'));
            should.not.exist(cm.convert(null, 'first'));
        });
        it('should convert objects', function () {
            cm.convert({ a: [1, 2], b: [2, 4] }, 'first').should.eql({ a: 1, b: 2 });
        });
    });

    describe('#previous', function () {
        it('should return the previous item in array with multiple items', function () {
            cm.convert([1, 2, 3], 'previous').should.equal(2);
        });
        it('should return the only item in array with single items', function () {
            cm.convert([1], 'previous').should.equal(1);
        });
        it('should nothing for empty arrays', function () {
            should.not.exist(cm.convert([], 'previous'));
            should.not.exist(cm.convert(null, 'previous'));
        });
        it('should convert objects', function () {
            cm.convert({ a: [1, 2], b: [2, 4] }, 'first').should.eql({ a: 1, b: 2 });
        });
    });
    describe('#reverse', function () {
        it('should return the array flipped', function () {
            cm.convert([1, 2, 3], 'reverse').should.eql([3, 2, 1]);
        });
    });

}());
