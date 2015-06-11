/**
 * ## Checkboxes and Radio Buttons
 *
 * Special handling for DOM elements with `type="checkbox"` and `type="radio"`. 
 *
 * ####data-f-bind
 *
 * Select the checkbox or radio button if the `value` matches the value of the model variable referenced, or if the model variable is true.
 *
 * **Example**
 *
 *      <!-- radio button, selected if sampleInt is 8 -->
 *      <input type="radio" data-f-bind="sampleInt" value="8" />
 *
 *      <!-- checkbox, checked if sampleBool is true -->
 *      <input type="checkbox" data-f-bind="sampleBool" />
 *
 * ####data-f-checked
 *
 * If the model variable is boolean, optionally, use the special property `checked` to make the selection instead.
 *
 * **Example**
 *
 *      <!-- checkbox, checked if sampleBool is true -->
 *      <input type="checkbox" data-f-checked="sampleBool" />
 * 
 */

'use strict';

module.exports = {

    target: ':checkbox,:radio',

    test: 'bind',

    handle: function (value) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        var settableValue = this.attr('value'); //initial value
        /*jslint eqeq: true*/
        var isChecked = (settableValue !== undefined) ? (settableValue == value) : !!value;
        this.prop('checked', isChecked);
    }
};
