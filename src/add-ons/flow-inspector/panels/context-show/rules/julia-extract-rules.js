'use strict';

module.exports = {
    fn: {
        start: function (reference) {
            var regExp = new RegExp('^\\s*?function\\s+' + reference);
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
            var regExp = new RegExp('^\\s*?' + reference + '\\s?=');
            return function (val) {
                return regExp.test(val);
            };
        },
        end: function (val, startValue) {
            return val.trim() === '' || (val.indexOf('=') !== -1);
        }
    }
};
