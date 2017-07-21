'use strict';

module.exports = {

    toImplicitType: function (data) {
        var rbrace = /^(?:\{.*\}|\[.*])$/;
        var converted = data;
        if (typeof data === 'string') {
            data = data.trim();

            if (data === 'true') {
                converted = true;
            } else if (data === 'false') {
                converted = false;
            } else if (data === 'null') {
                converted = null;
            } else if (data === 'undefined') {
                converted = '';
            } else if (converted.charAt(0) === '\'' || converted.charAt(0) === '"') {
                converted = data.substring(1, data.length - 1);
            } else if ($.isNumeric(data)) {
                converted = +data;
            } else if (rbrace.test(data)) {
                //TODO: This only works with double quotes, i.e., [1,"2"] works but not [1,'2']
                converted = JSON.parse(data);
            }
        }
        return converted;
    },

    toOperationFormat: function (value) {
        var split = (value || '').split('|');
        var listOfOperations = split.map(function (value) {
            value = value.trim();
            var fnName = value.split('(')[0];
            var params = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
            var args = params.trim() !== '' ? params.split(',') : [];

            return { name: fnName, value: args };
        });
        return listOfOperations;
    }
};
