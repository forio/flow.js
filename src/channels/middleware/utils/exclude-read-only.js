var { isArray, includes } = _;

/**
 * 
 * @param {PublishObject[]} published 
 * @param {boolean|String[]} readOnlyOptions 
 */
export default function excludeReadOnly(published, readOnlyOptions) {
    if (readOnlyOptions === true) {
        console.warn('Tried to publish to a readonly channel');
        return [];
    } else if (isArray(readOnlyOptions)) {
        var split = published.reduce((accum, data)=> {
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
    return published;
}
