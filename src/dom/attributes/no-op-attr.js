'use strict';

// Attributes which are just parameters to others and can just be ignored
module.exports = {

    target: '*',

    test: /^(?:model|format)$/i,

    handle: $.noop,

    init: function() {
        return false;
    }
};
