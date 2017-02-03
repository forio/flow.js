var CHANNEL_DELIMITER = ':';
function addSuffixDelimiter(text) {
    if (text && text.indexOf(CHANNEL_DELIMITER) !== (text.length - 1)) {
        text = text + CHANNEL_DELIMITER;
    }
    return text || '';
}

exports.prefix = function prefix(prefix) {
    prefix = addSuffixDelimiter(prefix);
    return function matchPrefix(topic) {
        return (topic.indexOf(prefix) === 0) ? prefix : false;
    };
};
exports.regex = function regex(regex) {
    return function matchRegex(topic) {
        var match = topic.match(regex);
        if (match) {
            return match[0].replace(CHANNEL_DELIMITER, '');
        }
        return false;
    };
};


function mapWithPrefix(obj, prefix) {
    if (!obj) {
        return {};
    }
    prefix = addSuffixDelimiter(prefix);
    return Object.keys(obj).reduce(function (accum, key) {
        accum[prefix + key] = obj[key];
        return accum;
    }, {});
}

exports.withPrefix = function withPrefix(callback, prefix) {
    return function (data) {
        return callback(mapWithPrefix(data, prefix));
    };
};

exports.mapWithPrefix = mapWithPrefix;

