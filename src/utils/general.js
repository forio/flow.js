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
    debounceWithStore: function (fn, debounceInterval) {
        var timer = null;
        var unfetched = [];
        return function (variables) {
            unfetched = _.uniq(unfetched.concat(variables));
            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(function () {
                timer = null;
                fn(unfetched);
                unfetched = [];
            }, debounceInterval);
        };
    }
};
