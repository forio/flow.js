import { toImplicitType } from 'utils/parse-utils';

export default function JSONMiddleware(config, notifier) {
    return {
        /**
         * Subscribe to string literals
         * @param  {string[]} topics
         * @return {string[]}        topics excluding parsed
         */
        subscribeHandler: function (topics) {
            var sorted = ([].concat(topics)).reduce(function (acc, topic) {
                var parsed = toImplicitType(topic);
                if (typeof parsed === 'string') {
                    acc.rest.push(topic);
                } else {
                    acc.claimed.push({
                        name: topic,
                        value: parsed
                    });
                }
                return acc;
            }, { claimed: [], rest: [] });
        
            if (sorted.claimed.length) {
                notifier(sorted.claimed);
            }
           
            return sorted.rest;
        }
    };

}
