'use strict';

var defaultHandlers = [
    require('./input-checkbox-node'),
    require('./default-input-node'),
    require('./default-node')
];

//{selector: '', handler: $.noop}
var handlersList = [];
var normalize = function (selector, handler) {
    if (_.isFunction(handler)) {
        handler = {
            handle: handler
        };
    }
    if (!selector) {
        selector = '*';
    }
    handler.selector = selector;
    return handler;
};

$.each(defaultHandlers, function(index, node) {
    handlersList.push(normalize(node.selector, node));
});

var match = function (toMatch, node) {
    if (_.isString(toMatch)) {
        return toMatch === node.selector;
    }
    else {
        return $(toMatch).is(node.selector);
    }
};

module.exports = {
    list: handlersList,

    /**
     * Add a new node handler
     * @param  {string} selector jQuery-compatible selector to use to match nodes
     * @param  {function} handler  Handlers are new-able functions. They will be called with $el as context.? TODO: Think this through
     */
    register: function (selector, handler) {
        handlersList.unshift(normalize(selector, handler));
    },

    getHandler: function(selector) {
        return _.find(handlersList, function(node) {
            return match(selector, node);
        });
    },

    replace: function(selector, handler) {
        var index;
        _.each(handlersList, function(currentHandler, i) {
            if (selector === currentHandler.selector) {
                index = i;
                return false;
            }
        });
        handlersList.splice(index, 1, normalize(selector, handler));
    }
};
