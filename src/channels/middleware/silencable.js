module.exports = function (published, options) {
    var silent = options.silent;
    var shouldSilence = silent === true;
    if (_.isArray(silent) && published) {
        shouldSilence = _.intersection(silent, published).length >= 1;
    }
    if ($.isPlainObject(silent) && published) {
        shouldSilence = _.intersection(silent.except, published).length !== published.length;
    }
    return shouldSilence;
};
