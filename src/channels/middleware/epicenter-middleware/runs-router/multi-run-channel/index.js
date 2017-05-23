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
            var commaRegex = /,(?![^[]*])/;
            var params = ([].concat(topics)).reduce((accum, t)=> {
                var [filter, variables] = t.split(')(');

                filter = filter.replace('(', '').replace(')', '');
                var [key, val] = filter.split('=');
                accum.filter[key] = val;

            
                variables = variables.replace('(', '').replace(')', '');
                accum.variables = variables.split(commaRegex);
                return accum;
            }, { filter: {}, variables: [] });
            return runService.query(params.filter, { include: params.variables }).then((runs)=> {
                return notifier([{ name: topics[0], value: runs }]);
            });
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
