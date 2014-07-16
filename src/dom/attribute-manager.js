'use strict';

var defaultHandlers = [
    require('./attributes/init-operation-attr'),
    require('./attributes/operation-attr'),
    require('./attributes/class-attr'),
    require('./attributes/positive-boolean-attr'),
    require('./attributes/negative-boolean-attr'),
    require('./attributes/default-bind-attr')
];

// var defaultHandlers = [
//     require('./nodes/text-nodes'),
//     require('./nodes/checkbox-nodes'),
//     require('./nodes/default-node')
// ];

var attrList = [];

var addDefaults = function (handler) {
    //TODO: target immpl
    if (!handler.target) {
        handler.target = '*';
    }
    if (!handler.name) {
        handler.name = '*';
    }
    return handler;
};

$.each(defaultHandlers, function(index, handler) {
    attrList.push(addDefaults(handler));
});

module.exports = {
    list: attrList,
    register: function (name, test, target, handler) {
        attrList.unshift(addDefaults({name: name, test: test, target: target, handle: handler}));
    },

    get: function(name) {
        return _.find(attrList, function(attr) {
            return attr.name === name;
        });
    },

    replace: function(selector, handler) {
        var existing = _.indexOf(attrList, function(node) {
            return node.selector === selector;
        });
        attrList.splice(existing, 1, {selector: selector, handler: handler});
    }
};

