/**
 * ## Display Array and Object Variables: data-f-foreach
 *
 * If your model variable is an array, you can reference specific elements of the array using `data-f-bind`: `data-f-bind="sales[3]"` or `data-f-bind="sales[<currentRegion>]"`, as described under [data-f-bind](../../binds/default-bind-attr/).
 *
 * However, sometimes you want to loop over *all* of the children of the referenced variable. The `data-f-foreach` attribute allows you to automatically loop over all the 'children' of a referenced variable &mdash; that is, all the elements of an array, or all the fields of an object.
 *
 * You can use the `data-f-foreach` attribute to name the variable, then use a combination of templates and aliases to access the index and value of each child for display. (Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).)
 *
 * **To display a DOM element based on an array variable from your model:**
 *
 * 1. Add the `data-f-foreach` attribute to any HTML element that has repeated sub-elements. The two most common examples are lists and tables. The `data-f-foreach` goes on the enclosing element. For a list, this is the `<ul>`, and for a table, it's the `<tbody>`.
 * 2. Set the value of the `data-f-foreach` attribute in your top-level HTML element to reference the model array variable. You can do this either with or without introducing an alias to reference the array elements: `<ul data-f-foreach="Time"></ul>` or `<ul data-f-foreach="t in Time"></ul>`.
 * 3. Add the HTML in which the value of your model array variable should appear. Optionally, inside this inner HTML element, you can use templates (`<%= %>`) to reference the `index` (for arrays) or `key` (for objects) and `value` to display, or to reference the alias you introduced. The `index`, `key`, and `value` are special variables that Flow.js populates for you. 
 *
 *
 * **Examples:**
 *
 * **Basic use of data-f-foreach.** Start with an HTML element that has repeated sub-elements. Add the model variable to this HTML element. Then, add the HTML sub-element where your model variable should appear. 
 *
 * By default, the `value` of the array element or object field is automatically added to the generated HTML:
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
 * **Add templates to reference the index and value.** Optionally, you can use templates (`<%= %>`) to reference the `index` and `value` of the array element to display.
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
 *
 * **Add an alias for the value.** Alternatively, you can add an alias when you initially introduce your model array variable, then reference that alias within templates (`<%= %>`). For example:
 *
 *      <ul data-f-foreach="f in Fruits">
 *          <li> <%= f %> </li>
 *      </ul>
 *
 * which generates:
 *
 *      <ul data-f-foreach="f in Fruits">
 *          <li> apples </li>
 *          <li> bananas </li>
 *          <li> cherries </li>
 *          <li> oranges </li>
 * 
 * **Nesting with aliases.** An advantage to introducing aliases is that you can nest HTML elements that have repeated sub-elements. For example:
 *
 *      <!-- given Sales, an array whose elements are themselves arrays of the sales for each Region -->
 *      <ul data-f-foreach="r in Regions">
 *          <li>Region <%= r %>: 
 *              <ul data-f-foreach="s in Sales[<%= r %>]">
 *                  <li>Sales <%= s %></li>
 *              </ul>
 *          </li>
 *      </ul>
 *
 * **Logic, data processing.** Finally, note that you can add logic to the display of your data by combining templating with either the `value` or an alias. For example, suppose you only want to display the sales total if it is greater than 250:
 *
 *      <table>
 *          <tbody data-f-foreach="r in regions">
 *              <tr data-f-foreach="s in sales">
 *                  <td><%= r + ": " %> <%= (s > 250) ? s : "sales below threshold" %></td>
 *              </tr>
 *          </tbody>
 *      </table>
 *
 * (However, if you want to completely hide the table cell for the region if the sales total is too low, you still need to [write your own converter](../../../../../converter-overview).)
 *
 * **Notes:**
 *
 * * You can use the `data-f-foreach` attribute with both arrays and objects. If the model variable is an object, reference the `key` instead of the `index` in your templates.
 * * You can use nested `data-f-foreach` attributes to created nested loops of your data. 
 * * The `data-f-foreach`, whether using aliases or not, goes on the enclosing element. For a list, this is the `<ul>`, and for a table, it's the `<tbody>`.
 * * The template syntax is to enclose each code fragment (including `index`, `key`, `variable`, or alias) in `<%=` and `%>`. Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).
 * * The `key`, `index`, and `value` are special variables that Flow.js populates for you. However, they are *no longer available* if you use aliases.
 * * As with other `data-f-` attributes, you can specify [converters](../../../../../converter-overview) to convert data from one form to another:
 *
 *          <ul data-f-foreach="Sales | $x,xxx">
 *              <li> Year <%= index %>: Sales of <%= value %> </li>
 *          </ul>
 *
 * * The `data-f-foreach` attribute is [similar to the `data-f-repeat` attribute](../../repeat-attr/), so you may want to review the examples there as well.
 */
const parseUtils = require('../../../utils/parse-utils');
const config = require('../../../config');

const { addChangeClassesToList } = require('utils/animation');
const { uniqueId, each, template } = require('lodash');

function refToMarkup(refKey) {
    return '<!--' + refKey + '-->';
}

const elTemplateMap = new WeakMap();

const MISSING_REFERENCES_KEY = 'missing-references';
const MISSING_REFERENCE_ATTR = `data-${MISSING_REFERENCES_KEY}`;

