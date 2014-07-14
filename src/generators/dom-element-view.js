'use strict';
var config = require('../config');
var utils = require('../utils/dom');

exports.selector = '*';
exports.handler = Backbone.View.extend({
    addedClasses: [],

    propertyChangeHandlers: [
        require('properties/class-attr'),
        require('properties/boolean-attr'),
        require('properties/default-attr')
    ],

    updateProperty: function(prop, val) {
        $.each(this.propertyChangeHandlers, function(index, handler) {
            if (utils.match(handler.test, prop, this.$el)) {
                handler.handle.call(this.$el, prop, val);
                return false;
            }
        });
    },


    //Variable as key. List of attributes to be changed when the variable changes as value
    variableAttributeMap: {},
    generateVariableAttributeMap: function() {
        var el = this.el;

        var variableAttributeMap = {};
        //NOTE: looping through attributes instead of .data because .data automatically camelcases properties and make it hard to retrvieve
        $(el.attributes).each(function(index, nodeMap){
            var attr = nodeMap.nodeName;
            var attrVal = nodeMap.nodeValue;

            var wantedPrefix = 'data-' + config.prefix + '-';
            if (attr.indexOf(wantedPrefix) === 0) {
                attr = attr.replace(wantedPrefix, '');

                if (attrVal.indexOf(',') !== -1) {
                    //TODO
                    // triggerers = triggerers.concat(val.split(','));
                }
                else {
                    variableAttributeMap[attrVal] = attr;
                }
            }
        });
        return variableAttributeMap;
    },

    //For two way binding, only relevant for input handlers
    attachUIChangeHandler: $.noop,

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

    initialize: function (options) {
        this.variableAttributeMap = this.generateVariableAttributeMap();

        this.attachUIChangeHandler();
        this.attachModelChangeHandler();

        options.channel.bind(Object.keys(this.variableAttributeMap), this.$el);
    }
});
