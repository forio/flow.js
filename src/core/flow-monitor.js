(function(){
    'use strict';

    var root = this;

    var $;
    if (typeof require !== 'undefined') {
        $ = require('jquery');
    }
    else {
        $ = root.jQuery;
    }

    var monitor = (function() {

        var publicAPI = {

            /**
             * @param  {String} property Model property to listen for changes on
             * @param  {Object|function} target If provided an object, it triggers a 'changed.flow' event on it. If a function, executes it when the property changes
             */
            bind: function(property, target) {

            },

            /**
             * @param  {String} property Model property to stop listening to
             * @param  {Object|function} context  The original context passed to bind
             */
            unbind: function() {

            },
        };

        return publicAPI;
    }());

    if (typeof exports !== 'undefined') {
        module.exports = monitor;
    }
    else {
        if (!root.F) { root.F = {};}
        root.F.flow = monitor;
    }

}).call(this);