const CURRENT_INDEX_KEY = 'current-index';
const CURRENT_INDEX_ATTR = `data-${CURRENT_INDEX_KEY}`;

module.exports = {

    test: 'foreach',

    target: '*',

    unbind: function (attr, $el) {
        const el = $el.get(0);
        const template = elTemplateMap.get(el);
        if (template) {
            $el.html(template);
            elTemplateMap.delete(el);
        }

        const dataToRemove = [config.attrs.keyAs, config.attrs.valueAs, MISSING_REFERENCES_KEY];
        $el.removeData(dataToRemove);

        const attrsToRemove = [MISSING_REFERENCE_ATTR, CURRENT_INDEX_ATTR];
        $el.removeAttr(attrsToRemove.join(' '));
    },

    //provide variable name from bound
    parse: function (attrVal, $el) {
        const inMatch = attrVal.match(/(.*) (?:in|of) (.*)/);
        if (inMatch) {
            const itMatch = inMatch[1].match(/\((.*),(.*)\)/);
            if (itMatch) {
                $el.data(config.attrs.keyAs, itMatch[1].trim());
                $el.data(config.attrs.valueAs, itMatch[2].trim());
            } else {
                $el.data(config.attrs.valueAs, inMatch[1].trim());
            }
            attrVal = inMatch[2];
        }
        return attrVal;
    },

    handle: function (value, prop, $el) {
        value = ($.isPlainObject(value) ? value : [].concat(value));

        const el = $el.get(0);
        let loopTemplate = elTemplateMap.get(el);
        if (!loopTemplate) {
            loopTemplate = $el.html();
            elTemplateMap.set(el, loopTemplate);
        }
        
        let cloop = loopTemplate.replace(/&lt;/g, '<').replace(/&gt;/g, '>');

        const defaultKey = $.isPlainObject(value) ? 'key' : 'index';
        const keyAttr = $el.data(config.attrs.keyAs) || defaultKey;
        const valueAttr = $el.data(config.attrs.valueAs) || 'value';
        
        const keyRegex = new RegExp('\\b' + keyAttr + '\\b');
        const valueRegex = new RegExp('\\b' + valueAttr + '\\b');

        //This needs to handle nested loops so you may not have all the data you need
        const closestParentWithMissing = $el.closest(`[${MISSING_REFERENCE_ATTR}]`);
        if (closestParentWithMissing.length) { //(grand)parent already stubbed out missing references
            const missing = closestParentWithMissing.data(MISSING_REFERENCES_KEY);
            each(missing, function (replacement, template) {
                if (keyRegex.test(template) || valueRegex.test(template)) {
                    cloop = cloop.replace(refToMarkup(replacement), template);
                }
            });
            //don't remove MISSING_REFERENCE_ATTR here because siblings may need it
        } else {
            const missingReferences = {};
            const templateTagsUsed = cloop.match(/<%[=-]?([\s\S]+?)%>/g);
            if (templateTagsUsed) {
                templateTagsUsed.forEach(function (tag) {
                    if (tag.match(/\w+/) && !keyRegex.test(tag) && !valueRegex.test(tag)) {
                        let refKey = missingReferences[tag];
                        if (!refKey) {
                            refKey = uniqueId('no-ref');
                            missingReferences[tag] = refKey;
                        }
                        const r = new RegExp(tag, 'g');
                        cloop = cloop.replace(r, refToMarkup(refKey));
                    }
                });
            }
            if (Object.keys(missingReferences).length) {
                //Attr, not data, to make jQ selector easy. No f- prefix to keep this from flow.
                $el.attr(MISSING_REFERENCE_ATTR, JSON.stringify(missingReferences));
            }
        }

        const closestKnownDataEl = $el.closest(`[${CURRENT_INDEX_ATTR}]`);
        let knownData = {};
        if (closestKnownDataEl.length) {
            knownData = closestKnownDataEl.data(CURRENT_INDEX_KEY);
        }
        const templateFn = template(cloop);
        const $dummyEl = $('<div></div>');
        each(value, function (dataval, datakey) {
            if (!dataval) {
                dataval = dataval + ''; //convert undefineds to strings
            }
            const templateData = {};
            templateData[keyAttr] = datakey;
            templateData[valueAttr] = dataval;
            
            $.extend(templateData, knownData);

            let nodes;
            let isTemplated;
            try {
                const templatedLoop = templateFn(templateData);
                isTemplated = templatedLoop !== cloop;
                nodes = $(templatedLoop);
            } catch (e) { //you don't have all the references you need;
                nodes = $(cloop);
                isTemplated = true;
                $(nodes).attr(CURRENT_INDEX_ATTR, JSON.stringify(templateData));
            }

            nodes.each(function (i, newNode) {
                const $newNode = $(newNode);
                each($newNode.data(), function (val, key) {
                    $newNode.data(key, parseUtils.toImplicitType(val));
                });
                if (!isTemplated && !$newNode.html().trim()) {
                    $newNode.html(dataval);
                }
            });
            $dummyEl.append(nodes);
        });
        
        const $withAnimAttrs = addChangeClassesToList($el, $dummyEl, config.animation);
        $el.empty().append($withAnimAttrs.children());
    }
};
