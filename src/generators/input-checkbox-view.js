'use strict';
var BaseView = require('./input-dom-element-view.js').handler;

exports.selector = 'input:checkbox';
exports.handler = BaseView.extend({

    propertyHandlers : [
        {
            test: 'bind',
            target: 'input:checkbox',
            handle: function (value){
                var settableValue = this.prop('value');
                var isChecked = (settableValue !== undefined) ? (settableValue === value) : !!value;
                this.prop('checked', isChecked);
            }
        }
    ],

    setValue: function(value) {

    },

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
