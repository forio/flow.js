import { debounceAndMerge } from 'utils/general';
import { objectToPublishable, publishableToObject } from 'channels/channel-utils';
import { uniqueId, uniq, difference } from 'lodash';
import { retriableFetch } from './retriable-variable-fetch';
// import { optimizedFetch } from './optimized-variables-fetch';

export default function RunVariablesRouteHandler($runServicePromise, notifier) {
    const id = uniqueId('variable-route-handler');

    function debouncedVariableQuery(runService, debounceInterval) {
        if (!runService.debouncedFetchers) {
            runService.debouncedFetchers = {};
        }
        if (!runService.debouncedFetchers[id]) {
            runService.debouncedFetchers[id] = debounceAndMerge(function (variables) {
                return retriableFetch(runService, variables);
            }, debounceInterval, [function mergeVariables(accum, newval) {
                if (!accum) {
                    accum = [];
                }
                return uniq(accum.concat(newval)).filter((v)=> !!(v && v.trim()));
            }]);
        }
        return runService.debouncedFetchers[id];
    }

    let knownTopics = [];
    return { 
        fetch: function () {
            return $runServicePromise.then(function (runService) {
                return retriableFetch(runService, [].concat(knownTopics)).then(objectToPublishable).then(notifier);
            });
        },

        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            knownTopics = knownTopics.filter((t)=> unsubscribedTopics.indexOf(t) === -1);
        },
        subscribeHandler: function (topics, options) {
            const isAutoFetchEnabled = options.autoFetch;
            const debounceInterval = options.debounce;

            return $runServicePromise.then(function (runService) {
                knownTopics = uniq(knownTopics.concat(topics));
                if (!knownTopics.length) {
                    return $.Deferred().resolve([]).promise();
                } else if (!isAutoFetchEnabled) {
                    return $.Deferred().resolve(topics).promise();
                }
                return debouncedVariableQuery(runService, debounceInterval)(topics).then((response)=> {
                    const missingVariables = difference(topics, Object.keys(response));
                    if (missingVariables.length) {
                        return $.Deferred().reject({
                            context: missingVariables,
                            message: `Missing variables: ${missingVariables.join(',')}`
                        }).promise();
                    }
                    return response;
                });
            });
        },
        notify: function (variableObj) {
            return $runServicePromise.then(function (runService) {
                const variables = Object.keys(variableObj); 
                return retriableFetch(runService, variables).then(objectToPublishable).then(notifier);
            });
        },
        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                const toSave = publishableToObject(topics);
                return runService.variables().save(toSave).then(function (response) {
                    const variables = Object.keys(toSave); 
                    //Get the latest from the server because what you think you saved may not be what was saved
                    //bool -> 1, scalar to array for time-based models etc
                    //FIXME: This causes dupe requests, one here and one after fetch by the run-variables channel
                    //FIXME: Other publish can't do anything till this is done, so debouncing won't help. Only way out is caching
                    return retriableFetch(runService, variables).then(objectToPublishable);
                });
            });
        }
    };
}
