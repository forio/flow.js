'use strict';

module.exports = {

    test: $.expr.match.bool,

    handle: function(prop, value) {
        this.prop(prop, !value);
    }
};
