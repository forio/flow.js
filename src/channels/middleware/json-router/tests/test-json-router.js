import { match } from '../index';

describe('JSON Router', ()=> {
    describe('#match', ()=> {
        it('should not match topics which aren\'t json', ()=> {
            const validMatches = ['[1,"a", b]', '{ "a": 1, "b": 2 }', 1];
            const invalidMatches = ['a'];

            validMatches.forEach((v)=> {
                const ret = match(v);
                expect(ret).to.eql(true);
            });

            invalidMatches.forEach((v)=> {
                const ret = match(v);
                expect(ret).to.eql(false);
            });

        });
    });
});
