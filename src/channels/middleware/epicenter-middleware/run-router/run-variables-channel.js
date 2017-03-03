var debounceAndMerge = require('utils/general').debounceAndMerge;

module.exports = function ($runServicePromise, notifier) {

    var id = _.uniqueId('variable-channel');

    var fetchFn = function (runService) {
        if (!runService.debouncedFetchers) {
            runService.debouncedFetchers = {};
        }
        var debounceInterval = 200; //todo: make this over-ridable
        if (!runService.debouncedFetchers[id]) {
            runService.debouncedFetchers[id] = debounceAndMerge(function (variables) {
                return runService.variables().query(variables);
            }, debounceInterval, [function mergeVariables(accum, newval) {
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

        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            knownTopics = remainingTopics;
        },
        subscribeHandler: function (topics) {
            return $runServicePromise.then(function (runService) {
                knownTopics = _.uniq(knownTopics.concat(topics));
                if (!knownTopics.length) {
                    return $.Deferred().resolve({}).promise();
                }
                return fetchFn(runService)(topics).then(notifier);
            });
        },
        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                var toSave = topics.reduce(function (accum, topic) {
                    accum[topic.name] = topic.value;
                    return accum;
                }, {});
                return runService.variables().save(toSave);
            });
        }
    };
};
