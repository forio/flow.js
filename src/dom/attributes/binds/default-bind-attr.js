'use strict';

module.exports = {

    target: '*',

    test: 'bind',

    handle: function (val) {
        this.html(val);
    }
};
