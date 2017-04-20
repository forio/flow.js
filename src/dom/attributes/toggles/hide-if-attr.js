
'use strict';
module.exports = {
    test: 'hideif',

    target: '*',

    handle: function (value, prop) {
        return value ? this.hide() : this.show();
    }
};
