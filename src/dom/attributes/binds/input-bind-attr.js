'use strict';

module.exports = {
    target: 'input, select',

    test: 'bind',

    handle: function (value) {
        this.val(value);
    }
};
