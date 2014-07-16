'use strict';

var nodeHandlers = [
    require('../generators/input-text-view'),
    require('../generators/input-checkbox-view'),
    require('../generators/dom-element-view')
];

// var nodeHandlers = [
//     require('./nodes/text-nodes'),
//     require('./nodes/checkbox-nodes'),
//     require('./nodes/default-node')
// ];

var nodeList = {};

var register = function (selector, handler) {
    if (!selector) {
        selector = '*';
    }
    nodeList[selector] = handler;
};

$.each(nodeHandlers, function(index, handler) {
    register(handler.selector, handler);
});

module.exports = {
    list: nodeList,
    register: register
};
