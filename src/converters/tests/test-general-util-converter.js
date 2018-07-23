const conv = require('../general-util-converters');
const cm = require('converters/converter-manager.js').default;

const fn = conv[0].convert;


describe('General util converter', ()=> {
    describe('#is', ()=> {
        // toCompare, trueVal, falseVal, valueToCompare, matchString
        it('return true not true/false vals provided default', ()=> {
            fn(50, 50, 'match').should.equal(true);
        });
        it('return true value if provided', ()=> {
            fn(50, 'boo', 50, 'match').should.equal('boo');
            fn(50, 'boo', 150, 'match').should.equal(150);
        });
        it('return false value if provided', ()=> {
            fn(50, 'boo', 'baa', 50, 'match').should.equal('boo');
            fn(50, 'boo', 'baa', 10, 'match').should.equal('baa');
        });

        describe('Integration', ()=> {
            it('is: return true if equal by default', ()=> {
                cm.convert(3000, 'is(3000)').should.equal(true);
            });
            it('is: return true value if provided', ()=> {
                cm.convert(3000, 'is(3000, apples)').should.equal('apples');
            });
            it('should return original value if false', ()=> {
                cm.convert(3000, 'is(4000)').should.equal(3000);
                cm.convert(3000, 'is(4000, apples)').should.equal(3000);
            });
            it('is: return false value if provided', ()=> {
                cm.convert(3000, 'is(3000, apples, oranges)').should.equal('apples');
                cm.convert(3000, 'is(4000, apples, oranges)').should.equal('oranges');
            });
            it('should convert arrays to array of values ', ()=> {
                cm.convert([4000, 3000], 'is(4000)').should.eql([true, 3000]);
                cm.convert([4000, 3000], 'is(4000, apples)').should.eql(['apples', 3000]);
            });
        });
    });
});
