/**
 * ## Array Converters
 *
 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).
 *
 * In general, if the model variable is an array, the converter is applied to each element of the array. There are a few built in array converters which, rather than converting all elements of an array, select particular elements from within the array or otherwise treat array variables specially.
 *
 */

const { mapValues, each } = require('lodash');
var list = [
    {
        alias: 'list',
        acceptList: true,
        /**
         * Convert the input into an array. Concatenates all elements of the input.
         *
         * @param {*} val value to convert to Array
         * @return {Array} value converted to array
         */
        convert: function (val) {
            return [].concat(val);
        }
    },
    {
        alias: 'last',
        acceptList: true,
        /**
         * Select only the last element of the array.
         *
         * **Example**
         *
         *      <div>
         *          In the current year, we have <span data-f-bind="Sales | last"></span> in sales.
         *      </div>
         *
         * @param {Array} val The array model variable.
         * @return {*} last element of array
         */
        convert: function (val) {
            val = [].concat(val);
            return val[val.length - 1];
        }
    },
    {
        alias: 'reverse',
        acceptList: true,
        /**
         * Reverse the array.
         *
         * **Example**
         *
         *      <p>Show the history of our sales, starting with the last (most recent):</p>
         *      <ul data-f-foreach="Sales | reverse">
         *          <li></li>
         *      </ul>
         *
         * @param {Array} val The array model variable.
         * @returns {Array} reversed array
         */
        convert: function (val) {
            val = [].concat(val);
            return val.reverse();
        }
    },
    {
        alias: 'first',
        acceptList: true,
        /**
         * Select only the first element of the array.
         *
         * **Example**
         *
         *      <div>
         *          Our initial investment was <span data-f-bind="Capital | first"></span>.
         *      </div>
         *
         * @param {Array} val The array model variable.
         * @returns {*} first element of array
         */
        convert: function (val) {
            val = [].concat(val);
            return val[0];
        }
    },
    {
        alias: 'previous',
        acceptList: true,
        /**
         * Select only the previous (second to last) element of the array.
         *
         * **Example**
         *
         *      <div>
         *          Last year we had <span data-f-bind="Sales | previous"></span> in sales.
         *      </div>
         *
         * @param {Array} val The array model variable.
         * @returns {*} previous (second to last) element of the array.
         */
        convert: function (val) {
            val = [].concat(val);
            return (val.length <= 1) ? val[0] : val[val.length - 2];
        }
    }
];

each(list, function (item) {
    var oldfn = item.convert;
    var newfn = function (val) {
        if ($.isPlainObject(val)) {
            return mapValues(val, oldfn);
        }
        return oldfn(val);
    };
    item.convert = newfn;
});
module.exports = list;
