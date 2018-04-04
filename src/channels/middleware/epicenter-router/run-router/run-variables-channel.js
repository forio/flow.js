import { debounceAndMerge } from 'utils/general';
import { objectToPublishable, publishableToObject } from 'channels/channel-utils';
import { uniqueId, uniq } from 'lodash';

/**
 * @param {number[]} subscripts 
 * @returns {number[][]}
 */
export function groupByContigousArrayItems(subscripts) {
    if (subscripts.length === 1) {
        return [subscripts];
    }
    const grouped = subscripts.reduce((accum, thisSub, index)=> {
        if (index === 0) {
            accum.last = [thisSub];
            return accum;
        } 
        
        const last = accum.last[accum.last.length - 1];
        if ((last + 1) !== thisSub) {
            accum.soFar.push(accum.last);
            accum.last = [thisSub];

            if (index === subscripts.length - 1) {
                accum.soFar.push([thisSub]);
            }
        } else {
            accum.last.push(thisSub);
            if (index === subscripts.length - 1) {
                accum.soFar.push(accum.last);
            }
        }
        return accum;

    }, { soFar: [], last: [] });
    return grouped.soFar;
}

//FIXME: this doesn' do multiple subs
export function groupVariableBySubscripts(variables) {
    const groupedBySubscripts = variables.reduce((accum, v)=> {
        const subscriptMatches = v.match(/\[\s*([^)]+?)\s*\]/);
        const vname = v.split('[')[0];
        if (subscriptMatches && subscriptMatches[1]) {
            const subscripts = subscriptMatches[1].split(/\s*,\s*/).map((subscript)=> {
                return parseInt(subscript.trim(), 10);
            });
            accum[vname] = (accum[vname] || []).concat(subscripts);
        } else {
            accum[vname] = [];
        }
        return accum;
    }, {});
    return groupedBySubscripts;
}

export function optimizedFetch(runService, variables) {
    const groupedBySubscripts = groupVariableBySubscripts(variables);

    const reducedVariables = variables.reduce((accum, v)=> {
        const vname = v.split('[')[0];
        const subs = groupedBySubscripts[vname];
        if (!groupedBySubscripts[vname].length) {
            accum.regular.push(vname);
        } else {
            const sortedSubs = subs.sort((a, b)=> {
                return a - b;
            });
            const groupedSubs = groupByContigousArrayItems(sortedSubs);
            groupedSubs.forEach((grouping)=> {
                const subs = grouping.length === 1 ? grouping[0] : `${grouping[0]}..${grouping[grouping.length - 1]}`;
                accum.grouped[`${vname}[${subs}]`] = grouping;
            });
        }
        return accum;
    }, { regular: [], grouped: {} });

    const toFetch = [].concat(reducedVariables.regular, Object.keys(reducedVariables.grouped));
    return runService.variables().query(toFetch).then((values)=> {
        const deparsed = Object.keys(values).reduce((accum, vname)=> {
            const groupedSubs = reducedVariables.grouped[vname];
            if (!groupedSubs) {
                accum[vname] = values[vname];
            } else {
                groupedSubs.forEach((subscript, index)=> {
                    const v = vname.split('[')[0];
                    accum[`${v}[${subscript}]`] = [].concat(values[vname])[index];
                });
            }
            return accum;
        }, {});
        return deparsed; 
    });
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
                return optimizedFetch(runService, variables).then(objectToPublishable);
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
                return runService.variables().query(variables).then(objectToPublishable).then(notifier);
            });
        },
        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                var toSave = publishableToObject(topics);
                return runService.variables().save(toSave).then(function (response) {
                    const variables = Object.keys(toSave); 
                    //Get the latest from the server because what you think you saved may not be what was saved
                    //bool -> 1, scalar to array for time-based models etc
                    //FIXME: This causes dupe requests, one here and one after fetch by the run-variables channel
                    //FIXME: Other publish can't do anything till this is done, so debouncing won't help. Only way out is caching
                    return runService.variables().query(variables).then(objectToPublishable);
                });
            });
        }
    };
}
