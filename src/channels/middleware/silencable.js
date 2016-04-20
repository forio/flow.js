module.exports = function (published, options) {
    var silent = options.silent;
    if (silent === true || !published) {
        return {};
    }
    if (_.isArray(silent)) {
        silent.forEach(function (name) {
            delete published[name];
        });
        return published;
    } else if ($.isPlainObject(silent)) {
        return Object.keys(published).reduce(function (accum, name) {
            if (!_.includes(silent, name)) {
                accum[name] = published[name];
            }
            return accum;
        }, {});
    }
    return published;
};
