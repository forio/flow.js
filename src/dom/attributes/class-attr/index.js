import { isNumber } from 'lodash';

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
