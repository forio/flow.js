import { debounceAndMerge } from 'utils/general';
import { objectToArray, arrayToObject } from 'channels/channel-utils';

export default function RunVariablesChannel($runServicePromise, notifier) {

    var id = _.uniqueId('variable-channel');

    // var fetchFn = function (runService) {
    //     if (!runService.debouncedFetchers) {
    //         runService.debouncedFetchers = {};
    //     }
    //     var debounceInterval = 200; //todo: make this over-ridable
    //     if (!runService.debouncedFetchers[id]) {
    //         runService.debouncedFetchers[id] = debounceAndMerge(function (variables) {
    //             return runService.variables().query(variables).then(objectToArray);
    //         }, debounceInterval, [function mergeVariables(accum, newval) {
    //             if (!accum) {
    //                 accum = [];
    //             }
    //             return _.uniq(accum.concat(newval));
    //         }]);
    //     }
    //     return runService.debouncedFetchers[id];
    // };
     

    var knownTopics = [];
    return { 
        fetch: function () {
            return Promise.resolve([]);

            // return $runServicePromise.then(function (runService) {
            //     return fetchFn(runService)(knownTopics).then(notifier);
            // });
        },

        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            console.log('unsubs');
            // knownTopics = remainingTopics;
        },
        subscribeHandler: function (topics) {
            console.log('subscribing', topics);
            return Promise.resolve(topics);
            // return $runServicePromise.then(function (runService) {
            //     knownTopics = _.uniq(knownTopics.concat(topics));
            //     if (!knownTopics.length) {
            //         return $.Deferred().resolve([]).promise();
            //     }
            //     return fetchFn(runService)(topics).then(notifier);
            // });
        },
        publishHandler: function (topics, options) {
            console.log('publishHandler', topics);

            return Promise.resolve(topics);
            // return $runServicePromise.then(function (runService) {
            //     var toSave = arrayToObject(topics);
            //     return runService.variables().save(toSave).then(function (response) {
            //         return objectToArray(response);
            //     });
            // });
        }
    };
}
