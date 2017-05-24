/**
 * ## Variables Channel
 *
 * Channels allow Flow.js to make requests of underlying APIs. The Variables Channel lets you track when model variables are updated. Specifically, the most common use cases for the Variables Channel are:
 *
 * * `publish`: Update a model variable: 
 *
 *       // using channel explicitly
 *       Flow.channel.variables.publish('myVariable', newValue);
 *
 *       // equivalent call using Flow.js custom HTML attributes
 *       <input type="text" data-f-bind="myVariable" value="newValue"></input>
 *
 * * `subscribe`: Receive notifications when a model variable is updated:
 *
 *       // use subscribe and a callback function 
 *       // to listen and react when a model variable has been updated
 *       Flow.channel.variables.subscribe('myVariable',
 *          function() { console.log('updated!'); } );
 *
 * See additional information on the [Channel Configuration Options and Methods](../../channel-manager/) page.
 */

import { debounceAndMerge } from 'utils/general';
import { objectToArray, arrayToObject } from 'channels/channel-utils';

export default function RunVariablesChannel($runServicePromise, notifier) {

    var id = _.uniqueId('variable-channel');

    var fetchFn = function (runService) {
        if (!runService.debouncedFetchers) {
            runService.debouncedFetchers = {};
        }
        var debounceInterval = 200; //todo: make this over-ridable
        if (!runService.debouncedFetchers[id]) {
            runService.debouncedFetchers[id] = debounceAndMerge(function (variables) {
                if (!variables || !variables.length) {
                    return $.Deferred().resolve([]).promise();
                }
                return runService.variables().query(variables).then(objectToArray);
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
        fetch: function () {
            return $runServicePromise.then(function (runService) {
                return fetchFn(runService)(knownTopics).then(notifier);
            });
        },

        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            knownTopics = remainingTopics;
        },
        subscribeHandler: function (topics) {
            return $runServicePromise.then(function (runService) {
                knownTopics = _.uniq(knownTopics.concat(topics));
                if (!knownTopics.length) {
                    return $.Deferred().resolve([]).promise();
                }
                return fetchFn(runService)(topics).then(notifier);
            });
        },
        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                var toSave = arrayToObject(topics);
                return runService.variables().save(toSave).then(function (response) {
                    return objectToArray(response);
                });
            });
        }
    };
}
