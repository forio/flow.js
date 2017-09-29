'use strict';
var nc = require('src/converters/bool-conditional-converters');
var cm = require('src/converters/converter-manager.js');

module.exports = (function () {
    describe('Boolean Conditional', function () {
        describe('toBool', ()=> {
            it('should return true for truthy values', ()=> {
                nc.toBool(1).should.equal(true);
                nc.toBool('apples').should.equal(true);
                nc.toBool([]).should.equal(true);
            });
            it('should return false for falsy values', ()=> {
                nc.toBool(0).should.equal(false);
                nc.toBool('').should.equal(false);
            });
        });
        describe('ifTrue', function () {
            it('should return true value if provided', function () {
                nc.ifTrue('boo', true, 'match').should.equal('boo');
                nc.ifTrue('boo', false, 'match').should.equal(false);
            });
            it('should return false value if provided', function () {
                nc.ifTrue('boo', 'baa', true, 'match').should.equal('boo');
                nc.ifTrue('boo', 'baa', false, 'match').should.equal('baa');
            });
        });
        describe('ifFalse', function () {
            it('should return true value if provided', function () {
                nc.ifFalse('boo', true, 'match').should.equal(true);
                nc.ifFalse('boo', false, 'match').should.equal('boo');
            });
            it('should return false value if provided', function () {
                nc.ifFalse('boo', 'baa', true, 'match').should.equal('baa');
                nc.ifFalse('boo', 'baa', false, 'match').should.equal('boo');
            });
        });

        describe('Integration', ()=> {
            describe('ifTrue', ()=> {
                it('should return first argument if true', function () {
                    cm.convert(true, 'ifTrue(boo)').should.equal('boo');
                    cm.convert(false, 'ifTrue(boo)').should.equal(false);
                });
                it('should return false value if provided', function () {
                    cm.convert(true, 'ifTrue(boo, baa)').should.equal('boo');
                    cm.convert(false, 'ifTrue(boo, baa)').should.equal('baa');
                });
            });
            describe('ifFalse', ()=> {
                it('should return first argument if provided', function () {
                    cm.convert(true, 'ifFalse(boo)').should.equal(true);
                    cm.convert(false, 'ifFalse(boo)').should.equal('boo');
                });
                it('should return second argument if provided', function () {
                    cm.convert(false, 'ifFalse(boo, baa)').should.equal('boo');
                    cm.convert(true, 'ifFalse(boo, baa)').should.equal('baa');
                });
            });
        });
    });
}());
