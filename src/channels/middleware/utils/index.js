var CHANNEL_DELIMITER = ':';

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
 * @param {string} prefix
 * @returns {matchFunction}
 */
export function prefix(prefix) {
    return function matchPrefix(topic) {
        return (topic.indexOf(prefix) === 0) ? prefix : false;
    };
}

/**
* 
* @param {string} prefix
* @returns {matchFunction}
*/
export function defaultPrefix(prefix) {
    return function matchPrefix(topic) {
        return prefix;
    };
}

/**
 * 
 * @param {string} regex
 * @returns {matchFunction}
 */
export function regex(regex) {
    var toMatch = new RegExp('^' + regex + CHANNEL_DELIMITER);
    return function matchRegex(topic) {
        var match = topic.match(toMatch);
        if (match && match.length) {
            return match[0];
        }
        return false;
    };
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
        return $.extend(true, {}, datapt, { name: prefix + datapt.name });
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
            var mapped = mapWithPrefix(data, prefix);
            callback(mapped);
        });
    };
}

/**
 * 
 * @param {Publishable[]} list 
 * @param {string} prefix
 * @return {Publishable[]} Item with prefix removed
 */
export function unprefix(list, prefix) {
    if (!prefix) return list;
    var unprefixed = list.map(function (item) {
        if (item.name) {
            return $.extend(true, {}, item, { name: item.name.replace(prefix, '') });
        }
        return item.replace(prefix, '');
    });
    return unprefixed;
}
