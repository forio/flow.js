import { promisify } from './promise-utils';

function executeAndResolve(fn, args, $def) {
    const promisifiedFn = promisify(fn);
    return promisifiedFn.apply(fn, args).then((result)=> {
        $def.resolve(result);
    }, (e)=> {
        $def.reject(e);
    });
}

/**
 * Returns debounced version of original (optionally promise returning) function
 * 
 * @param {function(*):Promise} fn function to debounce
 * @param {number} debounceInterval 
 * @param {Function[]} [argumentsReducers] pass in 1 reducer for each option your function takes
 * @returns {Function} debounced function
 */
export default function debounceAndMerge(fn, debounceInterval, argumentsReducers) {
    if (!argumentsReducers) {
        var arrayReducer = function (accum, newVal) {
            return (accum || []).concat(newVal);
        };
        argumentsReducers = [arrayReducer];
    }

    const queue = [];
    let timer = null;

    function mergeArgs(oldArgs, newArgs) {
        const merged = newArgs.map(function (newArg, index) {
            var reducer = argumentsReducers[index];
            if (reducer) {
                return reducer(oldArgs[index], newArg);
            }
            return newArg;
        });
        return merged;
    }

    /**
     * @returns {Promise}
     */
    return function debouncedFunction() {
        const newArgs = Array.prototype.slice.call(arguments);
        if (timer) {
            clearTimeout(timer);
            const mergedArgs = mergeArgs(queue[0].args, newArgs);
            queue[0].args = mergedArgs;
        } else {
            const args = mergeArgs([], newArgs);
            queue.push({
                $def: $.Deferred(),
                args: args
            });
        }

        timer = setTimeout(()=> {
            timer = null;
            const item = queue.pop();
            executeAndResolve(fn, item.args, item.$def);
        }, debounceInterval);

        return queue[0].$def.promise();
    };
}