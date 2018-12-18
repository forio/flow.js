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
     * @param {String} trueVal (Optional) The format (value) to display if the model variable is greater than `limit`. If not included, the display is `true`. If there are commas in this argument, they must be escaped with `\`.
     * @param {String} falseVal (Optional) The format (value) to display if the model variable is less than or equal to `limit`. If not included, the display is the value of the model variable. If there are commas in this argument, they must be escaped with `\`.
     * @return {*} If the model variable is greater than `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
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
     * @param {String} trueVal (Optional) The format (value) to display if the model variable is greater than or equal to `limit`. If not included, the display is `true`. If there are commas in this argument, they must be escaped with `\`.
     * @param {String} falseVal (Optional) The format (value) to display if the model variable is less than `limit`. If not included, the display is the value of the model variable. If there are commas in this argument, they must be escaped with `\`.
     * @return {*} If the model variable is greater than or equal to `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
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
     * @param {String} trueVal (Optional) The format (value) to display if the model variable is equal to `limit`. If not included, the display is `true`. If there are commas in this argument, they must be escaped with `\`.
     * @param {String} falseVal (Optional) The format (value) to display if the model variable is not equal to `limit`. If not included, the display is the value of the model variable. If there are commas in this argument, they must be escaped with `\`.
     * @return {*} If the model variable equals `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
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
     * @param {String} trueVal (Optional) The format (value) to display if the model variable is less than `limit`. If not included, the display is `true`. If there are commas in this argument, they must be escaped with `\`.
     * @param {String} falseVal (Optional) The format (value) to display if the model variable is less than `limit`. If not included, the display is the value of the model variable. If there are commas in this argument, they must be escaped with `\`.
     * @return {*} If the model variable is less than `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
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
     * @param {String} trueVal (Optional) The format (value) to display if the model variable is less than or equal to `limit`. If not included, the display is `true`. If there are commas in this argument, they must be escaped with `\`.
     * @param {String} falseVal (Optional) The format (value) to display if the model variable is less than or equal to `limit`. If not included, the display is the value of the model variable. If there are commas in this argument, they must be escaped with `\`.
     * @return {*} If the model variable is less than or equal to `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
     */
    lessThanEqual: function (limit) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) <= Number(limit) ? args.trueVal : args.falseVal;
    }
};
