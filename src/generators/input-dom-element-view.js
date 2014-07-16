'use strict';
var config = require('../config');
var BaseView = require('./dom-element-view.js');

exports.selector = 'input';
exports.handler = BaseView.handler.extend({}, {

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
    }
});
