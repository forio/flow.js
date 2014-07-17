'use strict';

module.exports = {

    target: ':checkbox',

    test: 'bind',

    handle: function (value) {
        var settableValue = this.prop('value');
        var isChecked = (settableValue !== undefined) ? (settableValue === value) : !!value;
        this.prop('checked', isChecked);
    }
};
