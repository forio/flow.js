'use strict';
var nc = require('src/converters/number-compare-converters');
module.exports = (function () {
    describe('Number compare converters', function () {
        describe('greaterThan', function () {
            it('return true if gt by default', function () {
                nc.greaterThan(50, 100).should.equal(true);
                nc.greaterThan(50, 10).should.equal(false);
            });
            it('return true value if provided', function () {
                nc.greaterThan(50, 'boo', 100).should.equal('boo');
                nc.greaterThan(50, 'boo', 10).should.equal(false);
            });
            it('return false value if provided', function () {
                nc.greaterThan(50, 'boo', 'baa', 100).should.equal('boo');
                nc.greaterThan(50, 'boo', 'baa', 10).should.equal('baa');
            });
        });
        describe('lesserThan', function () {
            it('return true if gt by default', function () {
                nc.lesserThan(50, 100).should.equal(false);
                nc.lesserThan(50, 10).should.equal(true);
            });
            it('return true value if provided', function () {
                nc.lesserThan(50, 'boo', 100).should.equal(false);
                nc.lesserThan(50, 'boo', 10).should.equal('boo');
            });
            it('return false value if provided', function () {
                nc.lesserThan(50, 'boo', 'baa', 100).should.equal('baa');
                nc.lesserThan(50, 'boo', 'baa', 10).should.equal('boo');
            });
        });
    });
}());
