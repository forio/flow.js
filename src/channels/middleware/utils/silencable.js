var { isArray, includes } = _;

export default function silencable(published, silentOptions) {
    if (silentOptions === true || !published) {
        return [];
    } else if (isArray(silentOptions)) {
        return published.reduce((accum, data)=> {
            if (!includes(silentOptions, data.name)) {
                accum.push(data);
            }
            return accum;
        }, []);
    } else if (silentOptions && silentOptions.except) {
        return published.reduce((accum, data)=> {
            if (includes(silentOptions.except || [], data.name)) {
                accum.push(data);
            }
            return accum;
        }, []);
    }
    return published;
}
