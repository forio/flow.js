/**
 * ## Number Comparison Converters
 *
 * Converters allow you to change how data is displayed. They let you display the value of any model variable in a different format than it is stored in the model -- converting the output value from one format to another.
 *
 * For a number comparison converter, the original format is your model variable, and the resulting "format" is a (possibly unrelated) value of your choosing. This resulting value is selected based on how the value of the model variable compares to a reference value that you pass to the converter.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute. Converters are chainable, so you can apply several in a row to a particular variable.
 * * Add the attribute `data-f-convert` to any element to convert all of the model variables referenced within that element's scope.
 *
 * For example:
 *
 *      <!-- displays "true" or the number of widgets -->
 *      <span data-f-bind="widgets | greaterThan(50)"></span>
 *
 *      <!-- displays the first string if true, the second if false -->
 *      <span data-f-bind="widgets | greaterThan(50, 'nice job!', 'not enough widgets')"></span>
 *
 */

'use strict';

function parseArgs(limit, trueVal, falseVal, valueToCompare, matchString) {
    var toReturn = { trueVal: true, falseVal: false };
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
module.exports = {
    /**
     * Convert the model variable to true, or other values passed to the converter, based on whether the model variable is greater than the limit.
     *
     * **Example**
     *
     *      <div>
     *          <!-- displays true or the number of widgets -->
     *          <span data-f-bind="widgets | greaterThan(50)"></span> 
     *
     *          <!-- displays custom text -->
     *          <span data-f-bind="widgets | greaterThan(50, 'Congratulations!', 'Better luck next year')"></span>
     *      </div>
     *
     * @param {Number} limit The reference value to compare the model variable against.
     * @param {Number} trueVal (Optional) The format (value) to display if the model variable is greater than `limit`. If not included, the display is `true`.
     * @param {Number} falseVal (Optional) The format (value) to display if the model variable is less than or equal to `limit`. If not included, the display is the value of the model variable.
     * @return {Any} If the model variable is greater than `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
     */
    greaterThan: function (limit) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) > Number(limit) ? args.trueVal : args.falseVal;
    },

    /**
     * Convert the model variable to true, or other values passed to the converter, based on whether the model variable is greater than or equal to the limit.
     *
     * **Example**
     *
     *      <div>
     *          <!-- displays true or the number of widgets -->
     *          <span data-f-bind="widgets | greaterThan(50)"></span> 
     *
     *          <!-- displays custom text -->
     *          <span data-f-bind="widgets | greaterThan(50, 'Congratulations!', 'Better luck next year')"></span>
     *      </div>
     *
     * @param {Number} limit The reference value to compare the model variable against.
     * @param {Number} trueVal (Optional) The format (value) to display if the model variable is greater than or equal to `limit`. If not included, the display is `true`.
     * @param {Number} falseVal (Optional) The format (value) to display if the model variable is less than `limit`. If not included, the display is the value of the model variable.
     * @return {Any} If the model variable is greater than or equal to `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
     */    
    greaterThanEqual: function (limit) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) >= Number(limit) ? args.trueVal : args.falseVal;
    },

    /**
     * Convert the model variable to true, or other values passed to the converter, based on whether the model variable is equal to the limit.
     *
     * 
     * **Example**
     *
     *      <div>
     *          <!-- displays true or the number of widgets -->
     *          <span data-f-bind="widgets | equalsNumber(50)"></span> 
     *
     *          <!-- display custom text -->
     *          <span data-f-bind="widgets | equalsNumber(50, 'Met the goal exactly!', 'Not an exact match')"></span>
     *      </div>
     *
     * @param {Number} limit The reference value to compare the model variable against.
     * @param {Number} trueVal (Optional) The format (value) to display if the model variable is equal to `limit`. If not included, the display is `true`.
     * @param {Number} falseVal (Optional) The format (value) to display if the model variable is not equal to `limit`. If not included, the display is the value of the model variable.
     * @return {Any} If the model variable equals `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
     */
    equalsNumber: function (limit) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) === Number(limit) ? args.trueVal : args.falseVal;
    },

    /**
     * Convert the model variable to true, or other values passed to the converter, based on whether the model variable is less than the limit.
     *
     * **Example**
     *
     *      <div>
     *          <!-- displays true or the number of widgets -->
     *          <span data-f-bind="widgets | lessThan(50)"></span> 
     *
     *          <!-- display custom text -->
     *          <span data-f-bind="widgets | lessThan(50, 'Oops didn't make quite enough!', 'Built a lot of widgets this year!')"></span>
     *      </div>
     *
     * @param {Number} limit The reference value to compare the model variable against.
     * @param {Number} trueVal (Optional) The format (value) to display if the model variable is less than `limit`. If not included, the display is `true`.
     * @param {Number} falseVal (Optional) The format (value) to display if the model variable is less than `limit`. If not included, the display is the value of the model variable.
     * @return {Any} If the model variable is less than `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
     */ 
    lessThan: function (limit) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) < Number(limit) ? args.trueVal : args.falseVal;
    },

    /**
     * Convert the model variable to true, or other values passed to the converter, based on whether the model variable is less than or equal to the limit.
     *
     * **Example**
     *
     *      <div>
     *          <!-- displays true or the number of widgets -->
     *          <span data-f-bind="widgets | lessThanEqual(50)"></span> 
     *
     *          <!-- display custom text -->
     *          <span data-f-bind="widgets | lessThanEqual(50, 'Oops didn't make quite enough!', 'Built a lot of widgets this year!')"></span>
     *      </div>
     *
     * @param {Number} limit The reference value to compare the model variable against.
     * @param {Number} trueVal (Optional) The format (value) to display if the model variable is less than or equal to `limit`. If not included, the display is `true`.
     * @param {Number} falseVal (Optional) The format (value) to display if the model variable is less than or equal to `limit`. If not included, the display is the value of the model variable.
     * @return {Any} If the model variable is less than or equal to `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
     */
    lessThanEqual: function (limit) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) <= Number(limit) ? args.trueVal : args.falseVal;
    }
};