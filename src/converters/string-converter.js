/**
 * ## String Converters
 * 
 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
 * * Use the `|` (pipe) character within any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).
 *
 * Additionally, converters are chainable, so you can apply several in a row to a particular variable.
 *
 * Basic converting and formatting options are built in to Flow.js. (TODO-add when complete: You can also write your own converters. See [link](TODO).)
 * 
 */

'use strict';
module.exports = {

    /**
     * Convert the model variable to a string. Often used for chaining to another converter.
     *
     * **Example**
     * 
     *      <div>
     *          This year you are in charge of sales for <span data-f-bind="salesMgr.region | s | upperCase"></span>.
     *      </div>
     *
     * @param {Array} `val` The model variable.
     */
    s: function (val) {
        return val + '';
    },

    /**
     * Convert the model variable to UPPER CASE.
     *
     * **Example**
     * 
     *      <div>
     *          This year you are in charge of sales for <span data-f-bind="salesMgr.region | s | upperCase"></span>.
     *      </div>
     *
     * @param {Array} `val` The model variable.
     */
    upperCase: function (val) {
        return (val + '').toUpperCase();
    },

    /**
     * Convert the model variable to lower case.
     *
     * **Example**
     * 
     *      <div>
     *          Enter your user name: <input data-f-bind="userName | lowerCase"></input>.
     *      </div>
     *
     * @param {Array} `val` The model variable.
     */
    lowerCase: function (val) {
        return (val + '').toLowerCase();
    },

    /**
     * Convert the model variable to Title Case.
     *
     * **Example**
     * 
     *      <div>
     *          Congratulations on your promotion! Your new title is: <span data-f-bind="currentRole | titleCase"></span>.
     *      </div>
     *
     * @param {Array} `val` The model variable.
     */
    titleCase: function (val) {
        val = val + '';
        return val.replace(/\w\S*/g, function (txt) {return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }
};
