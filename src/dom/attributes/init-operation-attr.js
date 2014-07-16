'use strict';

module.exports = {

    test: function (attr, $node) {
        return (attr.indexOf('on-init') === 0);
    },

    init: function(attr, value) {
        attr = attr.replace('on-init', '');
        $(function () {
            var fnName = value.split('(')[0];
            var params = value.substring(value.indexOf('(') + 1, value.indexOf(')')).split(',');

            this.trigger('f.ui.operate', {fn: fnName, args: params});
        });
    }
};
