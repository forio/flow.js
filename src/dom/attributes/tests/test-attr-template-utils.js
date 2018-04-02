import { getTemplateTags, findMissingReferences, isTemplated } from '../attr-template-utils';
import { expect } from 'chai';

describe('Attr Template Utils', ()=> {
    describe('#getTemplateTags', ()=> {
        it('should return nothing for regular strings', ()=> {
            expect(getTemplateTags('Hello')).to.eql([]);
            expect(getTemplateTags(`
                <div> Hello <strong>world</strong></div>
            `)).to.eql([]);
            expect(getTemplateTags(`
                <div> Hello <strong>world</strong>. Is 5 >= 5.0? </div>
            `)).to.eql([]);
        });
        it('should recognize <%= .. %>', ()=> {
            expect(getTemplateTags('<%= hi %>')).to.eql(['<%= hi %>']);
            expect(getTemplateTags('<div>Hello <%= hi %> there</div>')).to.eql(['<%= hi %>']);
            expect(getTemplateTags('<div>Hello <%= hi %> there <%= you %></div>')).to.eql(['<%= hi %>', '<%= you %>']);
        });
        it('should recognize <%- .. %>', ()=> {
            expect(getTemplateTags('<%- hi %>')).to.eql(['<%- hi %>']);
            expect(getTemplateTags('<div>Hello <%- hi %> there</div>')).to.eql(['<%- hi %>']);
            expect(getTemplateTags('<div>Hello <%- hi %> there <%= you %></div>')).to.eql(['<%- hi %>', '<%= you %>']);
        });
        it('should recognize <%= expressions %>', ()=> {
            expect(getTemplateTags('<%= hi + 1 %>')).to.eql(['<%= hi + 1 %>']);
            expect(getTemplateTags('<%= hi + 1 ? 2 : 3 %>')).to.eql(['<%= hi + 1 ? 2 : 3 %>']);
            expect(getTemplateTags('<div>Hello <%= hi + there %> there</div>')).to.eql(['<%= hi + there %>']);
        });
    });
    describe('#isTemplated', ()=> {
        it('should be false for non-templated', ()=> {
            expect(isTemplated('Hello')).to.equal(false);
            expect(isTemplated(`
                <div> Hello <strong>world</strong></div>
            `)).to.equal(false);
            expect(isTemplated(`
                <div> Hello <strong>world</strong>. Is 5 >= 5.0? </div>
            `)).to.equal(false);
        });
        it('should recognize oneliners', ()=> {
            expect(isTemplated('<%= hi %>')).to.equal(true);
            expect(isTemplated('<div>Hello <%- hi %> there</div>')).to.equal(true);
            expect(isTemplated('<div>Hello <% hi ? 1 : 2 %> there <%= you %></div>')).to.equal(true);
        });
        it('should recognize multiliners', ()=> {
            expect(isTemplated(`
                <div>
                    <% [1,2,3].forEach((v)=> { %>
                        Hello
                    <% }) %>
                </div>
    
            `)).to.equal(true);
        });
    });
    describe.skip('#findMissingReferences', ()=> {
        it('should exclude whitelisted', ()=> {
            
        });
        it('should find multiple in operations (<%= a + b %>)', ()=> {
            
        });
    });
    describe('#findMissingReferences', ()=> {
        it.skip('should find return nothing for non-templated values', ()=> {
            const op = findMissingReferences(`
                <div>Hello <strong>there</strong></div>
            `, []);
            expect(op).to.eql([]);
        });
    });
});
