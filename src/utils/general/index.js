import { uniqueId, random as _random } from 'lodash';

export { makePromise, promisify } from './promise-utils';
export { default as debounceAndMerge } from './debounce-and-merge';

export function random(prefix, min, max) {
    if (!min) {
        min = parseInt(uniqueId(), 10);
    }
    if (!max) {
        max = 100000; //eslint-disable-line no-magic-numbers
    }
    var rnd = _random(min, max, false) + '';
    if (prefix) {
        rnd = prefix + rnd;
    }
    return rnd;
}

