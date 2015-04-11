'use strict';
(function () {
    var cm = require('src/converters/converter-manager.js');

    describe('Converter Manager', function () {
        describe('#register', function () {
            it('Allows registering string converters', function () {
                var currentRegisterList = cm.list.length;
                cm.register('abc', $.noop);
                cm.list.length.should.equal(currentRegisterList + 1);
            });

            it('should carry on the \'isList\' property', function () {
                cm.register('listconv', $.noop, true);
                var registered = cm.getConverter('listconv');
                registered.isList.should.be.true;
            });

            it('Allows registesting object converters', function () {
                var currentRegisterList = cm.list.length;
                var convSpy = sinon.spy();
                cm.register({ 'def': $.noop, 'ghi': convSpy });
                cm.list.length.should.equal(currentRegisterList + 2);

                cm.convert(2, 'ghi');
                convSpy.should.have.been.calledWith(2);
            });
        });
        describe('#getConverter', function () {
            it('matches default handlers', function () {
                var def = cm.getConverter('s');
                def.should.exist;
            });
        });

        describe('convert', function () {
            it('should convert with a single converter', function () {
                cm.convert(1, 's').should.equal('1');
            });
            it('should convert with an array converters', function () {
                cm.register('multiply', function (val) {
                    return val * 3;
                });
                cm.convert('2', ['i', 'multiply']).should.equal(6);
            });
        });
        describe('#replace', function () {
            it('should replace existing string converters with new ones', function () {
                var conv = cm.getConverter('s');
                conv.convert(1).should.equal('1');

                cm.replace('s', function () {
                    return 'applesauce';
                });

                conv = cm.getConverter('s');
                conv.convert(1).should.equal('applesauce');
            });
        });

        describe('default converters', function () {
            require('./test-string-converters');
            require('./test-array-converters');
            require('./test-numberformat-converters');
        });
    });
}());
