/**
 * @type AttributeHandler 
 */
const booleanAttrHandler = {
    target: '*',

    test: /^(?:checked|selected|async|autofocus|autoplay|controls|defer|ismap|loop|multiple|open|required|scoped|disabled|hidden|readonly)$/i,

    handle: function (value, prop, $el) {
        if (Array.isArray(value)) {
            value = value[value.length - 1];
        }
        const val = ($el.attr('value')) ? (value == $el.prop('value')) : !!value; //eslint-disable-line eqeqeq
        $el.prop(prop, val);
    }
};

export default booleanAttrHandler;
