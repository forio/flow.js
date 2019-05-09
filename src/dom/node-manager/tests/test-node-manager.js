import nm from '../index';
import { expect } from 'chai';

describe('Node Manager', function () {
    var defaultHandlers = nm.list.slice();

    afterEach(function () {
        nm.list = defaultHandlers.slice();
    });

    describe('#register', function () {
        it('should allow adding new handlers', function () {
            var currentRegisterList = nm.list.length;
            nm.register('*', $.noop);
            expect(nm.list.length).to.equal(currentRegisterList + 1);
        });
    });
    describe('#getHandler', function () {
        it('matches default handlers', function () {
            nm.register(':radio', $.noop);

            var def = nm.getHandler(':radio');
            expect(def.selector).to.exist;
            expect(def.selector).to.equal(':radio');
        });
    });

    describe('#replace', function () {
        //FIXME: Handlers here have to match exactly whats specified while creating it, it should really break it apart into individual ones
        //Don't really have a valid usecase for replace yet, so leaving as-is
        it('should replace existing string converters with new ones', function () {
            var conv = nm.getHandler('input, select, textarea');
            expect(conv.apple).to.equal(undefined);

            nm.replace('input, select, textarea', { apple: 'sauce', handle: $.noop });

            conv = nm.getHandler('input, select, textarea');
            expect(conv.apple).to.equal('sauce');
        });
    });
});
