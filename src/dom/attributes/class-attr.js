'use strict';

module.exports = {

    test: 'class',

    handle: function(value, prop) {
        this.prop('disabled', !value);
    }
};
