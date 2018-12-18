module.exports = {
    alias: 'i',
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
     * @param {string} value The model variable.
     * @return {number}
     */
    convert: function (value) {
        return parseFloat(value);
    }
};
