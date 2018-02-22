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

function parseLimitArgs(starting, limit, val) {
    let toRet = {};
    if (arguments.length === 3) { //eslint-disable-line
        toRet = {
            input: limit,
            limit: starting
        };
    } else if (arguments.length === 2) {
        toRet = {
            input: starting
        };
    } else {
        console.error('Too many arguments passed to last', arguments);
        throw new Error('Too many arguments passed to last');
    }

    toRet.input = [].concat(toRet.input);
    return toRet;
}

const list = {
    /**
     * Convert the input into an array. 
     *
     * @param {any[]} val The array model variable.
     * @returns {any[]}
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
     * @param {any[]} val The array model variable.
     * @returns {any[]} the reversed array
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
     * @param {number} n number of items to get
     * @param {any[]} val The array model variable.
     * @returns {any} last element of array
     */
    last: function (n, val) {
        const parsed = parseLimitArgs.apply(null, arguments);
        const stripped = parsed.input.slice(-(parsed.limit || 1));
        if (stripped.length <= 1) {
            return stripped[0];
        }
        return stripped;
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
     * @param {number} n number of items to get
     * @param {any[]} val The array model variable.
     * @returns {any} first element of the array
     */
    first: function (n, val) {
        const parsed = parseLimitArgs.apply(null, arguments);
        const stripped = parsed.input.slice(0, (parsed.limit || 1));
        if (stripped.length <= 1) {
            return stripped[0];
        }
        return stripped;
    },

    /**
     * Select only the previous (second to last) element of the array.
     *
     * **Example**
     *
     *      <div>
     *          Last year we had <span data-f-bind="Sales | previous"></span> in sales.
     *      </div>
     *
     * @param {any[]} val The array model variable.
     * @returns {any} the previous (second to last) element of the array.
     */
    previous: (val)=> {
        val = [].concat(val);
        return (val.length <= 1) ? val[0] : val[val.length - 2];
    },

    /**
     * Returns length of array
     *
     * **Example**
     * Total Items: <h6 data-f-bind="items | size"></h6>
     * 
     * @param  {any[]} src array
     * @return {number}     length of array
     */
    size: (src)=> [].concat(src).length,

    /**
     * Select every nth item from array
     *
     * **Example**
     * <!-- select every 10th item starting from itself
     * <ul data-f-foreach="Time | pickEvery(10)"><li></li></ul>
     * <!-- select every 10th item starting from the fifth
     * <ul data-f-foreach="Time | pickEvery(10, 5)"><li></li></ul>
     * 
     * @param  {number} n          nth item to select
     * @param  {number} [startIndex] index to start from
     * @param  {any[]} [val]        source array
     * @return {any[]}            shortened array
     */
    pickEvery: function (n, startIndex, val) {
        if (arguments.length === 3) { //eslint-disable-line
            //last item is match string
            val = startIndex;
            startIndex = n - 1;
        }
        val = [].concat(val);
        val = val.slice(startIndex);
        return val.filter((item, index)=> {
            return (index % n) === 0;
        });
    },
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
