'use strict';
var BaseView = require('./input-dom-element-view.js');

exports.selector = 'input:text';
exports.handler = BaseView.handler.extend({
    type: ':text',


});
