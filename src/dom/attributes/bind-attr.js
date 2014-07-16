'use strict';

module.exports = {

    target: '*',

    test: 'bind',

    handle: function(prop, value, view) {
        if (view && view.setValue) {
            view.setValue(value);
        }
    }
};
