import { expect } from 'chai';
import am from '../attribute-manager';

describe('Attribute Manager', function () {
    var defaultHandlers = [].concat(am.list);
    afterEach(function () {
        am.list = defaultHandlers;
    });

    describe('#register', function () {
        it('should allow adding new handlers', function () {
            var currentRegisterList = am.list.length;
            am.register('abc', '*', $.noop);
            am.list.length.should.equal(currentRegisterList + 1);
        });
    });
    describe('#getHandler', function () {
        it('matches default handlers', function () { 
            am.register('def', '*', { handle: $.noop });

            var def = am.getHandler('def', '*');
            def.should.exist;
            def.test.should.equal('def');
        });
    });

    describe('#replace', function () {
        it('should replace existing string converters with new ones', function () {
            var conv = am.getHandler('class', '*');
            expect(conv.apple).to.equal(undefined);

            am.replace('class', '*', { apple: 'sauce', handle: $.noop });

            conv = am.getHandler('class', '*');
            expect(conv.apple).to.equal('sauce');
        });
    });

});
