module.exports = {
    /**
     * Convert source value to an integer. Often used for chaining to another converter.
     *
     * **Example**
     *
     *      <div>
     *          Your car has driven
     *          <span data-f-bind="Odometer | i | s0.0"></span> miles.
     *      </div>
     *
     * @param {string} value Source value.
     * @returns {number}
     */
    i: function (value) {
        return parseFloat(value);
    },

    /**
     * Add value to source number.
     *
     * **Example**
     *      <div>
     *          Next year is <span data-f-bind="Year | plus(1)"></span>.
     *      </div>
     *
     * @param {string} operand Value to add
     * @param {string} value Source value
     * @returns {number}
     */
    plus: function (operand, val) {
        return Number(val) + Number(operand);
    },

    /**
     * Subtract value from source number.
     *
     * **Example**
     *      <div>
     *          Last year was <span data-f-bind="Year | minus(1)"></span>.
     *      </div>
     *
     * @param {string} operand Value to add
     * @param {string} value Source value
     * @returns {number}
     */
    minus: function (operand, val) {
        return Number(val) - Number(operand);
    },

    /**
     * Multiply value with source number.
     *
     * **Example**
     *      <div>
     *          Total cost is <span data-f-bind="Units | multiplyBy(10)"></span>.
     *      </div>
     *
     * @param {string} operand Value to add
     * @param {string} value Source value
     * @returns {number}
     */
    multiplyBy: function (operand, val) {
        return Number(val) * Number(operand);
    },

    /**
     * Divide value by source number.
     *
     * **Example**
     *      <div>
     *          Unit cost is <span data-f-bind="Total Cost | divideBy(10)"></span>.
     *      </div>
     *
     * @param {string} operand Value to add
     * @param {string} value Source value
     * @returns {number}
     */
    divideBy: function (operand, val) {
        return Number(val) / Number(operand);
    },
};
