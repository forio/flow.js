/**
 * @param {Publishable[]} published 
 * @param {boolean|Array<string>|{except: Array<string>}} [silentOptions]
 * @returns {Publishable[]} filtered list
 */
export default function silencable(published, silentOptions) {
    if (silentOptions === true || !published) {
        return [];
    } else if (Array.isArray(silentOptions)) {
        return published.filter((data)=> {
            const found = silentOptions.indexOf(data.name) !== -1;
            return !found;
        });
    } else if (silentOptions && silentOptions.except) {
        return published.filter((data)=> {
            const found = (silentOptions.except || []).indexOf(data.name) !== -1;
            return found;
        });
    }
    return published;
}
