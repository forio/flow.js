'use strict';
var config = require('../../config');

module.exports = {
    selector: '*',

    getVariables: function() {

    },

    init: function() {
        var me = this;
        this.on(config.events.react, function(evt, data) {
            $.each(data, function(variableName, value) {
                //TODO: this could be an array
                var propertyToUpdate = me.variableAttributeMap[variableName].toLowerCase();
                me.updateProperty.call(me, propertyToUpdate, value);
            });
        });
        //model changes
        //ui changes
    }
};
