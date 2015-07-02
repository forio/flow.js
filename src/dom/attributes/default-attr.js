/**
 * ## Default Attribute Handling: Read-only Binding
 *
 * Flow.js uses the HTML5 convention of prepending data- to any custom HTML attribute. Flow.js also adds `f` for easy identification of Flow.js. For example, Flow.js provides several custom attributes and attribute handlers -- including [data-f-bind](../binds/default-bind-attr), [data-f-foreach](../foreach/default-foreach-attr/), [data-f-on-init](../events/init-event-attr/), etc. You can also [add your own attribute handlers](../attribute-manager/).
 *
 * The default behavior for handling a known attribute is to use the value of the model variable as the value of the attribute. (There are exceptions for some [boolean attributes](../boolean-attr/).) 
 *
 * This means you can bind variables from the model in your interface by adding the `data-f-` prefix to any standard DOM attribute. This attribute binding is **read-only**, so as the model changes, the interface is automatically updated; but when users change values in the interface, no action occurs.
 *
 * **To display a DOM element based on a variable from the model:**
 *
 * 1. Add the prefix `data-f-` to any attribute in any HTML element that normally takes a value.
 * 2. Set the value of the attribute to the name of the model variable.
 *
 * **Example**
 *
 * 		<!-- input element displays value of sample_int, however,
 * 			no call to the model is made if user changes sample_int 
 *
 *			if sample_int is 8, this is the equivalent of <input value="8"></input> -->
 *
 *		<input data-f-value="sample_int"></input> 
 *
 */

'use strict';

module.exports = {

    test: '*',

    target: '*',

    handle: function (value, prop) {
        this.prop(prop, value);
    }
};
