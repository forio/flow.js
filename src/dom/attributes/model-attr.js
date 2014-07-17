'use strict';

module.exports = {

    target: '*',

    test: 'model',

    //Nothing to do with this, assume someone else is handling it
    handle: $.noop,

    init: function() {
        return false;
    }
};
