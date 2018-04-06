import { extractVariableNames } from '../bind-utils';

describe.skip('Bind utils', ()=> {
    describe('#extractVariableNames', ()=> {
        describe('unaliased', ()=> {
            it('should extract single names without aliases', ()=> {
                expect(extractVariableNames('Foo')).to.equal('Foo');
                expect(extractVariableNames(' Foo ')).to.equal('Foo');
                expect(extractVariableNames(' Smelly Cat ')).to.equal('Smelly Cat');
            });
            it('should extract multiple variables', ()=> {
                expect(extractVariableNames('Foo, Bar')).to.eql(['Foo', 'Bar']);
                expect(extractVariableNames('Foo,Bar ')).to.eql(['Foo', 'Bar']);
                
            });
            it('should extract multiple subscripted variables', ()=> {
                expect(extractVariableNames('Foo, Bar[1,2]')).to.eql(['Foo', 'Bar[1,2]']);
                expect(extractVariableNames('Foo[a,2],Bar[foo,bar] ')).to.eql(['Foo[a,2]', 'Bar[foo,bar]']);
            });
        });
        describe('aliased', ()=> {
            it('should extract single names with aliases', ()=> {
                expect(extractVariableNames('something as Foo')).to.equal('Foo');
                expect(extractVariableNames('somethingElse as Foo ')).to.equal('Foo');
                expect(extractVariableNames('sword of jonas as  something')).to.equal('something');
            });
            it('should extract multiple variables with aliases', ()=> {
                expect(extractVariableNames('something as Foo, something else as Bar')).to.eql(['Foo', 'Bar']);
                expect(extractVariableNames('something as Foo,Bar')).to.eql(['Foo', 'Bar']);
                
            });
            it('should extract multiple subscripted variables', ()=> {
                expect(extractVariableNames('Foo as something, Bar[1,2] as somethingElse')).to.eql(['something', 'somethingElse']);
                expect(extractVariableNames('Foo[a,2] as something,Bar[foo,bar] ')).to.eql(['something', 'Bar[foo,bar]']);
            });
        });
    });
});
