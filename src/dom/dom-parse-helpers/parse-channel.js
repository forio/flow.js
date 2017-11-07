/**
 * 
 * @param {JQuery<HTMLElement>} $el  
 * @param {string} attr 
 * @returns {string | undefined}
 */
export function getChannelForAttribute($el, attr) {
    attr = attr.replace('data-f-', '');
    let channel = $el.data('f-channel-' + attr);
    if (channel === undefined) {
        channel = $el.attr('data-f-channel'); //.data shows value cached by jquery
    }
    if (channel === undefined) {
        const $parentEl = $el.closest('[data-f-channel]');
        if ($parentEl) {
            channel = $parentEl.attr('data-f-channel');
        }
    }
    return channel;
}

/**
 * @param {HTMLElement} el
 * @return {Object}
 */ 
export function getChannelConfigForElement(el) {
    const attrs = el.attributes;
    const config = {};
    for (let i = 0; i < attrs.length; i++) {
        const attrib = el.attributes[i];
        if (attrib.specified && attrib.name.indexOf('data-f-channel-') === 0) {
            const key = attrib.name.replace('data-f-channel-', '');
            config[key] = attrib.value;
        }
    }
    return config;
}
