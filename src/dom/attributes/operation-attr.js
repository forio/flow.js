'use strict';

module.exports = {

    name: 'on-',

    test: function (attr, $node) {
        return (attr.indexOf('on-') === 0);
    },

    init: function(attr, value) {
        attr = attr.replace('on-', '');
        var me = this;
        this.on(attr, function() {
            var fnName = value.split('(')[0];
            var params = value.substring(value.indexOf('(') + 1, value.indexOf(')')).split(',');
            me.trigger('f.ui.operate', {fn: fnName, args: params});
        });
    }
};
