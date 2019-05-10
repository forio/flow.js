import { toImplicitType } from 'utils/parse-utils';
import _ from 'lodash';

export function match(topic) {
    return (topic.indexOf('#') === 0) ? '' : false;
} 


export default function DOMRouteHandler(options, notifier) {
    
    const knownEls = new WeakMap();
    const domOptions = $.extend(true, {
        uiChangeEvents: {

        },
        debounceInterval: 200
    }, options.defaults, options.dom);

    function changeHandler($el, id, evt) {
        const val = toImplicitType($el.val());
        notifier([{ name: id, value: val }]);
    }
    const debouncedChangeHandler = _.debounce(changeHandler, domOptions.debounceInterval);
    return {
        match: match,
        name: 'DOM Route',
        subscribeHandler: function (topics) {
            const parsed = topics.map((elID)=> {
                const $el = $(elID);
                if (!knownEls.has($el)) {
                    knownEls.set($el, true);
                    const overrides = domOptions.uiChangeEvents || {};
                    const matchingEventOverride = Object.keys(overrides).find((selector)=> {
                        return $el.is(selector);
                    });
                    const changeEvent = matchingEventOverride ? overrides[matchingEventOverride] : 'change';
                    const handler = changeEvent.indexOf('key') !== -1 ? debouncedChangeHandler : changeHandler;
                    $el.on(`${changeEvent}.dom-handler`, handler.bind(this, $el, elID));
                }

                const val = toImplicitType($el.val());
                return {
                    name: elID,
                    value: val
                };
            });
            return parsed;
        },
        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            const toKill = unsubscribedTopics.filter((t)=> {
                const isRemaining = remainingTopics.indexOf(t) !== -1;
                return !isRemaining;
            });
            toKill.forEach((elID)=> {
                const $el = $(elID);

                $el.off('change.dom-handler');
                knownEls.delete($el);
            });
        },
        /**
         * 
         * @param {Publishable[]} publishable 
         */
        publishHandler: function (publishable) {
            publishable.forEach((p)=> {
                $(p.name).val(p.value);
            });
            return publishable;
        }
    };
}
