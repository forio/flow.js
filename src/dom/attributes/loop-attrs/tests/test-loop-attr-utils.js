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
        it('should extract variablenames from X in Y form', ()=> {
            expect(extractVariableName('X in foo')).to.equal('foo');
            expect(extractVariableName('X,Y in foo bar')).to.equal('foo bar');
            expect(extractVariableName('X,Y in inmate bar')).to.equal('inmate bar');
            expect(extractVariableName('X,Y in inmate bar[X,Y]')).to.equal('inmate bar[X,Y]');
        });
        it('should extract variablenames from X of Y form', ()=> {
            expect(extractVariableName('X of foo')).to.equal('foo');
            expect(extractVariableName('X,Y of foo bar')).to.equal('foo bar');
            expect(extractVariableName('X, Y of office bar')).to.equal('office bar');
            expect(extractVariableName('X, Y of office bar[X,Y]')).to.equal('office bar[X,Y]');
        });
    });
    describe('#parseKeyAlias', ()=> {
        it('should return default alias single strings', ()=> {
            expect(parseKeyAlias('foo', {})).to.equal('key');
            expect(parseKeyAlias(' foo bar', [])).to.equal('index');
        });
        it('should return default alias for `in` form', ()=> {
            expect(parseKeyAlias('X in foo', {})).to.equal('key');
            expect(parseKeyAlias('X in foo', [])).to.equal('index');
        });
        it('should return alias for `of` form', ()=> {
            expect(parseKeyAlias('X of foo', {})).to.equal('key');
            expect(parseKeyAlias('X of foo', [])).to.equal('index');
        });
        it('should return actual alias if provided', ()=> {
            expect(parseKeyAlias('X,Y in foo bar', [])).to.equal('X');
            expect(parseKeyAlias('X,Y in bar[X,Y]', [])).to.equal('X');
        });
    });
    describe('#parseValueAlias', ()=> {
        it('should return default alias single strings', ()=> {
            expect(parseValueAlias('foo')).to.equal('value');
            expect(parseValueAlias(' foo bar')).to.equal('value');
        });
        it('should return alias for single `in` form', ()=> {
            expect(parseValueAlias('X in foo')).to.equal('X');
        });
        it('should return alias for single `of` form', ()=> {
            expect(parseValueAlias('X of foo')).to.equal('X');
        });
        it('should return actual alias if provided', ()=> {
            expect(parseValueAlias('X,Y in foo bar')).to.equal('Y');
            expect(parseValueAlias('X,Y in office bar[X,Y]')).to.equal('Y');
        });
    });
});
