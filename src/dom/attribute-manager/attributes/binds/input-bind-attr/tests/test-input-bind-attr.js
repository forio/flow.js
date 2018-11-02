import handler from '../index';
import { expect } from 'chai';

describe('Input bind Handler', ()=> {
    it('should insert regular text', ()=> {
        const $el = $('<textarea>foo</textarea>');
        handler.handle(32, 'bind', $el, []);
        expect($el.val()).to.equal('32');
    });
    it('should strip out undefineds', ()=> {
        const $el = $('<textarea>foo</textarea>');
        handler.handle(undefined, 'bind', $el, []);
        expect($el.val()).to.equal('');
    });
    it('should not strip out nulls', ()=> {
        const $el = $('<textarea>foo</textarea>');
        handler.handle(null, 'bind', $el, []);
        expect($el.val()).to.equal('null');
    });
    it('should handle arrays', ()=> {
        const $el = $('<textarea>foo</textarea>');
        handler.handle([2, 3, 'hello'], 'bind', $el, []);
        expect($el.val()).to.equal('hello');
    });
});
