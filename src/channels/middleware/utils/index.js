var CHANNEL_DELIMITER = ':';

export { default as silencable } from './silencable';

export function stripSuffixDelimiter(text) {
    if (text && text.indexOf(CHANNEL_DELIMITER) === (text.length - 1)) {
        text = text.replace(CHANNEL_DELIMITER, '');
    }
    return text;
}

function addSuffixDelimiter(text) {
    if (text && text.indexOf(CHANNEL_DELIMITER) !== (text.length - 1)) {
        text = text + CHANNEL_DELIMITER;
    }
    return text || '';
}

export function prefix(prefix) {
    prefix = addSuffixDelimiter(prefix);
    return function matchPrefix(topic) {
        return (topic.indexOf(prefix) === 0) ? prefix : false;
    };
}
export function regex(regex) {
    var toMatch = new RegExp('^' + regex + CHANNEL_DELIMITER);
    return function matchRegex(topic) {
        var match = topic.match(toMatch);
        if (match) {
            return match[0];
        }
        return false;
    };
}


export function mapWithPrefix(dataArray, prefix) {
    if (!prefix) return dataArray;
    return (dataArray || []).map(function (datapt) {
        return $.extend(true, {}, datapt, { name: prefix + datapt.name });
    });
}

export function withPrefix(callback, prefix) {
    return function (data) {
        var mapped = mapWithPrefix(data, prefix);
        return callback(mapped);
    };
}

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
