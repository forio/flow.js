import excludeReadonly from '../exclude-read-only';
import { expect } from 'chai';

describe('Readonly Flag', ()=> {
    describe('Boolean', ()=> {
        it('should reject everything if set to true', ()=> {
            const ip = [{ name: 'foo', value: 1 }, { name: 'bar', value: 2 }];
            const res = excludeReadonly(ip, true);
            expect(res).to.eql([]);
        });
        it('should accept everything if set to false', ()=> {
            const ip = [{ name: 'foo', value: 1 }, { name: 'bar', value: 2 }];
            const res = excludeReadonly(ip, false);
            expect(res).to.eql(ip);
        });
    });

    it('should exclude whitelisted operations', ()=> {
        const ip = [{ name: 'foo', value: 1 }, { name: 'bar', value: 2 }];
        const res = excludeReadonly(ip, ['foo', 'boo']);
        expect(res).to.eql([{ name: 'bar', value: 2 }]);
    });
    it('should allow functions', ()=> {
        const ip = [{ name: 'foo', value: 1 }, { name: 'bar', value: 2 }];
        expect(excludeReadonly(ip, ()=> true)).to.eql([]);
        expect(excludeReadonly(ip, ()=> false)).to.eql(ip);
    });
});
