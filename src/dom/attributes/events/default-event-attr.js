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

import { events } from 'config';
import { toPublishableFormat } from 'utils/parse-utils';

/**
 * @type AttributeHandler 
 */
const defaultEventAttr = {

    target: '*',

    test: function (attr) {
        return (attr.indexOf('on-') === 0);
    },

    unbind: function (attr, $el) {
        const eventName = attr.replace('on-', '');
        $el.off(eventName);
    },

    parse: function () {
        return []; //There's nothing to subscribe to on an event
    },

    init: function (attr, topics, $el) {
        const eventName = attr.replace('on-', '');
        const matching = topics[0] && topics[0].name; //multiple topics aren't really relevant here
        $el.off(eventName).on(eventName, function (evt) {
            evt.preventDefault();
            var listOfOperations = toPublishableFormat(matching);
            $el.trigger(events.operate, { data: listOfOperations, source: attr });
        });
    }
};

export default defaultEventAttr;
