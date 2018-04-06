export function translateDataToInsertable(value) {
    if (Array.isArray(value)) {
        value = value[value.length - 1];
    }
    value = ($.isPlainObject(value)) ? JSON.stringify(value) : value + '';
    return value;
}

export function translateDataToTemplatable(value, alias) {
    let templateData = {};
    if (!$.isPlainObject(value)) {
        templateData = { value: value };
        if (alias) {
            templateData[alias] = value;
        }
    } else {
        templateData = $.extend({}, value, {
            value: value, //If the key has 'weird' characters like '<>' hard to get at with a template otherwise
        });
    }
    return templateData;
}

const AS_REGEX = /(.*) (?:as) (.*)/;
const KEY_VALUE_REGEX = /(.*),(.*)/;

export function extractVariableName(attrVal, $el) {
    const asMatch = attrVal.trim().match(AS_REGEX);
    const varName = asMatch ? asMatch[1] : attrVal;
    return varName.trim();
}
