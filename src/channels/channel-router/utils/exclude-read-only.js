import { isFunction } from 'lodash';

/**
 * 
 * @param {Publishable[]} publishable 
 * @param {boolean|string[]|Function} readOnlyOptions 
 * @return {Publishable[]} filtered list
 */
export default function excludeReadOnly(publishable, readOnlyOptions) {
    if (isFunction(readOnlyOptions)) {
        readOnlyOptions = readOnlyOptions();
    }
    if (readOnlyOptions === true) {
        console.error('Tried to publish to a readonly channel', publishable);
        return [];
    }  
    if (Array.isArray(readOnlyOptions)) {
        const split = publishable.reduce((accum, data)=> {
            const isReadonly = readOnlyOptions.indexOf(data.name) !== -1;
            if (isReadonly) {
                accum.readOnly.push(data);
            } else {
                accum.remaining.push(data);
            }
            return accum;
        }, { readOnly: [], remaining: [] });
        
        if (split.readOnly.length) {
            console.warn('Ignoring readonly publishes', split.readOnly);
        }
        return split.remaining;
    }
    return publishable;
}
