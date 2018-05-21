var CHANNEL_DELIMITER = ':';

/**
 * 
 * @param {string} prefix
 * @returns {matchFunction}
 */
export function matchPrefix(prefix) {
    return function prefixMatcher(topic) {
        const hasPrefix = topic.indexOf(prefix) === 0;
        if (hasPrefix) return prefix;

        const isOnlyPrefix = prefix.replace(/:/g, '') === topic;
        if (isOnlyPrefix) return topic;

        return false;
    };
}

/**
* 
* @param {string} prefix
* @returns {matchFunction}
*/
export function matchDefaultPrefix(prefix) {
    return function defaultPrefixMatcher(topic, forcePrefix) {
        const hasPrefix = topic.indexOf(prefix) === 0;
        return (hasPrefix || forcePrefix) ? prefix : '';
    };
}

/**
 * 
 * @param {string} regex
 * @returns {matchFunction}
 */
export function matchRegex(regex) {
    var toMatch = new RegExp('^' + regex + CHANNEL_DELIMITER);
    return function regexMatcher(topic) {
        var match = topic.match(toMatch);
        if (match && match.length) {
            return match[0];
        }
        return false;
    };
}

