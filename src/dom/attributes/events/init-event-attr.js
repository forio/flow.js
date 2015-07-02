'use strict';

module.exports = {

    target: '*',

    test: function (attr, $node) {
        return (attr.indexOf('on-init') === 0);
    },

    init: function (attr, value) {
        attr = attr.replace('on-init', '');
        var me = this;
        $(function () {
            var listOfOperations = _.invoke(value.split('|'), 'trim');
            listOfOperations = listOfOperations.map(function (value) {
                var fnName = value.split('(')[0];
                var params = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
                var args = ($.trim(params) !== '') ? params.split(',') : [];
                return { name: fnName, params: args };
            });

            me.trigger('f.ui.operate', { operations: listOfOperations, serial: true });
        });
        return false; //Don't bother binding on this attr. NOTE: Do readonly, true instead?;
    }
};
