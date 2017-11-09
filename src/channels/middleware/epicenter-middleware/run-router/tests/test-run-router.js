import { VARIABLES_PREFIX, OPERATIONS_PREFIX, _shouldFetch } from '../index.js';
import { expect } from 'chai';

describe.only('run router', ()=> {
    describe('Variables channel fetch', ()=> {
        it('should not fetch if there are no operations', ()=> {
            expect(_shouldFetch([], [])).to.equal(false);
        });
        it('should not fetch if there are only ignored operations', ()=> {
            const pubData = [{ name: `${OPERATIONS_PREFIX}foo`, value: '1' }, { name: `${OPERATIONS_PREFIX}bar`, value: 2 }];
            const toIgnore = ['foo', 'bar'];
            expect(_shouldFetch(pubData, toIgnore)).to.equal(false);

        });
        it.only('should fetch if there are any valid operations', ()=> {
            const pubData = [{ name: `${OPERATIONS_PREFIX}foo`, value: '1' }, { name: `${OPERATIONS_PREFIX}batman`, value: 2 }];
            const toIgnore = ['foo', 'bar'];
            expect(_shouldFetch(pubData, toIgnore)).to.equal(true);

        });
        it('should fetch if there are any variable sets', ()=> {
            const pubData = [
                { name: `${OPERATIONS_PREFIX}foo`, value: '1' }, 
                { name: `${OPERATIONS_PREFIX}bar`, value: 2 }, 
                { name: `${VARIABLES_PREFIX}hi`, value: 2 }
            ];
            const toIgnore = ['foo', 'bar'];
            expect(_shouldFetch(pubData, toIgnore)).to.equal(true);
        });
        it('should not fetch if there are only non-variable non-ignored ite,s', ()=> {
            const pubData = [
                { name: 'food', value: '1' }, 
                { name: 'bard', value: 2 }, 
            ];
            const toIgnore = ['foo', 'bar'];
            expect(_shouldFetch(pubData, toIgnore)).to.equal(true);
        });
    });
});
