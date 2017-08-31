const { uniqueId, random, toArray } = require('lodash');

module.exports = {
    random: function (prefix, min, max) {
        if (!min) {
            min = parseInt(uniqueId(), 10);
        }
        if (!max) {
            max = 100000; //eslint-disable-line no-magic-numbers
        }
        var number = random(min, max, false) + '';
        if (prefix) {
            number = prefix + number;
        }
        return number;
    },

    /**
     * A promise-returning debounce function. Also lets you decide what to do with arguments passed in while being debounced
     * @param  {Function} fn                function to debounce
     * @param  {Number}   debounceInterval  interval
     * @param  {Array}   argumentsReducers A reducer for each argument to the function
     * @return {Function}                     
     */
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
            var $def = $.Deferred();
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
            timer = setTimeout(function () {
                timer = null;
                var res = fn.apply(fn, argsToPass);
                if (res && res.then) {
                    return res.then(function (arg) {
                        argsToPass = [];
                        $def.resolve(arg);
                    });
                } else {
                    argsToPass = [];
                    $def.resolve(res);
                }
            }, debounceInterval);

            return $def.promise();
        };
    }
};
