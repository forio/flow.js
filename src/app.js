'use strict';

var domManager = require('./dom/dom-manager');
var Channel = require('./channels/channel-manager');

window.Flow = {
    dom: domManager,

    initialize: function(config) {
        var model = $('body').data('f-model');

        var defaults = {
            channel: {
                account: '',
                project: '',
                model: model
            },
            dom: {

            }
        };
        var options = $.extend(true, {}, defaults, config);
        this.channel = new Channel(options.channel);

        domManager.initialize($.extend(true, {
            channel: this.channel
        }));
    }
};
