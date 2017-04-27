'use strict';

function parseArgs(trueVal, falseVal, input, matchString) {
    var toReturn = { trueVal: true, falseVal: false };
    switch (arguments.length) {
        case 4: //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, falseVal: falseVal, input: input });
        case 3: //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, input: falseVal }); 
        default:
            return toReturn;
    }
}

module.exports = {
    /**
     * Converts a 'truthy' values to true and 'falsy' values to false
     * @param {Any} value
     * @return {Boolean}
     */
    toBool: function (value) {
        return !!value;
    },
    ifTrue: function () {
        var args = parseArgs.apply(null, arguments);
        return args.input ? args.trueVal : args.falseVal;
    },
    ifFalse: function () {
        var args = parseArgs.apply(null, arguments);
        return args.input ? args.falseVal : args.trueVal;
    }
};
