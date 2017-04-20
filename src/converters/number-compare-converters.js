'use strict';

function parseArgs(limit, trueVal, falseVal, valueToCompare) {
    var toReturn = { trueVal: true, falseVal: false };
    switch (arguments.length) {
        case 4: //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, falseVal: falseVal, input: valueToCompare });
        case 3: //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, input: falseVal }); 
        case 2:
            return $.extend(toReturn, { input: trueVal }); 
        default:
            return toReturn;
    }
}
module.exports = {
    greaterThan: function (limit, trueVal, falseVal, valueToCompare) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) > Number(limit) ? args.trueVal : args.falseVal;
    },
    greaterThanEqual: function (limit, trueVal, falseVal, valueToCompare) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) >= Number(limit) ? args.trueVal : args.falseVal;
    },
    equalsNumber: function (limit, trueVal, falseVal, valueToCompare) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) === Number(limit) ? args.trueVal : args.falseVal;
    },
    lesserThan: function (limit, trueVal, falseVal, valueToCompare) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) < Number(limit) ? args.trueVal : args.falseVal;
    },
    lesserThanEqual: function (limit, trueVal, falseVal, valueToCompare) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) <= Number(limit) ? args.trueVal : args.falseVal;
    }
};
