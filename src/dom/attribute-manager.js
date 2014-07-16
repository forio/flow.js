'use strict';

var attrHandlers = [
    require('./attributes/init-operation-attr'),
    require('./attributes/operation-attr'),
    require('./attributes/class-attr'),
    require('./attributes/positive-boolean-attr'),
    require('./attributes/negative-boolean-attr'),
    require('./attributes/default-bind-attr')
];

var nodeAttrList = {};
$.each(attrHandlers, function(index, handler) {
    //TODO: attrfor immpl
    if (!handler.attrfor) {
        handler.attrfor = '*';
    }
    if (!handler.name) {
        handler.name = '*';
    }
    nodeAttrList[handler.attrfor][handler.name] = handler;
});

module.exports = nodeAttrList;
