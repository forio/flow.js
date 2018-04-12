import { extractVariableName, extractAlias, translateDataToTemplatable } from '../bind-utils';
import { expect } from 'chai';

describe('Bind utils', ()=> {
    describe('#extractVariableName', ()=> {
        describe('unaliased', ()=> {
            it('should default to variable name as alias for unsubscripted', ()=> {
                expect(extractAlias('Foo')).to.equal('Foo');
                expect(extractAlias(' Foo ')).to.equal('Foo');
                expect(extractAlias(' Smelly Cat ')).to.equal('Smelly Cat');
            });
            it('should default to variable name as alias subscripted variables', ()=> {
                expect(extractAlias('Bar[1,2]')).to.eql('Bar[1,2]');
            });
        });
        describe('aliased', ()=> {
            it('should alias single names with aliases', ()=> {
                expect(extractAlias('something as Foo')).to.equal('Foo');
                expect(extractAlias('somethingElse as Foo ')).to.equal('Foo');
                expect(extractAlias('sword of jonas as  something')).to.equal('something');
            });
            it('should alias subscripted variables', ()=> {
                expect(extractAlias('Bar[1,2] as somethingElse')).to.eql('somethingElse');
            });
        });
    });
    describe('#extractVariableName', ()=> {
        describe('unaliased', ()=> {
            it('should extract single names without aliases', ()=> {
                expect(extractVariableName('Foo')).to.equal('Foo');
                expect(extractVariableName(' Foo ')).to.equal('Foo');
                expect(extractVariableName(' Smelly Cat ')).to.equal('Smelly Cat');
            });
            it('should extract subscripted variables', ()=> {
                expect(extractVariableName('Bar[1,2]')).to.eql('Bar[1,2]');
            });
        });
        describe('aliased', ()=> {
            it('should extract single names with aliases', ()=> {
                expect(extractVariableName('something as Foo')).to.equal('something');
                expect(extractVariableName('somethingElse as Foo ')).to.equal('somethingElse');
                expect(extractVariableName('sword of jonas as  something')).to.equal('sword of jonas');
            });
            it('should extract subscripted variables', ()=> {
                expect(extractVariableName('Bar[1,2] as somethingElse')).to.eql('Bar[1,2]');
            });
        });
    });
    describe('#translateDataToTemplatable', ()=> {
        describe('without aliases', ()=> {
            it('should add a value property to regular objects', ()=> {
                const ip = { a: 1, b: 2 };
                const op = translateDataToTemplatable(ip, {});
                expect(op).to.eql({ a: 1, b: 2, value: ip });
            });
            it('should leave arrays as-is', ()=> {
                const ip = [1, 2, 3];
                const op = translateDataToTemplatable(ip, {});
                expect(op).to.eql({ value: ip });
            });
            it('should leave literals as-is', ()=> {
                expect(translateDataToTemplatable(1, {})).to.eql({ value: 1 });
                expect(translateDataToTemplatable('a', {})).to.eql({ value: 'a' });
            });
        });
        describe('with aliases', ()=> {
            describe('with object data', ()=> {
                it('should replace partial aliases', ()=> {
                    const ip = { a: 1, b: 2 };
                    const op = translateDataToTemplatable(ip, { a: 'apples' });
                    expect(op).to.eql({ apples: 1, b: 2, value: ip });
                });
                it('should replace complete aliases', ()=> {
                    const ip = { a: 1, b: 2 };
                    const op = translateDataToTemplatable(ip, { a: 'apples', b: 'boys' });
                    expect(op).to.eql({ apples: 1, boys: 2, value: ip });
                });
            });
            describe('non-object data', ()=> {
                it('should alias arrays', ()=> {
                    const ip = [1, 2, 3];
                    const op = translateDataToTemplatable(ip, { a: 'apples' });
                    expect(op).to.eql({ value: ip, apples: ip });
                });
                it('should alias literals', ()=> {
                    expect(translateDataToTemplatable(1, { a: 'foo' })).to.eql({ value: 1, foo: 1 });
                    expect(translateDataToTemplatable('a', { b: 'bar' })).to.eql({ value: 'a', bar: 'a' });
                });
            });
        });
    });
});
