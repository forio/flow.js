const IN_OF_REGEX = /\((.*)\) (?:in|of)\s+(.*)/;
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


//Public exports

export function aliasesFromTopics(topics, value) {
    const relevantTopic = topics[0]; //doesn't support multiple topics

    const defaultKey = $.isPlainObject(value) ? 'key' : 'index';
    const keyAlias = relevantTopic.keyAlias || defaultKey;
    const valueAlias = relevantTopic.valueAlias || 'value';

    return { keyAlias: keyAlias, valueAlias: valueAlias };
}
export function parseTopics(topics) {
    const attrVal = topics[0].name; //doesn't support multiple topics
    return [{
        name: extractVariableName(attrVal),
        keyAlias: parseKeyAlias(attrVal),
        valueAlias: parseValueAlias(attrVal),
    }];
}
