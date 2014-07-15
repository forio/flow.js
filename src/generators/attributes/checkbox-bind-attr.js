'use strict';

module.exports = {

    test: function (attr, $node) {
        return (attr === 'bind' && $node.is(':checkbox'));
    },

    handle: function(prop, value) {
        this.prop('checked', !!value);
    }
};