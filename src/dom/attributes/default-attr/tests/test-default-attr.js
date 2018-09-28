import defaultAttrHandler from '../index';

describe('Default Attributes', function () {
    describe('#handle', ()=> {
        it('should copy attributes for anything it doesn\'t understand', function () {
            const $el = $('<input type="text" data-f-fruit="apple" data-f-bind="stuff"/>');
            defaultAttrHandler.handle('sauce', 'fruit', $el, []);
            $el.prop('fruit').should.equal('sauce');
        });
        it('should copy attributes as arrays for arrays', function () {
            const $el = $('<input type="text" data-f-fruit="apple" data-f-bind="stuff"/>');
            defaultAttrHandler.handle([1, 2, 3], 'fruit', $el, []);
            $el.prop('fruit').should.eql([1, 2, 3]);
        });
    });
});
