'use strict';

var defaultHandlers = [
    require('./attributes/init-operation-attr'),
    require('./attributes/operation-attr'),
    require('./attributes/class-attr'),
    require('./attributes/positive-boolean-attr'),
    require('./attributes/negative-boolean-attr'),
    require('./attributes/bind-attr'),
    require('./attributes/default-attr')
];

// var defaultHandlers = [
//     require('./nodes/text-nodes'),
//     require('./nodes/checkbox-nodes'),
//     require('./nodes/default-node')
// ];

var handlersList = [];

var addDefaults = function (handler) {
    //TODO: target immpl
    if (!handler.target) {
        handler.target = '*';
    }
    if (!handler.name) {
        handler.name =  _.isString(handler.test) ? handler.test : '*';
    }
    return handler;
};

$.each(defaultHandlers, function(index, handler) {
    handlersList.push(addDefaults(handler));
});

module.exports = {
    list: handlersList,
    register: function (handler) {
        handlersList.unshift(addDefaults(handler));
    },

    get: function(name) {
        return _.find(handlersList, function(attr) {
            return attr.name === name;
        });
    },

    replace: function(selector, handler) {
        var existing = _.indexOf(handlersList, function(node) {
            return node.selector === selector;
        });
        handlersList.splice(existing, 1, {selector: selector, handler: handler});
    },

    getHandler: function($el, property) {
        return _.find(handlersList, function(handler) {
            var elementMatch = $el.is(handler.target);
            var matchExpr = handler.test;
            var attrMatch;

            if (_.isString(matchExpr)) {
                attrMatch = (matchExpr === '*' || (matchExpr.toLowerCase() === property.toLowerCase()));
            }
            else if (_.isFunction(matchExpr)) {
                attrMatch = matchExpr(property, $el);
            }
            else if (_.isRegExp(matchExpr)) {
                attrMatch = property.match(matchExpr);
            }

            return elementMatch && attrMatch;
        });
    }
};

