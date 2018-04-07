import { extractVariableNames } from '../bind-utils';
import { expect } from 'chai';

describe('Bind utils', ()=> {
    describe('#extractVariableNames', ()=> {
        describe('unaliased', ()=> {
            it('should extract single names without aliases', ()=> {
                expect(extractVariableNames('Foo')).to.equal('Foo');
                expect(extractVariableNames(' Foo ')).to.equal('Foo');
                expect(extractVariableNames(' Smelly Cat ')).to.equal('Smelly Cat');
            });
            it('should extract subscripted variables', ()=> {
                expect(extractVariableNames('Bar[1,2]')).to.eql('Bar[1,2]');
            });
        });
        describe('aliased', ()=> {
            it('should extract single names with aliases', ()=> {
                expect(extractVariableNames('something as Foo')).to.equal('Foo');
                expect(extractVariableNames('somethingElse as Foo ')).to.equal('Foo');
                expect(extractVariableNames('sword of jonas as  something')).to.equal('something');
            });
            it('should extract subscripted variables', ()=> {
                expect(extractVariableNames('Bar[1,2] as somethingElse')).to.eql('somethingElse');
            });
        });
    });
});
