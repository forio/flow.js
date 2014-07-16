'use strict';
var config = require('../config');
var BaseView = require('./default-node').handler;

exports.selector = 'input';
exports.handler = BaseView.extend( {
    propertyHandlers : [],

    uiChangeEvent: 'change',
    getUIValue: function () {
        return this.$el.val();
    },

    setValue: function(value) {
        this.$el.val(value);
    },

    initialize: function () {
        var me = this;
        this.$el.on(this.uiChangeEvent, function () {
            var val = me.getUIValue();
            var propName = me.$el.data(config.binderAttr);

            var params = {};
            params[propName] = val;

            me.$el.trigger(config.events.trigger, params);
        });
        BaseView.prototype.initialize.apply(this, arguments);
    }
}, {test3:3, test: 3});
