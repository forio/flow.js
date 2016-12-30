var debounceAndMerge = require('utils/general').debounceAndMerge;

module.exports = function () {

    var id = _.uniqueId('variable-channel');

    var fetchFn = function (runService) {
        if (!runService.debouncedFetchers) {
            runService.debouncedFetchers = {};
        }
        if (!runService.debouncedFetchers[id]) {
            runService.debouncedFetchers[id] = debounceAndMerge(function (variables) {
                return runService.variables().query(variables);
            }, 200, [function mergeVariables(accum, newval) {
                if (!accum) {
                    accum = [];
                }
                return _.uniq(accum.concat(newval));
            }]);
        }
        return runService.debouncedFetchers[id];
    };
     

    var knownTopics = [];
    return { 
        fetch: function (runService, callback) {
            return fetchFn(runService)(knownTopics);
        },

        unsubscribeHandler: function (remainingTopics) {
            knownTopics = remainingTopics;
        },
        subscribeHandler: function (runService, topics) {
            knownTopics = _.uniq(knownTopics.concat(topics));
            if (!knownTopics.length) {
                return $.Deferred().resolve({}).promise();
            }
            return fetchFn(runService)(topics);
        },
        publishHandler: function (runService, toSave, options) {
            return runService.variables().save(toSave);
        }
    };
};
