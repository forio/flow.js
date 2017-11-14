import { addChangeClassesToList, _findMostConsequtive } from '../animation';
import { animation } from 'src/config';

describe('Animation', ()=> {
    describe('#_findMostConsequtive', ()=> {
        it('should find most conseq trues', ()=> {
            expect(_findMostConsequtive([true, false, false, true, true], true)).to.equal(2);
            expect(_findMostConsequtive([true, true, true], true)).to.equal(3);
            expect(_findMostConsequtive([false, true, true], true)).to.equal(2);
            expect(_findMostConsequtive([false, false, false], true)).to.equal(0);
            expect(_findMostConsequtive([true, true, false, true, true, true, false], true)).to.equal(3);
            expect(_findMostConsequtive([false, true, false, true, true, true, false], true)).to.equal(3);
            expect(_findMostConsequtive([false, true, false, true, false], true)).to.equal(1);
        });
    });
    function verifyChildAttrValues($els, attr, values) {
        expect($els.length).to.equal(values.length);

        $els.each((index, child)=> {
            const matchVal = values[index];
            expect(child.hasAttribute(attr)).to.equal(matchVal);
        });
    }
    function makeList(data) {
        const $parent = $('<ul></ul>');
        data.forEach((d)=> {
            $parent.append(`<li>${d}</li>`);
        });
        return $parent.children();
    }

    describe('addChangeClassesToList', ()=> {
        describe(animation.addAttr, ()=> {
            it('should add new attr to new children if added at the end', ()=> {
                const $current = makeList([1, 2]);
                const $new = makeList([1, 2, 3]);

                const $changed = addChangeClassesToList($current, $new, false, animation);
                verifyChildAttrValues($changed, animation.addAttr, [false, false, true]);
            });
            it('should add new attr to new children if added at the beginning', ()=> {
                const $current = makeList([1, 2]);
                const $new = makeList([3, 1, 2]);

                const $changed = addChangeClassesToList($current, $new, false, animation);
                verifyChildAttrValues($changed, animation.addAttr, [true, false, false]);
            });
            it('should guess if last items are same', ()=> {
                const $current = makeList([1, 2, 3]);
                const $new = makeList([1, 1, 2, 2, 3]);

                const $changed = addChangeClassesToList($current, $new, false, animation);
                verifyChildAttrValues($changed, animation.addAttr, [true, true, false, false, false]);
            });
            describe('Removing items', ()=> {
                it('should not add new classes', ()=> {
                    const $current = makeList([1, 2, 3]);
                    const $new = makeList([1, 1]);

                    const $changed = addChangeClassesToList($current, $new, false, animation);
                    verifyChildAttrValues($changed, animation.addAttr, [false, false]);
                });
            });
            describe('initial attrs', ()=> {
                it('should add initial classes if called with initial', ()=> {
                    const $current = makeList([1, 2]);
                    const $new = makeList([3, 1, 2]);

                    const $changed = addChangeClassesToList($current, $new, true, animation);
                    verifyChildAttrValues($changed, animation.addAttr, [true, false, false]);
                    verifyChildAttrValues($changed, animation.initialAttr, [true, false, false]);
                });
                it('should not add initial classes if not called with initial', ()=> {
                    const $current = makeList([1, 2]);
                    const $new = makeList([3, 1, 2]);

                    const $changed = addChangeClassesToList($current, $new, false, animation);
                    verifyChildAttrValues($changed, animation.addAttr, [true, false, false]);
                    verifyChildAttrValues($changed, animation.initialAttr, [false, false, false]);
                });
            });
           
        });
        describe(animation.changeAttr, ()=> {
            it('should update if count is same', ()=> {
                const $current = makeList([1, 2, 3]);
                const $new = makeList([1, 1, 2]);

                const $changed = addChangeClassesToList($current, $new, false, animation);
                verifyChildAttrValues($changed, animation.changeAttr, [false, true, true]);
            });
            it('should not add update class for new items', ()=> {
                const $current = makeList([1, 2, 3]);
                const $new = makeList([1, 1, 2, 4, 5]);

                const $changed = addChangeClassesToList($current, $new, false, animation);
                verifyChildAttrValues($changed, animation.changeAttr, [false, true, true, false, false]);
            });
            describe('Removing items', ()=> {
                it('should update existing items', ()=> {
                    const $current = makeList([1, 2, 3]);
                    const $new = makeList([1, 1]);

                    const $changed = addChangeClassesToList($current, $new, false, animation);
                    verifyChildAttrValues($changed, animation.changeAttr, [false, true]);
                });
            });
            describe('initial attrs', ()=> {
                it('should add initialAttr if flag passed in', ()=> {
                    const $current = makeList([1, 2, 3]);
                    const $new = makeList([1, 1, 2, 4, 5]);

                    const $changed = addChangeClassesToList($current, $new, true, animation);
                    verifyChildAttrValues($changed, animation.changeAttr, [false, true, true, false, false]);
                    verifyChildAttrValues($changed, animation.initialAttr, [false, true, true, true, true]); //2 for added, 2 for initial
                });
                it('should not add initialAttr if flag not passed in', ()=> {
                    const $current = makeList([1, 2, 3]);
                    const $new = makeList([1, 1, 2, 4, 5]);

                    const $changed = addChangeClassesToList($current, $new, false, animation);
                    verifyChildAttrValues($changed, animation.changeAttr, [false, true, true, false, false]);
                    verifyChildAttrValues($changed, animation.initialAttr, [false, false, false, false, false]);
                });
            });
            
        });
    });
});
