'use strict';

var defaultHandlers = [
    require('./input-checkbox-node'),
    require('./default-input-node'),
    require('./default-node')
];

var nodeList = [];

$.each(defaultHandlers, function(index, node) {
    if (!node.selector) {
        node.selector = '*';
    }
    nodeList.push(node);
});

module.exports = {
    list: nodeList,

    /**
     * Add a new node handler
     * @param  {string} selector jQuery-compatible selector to use to match nodes
     * @param  {function} handler  Handlers are new-able functions. They will be called with $el as context.? TODO: Think this through
     */
    register: function (selector, handler) {
        handler.selector = selector;
        nodeList.unshift(handler);
    },

    get: function(selector) {
        return _.find(nodeList, function(node) {
            return node.selector === selector;
        });
    },

    replace: function(selector, handler) {
        var existing = _.indexOf(nodeList, function(node) {
            return node.selector === selector;
        });
        nodeList.splice(existing, 1, handler);
    }
};

/**
 * Flow.dom.nodes.register('contour-chart', {
 *     propertyHandlers : [
 *         {test: 'bind', handle: function (data){
 *             var time = data.time;
 *         } }
 *     ],
 *
 *     init: function() {
 *         $(this).on(f.model.update, function () {
 *
 *         });
 *     };
 * })
 */
