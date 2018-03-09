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
            const parsed = topics.map((t)=> {
                return {
                    name: t,
                    value: toImplicitType(t)
                };
            });
            setTimeout(()=> {
                notifier(parsed);
            }, 0);
        }
    };
}
