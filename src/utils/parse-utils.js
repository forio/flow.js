'use strict';

function toImplicitType(data) {
    var rbrace = /^(?:\{.*\}|\[.*\])$/;
    var converted = data;
    if (typeof data === 'string') {
        converted = data = data.trim();

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
}

function splitUnescapedCommas(str) {
    var regex = /(\\.|[^,])+/g;
    var m;

    var op = [];
    while ((m = regex.exec(str)) !== null) { //eslint-disable-line
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        m.forEach(function (match, groupIndex) {
            if (groupIndex === 0) {
                op.push(match.replace('\\', ''));
            }
        });
    }
    return op;
}
module.exports = {
    splitNameArgs: function (value) {
        var fnName = value.split('(')[0];
        var params = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
        var args = splitUnescapedCommas(params);
        args = args.map(toImplicitType);
        return { name: fnName, args: args };
    },

    toImplicitType: toImplicitType
};
