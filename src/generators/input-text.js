'use strict';

var config = require('../config');


var variableAttributeMap = {};
var addedClasses = [];

module.exports = {

    test: function(el) {
        return $(el).is('input:text');
    },

    getModelVariables: function() {
        return _.keys(variableAttributeMap);
    },

    claim: function(el) {
        var $el = $(el);
        //Get everything this is listening to
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

        $el.on('change', function() {
            var val = $el.val();
            $(this).trigger(config.events.trigger, changeableValue, val);
        });

        $el.on(config.events.react, function(modelName, val) {
            var propertyToUpdate = triggerers[modelName];

            if (propertyToUpdate === 'value') {
                $(this).val(val);
            }
            else if (propertyToUpdate === 'class') {
                $.each(addedClasses, function (index, cls) {
                    $el.removeClass(cls);
                });
                $(this).addClass(val);
            }
            else {
                $(this).attr(propertyToUpdate, val);
            }
        });
    }
};
