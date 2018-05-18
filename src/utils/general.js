import { uniqueId, random as _random, toArray } from 'lodash';

export function makePromise(val) {
    if (val.then) {
        return val;
    }
    return $.Deferred().resolve(val).promise();
}

export function random(prefix, min, max) {
    if (!min) {
        min = parseInt(uniqueId(), 10);
    }
    if (!max) {
        max = 100000; //eslint-disable-line no-magic-numbers
    }
    var rnd = _random(min, max, false) + '';
    if (prefix) {
        rnd = prefix + rnd;
    }
    return rnd;
}
export function debounceAndMerge(fn, debounceInterval, argumentsReducers) {
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
    return function () {
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
            var res = fn.apply(fn, argsToPass);
            if (res && res.then) {
                return res.then(function (arg) {
                    argsToPass = [];
                    $def.resolve(arg);
                }, $def.reject);
            } else {
                argsToPass = [];
                $def.resolve(res);
            }
        }, debounceInterval);
        prom.then(()=> {
            $def = prom = null;  
        }, ()=> {
            $def = prom = null;
        });
        return prom;
    };
}
