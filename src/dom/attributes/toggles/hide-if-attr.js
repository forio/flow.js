
'use strict';
module.exports = {
    test: 'hideif',

    target: '*',

    init: function () {
        this.hide(); //hide by default; if not this shows text until data is fetched
        return true;
    },
    handle: function (value, prop) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        return value === true ? this.hide() : this.show();
    }
};
