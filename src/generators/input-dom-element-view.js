'use strict';
var config = require('../config');
var BaseView = require('./dom-element-view.js');

exports.selector = 'input';
exports.handler = BaseView.handler.extend({
    propertyChangeHandlers: {
        value: function(val) {
            this.$el.val(val);
        }
    },
    changeableProperty: config.binderAttr,
    uiChangeEvent: 'change',
    getUIValue: function () {
        return this.$el.val();
    },

    attachUIChangeHandler: function () {
        var me = this;
        this.$el.on(this.uiChangeEvent, function () {
            var val = me.getUIValue();

            var params = {};
            params[this.changeableProperty] = val;

            this.$el.trigger(config.events.trigger, params);
        });
    }

});
