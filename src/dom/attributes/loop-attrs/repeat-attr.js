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
 * * In most cases the same effect can be achieved with the [`data-f-foreach` attribute](../../attributes/loop-attrs/foreach-attr/), which is similar. In the common use case of a table of data displayed over time, the `data-f-repeat` can be more concise and easier to read. However, the `data-f-foreach` allows aliasing, and so can be more useful especially if you are nesting HTML elements or want to introduce logic about how to display the values.
 *
 */

const { each, template } = require('lodash');
const parseUtils = require('utils/parse-utils');
const gutils = require('utils/general');
const config = require('config');

const templateIdAttr = config.attrs.repeat.templateId;

const { addChangeClassesToList } = require('utils/animation');

const elAnimatedMap = new WeakMap(); //TODO: Can probably get rid of this if we make subscribe a promise and distinguish between initial value

const { getKnownDataForEl, updateKnownDataForEl, removeKnownData, 
    findMissingReferences, stubMissingReferences, addBackMissingReferences,
    getOriginalContents, clearOriginalContents,
} = require('../attr-template-utils');

const { extractVariableName, parseKeyAlias, parseValueAlias } = require('./loop-attr-utils');

module.exports = {

    test: 'repeat',

    target: '*',

    unbind: function (attr, $el) {
        var id = $el.data(templateIdAttr);
        if (id) {
            $el.nextUntil(':not([data-' + id + '])').remove();
            // $el.removeAttr('data-' + templateIdAttr); //FIXME: Something about calling rebind multiple times in IB makes this happen without the removal
        }

        const el = $el.get(0);
        elAnimatedMap.delete(el);

        const originalHTML = getOriginalContents($el);
        if (originalHTML) {
            $el.replaceWith(originalHTML);
        }
        clearOriginalContents($el);

        removeKnownData($el);
    },

    parse: function (topics) {
        const attrVal = topics[0].name;
        return { name: extractVariableName(attrVal) };
    },

    handle: function (value, prop, $el) {
        value = ($.isPlainObject(value) ? value : [].concat(value));
        var id = $el.data(templateIdAttr);
        
        const originalHTML = getOriginalContents($el, ($el)=> $el.get(0).outerHTML);

        const $dummyOldDiv = $('<div></div>');
        if (id) {
            const $removed = $el.nextUntil(':not([data-' + id + '])').remove();
            $dummyOldDiv.append($removed);
        } else {
            id = gutils.random('repeat-');
            $el.attr('data-' + templateIdAttr, id);
        }

        const attrVal = $el.data(`f-${prop}`);
        const keyAttr = parseKeyAlias(attrVal, value);
        const valueAttr = parseValueAlias(attrVal, value);

        const knownData = getKnownDataForEl($el);
        const missingReferences = findMissingReferences(originalHTML, [keyAttr, valueAttr].concat(Object.keys(knownData)));
        const stubbedTemplate = stubMissingReferences(originalHTML, missingReferences);

        const templateFn = template(stubbedTemplate);
        var last;
        each(value, function (dataval, datakey) {
            if (dataval === undefined || dataval === null) {
                dataval = dataval + ''; //convert undefineds to strings
            }
            const templateData = $.extend(true, {}, knownData, {
                [keyAttr]: datakey,
                [valueAttr]: dataval
            });

            let nodes;
            let isTemplated;
            try {
                const templated = templateFn(templateData);
                const templatedWithReferences = addBackMissingReferences(templated, missingReferences);
                isTemplated = templatedWithReferences !== stubbedTemplate;
                nodes = $(templatedWithReferences);
            } catch (e) { //you don't have all the references you need;
                nodes = $(stubbedTemplate);
                isTemplated = true;
                updateKnownDataForEl($(nodes), templateData);
            }

            var hasData = (dataval !== null && dataval !== undefined);
            nodes.each(function (i, newNode) {
                const $newNode = $(newNode);
                $newNode.removeAttr('data-f-repeat').removeAttr('data-' + templateIdAttr);
                each($newNode.data(), function (val, key) {
                    if (!last) {
                        $el.data(key, parseUtils.toImplicitType(val));
                    } else {
                        $newNode.data(key, parseUtils.toImplicitType(val));
                    }
                });
                $newNode.attr('data-' + id, true);
                if (!isTemplated && !$newNode.children().length && hasData) {
                    $newNode.html(dataval + '');
                }
            });
            if (!last) {
                last = $el.html(nodes.html());
            } else {
                last = nodes.insertAfter(last);
            }
        });

        const $newEls = $el.nextUntil(`:not('[data-${id}]')`);

        const el = $el.get(0);
        const isInitialAnim = !elAnimatedMap.get(el);
        addChangeClassesToList($dummyOldDiv.children(), $newEls, isInitialAnim, config.animation);

        elAnimatedMap.set(el, true);
    }
};
