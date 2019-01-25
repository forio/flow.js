/**
 * 
 * @param {Object} obj
 * @returns {Publishable[]}
 */
export function objectToPublishable(obj) {
    var mapped = Object.keys(obj || {}).map(function (t) {
        return { name: t, value: obj[t] };
    });
    return mapped;
}

/**
 * Converts arrays of the form [{ name: '', value: ''}] to {[name]: value}
 * @param {Publishable[]} arr
 * @param {Object} [mergeWith]
 * @returns {Object}
 */
export function publishableToObject(arr, mergeWith) {
    var result = (arr || []).reduce(function (accum, topic) {
        accum[topic.name] = topic.value;
        return accum;
    }, $.extend(true, {}, mergeWith));
    return result;
}

/**
 * @typedef NormalizedParam
 * @property {Publishable[]} params
 * @property {Object} options
 */

/**
 *
 * @param {string|Object|Array} topic 
 * @param {*} publishValue 
 * @param {Object} [options]
 * @returns {NormalizedParam}
 */
export function normalizeParamOptions(topic, publishValue, options) {
    if (!topic) {
        return { params: [], options: {} };
    }
    if ($.isPlainObject(topic)) {
        return { params: objectToPublishable(topic), options: publishValue };
    }
    if (Array.isArray(topic)) {
        return { params: topic, options: publishValue };
    }
    return { params: [{ name: topic, value: publishValue }], options: options };
}
