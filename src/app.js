'use strict';

var domManager = require('./dom-manager');
var Channel = require('./channels/channel-manager');



window.Flow = {
    dom: domManager,

    initialize: function(options) {
        var defaults = {
            run: {
                account: 'nranjit',
                project: 'sales_forecaster'
            }
        };
        $.extend(defaults, options);
        this.channel = new Channel(defaults.run);

        domManager.initialize({
            channel: this.channel
        });
    }
};
