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

const list = {
    /**
     * Convert the input into an array. 
     *
     * @param {Array} val The array model variable.
     * @returns {Array}
     */
    list: (val)=> [].concat(val),

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
     * @returns {Array} the reversed array
     */
    reverse: (val)=> ([].concat(val)).reverse(),

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
     * @returns {Any} last element of array
     */
    last: (val)=> {
        val = [].concat(val);
        return val[val.length - 1];
    },

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
     * @returns {Any} first element of the array
     */
    first: (val)=> ([].concat(val))[0], 

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
     * @returns {Any} the previous (second to last) element of the array.
     */
    previous: (val)=> {
        val = [].concat(val);
        return (val.length <= 1) ? val[0] : val[val.length - 2];
    },

    pickEvery: function (n, startIndex, val, matched) {
        if (arguments.length === 3) { //eslint-disable-line
            val = startIndex;
            startIndex = 1;
        }
        val = [].concat(val);
        val = val.slice(startIndex);
        return val.filter((item, index)=> {
            return (index % n) === 0;
        });
    } 
};

const mapped = Object.keys(list).map(function (alias) {
    const fn = list[alias];
    const newfn = function () {
        const args = _.toArray(arguments);
        const indexOfActualValue = args.length - 2; //last item is the matchstring
        const val = args[indexOfActualValue];
        if ($.isPlainObject(val)) {
            return Object.keys(val).reduce((accum, key)=> {
                const arr = val[key];
                const newArgs = args.slice();
                newArgs[indexOfActualValue] = arr;
                accum[key] = fn.apply(fn, newArgs);
                return accum;
            }, {});
        }
        return fn.apply(fn, arguments);
    };
    return {
        alias: alias,
        acceptList: true,
        convert: newfn,
    };
});
module.exports = mapped;
