'use strict';

module.exports = {

    target: '*',

    test: 'bind',

    handle: function (value) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        this.html(value);
    }
};
