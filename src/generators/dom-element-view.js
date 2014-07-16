'use strict';
var config = require('../config');
var utils = require('../utils/dom');

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

    updateProperty: function(prop, val) {
        var me = this;
        $.each(this.propertyChangeHandlers, function(index, handler) {
            if (utils.match(handler.test, prop, me.$el)) {
                handler.handle.call(me.$el, prop, val);
                return false;
            }
        });
    },

    //When model changes
    attachModelChangeHandler: function() {
        var me = this;
        this.$el.on(config.events.react, function(evt, data) {
            $.each(data, function(variableName, value) {
                //TODO: this could be an array
                var propertyToUpdate = me.variableAttributeMap[variableName].toLowerCase();
                me.updateProperty.call(me, propertyToUpdate, value);
            });
        });
    },


    //Variable as key. List of attributes to be changed when the variable changes as value
    getVariables: function() {
        var variableAttributeMap = this.generateVariableAttributeMap();
        return Object.keys(variableAttributeMap);
    },
    //For two way binding, only relevant for input handlers
    attachUIChangeHandler: $.noop,

    initialize: function (options) {
        this.propertyChangeHandlers = this.propertyChangeHandlers.concat(defaultAttrHandlers);


        this.attachUIChangeHandler();
        this.attachModelChangeHandler();

    }
});
