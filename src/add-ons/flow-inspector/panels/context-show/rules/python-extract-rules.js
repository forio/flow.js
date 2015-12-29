'use strict';

module.exports = {
    fn: {
        start: function (reference) {
            var regExp = new RegExp('^[ \t]*?def\\s+' + reference);
            return function (val) {
                return regExp.test(val);
            };
        },
        end: function (fromStart, startValue) {
            var leadingSpacesInStart = startValue.match(/^[ \t]*/)[0].length;
            var indexOfLastGoodLine = 0;
            _.every(fromStart, function (line, index) {
                var leadingSpacesInLine = line.match(/^[ \t]*/)[0].length;
                if (line.trim() !== '') {
                    if (leadingSpacesInLine === leadingSpacesInStart) {
                        return false;
                    } else {
                        indexOfLastGoodLine = index;
                    }
                }
                return true;
            });
            return indexOfLastGoodLine + 1;
        },
        offset: 0
    },
    variable: {
        start: function (reference) {
            var regExp = new RegExp('^' + reference + '\\s?=');
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
