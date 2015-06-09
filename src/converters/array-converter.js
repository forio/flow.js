/**
 * ## Array Converters
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
 * In general, if the model variable is an array, the converter is applied to each element of the array. 
 * 
 * As a special case, there are a few built in converters which, rather than converting all elements of an array, select particular elements from within the array or otherwise treat array variables specially.
 * 
 */


'use strict';
var list = [
    {
        /**
         * Convert the array into a list by concatenating all elements of the array.
         *
         * @param {Array} `val` The array model variable.
         */
        alias: 'list',
        acceptList: true,
        convert: function (val) {
            return [].concat(val);
        }
    },
    {
        /**
         * Select and display only the last element of the array.
         *
         * **Example**
         * 
         *      <div>
         *          In the current year, we have <span data-f-bind="Sales | last"></span> in sales.
         *      </div>
         *
         * @param {Array} `val` The array model variable.
         */
        alias: 'last',
        acceptList: true,
        convert: function (val) {
            val = [].concat(val);
            return val[val.length - 1];
        }
    },
    {
        /**
         * Select and display only the first element of the array.
         *
         * **Example**
         * 
         *      <div>
         *          Our initial investment was <span data-f-bind="Capital | first"></span>.
         *      </div>
         *
         * @param {Array} `val` The array model variable.
         */
        alias: 'first',
        acceptList: true,
        convert: function (val) {
            val = [].concat(val);
            return val[0];
        }
    },
    {
        /**
         * Select and display only the previous (second to last) element of the array.
         *
         * **Example**
         * 
         *      <div>
         *          Last year we had <span data-f-bind="Sales | previous"></span> in sales.
         *      </div>
         *
         * @param {Array} `val` The array model variable.
         */
        alias: 'previous',
        acceptList: true,
        convert: function (val) {
            val = [].concat(val);
            return (val.length <= 1) ? val[0] : val[val.length - 2];
        }
    }
];

_.each(list, function (item) {
   var oldfn = item.convert;
   var newfn = function (val) {
       if ($.isPlainObject(val)) {
            return _.mapValues(val, oldfn);
       } else {
            return oldfn(val);
       }
   };
   item.convert = newfn;
});
module.exports = list;
