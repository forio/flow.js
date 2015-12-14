'use strict';

module.exports = {
    fn: {
        start: function (reference) {
            var regExp = new RegExp('^def ' + reference);
            return regExp.test;
        },
        end: function (val, startValue) {
            return val.trim() === '';
        },
    },
    variable: {
        start: function (reference) {
            var regExp = new RegExp('^' + reference + '\\s?=');
            return regExp.test;
        },
        end: function (val, startValue) {
            return val.trim() === '' || (val.indexOf('=') !== -1);
        }
    }
};
