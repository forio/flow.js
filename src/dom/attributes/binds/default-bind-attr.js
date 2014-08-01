'use strict';

module.exports = {

    target: '*',

    test: 'bind',

    handle: function (value) {
        this.html(value);
    }
};
