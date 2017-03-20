import { debounceAndMerge } from 'utils/general';

export default function SavedRunsVariablesChannel(savedRunsService, notifier) {

    var id = _.uniqueId('variable-channel');

    var fetchFn = function (savedRunsService) {
        if (!savedRunsService.debouncedFetchers) {
            savedRunsService.debouncedFetchers = {};
        }
        var debounceInterval = 200; //todo: make this over-ridable
        if (!savedRunsService.debouncedFetchers[id]) {
            savedRunsService.debouncedFetchers[id] = debounceAndMerge(function (variables) {
                return savedRunsService.getRuns([].concat(variables)).then(function (result) {
                    return [{ name: variables, value: result }];
                });
            }, debounceInterval, [function mergeVariables(accum, newval) {
                if (!accum) {
                    accum = [];
                }
                return _.uniq(accum.concat(newval));
            }]);
        }
        return savedRunsService.debouncedFetchers[id];
    };
     

    var knownTopics = [];
    return { 
        fetch: function () {
            return fetchFn(savedRunsService)(knownTopics).then(notifier);
        },

        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            knownTopics = remainingTopics;
        },
        subscribeHandler: function (topics) {
            knownTopics = _.uniq(knownTopics.concat(topics));
            if (!knownTopics.length) {
                return $.Deferred().resolve([]).promise();
            }
            return fetchFn(savedRunsService)(topics).then(notifier);
        },
        publishHandler: function (topics, options) {
            console.warn('Saved variables are read-only');
            return [];
        }
    };
}
