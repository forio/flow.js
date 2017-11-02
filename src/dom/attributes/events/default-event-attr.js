/**
 * ## Call Operation in Response to User Action
 *
 * Many models call particular operations in response to end user actions, such as clicking a button or submitting a form.
 *
 * #### data-f-on-event
 *
 * For any HTML attribute using `on` -- typically on click or on submit -- you can add the attribute `data-f-on-XXX`, and set the value to the name of the operation. To call multiple operations, use the `|` (pipe) character to chain operations. Operations are called serially, in the order listed.
 *
 * **Example**
 *
 *      <button data-f-on-click="reset">Reset</button>
 *
 *      <button data-f-on-click="step(1)">Advance One Step</button>
 *
 */

'use strict';
var config = require('config');
var toOperationFormat = require('utils/parse-utils').toOperationFormat;

module.exports = {

    target: '*',

    test: function (attr, $node) {
        return (attr.indexOf('on-') === 0);
    },

    unbind: function (attr) {
        attr = attr.replace('on-', '');
        this.off(attr);
    },

    init: function (attr, value) {
        attr = attr.replace('on-', '');
        var me = this;
        this.off(attr).on(attr, function (evt) {
            evt.preventDefault();
            var listOfOperations = toOperationFormat(value);
            me.trigger(config.events.operate, { operations: listOfOperations });
        });
        return false; //Don't bother binding on this attr. NOTE: Do readonly, true instead?;
    }
};
