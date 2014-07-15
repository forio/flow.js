'use strict';

module.exports = {

    test: function (attr, $node) {
        return (attr === 'bind' && $node.prop('nodeName').toLowerCase() === 'input');
    },

    handle: function(prop, value) {
        this.val(value);
    }
};
