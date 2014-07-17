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
    //handler should be new-able
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
