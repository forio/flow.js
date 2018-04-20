/**
 * ## Class Attribute: data-f-class
 *
 * You can bind model variables to names of CSS classes, so that you can easily change the styling of HTML elements based on the values of model variables.
 *
 * **To bind model variables to CSS classes:**
 *
 * 1. Add the `data-f-class` attribute to an HTML element.
 * 2. Set the value to the name of the model variable.
 * 3. Optionally, add an additional `class` attribute to the HTML element.
 *      * If you only use the `data-f-class` attribute, the value of `data-f-class` is the class name.
 *      * If you *also* add a `class` attribute, the value of `data-f-class` is *appended* to the class name.
 * 4. Add classes to your CSS code whose names include possible values of that model variable.
 *
 * **Example**
 *
 *      <style type="text/css">
 *          .North { color: grey }
 *          .South { color: purple }
 *          .East { color: blue }
 *          .West { color: orange }
 *          .sales.good { color: green }
 *          .sales.bad { color: red }
 *          .sales.value-100 { color: yellow }
 *       </style>
 *
 *       <div data-f-class="salesMgr.region">
 *           Content colored by region
 *       </div>
 *
 *       <div data-f-class="salesMgr.performance" class="sales">
 *           Content green if salesMgr.performance is good, red if bad
 *       </div>
 *
 *       <div data-f-class="salesMgr.numRegions" class="sales">
 *           Content yellow if salesMgr.numRegions is 100
 *       </div>
 *
 */
import { isNumber } from 'lodash';
import { classesAdded } from '../../../config';

const elClassesMap = new WeakMap();
function deleteAddedClasses($el) {
    const el = $el.get(0);
    const addedClasses = elClassesMap.get(el);
    if (addedClasses) {
        $el.removeClass(addedClasses);
    }
}
/**
 * @type AttributeHandler
 */
const classAttr = {
    test: 'class',

    target: '*',


    unbind: function (attr, $el) {
        const el = $el.get(0);
        deleteAddedClasses($el);
        elClassesMap.delete(el);
    },

    handle: function (value, prop, $el) {
        if (Array.isArray(value)) {
            value = value[value.length - 1];
        }

        const el = $el.get(0);
        deleteAddedClasses($el);

        if (isNumber(value)) {
            value = 'value-' + value;
        }
        $el.addClass(value);

        elClassesMap.set(el, value);
    }
};

export default classAttr;
