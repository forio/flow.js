const CHANNEL_DELIMITER = ':';

export { default as silencable } from './silencable';
export { default as excludeReadOnly } from './exclude-read-only';

/**
 * 
 * @param {string} text
 * @return {string}
 */
export function stripSuffixDelimiter(text) {
    if (text && text.indexOf(CHANNEL_DELIMITER) === (text.length - 1)) {
        text = text.replace(CHANNEL_DELIMITER, '');
    }
    return text;
}

/**
 * 
 * @param {Publishable[]} dataArray 
 * @param {string} prefix 
 * @return {Publishable[]} array with name prefixed
 */
export function mapWithPrefix(dataArray, prefix) {
    if (!prefix) return dataArray;
    return (dataArray || []).map(function (datapt) {
        const name = (prefix + datapt.name).replace(/:$/, ''); //replace trailing delimiters
        return $.extend(true, {}, datapt, { name: name });
    });
}

/**
 * 
 * @param {Function} callback 
 * @param {string|string[]} prefixList
 * @return {Function}
 */
export function withPrefix(callback, prefixList) {
    const arr = [].concat(prefixList);

    /**
     * @param {Publishable[]} data
     */
    return function (data) {
        arr.forEach(function (prefix) {
            const mapped = mapWithPrefix(data, prefix);
            callback(mapped);
        });
    };
}

/**
 * 
 * @param {string[]} list 
 * @param {string} prefix
 * @return {string[]} Item with prefix removed
 */
export function unprefixTopics(list, prefix) {
    if (!prefix) return list;
    const unprefixed = list.map(function (item) {
        return item.replace(prefix, '');
    });
    return unprefixed;
}

/**
 * 
 * @param {Publishable[]} list 
 * @param {string} prefix
 * @return {Publishable[]} Item with prefix removed
 */
export function unprefix(list, prefix) {
    if (!prefix) return list;
    const unprefixed = list.map(function (item) {
        if (item.name) {
            return $.extend(true, {}, item, { name: item.name.replace(prefix, '') });
        }
        return item.replace(prefix, '');
    });
    return unprefixed;
}
