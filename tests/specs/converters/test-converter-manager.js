var cm = require('src/converters/converter-manager.js');

describe('Converter Manager', function () {
    describe('#register', function () {
        it('Allows registering string converters', function () {
            var currentRegisterList = cm.list.length;
            cm.register('abc', $.noop);
            cm.list.length.should.equal(currentRegisterList + 1);
        });

        it('should carry on the \'acceptList\' property', function () {
            cm.register('listconv', $.noop, true);
            var registered = cm.getConverter('listconv');
            registered.acceptList.should.be.true;
        });

        it('Allows registesting object converters', function () {
            var currentRegisterList = cm.list.length;
            var convSpy = sinon.spy();
            cm.register({ def: $.noop, ghi: convSpy });
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
        describe('Single values', function () {
            it('should convert with a single converter', function () {
                cm.convert(1, 's').should.equal('1');
            });
            it('should convert with an array of converters', function () {
                cm.register('multiply', function (val) {
                    return val * 3;
                });
                cm.convert('2', ['i', 'multiply']).should.equal(6);
            });
            it('should be able to pass single parameter to converter', function () {
                var spy = sinon.spy(function multiply(ip, val) {
                    return ip * val;
                });
                cm.register('multiplyOperand', spy);

                var result = cm.convert(3, ['multiplyOperand(2)']);
                result.should.equal(6);

                spy.should.have.been.calledWith(2, 3);
            });
            it('should be able to pass multiple parameters to converter', function () {
                var spy = sinon.spy(function multiply(ip, ip2, val) {
                    return ip * ip2 * val;
                });
                cm.register('multiplyOperand', spy);

                var result = cm.convert(4, ['multiplyOperand(2, 3)']);
                result.should.equal(24);

                spy.should.have.been.calledWith(2, 3, 4);
            });
        });
        describe('Arrays', function () {
            it('should apply converter to each item in an array if provided an array + non-list converter', function () {
                cm.register('multiply', function (val) {
                    return val * 3;
                });
                cm.convert(['2', '3', '4'], ['i', 'multiply']).should.eql([6, 9, 12]);
            });
            it('should apply converter to entire array if provided an array + list converter', function () {
                cm.register('zefirst', function (val) {
                    return val[0];
                }, true);
                cm.convert(['2', '3', '4'], ['zefirst']).should.eql('2');
            });
        });

        describe('Objects', function () {
            it('should convert objects with single values', function () {
                cm.convert({ a: 1, b: 2 }, 's').should.eql({ a: '1', b: '2' });
            });
            it('should convert objects with array values', function () {
                cm.register('multiply', function (val) {
                    return val * 3;
                });
                cm.convert({ a: [1, 2], b: [3, 4] }, 'multiply').should.eql({ a: [3, 6], b: [9, 12] });
            });
        });
        it('should convert with an array of converters', function () {
            cm.register('multiply', function (val) {
                return val * 3;
            });
            cm.convert('2', ['i', 'multiply']).should.equal(6);
        });
    });


    it('should throw an error if converter is not found', function () {
        var c = function () { cm.convert({ a: 1, b: 2 }, 'does not exist'); };
        c.should.throw(/could not find/i);
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
        require('./test-underscore-converters');
    });
});
