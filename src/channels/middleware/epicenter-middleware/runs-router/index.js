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
     

    var topicParamMap = {};

    function extractFromTopic(topicString) {
        var commaRegex = /,(?![^[]*])/;
        var [filters, variables] = topicString.split(')(');

        filters = filters.replace('(', '').replace(')', '');
        var filterParam = filters.split(';').reduce((accum, filter)=> {
            var [key, val] = filter.split('=');
            accum[key] = val;
            return accum;
        }, {});

        variables = variables.replace('(', '').replace(')', '');
        variables = variables.split(commaRegex);

        return { filter: filterParam, variables: variables };
    }

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
            var topic = ([].concat(topics))[0];
            var params = extractFromTopic(topic);
            topicParamMap[topic] = true;

            return runService.query(params.filter, { include: params.variables }).then((runs)=> {
                return notifier([{ name: topic, value: runs }]);
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
