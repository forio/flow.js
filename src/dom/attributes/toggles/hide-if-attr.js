
'use strict';
module.exports = {
    test: 'hideif',

    target: '*',

    handle: function (value, prop) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        return value ? this.hide() : this.show();
    }
};
