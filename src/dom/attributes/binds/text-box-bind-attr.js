'use strict';

module.exports = {

    target: 'input',

    test: 'bind',

    handle: function (value) {
        this.val(value);
    }
};
