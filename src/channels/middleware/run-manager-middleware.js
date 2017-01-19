var RunChannel = require('./run-middleware');

var prefix = require('./middleware-utils').prefix;
var regexpMatch = require('./middleware-utils').regex;
var mapWithPrefix = require('./middleware-utils').mapWithPrefix;
var runChannelFactory = require('./run-channel-factory');

var Middleware = require('./general-middleware');

module.exports = function (config, notifier) {
    var defaults = {
        serviceOptions: {},
    };
    var opts = $.extend(true, {}, defaults, config);

    var rm = new window.F.manager.RunManager(opts.serviceOptions);
    var $creationPromise = rm.getRun().then(function () {
        return rm.run;
    });
    var notifyWithPrefix = function (prefix, data) {
        notifier(mapWithPrefix(data, prefix));
    };

    var channelOpts = $.extend(true, 
        { serviceOptions: $creationPromise }, opts.defaults, opts.current);
    var currentRunChannel = new RunChannel(channelOpts, notifyWithPrefix.bind(null, 'current:'));
    var defaultRunChannel = new RunChannel(channelOpts, notifier);

    var sampleRunidLength = '000001593dd81950d4ee4f3df14841769a0b'.length;
    var runidRegex = new RegExp('^(?:.{' + sampleRunidLength + '}):');

    var handlers = [
        $.extend(currentRunChannel, { name: 'current', match: prefix('current:') }),
        { 
            name: 'custom', 
            match: regexpMatch(runidRegex),
            subscribeHandler: function (topics, prefix) {
                var runid = prefix.replace(':', '');
                var channel = runChannelFactory(runid, opts.serviceOptions.run, notifyWithPrefix);
                return channel.subscribeHandler(topics);
            },
            publishHandler: function (topics, prefix) {
                var runid = prefix.replace(':', '');
                var channel = runChannelFactory(runid, opts.serviceOptions.run, notifyWithPrefix);
                return channel.publishHandler(topics);
            }
        },
        $.extend(defaultRunChannel, { name: 'current', match: prefix('') }),
    ];

    var middleware = new Middleware(handlers, config, notifier);
    return middleware;
};
