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
    }
};
