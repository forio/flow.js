'use strict';
var BaseView = require('./default-input-node').handler;

exports.selector = 'input:checkbox';
exports.handler = BaseView.extend({

    propertyHandlers : [

    ],

    getUIValue: function () {
        var $el = this.$el;
        var offVal =  ($el.data('f-off')) ? $el.data('f-off') : 0;
        var val = ($el.is(':checked')) ? $el.val() : offVal;
        return val;
    },
    initialize: function () {
        BaseView.prototype.initialize.apply(this, arguments);
    }
}, {test2:1, test:2});
