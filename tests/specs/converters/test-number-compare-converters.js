'use strict';
var nc = require('src/converters/number-compare-converters');
var cm = require('src/converters/converter-manager.js');

module.exports = (function () {
    describe('Number compare converters', function () {
        describe('greaterThan', function () {
            it('return true if gt by default', function () {
                nc.greaterThan(50, 100, 'match').should.equal(true);
                nc.greaterThan(50, 10, 'match').should.equal(10);
            });
            it('return true value if provided', function () {
                nc.greaterThan(50, 'boo', 100, 'match').should.equal('boo');
                nc.greaterThan(50, 'boo', 10, 'match').should.equal(10);
            });
            it('return false value if provided', function () {
                nc.greaterThan(50, 'boo', 'baa', 100, 'match').should.equal('boo');
                nc.greaterThan(50, 'boo', 'baa', 10, 'match').should.equal('baa');
            });
        });
        describe('lesserThan', function () {
            it('return true if gt by default', function () {
                nc.lesserThan(50, 100, 'match').should.equal(100);
                nc.lesserThan(50, 10, 'match').should.equal(true);
            });
            it('return true value if provided', function () {
                nc.lesserThan(50, 'boo', 100, 'match').should.equal(100);
                nc.lesserThan(50, 'boo', 10, 'match').should.equal('boo');
            });
            it('return false value if provided', function () {
                nc.lesserThan(50, 'boo', 'baa', 100, 'match').should.equal('baa');
                nc.lesserThan(50, 'boo', 'baa', 10, 'match').should.equal('boo');
            });
        });
        describe('Integration', function () {
            it('greaterThan: return true if gt by default', function () {
                cm.convert('3000', 'greaterThan(2000)').should.equal(true);
                cm.convert('3000', 'greaterThan(4000)').should.equal('3000');
            });
            it('greaterThan: return true value if provided', function () {
                cm.convert('3000', 'greaterThan(2000, apples)').should.equal('apples');
                cm.convert('3000', 'greaterThan(4000, apples)').should.equal('3000');
            });
            it('greaterThan: return false value if provided', function () {
                cm.convert('3000', 'greaterThan(2000, apples, oranges)').should.equal('apples');
                cm.convert('3000', 'greaterThan(4000, apples, oranges)').should.equal('oranges');
            });
            it('should be able to chain greaterThans', ()=> {
                cm.convert('3', ['greaterThan(2, v.angry)', 'greaterThan(1, angry)', 'greaterThan(0, ok)']).should.equal('v.angry');
                cm.convert('2', ['greaterThan(2, v.angry)', 'greaterThan(1, angry)', 'greaterThan(0, ok)']).should.equal('angry');
                cm.convert('1', ['greaterThan(2, v.angry)', 'greaterThan(1, angry)', 'greaterThan(0, ok)']).should.equal('ok');
                cm.convert('-1', ['greaterThan(2, v.angry)', 'greaterThan(1, angry)', 'greaterThan(0, ok)']).should.equal('-1');
            });
        });
    });
}());
