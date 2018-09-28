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
    it('should allow inline converters to override attr converters', ()=> {
        const node = makeEl('<div data-f-bind="Price | foo" data-f-convert="bar"></div>');
        const config = getConvertersForEl(node, 'bind');
        expect(config).to.eql(['foo']);
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
        describe('bind', ()=> {
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
        describe('other attrs', ()=> {
            it('should return items in convert attr', ()=> {
                const node = makeEl('<div data-f-convert-attrname="foo"></div>');
                const config = getConvertersForEl(node, 'attrname');
                expect(config).to.eql(['foo']);
            });
            it('should return piped items in convert attr', ()=> {
                const node = makeEl('<div data-f-convert-attrname="foo | bar| gaz"></div>');
                const config = getConvertersForEl(node, 'attrname');
                expect(config).to.eql(['foo', 'bar', 'gaz']);
            });
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
    describe('Inherit', ()=> {
        it('should ignore if nothing to inherit from', ()=> {
            const node = makeEl('<div data-f-convert="foo | inherit | bar"></div>');
            const config = getConvertersForEl(node, 'bind');
            expect(config).to.eql(['foo', 'bar']);
        });
        it('should inherit from parent if available', ()=> {
            const node = makeEl(`
                <div data-f-convert="bar">
                    <span data-f-convert="foo | inherit | gaz"></span>
                </div>
            `).find('span');
            const config = getConvertersForEl(node, 'bind');
            expect(config).to.eql(['foo', 'bar', 'gaz']);
        });
        it('should handle nested inherits', ()=> {
            const node = makeEl(`
                <div data-f-convert="bar">
                    <div>
                        <div data-f-convert="blah | inherit">
                            <span data-f-convert="foo | inherit | gaz"></span>
                        </div>
                    </div>
                </div>
            `).find('span');
            const config = getConvertersForEl(node, 'bind');
            expect(config).to.eql(['foo', 'blah', 'bar', 'gaz']);
        });
        it('should handle nested inherits with plain leaf nodes', ()=> {
            const node = makeEl(`
                <table data-f-convert="pickEvery(1)">
                    <tr data-f-convert="$#,###.00| inherit">
                        <td data-f-repeat="Price"></td>
                    </tr>
                </table>
            `);
            const config = getConvertersForEl(node.find('td'), 'bind');
            expect(config).to.eql(['$#,###.00', 'pickEvery(1)']);
        });
    });
});
