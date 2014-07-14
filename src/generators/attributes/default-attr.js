'use strict';

module.exports = {

    test: function () {
        return true;
    },

    handle: function(prop, value) {
        this.prop(prop, value);
    }
};
