'use strict';

module.exports = {
    random: function (prefix, min, max) {
        if (!min) {
            min = parseInt(_.uniqueId(), 10);
        }
        if (!max) {
            max = 100000; //eslint-disable-line no-magic-numbers
        }
        var number = _.random(min, max, false) + '';
        if (prefix) {
            number = prefix + number;
        }
        return number;
    },
    debounceAndMerge: function (fn, debounceInterval, argumentsReducers) {
        var timer = null;

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
            var newArgs = _.toArray(arguments);
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
            timer = setTimeout(function () {
                timer = null;
                fn.apply(fn, argsToPass);
                argsToPass = [];
            }, debounceInterval);
        };
    }
};
