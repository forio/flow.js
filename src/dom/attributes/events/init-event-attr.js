/**
 * ## Call Operation when Element Added to DOM
 *
 * Many models call an initialization operation when the [run](../../../../../../glossary/#run) is first created. This is particularly common with [Vensim](../../../../../../model_code/vensim/) models, which need to initialize variables ('startGame') before stepping. You can use the `data-f-on-init` attribute to call an operation from the model when a particular element is added to the DOM.
 *
 * #### data-f-on-init
 *
 * Add the attribute `data-f-on-init`, and set the value to the name of the operation. To call multiple operations, use the `|` (pipe) character to chain operations. Operations are called serially, in the order listed. Typically you add this attribute to the `<body>` element.
 *
 * **Example**
 *
 *      <body data-f-on-init="startGame">
 *
 *      <body data-f-on-init="startGame | step(3)">
 *
 */

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

            //FIXME: this knows too much about the channel
            me.trigger('f.ui.operate', { operations: listOfOperations, serial: true, options: { readOnly: false } });
        });
        return false; //Don't bother binding on this attr. NOTE: Do readonly, true instead?;
    }
};
