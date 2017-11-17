const cc = require('converters/collection-converters');

function getConverter(name) {
    const conv = cc.find((c)=> c.alias === name);
    return conv.convert;
}

describe('Collection Converters', ()=> {
    describe('#any', ()=> {
        const any = getConverter('any');
        const src = [{ name: 'John', isOnline: false }, { name: 'Wayne', isOnline: true }];
        it('should allow string params', ()=> {
            expect(any('isOnline', src)).to.equal(true);
        });
        it('should allow object matches', ()=> {
            expect(any({ isOnline: true }, src)).to.equal(true);
            expect(any({ foobar: true }, src)).to.equal(false);
        });
        it('should allow array of literals', ()=> {
            const src = [1, 2, 3];
            expect(any(1, src)).to.eql(true);
            expect(any(10, src)).to.eql(false);
        });
    });
    describe('#every', ()=> {
        const every = getConverter('every');
        const src = [{ name: 'John', isOnline: false, isStudent: true }, { name: 'Wayne', isOnline: true, isStudent: true }];
        it('should allow string params', ()=> {
            expect(every('isOnline', src)).to.equal(false);
            expect(every('isStudent', src)).to.equal(true);
        });
        it('should allow object matches', ()=> {
            expect(every({ isOnline: true }, src)).to.equal(false);
            expect(every({ isStudent: true }, src)).to.equal(true);
            expect(every({ foobar: true }, src)).to.equal(false);
        });
        it('should allow array of literals', ()=> {
            expect(every(true, [true, true, true])).to.eql(true);
            expect(every(true, [true, true, true, 1])).to.eql(false);
            expect(every(false, [true, true, true, 1])).to.eql(false);
        });
    });
    describe('#except', ()=> {
        const except = getConverter('except');
        describe('array of objects', ()=> {
            const src = [{ name: 'John', isOnline: false, isStudent: true }, { name: 'Wayne', isOnline: true, isStudent: true }];
            it('should allow string params', ()=> {
                expect(except('isOnline', src)).to.eql([src[0]]);
            });
            it('should allow object matches', ()=> {
                expect(except({ 'isOnline': false }, src)).to.eql([src[1]]);
            });
        });
        it('should allow array of literals', ()=> {
            const src = [1, 2, 3];
            expect(except(1, src)).to.eql([2, 3]);
        });
    });
    describe('#filter', ()=> {
        const filter = getConverter('filter');
        describe('array of objects', ()=> {
            const src = [{ name: 'John', isOnline: false, isStudent: true }, { name: 'Wayne', isOnline: true, isStudent: true }];
            it('should allow string params', ()=> {
                expect(filter('isOnline', src)).to.eql([src[1]]);
            });
            it('should allow object matches', ()=> {
                expect(filter({ 'isOnline': false }, src)).to.eql([src[0]]);
            });
        });
        it('should allow array of literals', ()=> {
            const src = [1, 2, 3];
            expect(filter(1, src)).to.eql([1]);
        });
    });
});
