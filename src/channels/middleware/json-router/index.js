import { toImplicitType } from 'utils/parse-utils';

export function match(topic) {
    var parsed = toImplicitType(topic);
    return typeof parsed !== 'string';
}

export default function JSONRouter(config, notifier) {
    return {
        match: match,
        name: 'JSON Route',
        subscribeHandler: function (topics, options, prefix) {
            const parsed = topics.reduce((accum, t)=> {
                if (match(t)) {
                    accum.claimed.push({
                        name: t,
                        value: toImplicitType(t)
                    });
                } else {
                    accum.rest.push(t);
                }
                return accum;
            }, { claimed: [], rest: [] });
            setTimeout(()=> {
                notifier(parsed.claimed);
            }, 0);
            return parsed.rest;
        }
    };
}
