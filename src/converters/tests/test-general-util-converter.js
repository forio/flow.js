const conv = require('../general-util-converters');
const cm = require('converters/converter-manager.js').default;

const fn = conv[0].convert;

describe('General util converter', ()=> {
    describe('#is', ()=> {
        it('return true not true/false vals provided default', ()=> {
            fn(50, 50, 'match').should.equal(true);
        });
        it('return true value if provided', ()=> {
            fn(50, 'boo', 50, 'match').should.equal('boo');
            fn(50, 'boo', 150, 'match').should.equal(false);
        });
        it('return false value if provided', ()=> {
            fn(50, 'boo', 'baa', 50, 'match').should.equal('boo');
            fn(50, 'boo', 'baa', 10, 'match').should.equal('baa');
        });

        describe('Integration', ()=> {
            it('is: return true if equal by default', ()=> {
                cm.convert(3000, 'is(3000)').should.equal(true);
                cm.convert(3000, 'is(4000)').should.equal(false);
            });
            it('is: return true value if provided', ()=> {
                cm.convert(3000, 'is(3000, apples)').should.equal('apples');
                cm.convert(3000, 'is(4000, apples)').should.equal(false);
            });
            it('is: return false value if provided', ()=> {
                cm.convert(3000, 'is(3000, apples, oranges)').should.equal('apples');
                cm.convert(3000, 'is(4000, apples, oranges)').should.equal('oranges');
            });
        });
    });
});
