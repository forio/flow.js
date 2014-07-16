'use strict';

var nodeHandlers = [
    require('./nodes/text-nodes'),
    require('./nodes/checkbox-nodes'),
    require('./nodes/default-node')
];

var nodeList = {};
$.each(nodeHandlers, function(index, handler) {
    if (!handler.name) {
        handler.name = (_.isString(handler.selector))? handler.selector: '*';
    }
    nodeList[handler.name] = handler;
});

module.exports = nodeList;
