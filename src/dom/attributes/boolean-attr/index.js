/**
 * ## Binding for data-f-[boolean]
 *
 * Flow.js provides special handling for HTML attributes that take Boolean values.
 *
 * In particular, for most HTML attributes that expect Boolean values, the attribute is directly set to the value of the model variable. This is true for `checked`, `selected`, `async`, `autofocus`, `autoplay`, `controls`, `defer`, `ismap`, `loop`, `multiple`, `open`, `required`, and `scoped`.
 *
 * **Example**
 *
 *      <!-- this checkbox is CHECKED when sampleBool is TRUE,
 *           and UNCHECKED when sampleBool is FALSE -->
 *      <input type="checkbox" data-f-checked="sampleBool" />
 *
 *      <!-- this button is DISABLED when sampleBool is TRUE,
 *           and ENABLED when sampleBool is FALSE -->
 *      <button data-f-disabled="sampleBool">Click Me</button>
 *
 */

/**
 * @type AttributeHandler 
 */
const booleanAttrHandler = {
    target: '*',

    test: /^(?:checked|selected|async|autofocus|autoplay|controls|defer|ismap|loop|multiple|open|required|scoped|disabled|hidden|readonly)$/i,

    handle: function (value, prop, $el) {
        if (Array.isArray(value)) {
            value = value[value.length - 1];
        }
        const val = ($el.attr('value')) ? (value == $el.prop('value')) : !!value; //eslint-disable-line eqeqeq
        $el.prop(prop, val);
    }
};

export default booleanAttrHandler;
