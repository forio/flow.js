'use strict';

var utils = require('../../testing-utils');
var d = require('src/utils/dom');
// 
describe('DOM utils', function () {
    describe('#getChannelConfig', function () {
        it('should return empty if no attrs', ()=> {
            var node = utils.create('<div></div>');
            var config = d.getChannelConfig(node);
            expect(config).to.eql({});
        });
        it('should return empty if no channel attrs', ()=> {
            var node = utils.create('<div foo="bar" id="x"></div>');
            var config = d.getChannelConfig(node);
            expect(config).to.eql({});
        });
        it('should return empty if only root channel attrs', ()=> {
            var node = utils.create('<div data-f-channel="foo" foo="bar" id="x"></div>');
            var config = d.getChannelConfig(node);
            expect(config).to.eql({});
        });
        it('should return config object if one provided', ()=> {
            var node = utils.create('<div data-f-channel="foo" data-f-channel-foo="bar"></div>');
            var config = d.getChannelConfig(node);
            expect(config).to.eql({ foo: 'bar' });
        });
        it('should return config object if multiple provided', ()=> {
            var node = utils.create('<div data-f-channel="foo" data-f-channel-foo="bar" data-f-channel-adam="west"></div>');
            var config = d.getChannelConfig(node);
            expect(config).to.eql({ foo: 'bar', adam: 'west' });
        });
    });
});
