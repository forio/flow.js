const IN_OF_REGEX = /\((.*)\) (?:in|of) (.*)/;
const KEY_VALUE_REGEX = /(.*),(.*)/;

/**
 * @param {string} attrVal 
 * @return {string}
 */
export function extractVariableName(attrVal) {
    const inMatch = attrVal.trim().match(IN_OF_REGEX);
    const varName = inMatch ? inMatch[2] : attrVal;
    return varName.trim();
}

/**
 * @param {string} attrVal 
 * @return {string}
 */
export function parseKeyAlias(attrVal) {
    const inMatch = attrVal.match(IN_OF_REGEX);
    if (!inMatch) {
        return undefined;
    }
    const itMatch = inMatch[1].match(KEY_VALUE_REGEX);
    const alias = itMatch ? itMatch[1].trim() : undefined;
    return alias;
}

/**
 * @param {string} attrVal 
 * @return {string}
 */
export function parseValueAlias(attrVal) {
    const inMatch = attrVal.match(IN_OF_REGEX);
    if (!inMatch) {
        return undefined;
    }
    const itMatch = inMatch[1].match(KEY_VALUE_REGEX);
    const alias = itMatch ? itMatch[2] : inMatch[1];
    return alias.trim();
}
