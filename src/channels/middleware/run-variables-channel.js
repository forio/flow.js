var debounceAndMerge = require('utils/general').debounceAndMerge;
var VARIABLES_PREFIX = 'variable:';

var debouncedFetch = debounceAndMerge(function (variables, runService, notifyCallback) {
    runService.variables().query(variables).then(function (result) {
        var toNotify = _.reduce(result, function (accum, value, variable) {
            var key = VARIABLES_PREFIX + variable;
            accum[key] = value;
            return accum;
        }, {});
        notifyCallback(toNotify);
    });
}, 200, [function mergeVariables(accum, newval) {
    if (!accum) {
        accum = [];
    }
    return _.uniq(accum.concat(newval));
}]);

exports.subscribeHandler = function (topics, options, runservice, runData, notifier) {
    debouncedFetch(topics, runservice, notifier);
};


exports.publishHander = function (runservice, toSave, options) {
    return runservice.variables().save(toSave);
};
