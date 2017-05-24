var parseUtils = require('utils/parse-utils');
export default function JSONMiddleware(config, notifier) {
    return {
        subscribeHandler: function (topics) {
            var sorted = ([].concat(topics)).reduce(function (acc, topic) {
                var parsed = parseUtils.toImplicitType(topic);
                if (typeof parsed === 'string') {
                    acc.rest.push(topic);
                } else {
                    acc.claimed.push(topic);
                }
                return acc;
            }, { claimed: [], rest: [] });
        
            var mapped = sorted.claimed.map(function (item) {
                return { name: item, value: parseUtils.toImplicitType(item) };
            });
            notifier(mapped);
            
            return sorted.rest;
        }
    };

}
