'use strict';

var config = require('../config');


var changeableValue;
var triggerers = {};
var addedClasses = [];

module.exports = {

    test: function(el) {
        return $(el).is('input:text');
    },
    claim: function(el) {
        var $el = $(el);
        //Get everything this is listening to
        $.each($el.data(), function(attr, val){
            if (attr.indexOf(config.prefix) === 0) {
                attr = attr.replace(config.prefix, '');

                if (val.indexOf(',') !== -1) {
                    // triggerers = triggerers.concat(val.split(','));
                }
                else {
                    triggerers[val] = attr;
                }
                if (attr.indexOf(config.defaultAttr) === 0) {
                    changeableValue = val;
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
