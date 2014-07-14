'use strict';

module.exports = {

    test: function (attr, $node) {
        return (attr.indexOf('on-') === 0);
    },

    init: function(attr, value, $node) {
        attr = attr.replace('on-', '');
        $node.on(attr, function() {
            var fnName = value.split('(')[0];
            var params = value.substring(value.indexOf('(') + 1, value.indexOf(')')).split(',');
            $node.trigger('f.ui.operate', {fn: fnName, args: params});
        });
    }
};
