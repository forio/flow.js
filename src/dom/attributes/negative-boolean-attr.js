'use strict';

module.exports = {

    name: 'negative-boolean',

    test: /^(?:disabled|hidden|readonly)$/i,

    handle: function(prop, value) {
        this.prop(prop, !value);
    }
};
