/**
 * ## Boolean Conditional Converters
 *
 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
 *
 * In particular, for a boolean conditional converter, the original format is your model variable, and the resulting "format" is a boolean value, or another value of your choosing.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).
 * * Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
 *
 * For example:
 *
 *      <!-- will show "true" or "false" -->
 *      <span data-f-bind="sampleVar | toBool"></span>
 *      <span data-f-bind="sampleVar" data-f-convert="toBool"></span>
 *
 */

'use strict';

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
     * Convert a 'truthy' value to true and 'falsy' values to false.
     *
     * **Example**
     *
     *      <!-- displays "true" or "false" -->
     *      <span data-f-bind="sampleDecisionVar | toBool"></span>
     * 
     * @param {Any} value
     * @return {Boolean}
     */
    toBool: function (value) {
        return !!value;
    },

    /**
     * Convert the input to a new value (for example, some text), based on whether it is true or false.
     *
     * **Example**
     *
     *      <div>
     *
     *          <span data-f-bind="sampleDecisionVar | ifTrue('yes! please move forward', 'not ready to proceed')"></span> 
     *
     *          <span data-f-bind="sampleDecisionVar | ifTrue('yes! please move forward')"></span>
     *      </div>
     *
     * @param {Number} trueVal The value to display if the input is true.
     * @param {Number} falseVal (Optional) The value to display if the input is false. If not included, returns false.
     * @param {Any} input (Optional) The input to test. If not included, the output of the previous argument is used.
     * @return {Any} If input is true, returns trueVal. If input is false, returns falseVal if provided, or false.
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
     *
     *          <span data-f-bind="sampleDecisionVar | ifFalse('not ready to proceed', 'actually this is still true')"></span> 
     *
     *          <span data-f-bind="sampleDecisionVar | ifFalse('not ready to proceed')"></span>
     *      </div>
     *
     * @param {Number} trueVal The value to display if the input is false.
     * @param {Number} falseVal (Optional) The value to display if the input is true. If not included, returns false.
     * @param {Any} input (Optional) The input to test. If not included, the output of the previous argument is used.
     * @return {Any} If input is false, returns trueVal. If input is true, returns falseVal if provided, or false.
     */
    ifFalse: function () {
        var args = parseArgs.apply(null, arguments);
        return !args.input ? args.trueVal : args.falseVal;
    }
};
