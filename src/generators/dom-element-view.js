'use strict';

var BaseView = require('./base-view');

exports.selector = '*';
exports.handler = BaseView.extend({
    setValue: function(value) {
        $(this).html(value);
    }
});
