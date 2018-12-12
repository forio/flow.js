import { toArray } from 'lodash';
import { promisify } from './promise-utils';

/**
 * Returns debounced version of original (optionally promise returning) function
 * 
 * @param {function(*):Promise} fn function to debounce
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

    const startTime = Date.now();
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
            console.log('Start executing fn', Date.now() - startTime);

            timer = null;

            const promisifiedFn = promisify(fn);
            promisifiedFn.apply(fn, argsToPass).then((arg)=> {
                argsToPass = [];
                $def.resolve(arg);
            }, (e)=> {
                argsToPass = [];
                $def.reject(e);
            });
        }, debounceInterval);
        prom = prom.then((r)=> {
            console.log('nullify prom', Date.now() - startTime);

            $def = prom = null; 
            return r; 
        }, (err)=> {
            $def = prom = null;
            throw err;
        });
        return prom;
    };
}
