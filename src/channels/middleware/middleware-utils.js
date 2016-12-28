exports.prefix = function prefix(prefix) {
    return function match(topic) {
        return (topic.indexOf(prefix) === 0) ? prefix : false;
    };
};

exports.mapWithPrefix = function mapWithPrefix(obj, prefix) {
    return Object.keys(obj).reduce(function (accum, key) {
        accum[prefix + key] = obj[key];
        return accum;
    }, {});
};
