'use strict';

var defaultAttrHandlers = [
    require('./attributes/init-operation-attr'),
    require('./attributes/operation-attr'),
    require('./attributes/class-attr'),
    require('./attributes/positive-boolean-attr'),
    require('./attributes/negative-boolean-attr'),
    require('./attributes/default-bind-attr')
];

exports.selector = '*';
exports.handler = Backbone.View.extend({

    propertyChangeHandlers: [
        require('./attributes/default-bind-attr')
    ],

    //For two way binding, only relevant for input handlers
    attachUIChangeHandler: $.noop,

    initialize: function (options) {
        this.propertyChangeHandlers = this.propertyChangeHandlers.concat(defaultAttrHandlers);
        this.attachUIChangeHandler();
    }
});
