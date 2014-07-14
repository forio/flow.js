'use strict';

module.exports = {

    test: 'class',

    handle: function(prop, value) {
        this.prop('disabled', !value);
    }
};
