export function translateDataToInsertable(value) {
    if (Array.isArray(value)) {
        value = value[value.length - 1];
    }
    value = ($.isPlainObject(value)) ? JSON.stringify(value) : value + '';
    return value;
}

/**
 * @param {any} value
 * @param {{string:string}} aliasMap
 * @returns {{value: any}}
 */
export function translateDataToTemplatable(value, aliasMap) {
    const templateData = { value: value };
    if ($.isPlainObject(value)) {
        Object.keys(value).forEach((originalName)=> {
            const alias = aliasMap[originalName] || originalName;
            templateData[alias] = value[originalName];
        });
    } else {
        Object.keys(aliasMap).forEach((originalName)=> {
            const alias = aliasMap[originalName] || originalName;
            templateData[alias] = value;
        });
    }
    
    return templateData;
}

const AS_REGEX = /(.*) (?:as) (.*)/;

/**
 * @param {string} attrVal 
 * @returns {string}
 */
export function extractVariableName(attrVal) {
    const asMatch = attrVal.trim().match(AS_REGEX);
    const varName = asMatch && asMatch[1] ? asMatch[1] : attrVal;
    return varName.trim();
}

/**
 * @param {string} attrVal 
 * @returns {string}
 */
export function extractAlias(attrVal) {
    const asMatch = attrVal.trim().match(AS_REGEX);
    const alias = asMatch && asMatch[2] ? asMatch[2] : attrVal;
    return alias.trim();
}
