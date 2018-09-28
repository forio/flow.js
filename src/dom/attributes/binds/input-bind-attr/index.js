/**
 * @type AttributeHandler 
 */
const inputBindAttr = {
    target: 'input, select, textarea',

    test: 'bind',

    handle: function (value, prop, $el) {
        if (value === undefined) {
            value = '';
        } else if (Array.isArray(value)) {
            value = value[value.length - 1];
        }
        $el.val(value + '');
    }
};

export default inputBindAttr;
