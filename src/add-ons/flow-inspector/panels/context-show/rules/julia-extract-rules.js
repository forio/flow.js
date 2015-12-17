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
            return val.match(/^end/);//ignore leading whitespaces to avoid returning early for nested ends
        },
    },
    variable: {
        start: function (reference) {
            var regExp = new RegExp('^\\s*?(global\\s*)?' + reference + '\\s?=');
            return function (val) {
                return regExp.test(val);
            };
        },
        end: function (val, startValue) {
            return val.trim() === '' || (val.indexOf('=') !== -1);
        }
    }
};
