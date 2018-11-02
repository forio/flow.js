/**
  * @type AttributeHandler
  */
const showifHandler = {
    test: 'showif',

    target: '*',

    init: function (attr, value, $el) {
        $el.hide(); //hide by default; if not this shows text until data is fetched
    },

    handle: function (value, prop, $el) {
        if (Array.isArray(value)) {
            value = value[value.length - 1];
        }
        return (value && `${value}`.trim()) ? $el.show() : $el.hide();
    }
};

export default showifHandler;
