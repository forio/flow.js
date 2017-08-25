'use strict';
var BaseView = require('./default-input-node');

module.exports = BaseView.extend({

    propertyHandlers: [

    ],

    getUIValue: function () {
        var $el = this.$el;
        //Change 0,1 to true/false after EPICENTER-3180 is fixed
        var offVal = (typeof $el.data('f-off') !== 'undefined') ? $el.data('f-off') : 0;
        //attr = initial value, prop = current value
        var onVal = (typeof $el.attr('value') !== 'undefined') ? $el.prop('value') : 1;

        var val = ($el.is(':checked')) ? onVal : offVal;
        return val;
    },
    initialize: function () {
        BaseView.prototype.initialize.apply(this, arguments);
    }
}, { selector: ':checkbox,:radio' });
