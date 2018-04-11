/**
 * ## Checkboxes and Radio Buttons
 *
 * In the [default case](../default-bind-attr/), the `data-f-bind` attribute creates a bi-directional binding between the DOM element and the model variable. This binding is **bi-directional**, meaning that as the model changes, the interface is automatically updated; and when end users change values in the interface, the model is automatically updated.
 *
 * Flow.js provides special handling for DOM elements with `type="checkbox"` and `type="radio"`.
 *
 * In particular, if you add the `data-f-bind` attribute to an `input` with `type="checkbox"` and `type="radio"`, the checkbox or radio button is automatically selected if the `value` matches the value of the model variable referenced, or if the model variable is `true`.
 *
 * **Example**
 *
 *      <!-- radio button, selected if sampleInt is 8 -->
 *      <input type="radio" data-f-bind="sampleInt" value="8" />
 *
 *      <!-- checkbox, checked if sampleBool is true -->
 *      <input type="checkbox" data-f-bind="sampleBool" />
 *
 */
module.exports = {

    target: ':checkbox,:radio',

    test: 'bind',

    /**
     * @param {string[]|number[]|string|number} value
     * @param {string} prop name of property bound to
     * @param {JQuery<HTMLElement>} $el
     * @return {void}
     */ 
    handle: function (value, prop, $el) {
        if (Array.isArray(value)) {
            value = value[value.length - 1];
        }
        var settableValue = $el.attr('value'); //initial value
        var isChecked = (typeof settableValue !== 'undefined') ? (settableValue == value) : !!value; //eslint-disable-line eqeqeq
        $el.prop('checked', isChecked);
    }
};
