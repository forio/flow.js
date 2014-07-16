'use strict';

module.exports = {

    test: /^(?:disabled|hidden|readonly)$/i,

    handle: function(prop, value) {
        this.prop(prop, !value);
    }
};
