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

export function addChangeClassesToList($curentEl, $newEls) {
    let currentcontents = $curentEl.children().map((index, child)=> {
        return $(child).html().trim();
    }).get();
    const newContents = $newEls.children().map((index, child)=> {
        return $(child).html().trim();
    }).get();
    const reversedContents = currentcontents;

    const $newChildren = $newEls.children();
    const diffFromEnd = buildDiffArray(currentcontents, newContents);
    const diffFromBeginning = buildDiffArray(reversedContents.slice().reverse(), newContents.slice().reverse());

    const endMatches = _findMostConsequtive(diffFromEnd, true);
    const beginningMatches = _findMostConsequtive(diffFromBeginning, true);

    const placeHoldersCount = newContents.length - currentcontents.length;
    const placeHolders = fill(placeHoldersCount, undefined);

    if (beginningMatches < endMatches) {
        currentcontents = currentcontents.concat(placeHolders);
    } else {
        currentcontents = placeHolders.concat(currentcontents);
    }

    for (let i = 0; i < newContents.length; i++) {
        const $el = $newChildren.eq(i);
        const curr = currentcontents[i];
        if (curr === undefined) {
            $el.attr('data-added', true);
            $el.removeAttr('data-updated');
        } else if (curr !== $el.html().trim()) {
            $el.attr('data-updated', true);
            $el.removeAttr('data-added');
        } else {
            $el.removeAttr('data-added data-updated');
        }
    }

    return $newEls;
}
