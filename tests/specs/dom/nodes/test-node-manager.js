'use strict';
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
        //FIXME: Handlers here have to match exactly whats specified while creating it, it should really break it apart into individual ones
        //Don't really have a valid usecase for replace yet, so leaving as-is
        it('should replace existing string converters with new ones', function () {
            var conv = nm.getHandler('input, select, textarea');
            should.not.exist(conv.apple);

            nm.replace('input, select, textarea', { apple: 'sauce', handle: $.noop });

            conv = nm.getHandler('input, select, textarea');
            conv.apple.should.equal('sauce');
        });
    });
});
