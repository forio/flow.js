'use strict';
var BaseView = require('./input-dom-element-view.js');

exports.selector = 'input:checkbox';
exports.handler = BaseView.handler.extend({
    propertyChangeHandlers: [
        require('./attributes/checkbox-bind-attr')
    ],

    getUIValue: function () {
        var offVal =  (this.data('f-off')) ? this.data('f-off') : 0;
        var val = (this.is(':checked')) ? this.$el.val() : offVal;
        return val;
    }
});
