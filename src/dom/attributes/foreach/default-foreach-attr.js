/**
 * ## Display Array and Object Variables: data-f-foreach
 *
 * If your model variable is an array, you can reference specific elements of the array using `data-f-bind`: `data-f-bind="sales[3]"` or `data-f-bind="sales[<currentRegion>]"`, as described under [data-f-bind](../../binds/default-bind-attr/).
 *
 * However, that's not the only option. If you want to automatically loop over all elements of the array, or all the fields of an object, you can use the `data-f-foreach` attribute to name the variable, then use templates to access its index and value for display. (Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).)
 *
 * **To display a DOM element based on an array variable from the model:**
 *
 * 1. Add the `data-f-foreach` attribute to any HTML element that has repeated sub-elements. The two most common examples are lists and tables.
 * 2. Set the value of the `data-f-foreach` attribute in your top-level HTML element to the name of the array variable.
 * 3. Add the HTML in which the value of your array variable should appear.
 * 4. Optionally, inside the inner HTML element, use templates (`<%= %>`) to reference the `index` (for arrays) or `key` (for objects) and `value` to display. The `index`, `key`, and `value` are special variables that Flow.js populates for you.
 *
 *
 * **Examples:**
 *
 * By default &mdash; that is, if you do not include templates in your HTML &mdash; the `value` of the array element or object field appears:
 *
 *      <!-- the model variable Time is an array of years
 *          create a list that shows which year -->
 *
 *      <ul data-f-foreach="Time">
 *          <li></li>
 *      </ul>
 *
 * In the third step of the model, this example generates:
 *
 *      * 2015
 *      * 2016
 *      * 2017
 *
 * Optionally, you can use templates (`<%= %>`) to reference the `index` and `value` of the array element to display.
 *
 *
 *      <!-- the model variable Time is an array of years
 *          create a list that shows which year -->
 *
 *      <ul data-f-foreach="Time">
 *          <li> Year <%= index %>: <%= value %> </li>
 *      </ul>
 *
 * In the third step of the model, this example generates:
 *
 *      * Year 1: 2015
 *      * Year 2: 2016
 *      * Year 3: 2017
 *
 * As with other `data-f-` attributes, you can specify [converters](../../../../../converter-overview) to convert data from one form to another:
 *
 *      <ul data-f-foreach="Sales | $x,xxx">
 *          <li> Year <%= index %>: Sales of <%= value %> </li>
 *      </ul>
 *
 *
 * **Notes:**
 *
 * * You can use the `data-f-foreach` attribute with both arrays and objects. If the model variable is an object, reference the `key` instead of the `index` in your templates.
 * * The `key`, `index`, and `value` are special variables that Flow.js populates for you.
 * * The template syntax is to enclose each keyword (`index`, `key`, `variable`) in `<%=` and `%>`. Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).
 *
 */

'use strict';
var parseUtils = require('../../../utils/parse-utils');
module.exports = {

    test: 'foreach',

    target: '*',

    handle: function (value, prop) {
        value = ($.isPlainObject(value) ? value : [].concat(value));
        var loopTemplate = this.data('foreach-template');
        if (!loopTemplate) {
            loopTemplate = this.html();
            this.data('foreach-template', loopTemplate);
        }
        var $me = this.empty();
        _.each(value, function (dataval, datakey) {
            if (!dataval) {
                dataval = dataval + '';
            }
            var cloop = loopTemplate.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            var templatedLoop = _.template(cloop, { value: dataval, key: datakey, index: datakey });
            var isTemplated = templatedLoop !== cloop;
            var nodes = $(templatedLoop);

            nodes.each(function (i, newNode) {
                newNode = $(newNode);
                _.each(newNode.data(), function (val, key) {
                    newNode.data(key, parseUtils.toImplicitType(val));
                });
                if (!isTemplated && !newNode.html().trim()) {
                    newNode.html(dataval);
                }
            });
            $me.append(nodes);
        });
    }
};
