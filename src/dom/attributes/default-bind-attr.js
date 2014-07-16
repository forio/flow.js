'use strict';

module.exports = {

    target: ':not(input)',

    test: 'bind',

    handle: function(prop, value) {
        this.html(value);
    }
};
