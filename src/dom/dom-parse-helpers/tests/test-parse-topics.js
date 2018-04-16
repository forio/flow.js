import { expect } from 'chai';
import { parseTopicsFromAttributeValue } from '../parse-topics';

describe('Dom Parse Topics', ()=> {
    it('should ignore templated items', ()=> {
        expect(parseTopicsFromAttributeValue('<% foo %>')).to.eql([]);
    });
    it('should exclude converters', ()=> {
        expect(parseTopicsFromAttributeValue('foo | bar | lars')).to.eql([{ name: 'foo' }]);
    });
    it('should separate comma separated values', ()=> {
        expect(parseTopicsFromAttributeValue('a, b,c | bar | lars')).to.eql([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
    });
    it('should ignore values separated by []', ()=> {
        expect(parseTopicsFromAttributeValue('a, b[c,s],c | bar | lars')).to.eql([{ name: 'a' }, { name: 'b[c,s]' }, { name: 'c' }]);
    });
    it('should ignore values separated by ())', ()=> {
        expect(parseTopicsFromAttributeValue('a(b,c), b[c,s],c | bar | lars')).to.eql([{ name: 'a(b,c)' }, { name: 'b[c,s]' }, { name: 'c' }]);
    });
});
