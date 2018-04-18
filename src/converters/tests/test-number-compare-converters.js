const nc = require('converters/number-compare-converters');
const cm = require('converters/converter-manager.js').default;

describe('Number compare converters', ()=> {
    describe('greaterThan', ()=> {
        it('return true if gt by default', ()=> {
            nc.greaterThan(50, 100, 'match').should.equal(true);
            nc.greaterThan(50, 10, 'match').should.equal(10);
        });
        it('return true value if provided', ()=> {
            nc.greaterThan(50, 'boo', 100, 'match').should.equal('boo');
            nc.greaterThan(50, 'boo', 10, 'match').should.equal(10);
        });
        it('return false value if provided', ()=> {
            nc.greaterThan(50, 'boo', 'baa', 100, 'match').should.equal('boo');
            nc.greaterThan(50, 'boo', 'baa', 10, 'match').should.equal('baa');
        });
    });
    describe('lessThan', ()=> {
        it('return true if gt by default', ()=> {
            nc.lessThan(50, 100, 'match').should.equal(100);
            nc.lessThan(50, 10, 'match').should.equal(true);
        });
        it('return true value if provided', ()=> {
            nc.lessThan(50, 'boo', 100, 'match').should.equal(100);
            nc.lessThan(50, 'boo', 10, 'match').should.equal('boo');
        });
        it('return false value if provided', ()=> {
            nc.lessThan(50, 'boo', 'baa', 100, 'match').should.equal('baa');
            nc.lessThan(50, 'boo', 'baa', 10, 'match').should.equal('boo');
        });
    });
    describe('Integration', ()=> {
        it('greaterThan: return true if gt by default', ()=> {
            cm.convert('3000', 'greaterThan(2000)').should.equal(true);
            cm.convert('3000', 'greaterThan(4000)').should.equal('3000');
        });
        it('greaterThan: return true value if provided', ()=> {
            cm.convert('3000', 'greaterThan(2000, apples)').should.equal('apples');
            cm.convert('3000', 'greaterThan(4000, apples)').should.equal('3000');
        });
        it('greaterThan: return false value if provided', ()=> {
            cm.convert('3000', 'greaterThan(2000, apples, oranges)').should.equal('apples');
            cm.convert('3000', 'greaterThan(4000, apples, oranges)').should.equal('oranges');
        });
        it('should be able to chain greaterThans', ()=> {
            cm.convert('3', ['greaterThan(2, v.angry)', 'greaterThan(1, angry)', 'greaterThan(0, ok)']).should.equal('v.angry');
            cm.convert('2', ['greaterThan(2, v.angry)', 'greaterThan(1, angry)', 'greaterThan(0, ok)']).should.equal('angry');
            cm.convert('1', ['greaterThan(2, v.angry)', 'greaterThan(1, angry)', 'greaterThan(0, ok)']).should.equal('ok');
            cm.convert('-1', ['greaterThan(2, v.angry)', 'greaterThan(1, angry)', 'greaterThan(0, ok)']).should.equal('-1');
            cm.convert('-1', ['greaterThan(2, v.angry)', 'greaterThan(1, angry)', 'greaterThan(0, ok)', 'lessThanEqual(0, shrug)']).should.equal('shrug');
        });
    });
});
