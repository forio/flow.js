import { debounceAndMerge } from 'utils/general';
import { objectToArray, arrayToObject } from 'channels/channel-utils';
import { uniqueId, uniq } from 'lodash';

/**
 * @param {number[]} subs 
 * @returns {Array}
 */
export function groupSubs(subs) {
    const grouped = subs.reduce((accum, sub, index)=> {
        if (index === 0) {
            accum.starting = sub;
        } else if ((accum.last + 1) !== sub) {
            //end last chain
            if (accum.starting === accum.last) {
                accum.soFar.push(`${accum.starting}`);
            } else {
                accum.soFar.push(`${accum.starting}..${accum.last}`);
            }

            if (index === subs.length - 1) {
                accum.soFar.push(`${sub}`);
            } else {
                accum.starting = sub;
            }
        } else if (index === subs.length - 1) {
            accum.soFar.push(`${accum.starting}..${sub}`);
        }
        accum.last = sub;
        return accum;

    }, { soFar: [], starting: null, last: null });
    return grouped.soFar;
}

export function optimizedFetch(variables) {
    const groupedBySubscripts = variables.reduce((accum, v)=> {
        const subscriptMatches = v.match(/\[\s*([^)]+?)\s*\]/);
        const vname = v.split('[')[0];
        if (subscriptMatches && subscriptMatches[1]) {
            const subscripts = subscriptMatches[1].split(/\s*,\s*/).map((subscript)=> {
                return parseInt(subscript.trim(), 10);
            });
            accum[vname] = subscripts;
        }
        return accum;
    }, {});

    const reducedVariables = variables.reduce((accum, v)=> {
        const vname = v.split('[')[0];
        const subs = groupedBySubscripts[vname];
        if (!groupedBySubscripts[vname]) {
            accum.push(vname);
        } else {
            const sortedSubs = subs.sort((a, b)=> {
                return a - b;
            });
            const groupedSubs = sortedSubs.reduce((accum, subs, index)=> {
                
            }, []);
        }
    }, []);
    /**
     * 
     */

}

export default function RunVariablesChannel($runServicePromise, notifier) {

    var id = uniqueId('variable-channel');

    var fetchFn = function (runService, debounceInterval) {
        if (!runService.debouncedFetchers) {
            runService.debouncedFetchers = {};
        }
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
                return uniq(accum.concat(newval)).filter((v)=> !!(v && v.trim()));
            }]);
        }
        return runService.debouncedFetchers[id];
    };
     

    var knownTopics = [];
    return { 
        fetch: function () {
            return $runServicePromise.then(function (runService) {
                return fetchFn(runService, 0)(knownTopics).then(notifier);
            });
        },

        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            knownTopics = remainingTopics;
        },
        subscribeHandler: function (topics, options) {
            var isAutoFetchEnabled = options.autoFetch;
            var debounceInterval = options.debounce;

            return $runServicePromise.then(function (runService) {
                knownTopics = uniq(knownTopics.concat(topics));
                if (!knownTopics.length) {
                    return $.Deferred().resolve([]).promise();
                } else if (!isAutoFetchEnabled) {
                    return $.Deferred().resolve(topics).promise();
                }
                return fetchFn(runService, debounceInterval)(topics).then(notifier);
            });
        },
        notify: function (variableObj) {
            return $runServicePromise.then(function (runService) {
                const variables = Object.keys(variableObj); 
                return runService.variables().query(variables).then(objectToArray).then(notifier);
            });
        },
        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                var toSave = arrayToObject(topics);
                return runService.variables().save(toSave).then(function (response) {
                    const variables = Object.keys(toSave); 
                    //Get the latest from the server because what you think you saved may not be what was saved
                    //bool -> 1, scalar to array for time-based models etc
                    //FIXME: This causes dupe requests, one here and one after fetch by the run-variables channel
                    //FIXME: Other publish can't do anything till this is done, so debouncing won't help. Only way out is caching
                    return runService.variables().query(variables).then(objectToArray);
                });
            });
        }
    };
}
