/**
 * ## Display Array Variables: data-f-repeat
 *
 * The `data-f-repeat` attribute allows you to automatically loop over a referenced variable. The most common use case is in time-based models, like those written in [SimLang](../../../../../model_code/forio_simlang/) or [Vensim](../../../../../model_code/vensim/), when you want to report the value of the variable at every time step so far. The `data-f-repeat` attribute automatically repeats the DOM element it's attached to, filling in the value.
 *
 * **To display a DOM element repeatedly based on an array variable from the model:**
 *
 * 1. Add the `data-f-repeat` attribute to any HTML element that has repeated sub-elements. The two most common examples are lists and tables.
 * 2. Set the value of the `data-f-repeat` attribute in the HTML element you want to repeat to the name of the array variable.
 * 3. Optionally, you can use templates (`<%= %>`) to reference the `index` (for arrays) or `key` (for objects) and `value` to display. The `index`, `key`, and `value` are special variables that Flow.js populates for you.
 *
 *
 * **Examples:**
 *
 * For example, to create a table that displays the year and cost for every step of the model that has occurred so far:
 *
 *      <table>
 *          <tr>
 *              <td>Year</td>
 *              <td data-f-repeat="Cost[Products]"><%= index + 1 %></td>
 *          </tr>
 *          <tr>
 *              <td>Cost of Products</td>
 *              <td data-f-repeat="Cost[Products]"></td>
 *          </tr>
 *      </table>
 *
 * In the third step of the model, this example generates the HTML:
 *
 *      <table>
 *          <tr>
 *              <td>Year</td>
 *              <td data-f-repeat="Cost[Products]">1</td>
 *              <td>2</td>
 *              <td>3</td>
 *          </tr>
 *          <tr>
 *              <td>Cost of Products</td>
 *              <td data-f-repeat="Cost[Products]">100</td>
 *              <td>102</td>
 *              <td>105</td>
 *          </tr>
 *      </table>
 *
 * You can also use this with a `<div>` and have the `<div>` itself repeated. For example:
 *
 *      <div data-f-repeat="sample_array"></div>
 *
 * generates:
 *
 *      <div data-f-repeat="sample_array">2</div>
 *      <div>4</div>
 *      <div>6</div>
 *
 * **Notes:**
 *
 * * You can use the `data-f-repeat` attribute with both arrays and objects. If the model variable is an object, reference the `key` instead of the `index` in your templates.
 * * The `key`, `index`, and `value` are special variables that Flow.js populates for you.
 * * The template syntax is to enclose each keyword (`index`, `key`, `variable`) in `<%=` and `%>`. Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../#templates).
 * * In most cases the same effect can be achieved with the [`data-f-foreach` attribute](../../attributes/foreach/default-foreach-attr/), which is similar. In the common use case of a table of data displayed over time, the `data-f-repeat` can be more concise and easier to read. However, the `data-f-foreach` allows aliasing, and so can be more useful especially if you are nesting HTML elements or want to introduce logic about how to display the values.
 *
 */

'use strict';
var parseUtils = require('../../utils/parse-utils');
var gutils = require('../../utils/general');
// var config = require('../../config');
module.exports = {

    test: 'repeat',

    target: '*',

    handle: function (value, prop) {
        value = ($.isPlainObject(value) ? value : [].concat(value));
        //FIXME: should ideally pull from config, but problem is, once it's unbound don't know what to remove
        //Possible fixes: Let this handle it's own unbind (which does nothing), or
        //have unbind remove all generated elements as well
        var loopTemplate = this.data('repeat-template');
        var id = this.data('repeat-template-id');

        if (id) {
            this.nextUntil(':not([data-' + id + '])').remove(); //clean-up pre-saved html
        } else {
            id = gutils.random('repeat-');
            this.data('repeat-template-id', id);
        }
        if (!loopTemplate) {
            loopTemplate = this.get(0).outerHTML;
            this.data('repeat-template', loopTemplate);
        }

        var last;
        var me = this;
        _.each(value, function (dataval, datakey) {
            var cloop = loopTemplate.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            var templatedLoop = _.template(cloop, { value: dataval, key: datakey, index: datakey });
            var isTemplated = templatedLoop !== cloop;
            var nodes = $(templatedLoop);
            var hasData = (dataval !== null && dataval !== undefined);

            nodes.each(function (i, newNode) {
                newNode = $(newNode).removeAttr('data-f-repeat');
                _.each(newNode.data(), function (val, key) {
                    if (!last) {
                        me.data(key, parseUtils.toImplicitType(val));
                    } else {
                        newNode.data(key, parseUtils.toImplicitType(val));
                    }
                });
                newNode.attr('data-' + id, true);
                if (!isTemplated && !newNode.children().length && hasData) {
                    newNode.html(dataval + '');
                }
            });
            if (!last) {
                last = me.html(nodes.html());
            } else {
                last = nodes.insertAfter(last);
            }
        });
    }
};
