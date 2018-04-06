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

var config = require('config');
var toPublishableFormat = require('utils/parse-utils').toPublishableFormat;

module.exports = {

    target: '*',

    test: function (attr, $node) {
        return (attr.indexOf('on-') === 0);
    },

    unbind: function (attr, $el) {
        const eventName = attr.replace('on-', '');
        $el.off(eventName);
    },

    init: function (attr, value, $el) {
        const eventName = attr.replace('on-', '');
        $el.off(eventName).on(eventName, function (evt) {
            evt.preventDefault();
            var listOfOperations = toPublishableFormat(value);
            $el.trigger(config.events.operate, { data: listOfOperations, source: attr });
        });
        return false; //Don't bother binding on this attr. NOTE: Do readonly, true instead?;
    }
};
