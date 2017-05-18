'use strict';

var u = require('src/utils/parse-utils');

describe('parse utils', function () {
    describe('#toImplicitType', function () {
        it('identifies strings', function () {
            u.toImplicitType('abc').should.equal('abc');
            u.toImplicitType('').should.equal('');
        });
        it('identifies numbers', function () {
            u.toImplicitType(1).should.equal(1);
            u.toImplicitType(0).should.equal(0);
            u.toImplicitType(-33423).should.equal(-33423);
        });

        it('identifies numbers passed in as strings', function () {
            u.toImplicitType('2').should.equal(2);
            u.toImplicitType('0').should.equal(0);
        });
        it('identifies numbers passed in as quoted strings', function () {
            u.toImplicitType('\'2\'').should.equal('2');
            u.toImplicitType('"0"').should.equal('0');
        });

        it('identifies arrays', function () {
            u.toImplicitType('[]').should.eql([]);
            u.toImplicitType('[1, 2, 4]').should.eql([1, 2, 4]);
            u.toImplicitType('[1, "2",4]').should.eql([1, '2', 4]);

            u.toImplicitType(JSON.stringify([1, '2', 4])).should.eql([1, '2', 4]);
        });

        it('identifies nulls', function () {
            should.not.exist(u.toImplicitType(null));
            should.not.exist(u.toImplicitType('null'));
            u.toImplicitType('undefined').should.equal('');
            should.not.exist(u.toImplicitType());
        });

        it('identifies objs', function () {
            u.toImplicitType('{}').should.eql({});
            u.toImplicitType('{"a": "abc"}').should.eql({ a: 'abc' });
            u.toImplicitType('{"a": "abc", "b": 2,  "c": "2"}').should.eql({ a: 'abc', b: 2, c: '2' });
        });
    });

    describe.only('#splitNameArgs', ()=> {
        it('splits fn calls with single params', ()=> {
            u.splitNameArgs('abc(1)').should.eql({ name: 'abc', args: [1] });
            u.splitNameArgs('abc(def)').should.eql({ name: 'abc', args: ['def'] });
        });
        it('splits fn calls with multiple params', ()=> {
            u.splitNameArgs('abc(1, def)').should.eql({ name: 'abc', args: [1, 'def'] });
            u.splitNameArgs('abc(1,     def)').should.eql({ name: 'abc', args: [1, 'def'] });
        });
        it('parses fncalls with no params', ()=> {
            u.splitNameArgs('abc()').should.eql({ name: 'abc', args: [] });
            u.splitNameArgs('abc').should.eql({ name: 'abc', args: [] });
        });
        it('should allow escaped strings as args', ()=> {
            u.splitNameArgs('abc(1, d\\,ef)').should.eql({ name: 'abc', args: [1, 'd,ef'] });

        });
    });
});
