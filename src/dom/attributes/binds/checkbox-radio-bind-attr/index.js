/**
  * @type {AttributeHandler}
  */
const checkboxAttrHandler = {

    target: ':checkbox,:radio',

    test: 'bind',

    handle: function (value, prop, $el) {
        if (Array.isArray(value)) {
            value = value[value.length - 1];
        }
        const settableValue = $el.attr('value'); //initial value
        const isChecked = (typeof settableValue !== 'undefined') ? (settableValue == value) : !!value; //eslint-disable-line eqeqeq
        $el.prop('checked', isChecked);
    }
};

export default checkboxAttrHandler;
