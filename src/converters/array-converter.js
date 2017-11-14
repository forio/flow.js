/**
 * ## Array Converters
 *
 * Converters allow you to change how data is displayed. They let you display the value of any model variable in a different format than it is stored in the model -- converting the output value from one format to another.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute. Converters are chainable, so you can apply several in a row to a particular variable.
 * * Add the attribute `data-f-convert` to any element to convert all of the model variables referenced within that element's scope.
 *
 * In general, if the model variable is an array, the converter is applied to each element of the array. There are a few built in array converters which, rather than converting all elements of an array, select particular elements from within the array or otherwise treat array variables specially.
 *
 */

const _ = require('lodash');

var list = [
    {
        alias: 'list',
        /**
         * Convert the input into an array. Concatenates all elements of the input.
         *
         * @param {*} val value to convert to Array
         * @return {array} value converted to array
         */
        convert: function (val) {
            return [].concat(val);
        }
    },
    {
        alias: 'last',
        /**
         * Select only the last element of the array.
         *
         * **Example**
         *
         *      <div>
         *          In the current year, we have <span data-f-bind="Sales | last"></span> in sales.
         *      </div>
         *
         * @param {array} val The array model variable.
         * @return {*} last element of array
         */
        convert: function (val) {
            val = [].concat(val);
            return val[val.length - 1];
        }
    },
    {
        alias: 'reverse',
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
         * @param {array} val The array model variable.
         * @returns {array} reversed array
         */
        convert: function (val) {
            val = [].concat(val);
            return val.reverse();
        }
    },
    {
        alias: 'first',
        /**
         * Select only the first element of the array.
         *
         * **Example**
         *
         *      <div>
         *          Our initial investment was <span data-f-bind="Capital | first"></span>.
         *      </div>
         *
         * @param {array} val The array model variable.
         * @returns {*} first element of array
         */
        convert: function (val) {
            val = [].concat(val);
            return val[0];
        }
    },
    {
        alias: 'previous',
        /**
         * Select only the previous (second to last) element of the array.
         *
         * **Example**
         *
         *      <div>
         *          Last year we had <span data-f-bind="Sales | previous"></span> in sales.
         *      </div>
         *
         * @param {array} val The array model variable.
         * @returns {*} previous (second to last) element of the array.
         */
        convert: function (val) {
            val = [].concat(val);
            return (val.length <= 1) ? val[0] : val[val.length - 2];
        }
    }
];

list.forEach(function (item) {
    var oldfn = item.convert;
    var newfn = function (val) {
        if ($.isPlainObject(val)) {
            return _.mapValues(val, oldfn);
        }
        return oldfn(val);
    };
    item.convert = newfn;
    item.acceptList = true;
});
module.exports = list;
