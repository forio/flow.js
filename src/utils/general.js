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
    debounceWithStore: function (fn, debounceInterval, argumentsReducer) {
        var timer = null;

        var argsToPass = null;
        if (!argumentsReducer) {
            var arrayReducer = function (accum, newVal) {
                if (!accum) {
                    return newVal ? [newVal] : [];
                }
                return accum.concat(newVal);
            };
            argumentsReducer = function (accum, newArgs) {
                if (!accum) {
                    accum = [[]];
                }
                return [arrayReducer(accum[0], newArgs[0])];
            };
        }
        return function () {
            var newArgs = _.toArray(arguments);
            argsToPass = argumentsReducer(argsToPass, newArgs);

            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(function () {
                timer = null;
                fn.apply(fn, argsToPass);
                argsToPass = null;
            }, debounceInterval);
        };
    }
};
