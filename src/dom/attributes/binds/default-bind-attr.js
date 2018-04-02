/**
 * ## Default Bi-directional Binding: data-f-bind
 *
 * The most commonly used attribute provided by Flow.js is the `data-f-bind` attribute.
 *
 * #### data-f-bind with a single value
 *
 * You can bind variables from the model in your interface by setting the `data-f-bind` attribute. This attribute binding is bi-directional, meaning that as the model changes, the interface is automatically updated; and when users change values in the interface, the model is automatically updated. Specifically:
 *
 * * The binding from the model to the interface ensures that the current value of the variable is displayed in the HTML element. This includes automatic updates to the displayed value if something else changes in the model.
 *
 * * The binding from the interface to the model ensures that if the HTML element is editable, changes are sent to the model.
 *
 * Once you set `data-f-bind`, Flow.js figures out the appropriate action to take based on the element type and the data response from your model.
 *
 * **To display and automatically update a variable in the interface:**
 *
 * 1. Add the `data-f-bind` attribute to any HTML element that normally takes a value.
 * 2. Set the value of the `data-f-bind` attribute to the name of the variable.
 *
 * **Example**
 *
 *      <span data-f-bind="salesManager.name" />
 *
 *      <input type="text" data-f-bind="sampleString" />
 *
 * **Notes:**
 *
 * * Use square brackets, `[]`, to reference arrayed variables: `sales[West]`.
 * * Use angle brackets, `<>`, to reference other variables in your array index: `sales[<currentRegion>]`.
 * * Remember that if your model is in Vensim, the time step is the last array index.
 * * By default, all HTML elements update for any change for each variable. However, you can prevent the user interface from updating &mdash; either for all variables or for particular variables &mdash; by setting the `silent` property when you initialize Flow.js. See more on [additional options for the Flow.initialize() method](../../../../../#custom-initialize).
 *
 * #### data-f-bind with multiple values and templates
 *
 * If you have multiple variables, you can use the shortcut of listing multiple variables in an enclosing HTML element and then referencing each variable using templates. (Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).)
 *
 * **To display and automatically update multiple variables in the interface:**
 *
 * 1. Add the `data-f-bind` attribute to any HTML element from which you want to reference model variables, such as a `div` or `table`.
 * 2. Set the value of the `data-f-bind` attribute in your top-level HTML element to a comma-separated list of the variables. (The variables may or may not be case-sensitive, depending on your modeling language.)
 *
 * 3. Inside the HTML element, use templates (`<%= %>`) to reference the specific variable names. These variable names are case-sensitive: they should match the case you used in the `data-f-bind` in step 2.
 *
 * **Example**
 *
 *      <!-- make these three model variables available throughout div -->
 *
 *      <div data-f-bind="CurrentYear, Revenue, Profit">
 *          In <%= CurrentYear %>,
 *          our company earned <%= Revenue %>,
 *          resulting in <%= Profit %> profit.
 *      </div>
 *
 * This example is shorthand for repeatedly using data-f-bind. For instance, this code also generates the same output:
 *
 *      <div>
 *          In <span data-f-bind="CurrentYear"></span>,
 *          our company earned <span data-f-bind="Revenue"></span>,
 *          resulting in <span data-f-bind="Profit"> profit</span>.
 *      </div>
 *
 * **Notes:**
 *
 * * Adding `data-f-bind` to the enclosing HTML element rather than repeatedly using it within the element is a code style preference. In many cases, adding `data-f-bind` at the top level, as in the first example, can make your code easier to read and maintain.
 * * However, you might choose to repeatedly use `data-f-bind` in some cases, for example if you want different [formatting](../../../../../converter-overview/) for different variables:
 *
 *          <div>
 *              In <span data-f-bind="CurrentYear | #"></span>,
 *              our company earned <span data-f-bind="Revenue | $#,###"></span>
 *          </div>
 *
 * * Because everything within your template (`<%= %>`) is evaluated as JavaScript, you can use templates to pass expressions to other Flow.js attributes. For example,
 *
 *          <div data-f-bind="myCurrentTimeStep">
 *              <div data-f-bind="Revenue[<%= value + 1%>]"></div>
 *          </div>
 *
 * will display the value of `Revenue[myCurrentTimeStep + 1]` (for example an estimate of future revenue in your model).
 *
 */

'use strict';
const { template } = require('lodash');
const { addContentAndAnimate } = require('utils/animation');
const config = require('../../../config');

const { getKnownDataForEl, updateKnownDataForEl, removeKnownData, 
    findMissingReferences, stubMissingReferences, addBackMissingReferences,
    isTemplated,
} = require('../attr-template-utils');


const elTemplateMap = new WeakMap(); //<dom-element>: template
const elAnimatedMap = new WeakMap(); //TODO: Can probably get rid of this if we make subscribe a promise and distinguish between initial value

function translateDataToInsertable(value) {
    if (Array.isArray(value)) {
        value = value[value.length - 1];
    }
    value = ($.isPlainObject(value)) ? JSON.stringify(value) : value + '';
    return value;
}
function translateDataToTemplatable(value, additionalKey) {
    let templateData = {};
    if (!$.isPlainObject(value)) {
        templateData = { value: value };
        if (additionalKey) {
            templateData[additionalKey] = value;
        }
    } else {
        templateData = $.extend({}, value, {
            value: value, //If the key has 'weird' characters like '<>' hard to get at with a template otherwise
        });
    }
    return templateData;
}

module.exports = {

    target: '*',

    test: 'bind',

    /**
     * @param {string} attr
     * @param {JQuery<HTMLElement>} $el
     * @return {void}
     */ 
    unbind: function (attr, $el) {
        const el = $el.get(0);
        elAnimatedMap.delete(el);

        const bindTemplate = elTemplateMap.get(el);
        if (bindTemplate) {
            $el.html(bindTemplate);
            elTemplateMap.delete(el);
        }
        removeKnownData($el);
    },

    /**
    * @param {any} value
    * @param {string} prop
    * @param {JQuery<HTMLElement>} $el
    * @return {void}
    */ 
    handle: function (value, prop, $el) {
        const el = $el.get(0);
        
        let bindTemplate = elTemplateMap.get(el);
        if (!bindTemplate) {
            bindTemplate = $el.html().replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            elTemplateMap.set(el, bindTemplate);
        }

        function getContentHTML(bindTemplate, value) {
            if (!isTemplated(bindTemplate)) {
                return translateDataToInsertable(value);
            } 

            let templateData = translateDataToTemplatable(value, $el.data(`f-${prop}`));
            const knownData = getKnownDataForEl($el);
            $.extend(templateData, knownData);

            const missingReferences = findMissingReferences(bindTemplate, Object.keys(templateData));
            bindTemplate = stubMissingReferences(bindTemplate, missingReferences);

            const templateFn = template(bindTemplate);
            let templatedHTML;
            try {
                templatedHTML = templateFn(templateData);
                templatedHTML = addBackMissingReferences(templatedHTML, missingReferences);
            } catch (e) { //you don't have all the references you need;
                updateKnownDataForEl($el, templateData);
            }

            return templatedHTML;
        }


        const contents = getContentHTML(bindTemplate, value);
        addContentAndAnimate($el, contents, !elAnimatedMap.has(el));
        elAnimatedMap.set(el, true, config.animation);
    }
};
