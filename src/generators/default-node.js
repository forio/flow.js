'use strict';

var BaseView = require('./base-node');
var attrManager = require('../dom/attribute-manager.js');

exports.selector = '*';
exports.handler = BaseView.extend({
    propertyHandlers : [
        {
            test: 'bind',
            target: '*',
            handle: function (value){
                this.val(value);
            }
        }
    ],

    initialize: function () {
        _.each(this.propertyHandlers, function(handler) {
            attrManager.register(handler);
        });
    }
}, {test:1});
