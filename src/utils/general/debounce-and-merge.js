import { toArray } from 'lodash';
import { promisify } from './promise-utils';

/**
 * Returns debounced version of original (optionally promise returning) function
 * 
 * @param {function(*):Promise} fn function to debounce
 * @param {number} debounceInterval 
 * @param {Function[]} [argumentsReducers] pass in 1 reducer for each option your function takes
 * @returns {Function} debounced function
 */
export default function debounceAndMerge(fn, debounceInterval, argumentsReducers) {
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

    const queue = [];

    let timer = null;
    let isExecuting = false;
    let $def = $.Deferred();
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

        if (isExecuting || $def.isComplete) {
            $def = $.Deferred();
        }
        if (timer && !isExecuting) {
            clearTimeout(timer);//caught within debounce period, reuse old deferred
        } else {
            queue.push($def);
        }
        
        timer = setTimeout(()=> {
            isExecuting = true;
            timer = null;

            const argsClone = [].concat(argsToPass);
            argsToPass = [];

            const promisifiedFn = promisify(fn);
            promisifiedFn.apply(fn, argsClone).then((args)=> {
                isExecuting = false;
                const $def = queue.shift();
                $def.isComplete = true;
                return $def.resolve(args);
            }, (e)=> {
                isExecuting = false;
                const $def = queue.shift();
                $def.isComplete = true;
                return $def.reject(e);
            });
        }, debounceInterval);
        const prom = $def.promise();

        return prom;
    };
}
