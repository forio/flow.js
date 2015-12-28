/**
 * ## Display Array and Object Variables: data-f-foreach
 *
 * The `data-f-foreach` attribute allows you to automatically loop over all the `children` of a referenced variable -- e.g. all elements of the array, or all the fields of an object.
 *
 * As background, if your model variable is an array, you can reference specific elements of the array using `data-f-bind`: `data-f-bind="sales[3]"` or `data-f-bind="sales[<currentRegion>]"`, as described under [data-f-bind](../../binds/default-bind-attr/).
 *
 * However, sometimes you want to loop over *all* of the children of the referenced variable. You can use the `data-f-foreach` attribute to name the variable, then use templates to access the index and value of each child for display. (Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).) Additionally, you can use nested `data-f-foreach` attributes to created nested loops of your data. Note that templates *only work once, at exactly the level specified* when working with nested `data-f-foreach` attributes. See the examples below for more detail.
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
 * In the third step of the model, this example generates the HTML:
 *
 *      <ul data-f-foreach="Time">
 *            <li>2015</li>
 *            <li>2016</li>
 *            <li>2017</li>
 *      </ul>
 *
 * which appears as:
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
 *      <ul data-f-foreach="Time">
 *          <li>Year 1: 2015</li>
 *          <li>Year 2: 2016</li>
 *          <li>Year 3: 2017</li>
 *      </ul>
 *
 * which appears as:
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
 * You can also use nested `data-f-foreach` attributes. For example, suppose you have in your model two arrays, `Outer` (1, 2) and `Inner` (10, 9, 8, 7), and you want to display all values of `Inner` each time you show a value of Outer. You can use nested `data-f-foreach` for this:
 *
 *      <ul data-f-foreach="Outer">
 *          <li><%= value %>
 *              <ul data-f-foreach="Inner">
 *                  <li></li>
 *              </ul>
 *          </li>
 *       </ul>
 *
 * which appears as:
 *
 *      * 1
 *          * 10
 *          * 9
 *          * 8
 *          * 7
 *      * 2
 *          * 10
 *          * 9
 *          * 8
 *          * 7
 *
 * **Notes:**
 *
 * * You can use the `data-f-foreach` attribute with both arrays and objects. If the model variable is an object, reference the `key` instead of the `index` in your templates.
 * * The `key`, `index`, and `value` are special variables that Flow.js populates for you.
 * * The template syntax is to enclose each keyword (`index`, `key`, `variable`) in `<%=` and `%>`. Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).
 * * When you are working with nested `data-f-foreach` attributes, templates *only work once, at exactly the level specified*. In the example above, the sample code references `value` in the outer `<li>` to refer to the elements of the `Outer` array. Alternatively, you could reference `value` in the inner `<li`> to refer to the elements of the `Inner` array. However, you cannot do both -- the `value` is not scoped by the hierarchy of your HTML.
 * * The `data-f-foreach` attribute is [similar to the `data-f-repeat` attribute](../../repeat-attr/), so you may want to review the examples there as well.
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
