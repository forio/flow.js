'use strict';
var nc = require('src/converters/bool-conditional-converters');
module.exports = (function () {
    describe('Boolean Conditional', function () {
        describe('ifTrue', function () {
            it('return true value if provided', function () {
                nc.ifTrue('boo', true).should.equal('boo');
                nc.ifTrue('boo', false).should.equal(false);
            });
            it('return false value if provided', function () {
                nc.ifTrue('boo', 'baa', true).should.equal('boo');
                nc.ifTrue('boo', 'baa', false).should.equal('baa');
            });
        });
        describe('ifFalse', function () {
            it('return true value if provided', function () {
                nc.ifFalse('boo', true).should.equal(false);
                nc.ifFalse('boo', false).should.equal('boo');
            });
            it('return false value if provided', function () {
                nc.ifFalse('boo', 'baa', true).should.equal('baa');
                nc.ifFalse('boo', 'baa', false).should.equal('boo');
            });
        });
    });
}());
