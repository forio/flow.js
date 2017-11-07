/**
 * @param {string} attrVal 
 * @returns {string[]} variables
 */
export function parseVariablesFromAttributeValue(attrVal) {
    const commaRegex = /,(?![^[]*])/;
    const variablesPart = attrVal.split('|')[0];
    if (variablesPart.indexOf('<%') !== -1) { //Assume it's templated for later use
        return;
    } 
    if (variablesPart.split(commaRegex).length > 1) {
        return variablesPart.split(commaRegex).map((v)=> v.trim());
    } 
    return [variablesPart.trim()];
}

/**
 * @param {string} attrVal 
 * @returns {string[]} converters
 */
export function parseConvertersFromAttributeValue(attrVal) {
    const withConv = attrVal.split('|').map((v)=> v.trim());
    if (withConv.length > 1) {
        return withConv.slice(1);
    }
    return [];
}
