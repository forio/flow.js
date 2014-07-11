'use strict';

var config = require('../config');


var addedClasses = [];

module.exports = {

    test: function(el) {
        return $(el).is('input:text');
    },

    getModelVariables: function(el) {
        var variableAttributeMap = {};
        $(el.attributes).each(function(index, nodeMap){
            var attr = nodeMap.nodeName;
            var val = nodeMap.nodeValue;
            if (attr.indexOf('data-' + config.prefix + '-') === 0) {
                attr = attr.replace(config.prefix + '-', '');

                if (val.indexOf(',') !== -1) {
                    // triggerers = triggerers.concat(val.split(','));
                }
                else {
                    variableAttributeMap[val] = attr;
                }
            }
        });
        return _.keys(variableAttributeMap);
    },

    updateProperty: function(el, propertyToUpdate, val) {
        var propertyHandlers = {
            value: function() {
                $(el).val(val);
            },
            className: function() {
                $.each(addedClasses, function (index, cls) {
                    $(el).removeClass(cls);
                });
                $(el).addClass(val);
            }
        };

        var updateFn = propertyHandlers[propertyToUpdate];
        if (updateFn) {
            updateFn();
        }
        else {
            $(el).prop(propertyToUpdate, val);
        }
    },

    claim: function(el) {
        var $el = $(el);
        //Get everything this is listening to
        var me = this;
        $el.on('change', function() {
            var val = $el.val();
            var changeableProperty = $el.data(config.prefix + '-value');
            var params = {};
            params[changeableProperty] = val;

            $(this).trigger(config.events.trigger, params);
        });

        $el.on(config.events.react, function(modelName, value) {
            var propertyToUpdate = variableAttributeMap[modelName].toLowerCase();
            me.updateProperty(el, propertyToUpdate, value);
        });
    }
};
