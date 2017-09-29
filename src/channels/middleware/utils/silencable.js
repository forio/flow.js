import { isArray, includes } from 'lodash';

/**
 * @param {Publishable[]} published 
 * @param {boolean|String[]|{except: String[]}} [silentOptions]
 * @return {Publishable[]} filtered list
 */
export default function silencable(published, silentOptions) {
    if (silentOptions === true || !published) {
        return [];
    } else if (isArray(silentOptions)) {
        return published.filter((data)=> !includes(silentOptions, data.name));
    } else if (silentOptions && silentOptions.except) {
        return published.filter((data)=> includes(silentOptions.except || [], data.name));
    }
    return published;
}
