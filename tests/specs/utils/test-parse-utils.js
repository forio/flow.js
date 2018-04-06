'use strict';

import { toImplicitType, splitNameArgs, toPublishableFormat } from 'src/utils/parse-utils';
import { expect } from 'chai';

describe('parse utils', function () {
    describe('#toImplicitType', function () {
        it('identifies strings', function () {
            toImplicitType('abc').should.equal('abc');
            toImplicitType('').should.equal('');
        });
        it('identifies numbers', function () {
            toImplicitType(1).should.equal(1);
            toImplicitType(0).should.equal(0);
            toImplicitType(-33423).should.equal(-33423);
        });

        it('identifies numbers passed in as strings', function () {
            toImplicitType('2').should.equal(2);
            toImplicitType('0').should.equal(0);
        });
        it('identifies numbers passed in as quoted strings', function () {
            toImplicitType('\'2\'').should.equal('2');
            toImplicitType('"0"').should.equal('0');
        });

        it('identifies arrays', function () {
            toImplicitType('[]').should.eql([]);
            toImplicitType('[1, 2, 4]').should.eql([1, 2, 4]);
            toImplicitType('[1, "2",4]').should.eql([1, '2', 4]);
            toImplicitType("[1, '2',4]").should.eql([1, '2', 4]);

            toImplicitType(JSON.stringify([1, '2', 4])).should.eql([1, '2', 4]);
        });

        it('identifies nulls', function () {
            should.not.exist(toImplicitType(null));
            should.not.exist(toImplicitType('null'));
            toImplicitType('undefined').should.equal('');
            should.not.exist(toImplicitType());
        });

        it('identifies objs', function () {
            toImplicitType('{}').should.eql({});
            toImplicitType('{"a": "abc"}').should.eql({ a: 'abc' });
            toImplicitType('{"a": "abc", "b": 2,  "c": "2"}').should.eql({ a: 'abc', b: 2, c: '2' });
        });
        it('should not break on invalid objs', ()=> {
            toImplicitType('{"a": "ab').should.eql('{"a": "ab');
        });
    });

    describe('#splitNameArgs', ()=> {
        it('splits fn calls with single params', ()=> {
            splitNameArgs('abc(1)').should.eql({ name: 'abc', args: ['1'] });
            splitNameArgs('abc(def)').should.eql({ name: 'abc', args: ['def'] });
        });
        it('splits fn calls with multiple params', ()=> {
            splitNameArgs('abc(1, def)').should.eql({ name: 'abc', args: ['1', 'def'] });
            splitNameArgs('abc(1,     def)').should.eql({ name: 'abc', args: ['1', 'def'] });
        });
        it('parses fncalls with no params', ()=> {
            splitNameArgs('abc()').should.eql({ name: 'abc', args: [] });
            splitNameArgs('abc').should.eql({ name: 'abc', args: [] });
        });
        it('should allow escaped strings as args', ()=> {
            splitNameArgs('abc(1, d\\,ef)').should.eql({ name: 'abc', args: ['1', 'd,ef'] });
        });
    });
    describe('#toPublishableFormat', ()=> {
        it('should extracts single name value from operations-format', ()=> {
            const op = toPublishableFormat('add(2,3)');
            expect(op).to.eql([{ name: 'add', value: ['2', '3'] }]);
        });
        it('should allow names without params', ()=> {
            const op = toPublishableFormat('add');
            expect(op).to.eql([{ name: 'add', value: [] }]);
        });
        it('should allow && seperated inputs', ()=> {
            const op = toPublishableFormat('add && subtract(2, 3)');
            expect(op).to.eql([{ name: 'add', value: [] }, { name: 'subtract', value: ['2', '3'] }]);
        });
        it('should support equals format', ()=> {
            const op = toPublishableFormat('foo=bar');
            expect(op).to.eql([{ name: 'foo', value: 'bar' }]);
        });
    });
});
