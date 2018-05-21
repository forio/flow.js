import { normalizeParamOptions } from '../channel-utils';
import { expect } from 'chai';

describe('#normalizeParamOptions', ()=> {
    it('should convert arrays', ()=> {
        var input = [{ name: 'foo', value: 'bar' }];
        var options = { foo: 'bah' };
        var output = normalizeParamOptions(input, options);
        var expectedOutput = { params: input, options: options };

        expect(output).to.eql(expectedOutput);
    });
    it('should convert objects', ()=> {
        var input = { a: 1, b: 'good' };
        var options = { foo: 'bah' };
        var output = normalizeParamOptions(input, options);
        var expectedOutput = { 
            params: [{ name: 'a', value: 1 }, { name: 'b', value: 'good' }], 
            options: options 
        };

        expect(output).to.eql(expectedOutput);
    });
    it('should convert key, value pairs', ()=> {
        var options = { foo: 'bah' };
        var output = normalizeParamOptions('a', 1, options);
        var expectedOutput = { 
            params: [{ name: 'a', value: 1 }], 
            options: options 
        };

        expect(output).to.eql(expectedOutput);
    });
});
