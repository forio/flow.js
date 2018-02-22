import { create } from 'tests/testing-utils';
import { getConvertersForEl } from '../parse-converters';
import { expect } from 'chai';

const makeEl = (s)=> $(create(s));

describe('#getConvertersForEl', ()=> {
    it('should return empty if no attrs', ()=> {
        const node = makeEl('<div></div>');
        const config = getConvertersForEl(node, 'bind');
        expect(config).to.eql([]);
    });

    describe('inline converters', ()=> {
        it('should return items in convert attr', ()=> {
            const node = makeEl('<div data-f-bind="Price | foo"></div>');
            const config = getConvertersForEl(node, 'bind');
            expect(config).to.eql(['foo']);
        });
        it('should return piped items in convert attr', ()=> {
            const node = makeEl('<div data-f-bind="Price | foo | bar| gaz"></div>');
            const config = getConvertersForEl(node, 'bind');
            expect(config).to.eql(['foo', 'bar', 'gaz']);
        });
    });
    describe('convert attr', ()=> {
        it('should return empty if no convert attrs', ()=> {
            const node = makeEl('<div foo="bar" id="x"></div>');
            const config = getConvertersForEl(node, 'bind');
            expect(config).to.eql([]);
        });
        it('should return items in convert attr', ()=> {
            const node = makeEl('<div data-f-convert="foo"></div>');
            const config = getConvertersForEl(node, 'bind');
            expect(config).to.eql(['foo']);
        });
        it('should return piped items in convert attr', ()=> {
            const node = makeEl('<div data-f-convert="foo | bar| gaz"></div>');
            const config = getConvertersForEl(node, 'bind');
            expect(config).to.eql(['foo', 'bar', 'gaz']);
        });
    });
    describe('Parent', ()=> {
        it('should not get from parent if it has convert attr', ()=> {
            const node = makeEl(`
                <div data-f-convert="bar">
                    <span data-f-convert="foo"></span>
                </div>
            `).find('span');
            const config = getConvertersForEl(node, 'bind');
            expect(config).to.eql(['foo']);
        });
        it('should not get from parent if it has inline converter', ()=> {
            const node = makeEl(`
                <div data-f-convert="bar">
                    <span data-f-bind="Price | foo"></span>
                </div>
            `).find('span');
            const config = getConvertersForEl(node, 'bind');
            expect(config).to.eql(['foo']);
        });
        it('should get from parent if it has no converters', ()=> {
            const node = makeEl(`
                <div data-f-convert="bar | foo">
                    <span data-f-bind="Price"></span>
                </div>
            `).find('span');
            const config = getConvertersForEl(node, 'bind');
            expect(config).to.eql(['bar', 'foo']);
        });
    });
    
});
