import { groupByContigousArrayItems, groupVariableBySubscripts } from '../optimized-variables-fetch';
import { expect } from 'chai';

describe('Run Variables fetch', ()=> {
    describe('#groupByContigousArrayItems', ()=> {
        it('should group single contigous arrays', ()=> {
            const op = groupByContigousArrayItems([1, 2, 3, 4]);
            expect(op).to.eql([[1, 2, 3, 4]]);
        });
        it('should group multi contigous arrays', ()=> {
            const op = groupByContigousArrayItems([1, 2, 3, 4, 6, 7, 8, 9]);
            expect(op).to.eql([[1, 2, 3, 4], [6, 7, 8, 9]]);
        });
        describe('singletons', ()=> {
            it('should handle singletons in middle', ()=> {
                const op = groupByContigousArrayItems([1, 2, 3, 4, 6, 8, 9]);
                expect(op).to.eql([[1, 2, 3, 4], [6], [8, 9]]);
            });
            it('should handle singletons at end', ()=> {
                const op2 = groupByContigousArrayItems([1, 2, 3, 4, 11]);
                expect(op2).to.eql([[1, 2, 3, 4], [11]]);
            });
            it('should handle singletons at begnning', ()=> {
                const op3 = groupByContigousArrayItems([0, 2, 3, 4, 8, 9]);
                expect(op3).to.eql([[0], [2, 3, 4], [8, 9]]);
            });
            it('should handle singletons by themselves', ()=> {
                const op3 = groupByContigousArrayItems([13]);
                expect(op3).to.eql([[13]]);
            });
        });
    });
    describe('#groupVariableBySubscripts', ()=> {
        it('should leave unsubscripted variables as is', ()=> {
            const op = groupVariableBySubscripts(['Foo', 'Bar']);
            expect(op).to.eql({
                Foo: [],
                Bar: []
            });
        });
        it('should extract subscripts for single dim', ()=> {
            const op = groupVariableBySubscripts(['Foo', 'Bar[1]', 'Gaz[3]']);
            expect(op).to.eql({
                Foo: [],
                Bar: [1],
                Gaz: [3],
            });
        });
        it('should extract subscripts for multi dim', ()=> {
            const op = groupVariableBySubscripts(['Foo', 'Bar[1, 2, 3]', 'Gaz[3]']);
            expect(op).to.eql({
                Foo: [],
                Bar: [1, 2, 3],
                Gaz: [3],
            });
        });
        it('should group multiple subscript', ()=> {
            const op = groupVariableBySubscripts(['Foo', 'Bar[1]', 'Bar[3]']);
            expect(op).to.eql({
                Foo: [],
                Bar: [1, 3],
            });
        });
    });
});
