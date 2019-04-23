import { events } from 'config';
import { toPublishableFormat } from 'utils/parse-utils';

function eventNameFromAttr(attr) {
    const eventName = attr.replace('on-', '');
    const nameSpacedEvent = `${eventName}.f-event`;
    return nameSpacedEvent;
}
/**
 * @type AttributeHandler 
 */
const defaultEventAttr = {

    target: '*',

    test: function (attr) {
        return (attr.indexOf('on-') === 0);
    },

    unbind: function (attr, $el) {
        const eventName = eventNameFromAttr(attr);
        $el.off(eventName);
    },

    parse: ()=> ([]), //There's nothing to subscribe to on an event
    handle: ()=> {},

    init: function (attr, topics, $el) {
        const matching = topics[0] && topics[0].name; //multiple topics aren't really relevant here
        const eventName = eventNameFromAttr(attr);
        $el.off(eventName).on(eventName, function (evt) {
            evt.preventDefault();
            var listOfOperations = toPublishableFormat(matching);
            $el.trigger(events.trigger, { data: listOfOperations, source: attr });
        });
    }
};

export default defaultEventAttr;
