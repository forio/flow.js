'use strict';

module.exports = {

    test: 'class',

    target: '*',

    handle: function(value, prop) {
        this.prop('disabled', !value);
    }
};
