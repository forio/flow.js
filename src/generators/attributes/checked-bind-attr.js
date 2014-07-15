'use strict';

module.exports = {

    test: function (attr, $node) {
        return (attr === 'bind' && ($node.is(':checkbox') || $node.is(':radio')));
    },

    handle: function(prop, value) {
        this.prop('checked', !!value);
    }
};
