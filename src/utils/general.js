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
            argumentsReducer = function (currentArgs, newArgs) {
                if (!currentArgs) {
                    currentArgs = [];
                }
                return _.uniq(currentArgs.concat(newArgs));
            };
        }
        return function (newArgs) {
            argsToPass = argumentsReducer(argsToPass, newArgs);
            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(function () {
                timer = null;
                fn(argsToPass);
                argsToPass = null;
            }, debounceInterval);
        };
    }
};
