/**
 * @param {string} attrVal 
 * @returns {string[]} variables
 */
export function parseTopicsFromAttributeValue(attrVal) {
    const commaRegex = /,(?![^[(]*[\])])/; //split except on a[b,c] or a(v,c)
    const topicsPart = attrVal.split('|')[0];
    if (topicsPart.indexOf('<%') !== -1) { //Assume it's templated for later use
        return [];
    } 
    const split = topicsPart.split(commaRegex);
    if (split.length > 1) {
        return split.map((v)=> v.trim());
    } 
    return [topicsPart.trim()];
}
