import utils from 'tests/testing-utils';
import { getChannelConfigForElement } from '../parse-channel';

describe('Parse Channel', ()=> {
    describe('#getChannelConfigForElement', ()=> {
        it('should return empty if no attrs', ()=> {
            const node = utils.create('<div></div>');
            const config = getChannelConfigForElement(node);
            expect(config).to.eql({});
        });
        it('should return empty if no channel attrs', ()=> {
            const node = utils.create('<div foo="bar" id="x"></div>');
            const config = getChannelConfigForElement(node);
            expect(config).to.eql({});
        });
        it('should return empty if only root channel attrs', ()=> {
            const node = utils.create('<div data-f-channel="foo" foo="bar" id="x"></div>');
            const config = getChannelConfigForElement(node);
            expect(config).to.eql({});
        });
        it('should return config object if one provided', ()=> {
            const node = utils.create('<div data-f-channel="foo" data-f-channel-foo="bar"></div>');
            const config = getChannelConfigForElement(node);
            expect(config).to.eql({ foo: 'bar' });
        });
        it('should return config object if multiple provided', ()=> {
            const node = utils.create('<div data-f-channel="foo" data-f-channel-foo="bar" data-f-channel-adam="west"></div>');
            const config = getChannelConfigForElement(node);
            expect(config).to.eql({ foo: 'bar', adam: 'west' });
        });
    });
});
