const IN_OF_REGEX = /(.*) (?:in|of) (.*)/;
const KEY_VALUE_REGEX = /(.*),(.*)/;

export function extractVariableName(attrVal, $el) {
    const inMatch = attrVal.trim().match(IN_OF_REGEX);
    const varName = inMatch ? inMatch[2] : attrVal;
    return varName.trim();
}

export function parseKeyAlias(attrVal, data) {
    const defaultKey = $.isPlainObject(data) ? 'key' : 'index';
    const inMatch = attrVal.match(IN_OF_REGEX);
    if (!inMatch) {
        return defaultKey;
    }
    const itMatch = inMatch[1].match(KEY_VALUE_REGEX);
    const alias = itMatch ? itMatch[1].trim() : defaultKey;
    return alias;
}

export function parseValueAlias(attrVal) {
    const defaultValueProp = 'value';
    const inMatch = attrVal.match(IN_OF_REGEX);
    if (!inMatch) {
        return defaultValueProp;
    }
    const itMatch = inMatch[1].match(KEY_VALUE_REGEX);
    const alias = itMatch ? itMatch[2] : inMatch[1];
    return alias.trim();
}
