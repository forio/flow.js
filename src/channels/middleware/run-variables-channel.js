var debounceAndMerge = require('utils/general').debounceAndMerge;

module.exports = function () {

    var fetchFn = function (runService) {
        var debounced = runService.patchedFetch ? runService.patchedFetch : runService.patchedFetch = debounceAndMerge(function (variables) {
            return runService.variables().query(variables);
        }, 200, [function mergeVariables(accum, newval) {
            if (!accum) {
                accum = [];
            }
            return _.uniq(accum.concat(newval));
        }]);

        return debounced;
    };
     

    var knownTopics = [];
    return { 
        fetch: function (runService, callback) {
            return fetchFn(runService)(knownTopics);
        },
        subscribeHandler: function (runService, topics) {
            knownTopics = _.uniq(knownTopics.concat(topics));
            return fetchFn(runService)(topics);
        },
        publishHander: function (runService, toSave, options) {
            return runService.variables().save(toSave);
        }
    };
};
