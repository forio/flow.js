import { extractVariableName, parseKeyAlias, parseValueAlias } from '../loop-attr-utils';
import { expect } from 'chai';

describe('Loop Attr Utils', ()=> {
    describe('#extractVariableName', ()=> {
        it('should treat single strings as variablenames', ()=> {
            expect(extractVariableName('foo')).to.equal('foo');
            expect(extractVariableName(' foo ')).to.equal('foo');
            expect(extractVariableName(' foo bar')).to.equal('foo bar');
            expect(extractVariableName('in bar[X,Y]')).to.equal('in bar[X,Y]');
        });
        it('should extract unaliased variablenames as-is', ()=> {
            expect(extractVariableName('X in foo')).to.equal('X in foo');
            expect(extractVariableName('Y in foo bar')).to.equal('Y in foo bar');
            expect(extractVariableName('Y of inmate bar[X,Y]')).to.equal('Y of inmate bar[X,Y]');
        });
        it('should extract aliased variablenames from X in Y form', ()=> {
            expect(extractVariableName('(X) in foo')).to.equal('foo');
            expect(extractVariableName('(X,Y) in foo bar')).to.equal('foo bar');
            expect(extractVariableName('(X,Y) in inmate bar')).to.equal('inmate bar');
            expect(extractVariableName('(X,Y) in inmate bar[X,Y]')).to.equal('inmate bar[X,Y]');
        });
        it('should extract aliased variablenames from X of Y form', ()=> {
            expect(extractVariableName('(X) of foo')).to.equal('foo');
            expect(extractVariableName('(X,Y) of foo bar')).to.equal('foo bar');
            expect(extractVariableName('(X, Y) of office bar')).to.equal('office bar');
            expect(extractVariableName('(X, Y) of office bar[X,Y]')).to.equal('office bar[X,Y]');
        });
    });
    describe('#parseKeyAlias', ()=> {
        it('should return nothing for single strings', ()=> {
            expect(parseKeyAlias('foo')).to.equal(undefined);
        });
        it('should return nothing for unaliased variablenames', ()=> {
            expect(parseKeyAlias('X in foo')).to.equal(undefined);
            expect(parseKeyAlias('Y in foo bar')).to.equal(undefined);
            expect(parseKeyAlias('Y of foo')).to.equal(undefined);
            expect(parseKeyAlias('Y of inmate bar[X,Y]')).to.equal(undefined);
        });
        it('should return nothing for `in` form without key', ()=> {
            expect(parseKeyAlias('(X) in foo')).to.equal(undefined);
        });
        it('should return nothing for `of` form without key', ()=> {
            expect(parseKeyAlias('(X) of foo')).to.equal(undefined);
        });
        it('should return actual alias if provided', ()=> {
            expect(parseKeyAlias('(X,Y) in foo bar')).to.equal('X');
            expect(parseKeyAlias('(X, Y) of bar[X,Y]')).to.equal('X');
        });
    });
    describe('#parseValueAlias', ()=> {
        it('should return nothing for single strings', ()=> {
            expect(parseValueAlias('foo')).to.equal(undefined);
            expect(parseValueAlias(' foo bar')).to.equal(undefined);
        });
        it('should return nothing for unaliased variablenames', ()=> {
            expect(parseValueAlias('X in foo')).to.equal(undefined);
            expect(parseValueAlias('Y in foo bar')).to.equal(undefined);
            expect(parseValueAlias('Y of foo')).to.equal(undefined);
            expect(parseValueAlias('Y of inmate bar[X,Y]')).to.equal(undefined);
        });
        it('should return alias for single `in` form', ()=> {
            expect(parseValueAlias('(X) in foo')).to.equal('X');
        });
        it('should return alias for single `of` form', ()=> {
            expect(parseValueAlias('(X) of foo')).to.equal('X');
        });
        it('should return actual alias if provided', ()=> {
            expect(parseValueAlias('(X,Y) in foo bar')).to.equal('Y');
            expect(parseValueAlias('(X, Y) in office bar[X,Y]')).to.equal('Y');
        });
    });
});
