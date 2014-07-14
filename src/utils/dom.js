'use strict';

module.exports = {

    match: function(matchExpr, matchValue, context) {
        if (_.isString(matchExpr)) {
            return (matchExpr.toLowerCase() === matchValue.toLowerCase());
        }
        else if (_.isFunction(matchExpr)) {
            return matchExpr(matchValue, context);
        }
        else if (_.isRegExp(matchExpr)) {
            return matchValue.match(matchExpr);
        }
    }
};
