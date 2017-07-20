var { isArray, includes } = _;

/**
 * 
 * @param {Publishable[]} publishable 
 * @param {boolean|string[]} readOnlyOptions 
 * @return {Publishable[]} filtered list
 */
export default function excludeReadOnly(publishable, readOnlyOptions) {
    if (readOnlyOptions === true) {
        console.error('Tried to publish to a readonly channel', publishable);
        return [];
    } else if (isArray(readOnlyOptions)) {
        var split = publishable.reduce((accum, data)=> {
            var isReadonly = includes(readOnlyOptions, data.name);
            if (isReadonly) {
                accum.readOnly.push(data);
            } else {
                accum.remaining.push(data);
            }
            return accum;
        }, { readOnly: [], remaining: [] });
        
        if (split.readOnly.length) {
            console.error('Ignoring readonly publishes', split.readOnly);
        }
        return split.remaining;
    }
    return publishable;
}