import { debounceAndMerge } from 'utils/general';
import { objectToArray, arrayToObject } from 'channels/channel-utils';
import { withPrefix } from 'channels/middleware/utils';

export default function RunVariablesChannel(options, notifier) {
    var runService = new F.service.Run(options.serviceOptions.run);
    // var id = _.uniqueId('variable-channel');

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
            var parsedTopics = ([].concat(topics)).map((t)=> {
                return t.replace('(', '').replace(')', '');
            });
            return runService.query(';' + parsedTopics[0]).then((runs)=> {
                return notifier([{ name: topics[0], value: runs }]);
                // return withPrefix(notifier, topics[0])(runs);
            });
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
