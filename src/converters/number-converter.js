/**
 * ## Number Converters
 * 
 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
 * * Use the `|` (pipe) character within any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).
 *
 */

'use strict';
module.exports = {
    /**
     * Convert the model variable to an integer. Often used for chaining to another converter.
     *
     * **Example**
     * 
     *      <div>
     *          Your car has driven 
     *          <span data-f-bind="Odometer | i | s0.0"></span> miles.
     *      </div>
     *
     * @param {Array} `value` The model variable.
     */
    alias: 'i',
    convert: function (value) {
        return parseFloat(value, 10);
    }
};
