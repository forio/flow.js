'use strict';

var defaultHandlers = [
    require('../generators/input-dom-element-view'),
    require('../generators/input-checkbox-view'),
    require('../generators/dom-element-view')
];

// var defaultHandlers = [
//     require('./nodes/text-nodes'),
//     require('./nodes/checkbox-nodes'),
//     require('./nodes/default-node')
// ];

var nodeList = [];

$.each(defaultHandlers, function(index, node) {
    if (!node.selector) {
        node.selector = '*';
    }
    nodeList.push({selector: node.selector, handler: node.handler});
});

module.exports = {
    list: nodeList,
    register: function (selector, handler) {
        nodeList.unshift({selector: selector, handler: handler});
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
        nodeList.splice(existing, 1, {selector: selector, handler: handler});
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
