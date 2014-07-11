'use strict';
var config = require('../config');

exports.selector = '';
exports.handler = Backbone.View.extend({
    addedClasses: [],

    propertyChangeHandlers: {
        value: $.noop,
        className: function(val) {
            $.each(this.addedClasses, function (index, cls) {
                this.$el.removeClass(cls);
            });
            this.$el.addClass(val);
        }
    },
    updateProperty: function(prop, val) {
        var updateFn = this.propertyChangeHandlers[prop];

        if (updateFn) {
            updateFn(val);
        }
        else {
            this.$el.prop(prop, val);
        }
    },


    variableAttributeMap: {},
    generateVariableAttributeMap: function() {
        var el = this.el;

        var variableAttributeMap = {};
        $(el.attributes).each(function(index, nodeMap){
            var attr = nodeMap.nodeName;
            var val = nodeMap.nodeValue;

            if (attr.indexOf('data-' + config.prefix + '-') === 0) {
                attr = attr.replace('data-', '');
                attr = attr.replace(config.prefix + '-', '');

                if (val.indexOf(',') !== -1) {
                    //TODO
                    // triggerers = triggerers.concat(val.split(','));
                }
                else {
                    variableAttributeMap[val] = attr;
                }
            }
        });
        return variableAttributeMap;
    },

    attachUIChangeHandler: $.noop,

    attachModelChangeHandler: function() {
        var me = this;
        this.$el.on(config.events.react, function(modelName, value) {
            //TODO: this could be an array
            var propertyToUpdate = this.variableAttributeMap[modelName].toLowerCase();
            me.updateProperty(propertyToUpdate, value);
        });
    },

    initialize: function (argument) {
        this.variableAttributeMap = this.generateVariableAttributeMap();
        this.attachUIChangeHandler();
        this.attachModelChangeHandler();
    }
});
