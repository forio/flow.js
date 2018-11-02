import showifAttr from '../index.js';

describe('show if', function () {
    describe('#init', ()=> {
        it('should hide node by default', ()=> {
            const $el = $('<div data-f-showif="stuff"/></div>');
            showifAttr.handle('showif', 'stuff', $el);
            $el.is(':visible').should.equal(false);
        });
    });
    describe('#handle', ()=> {
        it('should show node if value is true', ()=> {
            const $el = $('<div data-f-showif="stuff"/></div>');
            showifAttr.handle(true, 'showif', $el);
            ($el.attr('style') || '').should.equal('');
        });
        it('should show if value is truthy', ()=> {
            const $el = $('<div data-f-showif="stuff"/></div>');
            showifAttr.handle('foobar', 'showif', $el);
            ($el.attr('style') || '').should.equal('');
        });

        it('should hide if value is false', ()=> {
            const $el = $('<div data-f-showif="stuff"/></div>');
            showifAttr.handle(false, 'showif', $el);
            $el.is(':visible').should.equal(false);
        });

        it('should hide if value is falsy', ()=> {
            const $el = $('<div data-f-showif="stuff"/></div>');
            showifAttr.handle('', 'showif', $el);
            $el.is(':visible').should.equal(false);
        });

        it('should take last value if array', ()=> {
            const $el = $('<div data-f-showif="stuff"/></div>');
            showifAttr.handle([true, true, false], 'showif', $el);
            $el.is(':visible').should.equal(false);
        });
    });
});
