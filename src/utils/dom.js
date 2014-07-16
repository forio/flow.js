'use strict';

module.exports = {

    match: function(matchExpr, matchValue, context) {
        if (_.isString(matchExpr)) {
            return (matchExpr === '*' || (matchExpr.toLowerCase() === matchValue.toLowerCase()));
        }
        else if (_.isFunction(matchExpr)) {
            return matchExpr(matchValue, context);
        }
        else if (_.isRegExp(matchExpr)) {
            return matchValue.match(matchExpr);
        }
    },

    generateVariableAttrMap: function(el) {
        var variableAttributeMap = {};
        //NOTE: looping through attributes instead of .data because .data automatically camelcases properties and make it hard to retrvieve
        $(el.attributes).each(function(index, nodeMap){
            var attr = nodeMap.nodeName;
            var attrVal = nodeMap.nodeValue;

            var wantedPrefix = 'data-f-';
            if (attr.indexOf(wantedPrefix) === 0) {
                attr = attr.replace(wantedPrefix, '');

                if (attrVal.indexOf(',') !== -1) {
                    //TODO
                    // triggerers = triggerers.concat(val.split(','));
                }
                else {
                    variableAttributeMap[attrVal] = attr;
                }
            }
        });
        return variableAttributeMap;
    }
};
