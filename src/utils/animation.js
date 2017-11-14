export function _findMostConsequtive(arr, match) {
    const reduced = arr.reduce((accum, val)=> {
        if (val === match) {
            if (accum.prev === match) {
                accum.count = accum.count + 1;
            } else {
                accum.count = 1;
            }
        }
        accum.maxCount = Math.max(accum.maxCount, accum.count);
        accum.prev = val;
        return accum;
    }, { prev: null, count: 0, maxCount: 0 });
    return reduced.maxCount;
}

function buildDiffArray(currentcontents, newContents) {
    return newContents.map((contents, index)=> {
        const isSame = contents === currentcontents[index]; 
        return isSame;
    });
}

function fill(count, val) {
    const a = [];
    for (let i = 0; i < count; i++) {
        a.push(val);
    }
    return a;
}

function elementsToContents($els) {
    return $els.map((index, child)=> {
        return $(child).html().trim();
    }).get();
}

const defaults = {
    addAttr: 'data-add',
    changeAttr: 'data-update',
    initialAttr: 'data-initial',
};

/**
 * Compares 2 lists and Adds add or update classes
 * @param {JQuery<HTMLElement>} $currentEls existing elements
 * @param {JQuery<HTMLElement>} $newEls   new elements
 * @param {Boolean} isInitial check if this is initial data or it's updating
 * @param {{ addAttr: string, changeAttr: string}} [options]
 * @returns {JQuery<HTMLElement>} elements with updated attributes
 */
export function addChangeClassesToList($currentEls, $newEls, isInitial, options) {
    const opts = $.extend({}, defaults, options);

    let currentcontents = elementsToContents($currentEls);
    const newContents = elementsToContents($newEls);
    const reversedContents = currentcontents;

    //Guess if data was added to end or beginning of array
    const diffFromEnd = buildDiffArray(currentcontents, newContents);
    const diffFromBeginning = buildDiffArray(reversedContents.slice().reverse(), newContents.slice().reverse());

    const endMatches = _findMostConsequtive(diffFromEnd, true);
    const beginningMatches = _findMostConsequtive(diffFromBeginning, true);

    const placeHoldersCount = newContents.length - currentcontents.length;
    const placeHolders = fill(placeHoldersCount, undefined);

    if (beginningMatches <= endMatches) {
        currentcontents = currentcontents.concat(placeHolders);
    } else {
        currentcontents = placeHolders.concat(currentcontents);
    }

    for (let i = 0; i < newContents.length; i++) {
        const $el = $newEls.eq(i);
        const curr = currentcontents[i];
        $el.removeAttr(opts.initialAttr);

        if (curr === undefined) {
            $el.attr(isInitial ? opts.initialAttr : opts.addAttr, true);
            $el.removeAttr(opts.changeAttr);
        } else if (curr !== $el.html().trim()) {
            $el.attr(isInitial ? opts.initialAttr : opts.changeAttr, true);
            $el.removeAttr(opts.addAttr);
        } else {
            $el.removeAttr(`${opts.addAttr} ${opts.changeAttr}`);
        }
    }

    return $newEls;
}

export function addContentAndAnimate($el, newValue, isInitial, options) {
    const opts = $.extend({}, defaults, options);
    const current = $el.html().trim();
    const attrToAdd = isInitial ? opts.initialAttr : opts.changeAttr;

    $el.removeAttr(`${opts.changeAttr} ${opts.initialAttr}`);
    if (current === newValue.trim()) {
        return $el;
    }

    $el.html(newValue);
    setTimeout(()=> $el.attr(attrToAdd, true), 0); //need this to trigger animation
}
