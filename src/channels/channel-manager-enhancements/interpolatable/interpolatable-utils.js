var interpolationRegex = /<(.*?)>/g;
/**
 *  
 * @param {string} topic topic to extract dependencies from
 * @return {string[]} dependencies
 */
export function extractDependencies(topic) {
    var deps = (topic.match(interpolationRegex) || []).map((val)=> {
        return val.substring(1, val.length - 1); 
    });
    return deps;
}

/**
 * @param {string} topic topic with dependencies
 * @param {{string: any}} data object with values of dependencies
 * @return {string} interpolated string
 */
export function interpolateWithValues(topic, data) {
    var interpolatedTopic = topic.replace(interpolationRegex, (match, dependency)=> {
        var val = data[dependency];
        var toReplace = Array.isArray(val) ? val[val.length - 1] : val;
        return toReplace;
    });
    return interpolatedTopic;
}
