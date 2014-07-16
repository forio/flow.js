'use strict';

module.exports = {

    name: 'negative-boolean',

    test: /^(?:disabled|hidden|readonly)$/i,

    handle: function(value, prop) {
        this.prop(prop, !value);
    }
};
