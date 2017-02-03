exports.prefix = function prefix(prefix) {
    return function matchPrefix(topic) {
        return (topic.indexOf(prefix) === 0) ? prefix : false;
    };
};
exports.regex = function regex(regex) {
    return function matchRegex(topic) {
        var match = topic.match(regex);
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

