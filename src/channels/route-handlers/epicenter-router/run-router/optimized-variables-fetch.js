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
        return runService.variables().query(variables).catch((e)=> {
            throw e.responseJSON;
        });
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
