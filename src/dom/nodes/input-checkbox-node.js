'use strict';
var BaseView = require('./default-input-node');

module.exports = BaseView.extend({

    propertyHandlers: [

    ],

    getUIValue: function () {
        var $el = this.$el;
        var offVal = (typeof $el.data('f-off') !== 'undefined') ? $el.data('f-off') : false;
        //attr = initial value, prop = current value
        var onVal = (typeof $el.attr('value') !== 'undefined') ? $el.prop('value') : true;

        var val = ($el.is(':checked')) ? onVal : offVal;
        return val;
    },
    initialize: function () {
        BaseView.prototype.initialize.apply(this, arguments);
    }
}, { selector: ':checkbox,:radio' });
