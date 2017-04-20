'use strict';

function parseArgs(trueVal, falseVal, input) {
    var toReturn = { trueVal: true, falseVal: false };
    switch (arguments.length) {
        case 3: //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, falseVal: falseVal, input: input });
        case 2:
            return $.extend(toReturn, { trueVal: trueVal, input: falseVal }); 
        default:
            return toReturn;
    }
}

module.exports = {
    ifTrue: function (trueVal, falseVal, input) {
        var args = parseArgs.apply(null, arguments);
        return args.input ? args.trueVal : args.falseVal;
    },
    ifFalse: function (trueVal, falseVal, input) {
        var args = parseArgs.apply(null, arguments);
        return args.input ? args.falseVal : args.trueVal;
    }
};
