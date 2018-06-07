import { debounceAndMerge } from 'utils/general';
import { objectToPublishable, publishableToObject } from 'channels/channel-utils';
import { uniqueId, uniq } from 'lodash';

/**
 * @param {number[]} subscripts 
 * @returns {number[]}
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
    const MODEL_EXTENSIONS_SUPPORTING_OPTIMIZATION = ['xls', 'xlsx'];
    const config = runService.getCurrentConfig();
    const modelExtension = config.model && (config.model.toLowerCase()).split('.').pop();
    // const canOptimize = !!(MODEL_EXTENSIONS_SUPPORTING_OPTIMIZATION.find((e)=> e === modelExtension));
    // FIXME: this is not fully thought through yet; for e.g. don't think this handles cases with Price[1..2] as the input
    // Revisit after EPICENTER-3493 is done
    const canOptimize = false;
    if (!canOptimize) {
        if (!variables || !variables.length) {
            return $.Deferred().resolve([]).promise();
        }
        return runService.variables().query(variables);
    }

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

    const id = uniqueId('variable-channel');

    function debouncedVariableQuery(runService, debounceInterval) {
        if (!runService.debouncedFetchers) {
            runService.debouncedFetchers = {};
        }
        if (!runService.debouncedFetchers[id]) {
            runService.debouncedFetchers[id] = debounceAndMerge(function (variables) {
                return optimizedFetch(runService, variables);
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
                return optimizedFetch(runService, [].concat(knownTopics)).then(objectToPublishable).then(notifier);
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
                return debouncedVariableQuery(runService, debounceInterval)(topics);
            });
        },
        notify: function (variableObj) {
            return $runServicePromise.then(function (runService) {
                const variables = Object.keys(variableObj); 
                return optimizedFetch(runService, variables).then(objectToPublishable).then(notifier);
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
                    return optimizedFetch(runService, variables);
                });
            });
        }
    };
}
