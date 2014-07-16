'use strict';

module.exports = {
    name: 'positive-boolean',

    test: /^(?:checked|selected|async|autofocus|autoplay|controls|defer|ismap|loop|multiple|open|required|scoped)$/i,

    handle: function(value, prop) {
        this.prop(prop, !!value);
    }
};
