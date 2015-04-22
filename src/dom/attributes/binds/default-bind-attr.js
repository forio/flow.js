'use strict';

module.exports = {

    target: '*',

    test: 'bind',

    handle: function (value) {
        var current = this.html();
        var templated = _.template(current, value);
        if (current === templated) {
            if (_.isArray(value)) {
                value = value[value.length - 1];
            }
            this.html(value);
        } else {
            this.html(templated);
        }
    }
};
