'use strict';

module.exports = {

    test: '*',

    target: '*',

    handle: function(prop, value) {
        this.prop(prop, value);
    }
};
