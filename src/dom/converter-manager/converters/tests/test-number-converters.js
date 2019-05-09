import { i, plus, minus, divideBy, multiplyBy } from '../number-converters';
import cm from '../../index';

describe('Number converters', ()=> {
    describe('i', ()=> {
        it('should convert to floats', ()=> {
            i('50').should.equal(50);
            i('50.001').should.equal(50.001);
        });
    });
    describe('plus', ()=> {
        it('should add 2 numbers', ()=> {
            plus('50', 50).should.equal(100);
            plus('50.001', '1').should.equal(51.001);
        });
    });
    describe('minus', ()=> {
        it('should subtract 2 numbers', ()=> {
            minus('50', 50).should.equal(0);
            minus('50.001', '1').should.equal(49.001);
        });
    });
    describe('multiplyBy', ()=> {
        it('should subtract 2 numbers', ()=> {
            multiplyBy('50', 50).should.equal(2500);
            multiplyBy('50.001', '2').should.equal(100.002);
        });
    });
    describe('divideBy', ()=> {
        it('should subtract 2 numbers', ()=> {
            divideBy('50', 50).should.equal(1);
            divideBy('50', '2').should.equal(25);
        });
    });
    describe('Integration', ()=> {
        it.only('accept convert syntax', ()=> {
            cm.convert('1', 'plus(1)').should.equal(2);
            cm.convert('1', 'minus(10)').should.eql(-9.0);
            cm.convert('1', 'multiplyBy(10)').should.equal(10);
            cm.convert('1', 'divideBy(10)').should.equal(0.1);
        });
    });
});


