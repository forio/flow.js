'use strict';

module.exports = {
    fn: {
        start: function (reference) {
            var regExp = new RegExp('^def\\s+' + reference);
            return function (val) {
                return regExp.test(val);
            };
        },
        end: function (val, startValue) {
            return val.trim() === '';
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
