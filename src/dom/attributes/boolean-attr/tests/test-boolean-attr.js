import handler from '../index';

describe('Boolean Attr Handler', function () {
    describe('#handle', ()=> {
        it('should set property to true for truthy values', function () {
            const $el = $('<input type="checkbox" data-f-checked="canAdvance" data-f-bind="stuff"/>');
            handler.handle('1', 'checked', $el, []);
            $el.prop('checked').should.equal(true);
        });
        it('should set property to false for falsy values', function () {
            const $el = $('<input type="checkbox" data-f-checked="canAdvance" data-f-bind="stuff"/>');
            handler.handle(0, 'checked', $el, []);
            $el.prop('checked').should.equal(false);
        });
        it('should use the last item if it\'s an array', function () {
            const $el = $('<input type="checkbox" data-f-checked="canAdvance" data-f-bind="stuff"/>');
            handler.handle([0, 0, 3], 'checked', $el, []);
            $el.prop('checked').should.equal(true);
        });
    });
    
});
