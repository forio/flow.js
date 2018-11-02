import checkboxHandler from '../index';
import { expect } from 'chai';

describe('Checkbox/Radio Bind Attr', ()=> {
    describe('#handle', ()=> {
        it('should check on true value', ()=> {
            const $el = $('<input type="checkbox" />');
            checkboxHandler.handle(true, 'bind', $el, []);
            expect($el.is(':checked')).to.equal(true);
        });
        it('should check on truthy value', ()=> {
            const $el = $('<input type="checkbox" />');
            checkboxHandler.handle('hello', 'bind', $el, []);
            expect($el.is(':checked')).to.equal(true);
        });
        it('should uncheck on false value', ()=> {
            const $el = $('<input type="checkbox" />');
            checkboxHandler.handle(false, 'bind', $el, []);
            expect($el.is(':checked')).to.equal(false);
        });
        it('should uncheck on falsy value', ()=> {
            const $el = $('<input type="checkbox" checked/>');
            checkboxHandler.handle(0, 'bind', $el, []);
            expect($el.is(':checked')).to.equal(false);
        });
        it('should take last items of arrays', ()=> {
            const $el = $('<input type="checkbox" checked/>');
            checkboxHandler.handle([true, 0], 'bind', $el, []);
            expect($el.is(':checked')).to.equal(false);
        });
        describe('with value', ()=> {
            it('should check if value matches exactly', ()=> {
                const $el = $('<input type="checkbox" value="5" />');
                checkboxHandler.handle(true, 'bind', $el, []);
                expect($el.is(':checked')).to.equal(false);

                checkboxHandler.handle(5, 'bind', $el, []);
            });
            it('should check if value matches implicitly', ()=> {
                const $el = $('<input type="checkbox" value="5" />');
                checkboxHandler.handle(true, 'bind', $el, []);
                expect($el.is(':checked')).to.equal(false);

                checkboxHandler.handle('5', 'bind', $el, []);
            });
        });
    });
});
