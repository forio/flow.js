var RunChannel = require('./run-router');

var prefix = require('channels/middleware/utils').prefix;
var mapWithPrefix = require('channels/middleware/utils').mapWithPrefix;

var Middleware = require('channels/middleware/channel-router');

module.exports = function (config, notifier) {
    var defaults = {
        serviceOptions: {},
        channelOptions: {}
    };
    var opts = $.extend(true, {}, defaults, config);

    var rm = new window.F.manager.RunManager(opts.serviceOptions);
    var $creationPromise = rm.getRun().then(function () {
        return rm.run;
    });
    var notifyWithPrefix = function (prefix, data) {
        notifier(mapWithPrefix(data, prefix));
    };

    var currentChannelOpts = $.extend(true, 
        { serviceOptions: $creationPromise }, opts.defaults, opts.current);
    var currentRunChannel = new RunChannel(currentChannelOpts, notifyWithPrefix.bind(null, 'current:'));
    var defaultRunChannel = new RunChannel(currentChannelOpts, notifier);

    var handlers = [
        $.extend(currentRunChannel, { name: 'current', match: prefix('current:') }),
        $.extend(defaultRunChannel, { name: 'default', match: prefix('') }),
    ];

    var middleware = new Middleware(handlers, notifier);
    middleware.runManager = rm;
    
    return middleware;
};
