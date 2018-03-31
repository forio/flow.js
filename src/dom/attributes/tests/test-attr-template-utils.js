import { findMissingReferences } from '../attr-template-utils';
import { expect } from 'chai';

describe('Attr Template Utils', ()=> {
    describe('#findMissingReferences', ()=> {
        it.skip('should find return nothing for non-templated values', ()=> {
            const op = findMissingReferences(`
                <div>Hello <strong>there</strong></div>
            `, []);
            expect(op).to.eql([]);
        });
    });
});
