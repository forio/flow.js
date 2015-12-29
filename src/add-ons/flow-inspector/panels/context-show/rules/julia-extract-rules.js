'use strict';

module.exports = {
    fn: {
        start: function (reference) {
            var regExp = new RegExp('^[ \t]*?function\\s+' + reference);
            return function (val) {
                return regExp.test(val);
            };
        },
        end: function (fromStart) {
            return _.findIndex(fromStart, function (val, index) {
                return val.match(/^end/);//ignore leading whitespaces to avoid returning early for nested ends
            }, this);
        },
        offset: 1
    },
    variable: {
        start: function (reference) {
            var regExp = new RegExp('^[ \t]*?(global\\s*)?' + reference + '\\s?=');
            return function (val) {
                return regExp.test(val);
            };
        },
        end: function (fromStart) {
            return _.findIndex(fromStart, function (val, index) {
                return val.trim() === '' || (val.indexOf('=') !== -1);
            }, this);
        },
        offset: 0
    }
};
