import { toImplicitType } from 'utils/parse-utils';

export function match(topic) {
    var parsed = toImplicitType(topic);
    return typeof parsed !== 'string';
}

export default {
    match: match,
    name: 'JSON Route',
    subscribeHandler: function (topics) {
        const parsed = topics.map((t)=> {
            return {
                name: t,
                value: toImplicitType(t)
            };
        });
        return parsed;
    }
};
