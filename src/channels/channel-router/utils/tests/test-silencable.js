import silencable from '../silencable';
import { expect } from 'chai';

describe('Silencable', ()=> {
    var toPublish;
    beforeEach(()=> {
        toPublish = [
            { name: 'ball', value: 1 }, 
            { name: 'foo', value: 2 },
            { name: 'amazon', value: 4 }, 
        ];
    });
    it('should return inputs as-is if set to false', ()=> {
        var result = silencable(toPublish, false);
        expect(result).to.eql(toPublish);
    });
    it('should default to false', ()=> {
        expect(silencable(toPublish)).to.eql(toPublish);
    });
    it('should return nothing if set to true', ()=> {
        expect(silencable(toPublish, true)).to.eql([]);
    });
    describe('as array', ()=> {
        it('should allow passing in an array of silent items', ()=> {
            var result = silencable(toPublish, ['foo', 'amazon']);
            expect(result).to.eql([{ name: 'ball', value: 1 }]);
        });
    });
    describe('as object', ()=> {
        it('should allow passing in an object of exclusions', ()=> {
            var result = silencable(toPublish, { except: ['foo', 'amazon', 'bar'] });
            expect(result).to.eql([{ name: 'foo', value: 2 }, { name: 'amazon', value: 4 }]);
        });
    });
});
