import { normalizeParamOptions, objectToPublishable, publishableToObject } from '../channel-utils';
import { expect } from 'chai';

describe('Channel Utils', ()=> {
    describe('#normalizeParamOptions', ()=> {
        it('should convert arrays', ()=> {
            const input = [{ name: 'foo', value: 'bar' }];
            const options = { foo: 'bah' };
            const output = normalizeParamOptions(input, options);
            const expectedOutput = { params: input, options: options };
    
            expect(output).to.eql(expectedOutput);
        });
        it('should convert objects', ()=> {
            const input = { a: 1, b: 'good' };
            const options = { foo: 'bah' };
            const output = normalizeParamOptions(input, options);
            const expectedOutput = { 
                params: [{ name: 'a', value: 1 }, { name: 'b', value: 'good' }], 
                options: options 
            };
    
            expect(output).to.eql(expectedOutput);
        });
        it('should convert key, value pairs', ()=> {
            const options = { foo: 'bah' };
            const output = normalizeParamOptions('a', 1, options);
            const expectedOutput = { 
                params: [{ name: 'a', value: 1 }], 
                options: options 
            };
    
            expect(output).to.eql(expectedOutput);
        });
    });
    describe('objectToPublishable', ()=> {
        it('should return empty array if called with nothing', ()=> {
            expect(objectToPublishable()).to.eql([]);
        });
        it('should return convert objects to publishable', ()=> {
            expect(objectToPublishable({ a: 1, b: 2 })).to.eql([{ name: 'a', value: 1 }, { name: 'b', value: 2 }]);
        });
    });
    describe('publishableToObject', ()=> {
        it('should return empty object if called with nothing', ()=> {
            expect(publishableToObject()).to.eql({});
        });
        it('should return convert publishable to objects', ()=> {
            expect(publishableToObject([{ name: 'a', value: 1 }, { name: 'b', value: 2 }])).to.eql({ a: 1, b: 2 });
        });
    });
});

