/**
 * ## Inputs and Selects
 *
 * Special handling for DOM elements `input` and `select`. 
 *
 * TODO -- is this for: "<select data-f-bind='x'>" or for "<select><option data-f-selected='x'>" ? 
 */

'use strict';

module.exports = {
    target: 'input, select',

    test: 'bind',

    handle: function (value) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        this.val(value);
    }
};
