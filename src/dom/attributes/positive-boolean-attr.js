'use strict';

module.exports = {
    target: '*',

    test: /^(?:checked|selected|async|autofocus|autoplay|controls|defer|ismap|loop|multiple|open|required|scoped)$/i,

    handle: function(value, prop) {
        /*jslint eqeq: true*/
        var val = (this.prop('value')) ? (value == this.prop('value')) : !!value;
        this.prop(prop, val);
    }
};
