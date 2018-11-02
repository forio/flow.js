import classHandler from '../index';

describe('Classes Attribue', function () {
    describe('#handle', ()=> {
        it('should able to add classes if there are none', function () {
            const $el = $('<input type="text" data-f-class="apple" data-f-bind="stuff"/>');
            classHandler.handle('sauce', 'class', $el, []);
            setTimeout(()=> {
                $el.hasClass('sauce').should.equal(true);
            }, 0);
        });

        it('should able to append classes some already exist', function () {
            const $el = $('<input type="text" data-f-class="apple" class="exist" data-f-bind="stuff"/>');
            classHandler.handle('sauce', 'class', $el, []);
            setTimeout(()=> {
                $el.hasClass('sauce').should.equal(true);
                $el.hasClass('exist').should.equal(true);
            }, 0);

        });

        it('should prefix value- if passed in a number', function () {
            const $el = $('<input type="text" data-f-class="apple" data-f-bind="stuff"/>');
            classHandler.handle(2, 'class', $el, []);
            setTimeout(()=> {
                $el.hasClass('value-2').should.equal(true);
            }, 0);
        });
    
        it('should use the last item if it\'s an array', function () {
            const $el = $('<input type="text" data-f-class="apple" data-f-bind="stuff"/>');
            classHandler.handle([1, 2, 3], 'class', $el, []);
            setTimeout(()=> {
                $el.hasClass('value-3').should.equal(true);
            }, 0);
        });

        it('should change value of existing classes when input changes', function () {
            const $el = $('<input type="text" data-f-class="apple" class="exist" data-f-bind="stuff"/>');
           
            classHandler.handle('sauce', 'class', $el, []);
            setTimeout(()=> {
                $el.hasClass('sauce').should.equal(true);
                classHandler.handle('pie', 'class', $el, []);
                setTimeout(()=> {
                    $el.hasClass('sauce').should.equal(false);
                    $el.hasClass('exist').should.equal(true);
                    $el.hasClass('pie').should.equal(true);
                }, 0);
            }, 0);
        });
    });
});
