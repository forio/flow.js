function parseArgs(toCompare, trueVal, falseVal, valueToCompare, matchString) {
    const toReturn = { trueVal: true, falseVal: false };
    switch (arguments.length) {
        case 5: //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, falseVal: falseVal, input: valueToCompare });
        case 4: //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, input: falseVal }); 
        case 3: //eslint-disable-line
            return $.extend(toReturn, { input: trueVal }); 
        default:
            return toReturn;
    }
}

module.exports = [
    {
        alias: 'is',
        acceptList: true,
        convert: function (toCompare) {
            const args = parseArgs.apply(null, arguments);
            return args.input === toCompare ? args.trueVal : args.falseVal;
        }
    }
];
