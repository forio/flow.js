'use strict';

module.exports = {
    fn: {
        start: function (reference) {
            var regExp = new RegExp('^function ' + reference);
            return function (val) {
                return regExp.test(val);
            };
        },
        end: function (val, startValue) {
            return val.trim() === 'end';
        },
    },
    variable: {
        start: function (reference) {
            var regExp = new RegExp('^' + reference + '\\s?=');
            return function (val) {
                return regExp.test(val);
            };
        },
        end: function (val, startValue) {
            return val.trim() === '' || (val.indexOf('=') !== -1);
        }
    }
};
