'use strict';

function toImplicitType(data) {
    var objRegex = /^(?:\{.*\})$/;
    var arrRegex = /^(?:\[.*])$/;

    var converted = data;
    if (typeof data === 'string') {
        converted = data.trim();

        if (converted === 'true') {
            converted = true;
        } else if (converted === 'false') {
            converted = false;
        } else if (converted === 'null') {
            converted = null;
        } else if (converted === 'undefined') {
            converted = '';
        } else if (converted.charAt(0) === '\'' || converted.charAt(0) === '"') {
            converted = converted.substring(1, converted.length - 1);
        } else if ($.isNumeric(converted)) {
            converted = +converted;
        } else if (arrRegex.test(converted)) {
            const bracketReplaced = converted.replace(/[[\]]/g, '');
            if (!bracketReplaced) return [];
            const parsed = bracketReplaced.split(/,(?![^[]*])/).map((val)=> {
                return toImplicitType(val);
            });
            return parsed;
        } else if (objRegex.test(converted)) {
            try {
                converted = JSON.parse(converted);
            } catch (e) {
                console.error('toImplicitType: couldn\'t convert', converted);
            }
        }
    }
    return converted;
}

function toOperationFormat(value) {
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

export { toImplicitType, toOperationFormat };
