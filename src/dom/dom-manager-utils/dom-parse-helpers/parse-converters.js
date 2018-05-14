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
function getFConvertAttrVal($el, suffix) {
    const baseAttr = 'data-f-convert';
    const suffixAttr = suffix ? `-${suffix}` : '';
    const conv = $el.attr(`${baseAttr}${suffixAttr}`); //.data shows value cached by jquery
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
        const canUseFConvert = whiteListedGenericAttributes.indexOf(attribute) !== -1;
        if (canUseFConvert) {
            return getFConvertAttrVal($el, '');
        }
        return getFConvertAttrVal($el, attribute);
    }
   
    const converters = getAllConverters($el, attribute);
    const $parentEl = $el.parents('[data-f-convert]').eq(0);
    const resolvedConverters = converters.reduce((accum, val)=> {
        if (val === 'inherit') {
            const parentConv = getConvertersForEl($parentEl, attribute);
            accum = accum.concat(parentConv);
        } else {
            accum = accum.concat(val);
        }
        return accum;
    }, []);

    if (!resolvedConverters.length && $parentEl.length) {
        return getConvertersForEl($parentEl, attribute);
    }
    return resolvedConverters;
}
