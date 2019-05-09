import { debounceAndMerge } from 'utils/general';
import { objectToPublishable, publishableToObject } from 'channels/channel-utils';
import { uniqueId, uniq, difference } from 'lodash';
import { retriableFetch } from './retriable-variable-fetch';
// import { optimizedFetch } from './optimized-variables-fetch';

function mergeVariables(accum, newval) {
    if (!accum) {
        accum = [];
    }
    const merged = uniq(accum.concat(newval)).filter((v)=> !!(v && v.trim()));
    // console.log(merged, 'merged');
    return merged;
}

export default function RunVariablesRouteHandler($runServicePromise, notifier) {
    const id = uniqueId('variable-route-handler');

    function debouncedVariableQuery(runService, debounceInterval) {
        if (!runService.debouncedFetchers) {
            runService.debouncedFetchers = {};
        }
        if (!runService.debouncedFetchers[id]) {
            runService.debouncedFetchers[id] = debounceAndMerge(function (variables) {
                return retriableFetch(runService, variables);
            }, debounceInterval, [mergeVariables]);
        }
        return runService.debouncedFetchers[id];
    }

    let knownTopics = [];
    return { 
        /**
         * @param {{exclude:? boolean}} options 
         * @returns {Promise}
         */
        fetch: function (options) {
            const opts = $.extend({ exclude: [] }, options);
            return $runServicePromise.then(function (runService) {
                const variablesToFetch = difference([].concat(knownTopics), opts.exclude);
                if (!variablesToFetch.length) {
                    return [];
                }
                return retriableFetch(runService, [].concat(variablesToFetch)).then(objectToPublishable).then(notifier);
            });
        },

        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            knownTopics = knownTopics.filter((t)=> {
                const isUnsubscribed = unsubscribedTopics.indexOf(t) !== -1;
                const isRemaining = remainingTopics.indexOf(t) !== -1;
                return !isUnsubscribed || isRemaining;
            });
        },
        subscribeHandler: function (topics, options) {
            // console.log('subscribe', JSON.stringify(topics));
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
        /**
         * 
         * @param {Publishable[]} variableData
         */
        notify: function (variableData) {
            return $runServicePromise.then(function (runService) {
                const variables = variableData.map((v)=> v.name);
                //Need to fetch again because for Vensim, i'm notified about the Current value, while i need the value over time
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
                    return retriableFetch(runService, variables).then(objectToPublishable);
                });
            });
        }
    };
}
