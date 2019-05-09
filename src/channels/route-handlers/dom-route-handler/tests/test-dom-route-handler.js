import router, { match } from '../index';
import { expect } from 'chai';

describe('DOM Router', ()=> {
    describe('#match', ()=> {
        it('should match element ids', ()=> {
            const validMatches = ['#someid', '#some-id'];
            const invalidMatches = ['a'];

            validMatches.forEach((v)=> {
                const ret = match(v);
                expect(ret).to.eql('');
            });

            invalidMatches.forEach((v)=> {
                const ret = match(v);
                expect(ret).to.eql(false);
            });
        });
    });
});
