import { groupSubs } from '../run-variables-channel';

describe('Run Variables channel', ()=> {
    describe('Utils', ()=> {
        describe.only('#groupSubs', ()=> {
            it('should group single contigous arrays', ()=> {
                const op = groupSubs([1, 2, 3, 4]);
                expect(op).to.eql(['1..4']);
            });
            it('should group multi contigous arrays', ()=> {
                const op = groupSubs([1, 2, 3, 4, 6, 7, 8, 9]);
                expect(op).to.eql(['1..4', '6..9']);
            });
            describe('singletons', ()=> {
                it('should handle singletons in middle', ()=> {
                    const op = groupSubs([1, 2, 3, 4, 6, 8, 9]);
                    expect(op).to.eql(['1..4', '6', '8..9']);
                });
                it('should handle singletons at end', ()=> {
                    const op2 = groupSubs([1, 2, 3, 4, 11]);
                    expect(op2).to.eql(['1..4', '11']);
                });
                it('should handle singletons at begnning', ()=> {
                    const op3 = groupSubs([0, 2, 3, 4, 8, 9]);
                    expect(op3).to.eql(['0', '2..4', '8..9']);
                });
            });
        });
    });
});
