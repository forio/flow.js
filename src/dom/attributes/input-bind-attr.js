'use strict';

module.exports = {

    target: 'input',

    test: 'bind',

    handle: function(prop, value) {
        this.val(value);
    }
};
