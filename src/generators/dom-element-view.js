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
    variableAttributeMap: {},
    generateVariableAttributeMap: function() {
        var el = this.el;
        var $el = this.$el;
        var me = this;

        var variableAttributeMap = {};
        //NOTE: looping through attributes instead of .data because .data automatically camelcases properties and make it hard to retrvieve
        $(el.attributes).each(function(index, nodeMap){
            var attr = nodeMap.nodeName;
            var attrVal = nodeMap.nodeValue;

            var wantedPrefix = 'data-' + config.prefix + '-';
            if (attr.indexOf(wantedPrefix) === 0) {
                attr = attr.replace(wantedPrefix, '');

                //Give handlers a chance to claim variables before sending it off
                var claimed = false;
                $.each(me.propertyChangeHandlers, function(index, handler) {
                    if (utils.match(handler.test, attr, $el) && handler.init) {
                        handler.init.call($el, attr, attrVal);
                        claimed = true;
                    }
                });

                // if (!claimed)
                {
                    if (attrVal.indexOf(',') !== -1) {
                        //TODO
                        // triggerers = triggerers.concat(val.split(','));
                    }
                    else {
                        variableAttributeMap[attrVal] = attr;
                    }
                }
            }
        });
        return variableAttributeMap;
    },

    //For two way binding, only relevant for input handlers
    attachUIChangeHandler: $.noop,



    initialize: function (options) {
        this.propertyChangeHandlers = this.propertyChangeHandlers.concat(defaultAttrHandlers);

        this.variableAttributeMap = this.generateVariableAttributeMap();

        this.attachUIChangeHandler();
        this.attachModelChangeHandler();

        options.channel.subscribe(Object.keys(this.variableAttributeMap), this.$el);
    }
});
