var debounceAndMerge = require('utils/general').debounceAndMerge;

//TODO: None of this is scoped by run...
var debouncedFetch = debounceAndMerge(function (variables, runService, callback) {
    runService.variables().query(variables).then(callback);
}, 200, [function mergeVariables(accum, newval) {
    if (!accum) {
        accum = [];
    }
    return _.uniq(accum.concat(newval));
}]);

var knownTopics = [];
exports.fetch = function (runservice, callback) {
    debouncedFetch(knownTopics, runservice, callback);
};
exports.subscribeHandler = function (topics, runservice, runData, callback) {
    knownTopics = _.uniq(knownTopics.concat(topics));
    debouncedFetch(topics, runservice, callback);
};


exports.publishHander = function (runservice, toSave, options) {
    return runservice.variables().save(toSave);
};
