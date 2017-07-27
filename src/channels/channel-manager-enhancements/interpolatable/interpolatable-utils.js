var { isArray } = _;

var interpolationRegex = /<(.*?)>/g;
/**
 *  
 * @param {String} str
 * @return {String[]} inner variables
 */
export function extractInterpolatedFromString(str) {
    var inner = (str.match(interpolationRegex) || []).map((val) => {
        return val.substring(1, val.length - 1); 
    });
    return inner;
}

/**
 * @param {String} str
 * @param {Object} data
 * @return {String} interpolated string
 */
export function interpolateWithVariables(str, data) {
    var interpolatedTopic = str.replace(interpolationRegex, (match, inner)=> {
        var val = data[inner];
        var toReplace = isArray(val) ? val[val.length - 1] : val;
        return toReplace;
    });
    return interpolatedTopic;
}
