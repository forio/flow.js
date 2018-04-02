import { groupByContigousArrayItems } from '../run-variables-channel';

describe('Run Variables channel', ()=> {
    describe('Utils', ()=> {
        describe.only('#groupByContigousArrayItems', ()=> {
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
            });
        });
    });
});
