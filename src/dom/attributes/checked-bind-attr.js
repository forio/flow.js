'use strict';

module.exports = {

    target: ':checkbox,:radio',

    test: 'bind',

    handle: function(prop, value) {
        this.prop('checked', !!value);
    }
};
