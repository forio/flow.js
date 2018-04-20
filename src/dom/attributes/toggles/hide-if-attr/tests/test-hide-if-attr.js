import hideifAttr from '../index.js';

describe('hide if', function () {
    describe('#init', ()=> {
        it('should hide node by default', ()=> {
            const $el = $('<div data-f-hideif="stuff"/></div>');
            hideifAttr.handle('hideif', 'stuff', $el);
            $el.is(':visible').should.equal(false);
        });
    });
    describe('#handle', ()=> {
        it('should hide node if value is true', ()=> {
            const $el = $('<div data-f-hideif="stuff"/></div>');
            hideifAttr.handle(true, 'hideif', $el);
            $el.is(':visible').should.equal(false);
        });
        it('should hide if value is truthy', ()=> {
            const $el = $('<div data-f-hideif="stuff"/></div>');
            hideifAttr.handle('foobar', 'hideif', $el);
            $el.is(':visible').should.equal(false);
        });

        it('should show if value is false', ()=> {
            const $el = $('<div data-f-hideif="stuff"/></div>');
            hideifAttr.handle(false, 'hideif', $el);
            ($el.attr('style') || '').should.equal('');
        });

        it('should show if value is falsy', ()=> {
            const $el = $('<div data-f-hideif="stuff"/></div>');
            hideifAttr.handle('', 'hideif', $el);
            ($el.attr('style') || '').should.equal('');
        });

        it('should take last value if array', ()=> {
            const $el = $('<div data-f-hideif="stuff"/></div>');
            hideifAttr.handle([true, true, false], 'hideif', $el);
            ($el.attr('style') || '').should.equal('');
        });
    });
});
