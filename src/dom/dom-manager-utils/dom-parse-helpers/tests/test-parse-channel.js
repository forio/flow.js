import { create } from 'tests/testing-utils';
import { getChannelConfigForElement } from '../parse-channel';
import { expect } from 'chai';

describe('Parse Channel', ()=> {
    describe('#getChannelConfigForElement', ()=> {
        it('should return empty if no attrs', ()=> {
            const node = create('<div></div>');
            const config = getChannelConfigForElement(node);
            expect(config).to.eql({});
        });
        it('should return empty if no channel attrs', ()=> {
            const node = create('<div foo="bar" id="x"></div>');
            const config = getChannelConfigForElement(node);
            expect(config).to.eql({});
        });
        it('should return empty if only root channel attrs', ()=> {
            const node = create('<div data-f-channel="foo" foo="bar" id="x"></div>');
            const config = getChannelConfigForElement(node);
            expect(config).to.eql({});
        });
        it('should return config object if one provided', ()=> {
            const node = create('<div data-f-channel="foo" data-f-channel-foo="bar"></div>');
            const config = getChannelConfigForElement(node);
            expect(config).to.eql({ foo: 'bar' });
        });
        it('should return config object if multiple provided', ()=> {
            const node = create('<div data-f-channel="foo" data-f-channel-foo="bar" data-f-channel-adam="west"></div>');
            const config = getChannelConfigForElement(node);
            expect(config).to.eql({ foo: 'bar', adam: 'west' });
        });
    });
});
