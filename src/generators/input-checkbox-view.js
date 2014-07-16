'use strict';
var BaseView = require('./input-dom-element-view.js');

exports.selector = ':checkbox';
exports.handler = BaseView.handler.extend({}, {


    getUIValue: function () {
        var $el = this.$el;
        var offVal =  ($el.data('f-off')) ? $el.data('f-off') : 0;
        var val = ($el.is(':checked')) ? $el.val() : offVal;
        return val;
    },

    initialize: function() {
        this.setValue =function(value) {
            var settableValue = this.$el.prop('value');
            var isChecked = (settableValue !== undefined) ? (settableValue === value) : !!value;
            $(this).prop('checked', isChecked);
        };
    }
});
