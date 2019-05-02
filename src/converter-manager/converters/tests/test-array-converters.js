import cm from 'converter-manager';
import { expect } from 'chai';

describe('#Array converters', ()=> {
    describe('#list', ()=> {
        it('should strings to arrays', ()=> {
            cm.convert(1, 'list').should.eql([1]);
        });
        it('should leave arrays as-is', ()=> {
            cm.convert([1, 2], 'list').should.eql([1, 2]);
        });
        it('should convert objects', ()=> {
            cm.convert({ a: [1, 2], b: [2, 4] }, 'list').should.eql({ a: [1, 2], b: [2, 4] });
        });
    });

    describe('#last', ()=> {
        describe('with no params', ()=> {
            it('should return the last item in array with multiple items', ()=> {
                const op = cm.convert([1, 2, 3], 'last');
                op.should.equal(3);
            });
            it('should return the only item in array with single items', ()=> {
                cm.convert([1], 'last').should.equal(1);
            });
            it('should nothing for empty arrays', ()=> {
                expect(cm.convert([], 'last')).to.not.exist;
                expect(cm.convert(null, 'last')).to.not.exist;
            });
            it('should convert objects', ()=> {
                cm.convert({ a: [1, 2], b: [2, 4] }, 'last').should.eql({ a: 2, b: 4 });
            });
        });
        describe('with limit', ()=> {
            it('should return the last item in array with multiple items', ()=> {
                const op = cm.convert([1, 2, 3], 'last(2)');
                op.should.eql([2, 3]);
            });
            it('should nothing for empty arrays', ()=> {
                expect(cm.convert([], 'last(2)')).to.not.exist;
            });
            it('should convert objects', ()=> {
                cm.convert({ a: [1, 2, 2], b: [2, 4, 5] }, 'last(2)').should.eql({ a: [2, 2], b: [4, 5] });
            });
        });
    });

    describe('#first', ()=> {
        describe('with no params', ()=> {
            it('should return the first item in array with multiple items', ()=> {
                cm.convert([1, 2, 3], 'first').should.equal(1);
            });
            it('should return the only item in array with single items', ()=> {
                cm.convert([1], 'first').should.equal(1);
            });
            it('should nothing for empty arrays', ()=> {
                expect(cm.convert([], 'first')).to.not.exist;
                expect(cm.convert(null, 'first')).to.not.exist;
            });
            it('should convert objects', ()=> {
                cm.convert({ a: [1, 2], b: [2, 4] }, 'first').should.eql({ a: 1, b: 2 });
            });
        });
        describe('with limit', ()=> {
            it('should return the last item in array with multiple items', ()=> {
                const op = cm.convert([1, 2, 3], 'first(2)');
                op.should.eql([1, 2]);
            });
            it('should nothing for empty arrays', ()=> {
                expect(cm.convert([], 'first(2)')).to.not.exist;
            });
            it('should convert objects', ()=> {
                cm.convert({ a: [1, 2, 2], b: [2, 4, 5] }, 'first(2)').should.eql({ a: [1, 2], b: [2, 4] });
            });
        });
        
    });

    describe('#previous', ()=> {
        it('should return the previous item in array with multiple items', ()=> {
            cm.convert([1, 2, 3], 'previous').should.equal(2);
        });
        it('should return the only item in array with single items', ()=> {
            cm.convert([1], 'previous').should.equal(1);
        });
        it('should nothing for empty arrays', ()=> {
            expect(cm.convert([], 'previous')).to.not.exist;
            expect(cm.convert(null, 'previous')).to.not.exist;
        });
        it('should convert objects', ()=> {
            cm.convert({ a: [1, 2], b: [2, 4] }, 'first').should.eql({ a: 1, b: 2 });
        });
    });
    describe('#reverse', ()=> {
        it('should return the array flipped', ()=> {
            cm.convert([1, 2, 3], 'reverse').should.eql([3, 2, 1]);
        });
    });
    describe('#pickEvery', ()=> {
        it('should pick every nth element provided', ()=> {
            cm.convert([1, 2, 3, 4], 'pickEvery(2)').should.eql([1, 3]);
            cm.convert([1, 2, 3, 4, 5, 6, 7], 'pickEvery(3)').should.eql([1, 4, 7]);
            cm.convert([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'pickEvery(5)').should.eql([0, 5]);
        });
        it('should handle arrays with lesser numbers than n', ()=> {
            cm.convert([1, 2, 3, 4], 'pickEvery(10)').should.eql([1]);
        });
        it('should allow picking the start index', ()=> {
            cm.convert([1, 2, 3, 4], 'pickEvery(2, 1)').should.eql([2, 4]);
            cm.convert([1, 2, 3, 4], 'pickEvery(2, 0)').should.eql([1, 3]);
            cm.convert([1, 2, 3, 4], 'pickEvery(2, 7)').should.eql([]);
            cm.convert([1, 2, 3, 4], 'pickEvery(1, 3)').should.eql([4]);
            cm.convert([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'pickEvery(5, 0)').should.eql([0, 5]);
        });
        it('should allow objects', ()=> {
            cm.convert({ a: [1, 2, 3, 4], b: [4, 5, 6, 7] }, 'pickEvery(2, 0)').should.eql({ a: [1, 3], b: [4, 6] });
            cm.convert({ a: [1, 2, 3, 4], b: [4, 5, 6, 7] }, 'pickEvery(2, 1)').should.eql({ a: [2, 4], b: [5, 7] });
        });
    });

});
