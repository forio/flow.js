function parseArgs(trueVal, falseVal, input, matchString) {
    var toReturn = { trueVal: true, falseVal: false };
    switch (arguments.length) {
        case 4: //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, falseVal: falseVal, input: input });
        case 3: //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, falseVal: falseVal, input: falseVal }); 
        default:
            return toReturn;
    }
}

module.exports = {
    /**
     * Convert 'truthy' values to true and 'falsy' values to false.
     *
     * **Example**
     *
     *      <!-- displays "true" or "false" -->
     *      <!-- in particular, true if sampleVar is truthy (1, true, 'some string', [] etc.), 
     *            false if sampleVar is falsy (0, false, '') -->
     *      <span data-f-bind="sampleVar | toBool"></span>
     * 
     * @param {Any} value
     * @returns {boolean}
     */
    toBool: (value)=> !!value,

    /**
     * Converts values to boolean and negates.
     *
     * **Example**
     *
     *      <!-- disables input if isGameInProgress is false -->
     *      <input type="text" data-f-disabled="isGameInProgress | not" />
     * 
     * @param {Any} value
     * @returns {boolean}
     */
    not: (value)=> !value,

    /**
     * Convert the input to a new value (for example, some text), based on whether it is true or false.
     *
     * **Example**
     *
     *      <div>
     *          <span data-f-bind="sampleVar | ifTrue('yes! please move forward', 'not ready to proceed')"></span> 
     *          <span data-f-bind="sampleVar | ifTrue('yes! please move forward')"></span>
     *      </div>
     *
     * @param {string} trueVal The value to display if the input is true. If there are commas in this argument, they must be escaped with `\`.
     * @param {string} falseVal (Optional) The value to display if the input is false. If not included, returns the input. If there are commas in this argument, they must be escaped with `\`.
     * @param {Any} input (Optional) The input to test. If not included, the output of the previous argument is used.
     * @returns {Any} If input is true, returns trueVal. If input is false, returns falseVal if provided, or echoes the input.
     */
    ifTrue: function () {
        var args = parseArgs.apply(null, arguments);
        return args.input ? args.trueVal : args.falseVal;
    },
    /**
     * Convert the input to a new value (for example, some text), based on whether it is false or true.
     *
     * **Example**
     *
     *      <div>
     *          <span data-f-bind="sampleVar | ifFalse('not ready to proceed', 'actually this is still true')"></span> 
     *          <span data-f-bind="sampleVar | ifFalse('not ready to proceed')"></span>
     *      </div>
     *
     * @param {string} trueVal The value to display if the input is false. If there are commas in this argument, they must be escaped with `\`.
     * @param {string} falseVal (Optional) The value to display if the input is true. If not included, returns the input. If there are commas in this argument, they must be escaped with `\`.
     * @param {Any} input (Optional) The input to test. If not included, the output of the previous argument is used.
     * @returns {Any} If input is false, returns trueVal. If input is true, returns falseVal if provided, or echoes the input.
     */
    ifFalse: function () {
        var args = parseArgs.apply(null, arguments);
        return !args.input ? args.trueVal : args.falseVal;
    }
};
