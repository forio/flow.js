'use strict';
var config = require('../config');
var BaseView = require('./dom-element-view.js');

exports.selector = 'input';
exports.handler = BaseView.handler.extend({
    propertyChangeHandlers: [
        require('./attributes/value-attr')
    ],

    uiChangeEvent: 'change',
    getUIValue: function () {
        return this.$el.val();
    },

    changeableProperty: config.binderAttr,
    attachUIChangeHandler: function () {
        var me = this;
        this.$el.on(this.uiChangeEvent, function () {
            var val = me.getUIValue();
            var propName = me.$el.data(me.changeableProperty);

            var params = {};
            params[propName] = val;

            me.$el.trigger(config.events.trigger, params);
        });
    }
});
