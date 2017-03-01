var CHANNEL_DELIMITER = ':';

exports.stripSuffixDelimiter = function stripSuffixDelimiter(text) {
    if (text && text.indexOf(CHANNEL_DELIMITER) === (text.length - 1)) {
        text = text.replace(CHANNEL_DELIMITER, '');
    }
    return text;
};

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
    var toMatch = new RegExp('^' + regex + CHANNEL_DELIMITER);
    return function matchRegex(topic) {
        var match = topic.match(toMatch);
        if (match) {
            return match[0];
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
        var mapped = mapWithPrefix(data, prefix);
        return callback(mapped);
    };
};

exports.unprefix = function (list, prefix) {
    return list.map(function (item) {
        if (item.name) {
            item.name = item.name.replace(prefix, '');
        } else {
            item = item.replace(prefix, '');
        }
        return item;
    });
};

exports.mapWithPrefix = mapWithPrefix;

