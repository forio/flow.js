import { toImplicitType } from 'utils/parse-utils';

export function match(topic) {
    return (topic.indexOf('#') === 0) ? '' : false;
} 
export default function DOMRouteHandler(options, notifier) {
    
    const knownEls = new WeakMap();

    return {
        match: match,
        name: 'DOM Route',
        subscribeHandler: function (topics) {
            const parsed = topics.map((elID)=> {
                const $el = $(elID);
                if (!knownEls.has($el)) {
                    knownEls.set($el, true);
                    $el.on('change.dom-handler', (evt)=> {
                        const val = toImplicitType($el.val());
                        notifier([{ name: elID, value: val }]);
                    });
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
