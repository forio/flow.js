'use strict';

function toImplicitType(data) {
    var objRegex = /^(?:\{.*\})$/;
    var arrRegex = /^(?:\[.*])$/;

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
        } else if (data.charAt(0) === '\'' || data.charAt(0) === '"') {
            converted = data.substring(1, data.length - 1);
        } else if ($.isNumeric(data)) {
            converted = +data;
        } else if (arrRegex.test(data)) {
            const bracketReplaced = data.replace(/[[\]]/g, '');
            if (!bracketReplaced) return [];
            const parsed = bracketReplaced.split(/,(?![^[]*])/).map((val)=> {
                return toImplicitType(val);
            });
            return parsed;
        } else if (objRegex.test(data)) {
            try {
                converted = JSON.parse(data);
            } catch (e) {
                console.error('toImplicitType: couldn\'t convert', data);
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
