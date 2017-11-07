const { isString, isFunction, isRegExp } = require('lodash');

export function match(matchExpr, matchValue, context) {
    if (isString(matchExpr)) {
        return (matchExpr === '*' || (matchExpr.toLowerCase() === matchValue.toLowerCase()));
    } else if (isFunction(matchExpr)) {
        return matchExpr(matchValue, context);
    } else if (isRegExp(matchExpr)) {
        return matchValue.match(matchExpr);
    }
}

export function getChannel($el, property) {
    property = property.replace('data-f-', '');
    var channel = $el.data('f-channel-' + property);
    if (channel === undefined) {
        channel = $el.attr('data-f-channel'); //.data shows value cached by jquery
        if (channel === undefined) {
            var $parentEl = $el.closest('[data-f-channel]');
            if ($parentEl) {
                channel = $parentEl.attr('data-f-channel');
            }
        }
    }
    return channel;
}

function parseVariablesFromAttributeValue(attrVal) {
    const commaRegex = /,(?![^[]*])/;
    const variablesPart = attrVal.split('|')[0];
    if (variablesPart.indexOf('<%') !== -1) { //Assume it's templated for later use
        return;
    } 
    if (variablesPart.split(commaRegex).length > 1) {
        return variablesPart.split(commaRegex).map((v)=> v.trim());
    } 
    return variablesPart.trim();
}
function parseConvertersFromAttributeValue(attrVal) {
    const withConv = attrVal.split('|').map((v)=> v.trim());
    if (withConv.length > 1) {
        return withConv.slice(1);
    }
    return [];
}


export function parseAttributesWithPrefix(el, prefix) {
    const attrList = [];
    $(el.attributes).each(function (index, nodeMap) {
        const attr = nodeMap.nodeName;
        if (attr.indexOf(prefix) !== 0) {
            return;
        } 
        attrList.push({
            attr: attr,
            variables: parseConvertersFromAttributeValue(attrVal),
            converters: parseVariablesFromAttributeValue(attrVal),
        });
    });
    return attrList;
}


/**
 * @param {HTMLElement} el
 * @return {Object}
 */ 
export function getChannelConfig(el) {
    var attrs = el.attributes;
    var config = {};
    for (var i = 0; i < attrs.length; i++) {
        var attrib = el.attributes[i];
        if (attrib.specified && attrib.name.indexOf('data-f-channel-') === 0) {
            var key = attrib.name.replace('data-f-channel-', '');
            config[key] = attrib.value;
        }
    }
    return config;
}

export function getConvertersList($el, property) {
    var attrConverters = $el.data('f-convert-' + property);
    //FIXME: figure out how not to hard-code names here
    if (!attrConverters && (property === 'bind' || property === 'foreach' || property === 'repeat')) {
        attrConverters = $el.attr('data-f-convert'); //.data shows value cached by jquery
        if (!attrConverters) {
            var $parentEl = $el.closest('[data-f-convert]');
            if ($parentEl) {
                attrConverters = $parentEl.attr('data-f-convert');
            }
        }
        if (attrConverters) {
            attrConverters = attrConverters.split('|').map((v)=> v.trim());
        }
    }

    return attrConverters;
}
