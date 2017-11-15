function parseArgs(limit, trueVal, falseVal, valueToCompare, matchString) {
    const toReturn = { trueVal: true, falseVal: false };
    switch (arguments.length) {
        case 5: //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, falseVal: falseVal, input: valueToCompare });
        case 4: //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, falseVal: falseVal, input: falseVal }); 
        case 3: //eslint-disable-line
            return $.extend(toReturn, { input: trueVal, falseVal: trueVal }); 
        default:
            return toReturn;
    }
}

module.exports = [
    {
        name: 'is',
        acceptList: true,
        convert: function (toCompare) {
            const args = parseArgs.apply(null, arguments);
            return args.input === toCompare ? args.trueVal : args.falseVal;
        }
    }
];
