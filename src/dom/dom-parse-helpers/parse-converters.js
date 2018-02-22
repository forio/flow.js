/**
 * @param {string} conv 
 * @returns {string[]}
 */
function convertersToArray(conv) {
    if (!conv || !conv.trim()) return [];
    return conv.split('|').map((v)=> v.trim());
}

/**
 * @param {JQuery<HTMLElement>} $el
 * @param {string} attribute 
 * @returns {string[]}
 */
function getConvertersFromAttr($el, attribute) {
    const attrVal = $el.attr(`data-f-${attribute}`);
    const withConv = convertersToArray(attrVal);
    if (withConv.length > 1) {
        return withConv.slice(1); //First item will be the topic
    }
    return [];
}
function findConvertersForEl($el) {
    const conv = $el.attr('data-f-convert'); //.data shows value cached by jquery
    return convertersToArray(conv);
}

/**
 * @param {JQuery<HTMLElement>} $el  
 * @param {string} attribute 
 * @returns {string[]} converters
 */
export function getConvertersForEl($el, attribute) {

    function getAllConverters($el, attribute) {
        const convertersAsPipes = getConvertersFromAttr($el, attribute);
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

        const $parentEl = $el.closest('[data-f-convert]');
        if ($parentEl) {
            return findConvertersForEl($parentEl);
        }
        return [];
    }
   
    const converters = getAllConverters($el, attribute);
    const resolvedConverters = converters.reduce((accum, val)=> {
        if (val === 'inherit') {
            const $parentEl = $el.parents('[data-f-convert]').eq(0);
            const parentConv = getConvertersForEl($parentEl, attribute);
            accum = accum.concat(parentConv);
        } else {
            accum = accum.concat(val);
        }
        return accum;
    }, []);

    return resolvedConverters;
}
