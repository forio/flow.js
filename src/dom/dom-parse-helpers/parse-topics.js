/**
 * @param {string} attrVal 
 * @returns {string[]} variables
 */
export function parseTopicsFromAttributeValue(attrVal) {
    const commaRegex = /,(?![^[]*])/;
    const topicsPart = attrVal.split('|')[0];
    if (topicsPart.indexOf('<%') !== -1) { //Assume it's templated for later use
        return;
    } 
    if (topicsPart.split(commaRegex).length > 1) {
        return topicsPart.split(commaRegex).map((v)=> v.trim());
    } 
    return [topicsPart.trim()];
}
