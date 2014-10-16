'use strict';
var config = require('../../config');
var BaseView = require('./default-node');

module.exports = BaseView.extend( {
    propertyHandlers : [],

    uiChangeEvent: 'change',
    getUIValue: function () {
        return this.$el.val();
    },

    initialize: function () {
        var me = this;
        var propName = this.$el.data(config.binderAttr);

        if (propName) {
            this.$el.on(this.uiChangeEvent, function () {
                var val = me.getUIValue();

                var params = {};
                params[propName] = val;

                me.$el.trigger(config.events.trigger, params);
            });
        }

        BaseView.prototype.initialize.apply(this, arguments);
    }
}, {selector: 'input, select'});
