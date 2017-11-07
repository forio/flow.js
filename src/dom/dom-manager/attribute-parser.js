/**
 * @param {string} attrVal 
 * @returns {string[]} variables
 */
export function parseVariablesFromAttributeValue(attrVal) {
    const commaRegex = /,(?![^[]*])/;
    const variablesPart = attrVal.split('|')[0];
    if (variablesPart.indexOf('<%') !== -1) { //Assume it's templated for later use
        return;
    } 
    if (variablesPart.split(commaRegex).length > 1) {
        return variablesPart.split(commaRegex).map((v)=> v.trim());
    } 
    return [variablesPart.trim()];
}

function convertersToArray(conv) {
    if (!conv || !conv.trim()) return [];
    return conv.split('|').map((v)=> v.trim());
}

/**
 * @param {string} attrVal 
 * @returns {string[]} converters
 */
export function parseConvertersFromAttributeValue(attrVal) {
    const withConv = convertersToArray(attrVal);
    if (withConv.length > 1) {
        return withConv.slice(1);
    }
    return [];
}
function findConvertersForEl($el) {
    const conv = $el.attr('data-f-convert'); //.data shows value cached by jquery
    return convertersToArray(conv);
}
function findConvertersOnParents($el) {
    const $parentEl = $el.closest('[data-f-convert]');
    if ($parentEl) {
        return findConvertersForEl($parentEl);
    }
    return [];
}

export function getConvertersForEl($el, attribute) {
    const attrVal = $el.attr(`data-f-${attribute}`);
    const convertersAsPipes = parseConvertersFromAttributeValue(attrVal);
    if (convertersAsPipes.length) {
        return convertersAsPipes;
    }

    const whiteListedGenericAttributes = ['bind', 'foreach', 'repeat'];
    if (whiteListedGenericAttributes.indexOf(attribute) === -1) {
        return [];
    }

    const convertersOnElement = findConvertersForEl($el);
    if (convertersOnElement.length) {
        return convertersOnElement;
    }

    const convertersOnParent = findConvertersOnParents($el);
    return convertersOnParent;
}
