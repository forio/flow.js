/**
  * @type AttributeHandler
  */
const hideifHandler = {
    test: 'hideif',

    target: '*',

    init: function (attr, value, $el) {
        $el.hide(); //hide by default; if not this shows text until data is fetched
    },
    handle: function (value, prop, $el) {
        if (Array.isArray(value)) {
            value = value[value.length - 1];
        }
        if (value && `${value}`.trim()) {
            $el.hide();
        } else {
            $el.show();
        }
    }
};

export default hideifHandler;
