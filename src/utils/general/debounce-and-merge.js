import { toArray } from 'lodash';

/**
 * Returns debounced version of original (optionally promise returning) function
 * 
 * @param {Function} fn function to debounce
 * @param {number} debounceInterval 
 * @param {Function[]} [argumentsReducers] pass in 1 reducer for each option your function takes
 * @return {Function} debounced function
 */
export default function debounceAndMerge(fn, debounceInterval, argumentsReducers) {
    var timer = null;
    var $def = null;
    var prom = null;

    var argsToPass = [];
    if (!argumentsReducers) {
        var arrayReducer = function (accum, newVal) {
            if (!accum) {
                accum = [];
            }
            return accum.concat(newVal);
        };
        argumentsReducers = [
            arrayReducer
        ];
    }

    /**
     * @returns {Promise}
     */
    return function debouncedFunction() {
        var newArgs = toArray(arguments);
        argsToPass = newArgs.map(function (arg, index) {
            var reducer = argumentsReducers[index];
            if (reducer) {
                return reducer(argsToPass[index], arg);
            } else {
                return arg;
            }
        });
        if (timer) {
            clearTimeout(timer);
        }

        if (!$def) {
            $def = $.Deferred();
            prom = $def.promise();
        }
        timer = setTimeout(function () {
            timer = null;
            var res;
            try {
                res = fn.apply(fn, argsToPass);
            } catch (e) {
                argsToPass = [];
                $def.reject(e);
            }
            if (res && res.then) {
                return res.then(function (arg) {
                    argsToPass = [];
                    $def.resolve(arg);
                }, (e)=> {
                    argsToPass = [];
                    $def.reject(e);
                });
            } else {
                argsToPass = [];
                $def.resolve(res);
            }
        }, debounceInterval);
        prom.then((r)=> {
            $def = prom = null; 
            return r; 
        }, (err)=> {
            $def = prom = null;
            throw err;
        });
        return prom;
    };
}
