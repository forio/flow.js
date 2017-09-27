const _ = require('lodash');
const { isString, isFunction } = require('lodash');
/**
 * @typedef NodeHandler
 * @property {string} selector
 * @property {Function} handle
 */ 

 
/**
 * @param {string | undefined} selector
 * @param {Function | NodeHandler } handler
 * @return {NodeHandler}
 */
var normalize = function (selector, handler) {
    if (!selector) {
        selector = '*';
    }
    if (isFunction(handler)) {
        handler = {
            selector: selector,
            handle: handler
        };
    }
   
    handler.selector = selector;
    return handler;
};

/**
 * @param {string|HTMLElement|JQuery<HTMLElement>} toMatch
 * @param { {selector:string} } node
 * @return {boolean}
 */ 
var match = function (toMatch, node) {
    if (isString(toMatch)) {
        return toMatch === node.selector;
    }
    return $(toMatch).is(node.selector);
};

var nodeManager = {
    list: [],

    /**
     * Add a new node handler
     * @param  {string} selector jQuery-compatible selector to use to match nodes
     * @param  {function} handler  Handlers are new-able functions. They will be called with $el as context.? TODO: Think this through
     * @returns {void}
     */
    register: function (selector, handler) {
        this.list.unshift(normalize(selector, handler));
    },

    /**
     * @param {string|HTMLElement|JQuery<HTMLElement>} selector
     * @return NodeHandler
     */ 
    getHandler: function (selector) {
        return _.find(this.list, function (node) {
            return match(selector, node);
        });
    },

    replace: function (selector, handler) {
        var index;
        this.list.forEach(function (currentHandler, i) {
            if (selector === currentHandler.selector) {
                index = i;
                return false;
            }
        });
        this.list.splice(index, 1, normalize(selector, handler));
    }
};

//bootstraps
var defaultHandlers = [
    require('./input-checkbox-node'),
    require('./default-input-node'),
    require('./default-node')
];
defaultHandlers.reverse().forEach(function (handler) {
    nodeManager.register(handler.selector, handler);
});

module.exports = nodeManager;
