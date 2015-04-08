'use strict';
(function () {
    var nm = require('src/dom/nodes/node-manager');

    describe('Node Manager', function () {
        var defaultHandlers = nm.list.slice();

        afterEach(function () {
            nm.list = defaultHandlers.slice();
        });

        describe('#register', function () {
            it('should allow adding new handlers', function () {
                var currentRegisterList = nm.list.length;
                nm.register('*', $.noop);
                nm.list.length.should.equal(currentRegisterList + 1);
            });
        });
        describe('#getHandler', function () {
            it('matches default handlers', function () {
                nm.register(':radio', { handle: $.noop });

                var def = nm.getHandler(':radio');
                def.should.exist;
                def.selector.should.equal(':radio');
            });
        });

        describe('#replace', function () {
            it('should replace existing string converters with new ones', function () {
                var conv = nm.getHandler('input, select');
                should.not.exist(conv.apple);

                nm.replace('input, select', { apple: 'sauce', handle: $.noop });

                conv = nm.getHandler('input, select');
                conv.apple.should.equal('sauce');
            });
        });
    });
}());
