var RunChannel = require('./run-middleware');
var CustomRunChannel = require('./custom-run-middleware');

var prefix = require('./middleware-utils').prefix;
var regexpMatch = require('./middleware-utils').regex;
var mapWithPrefix = require('./middleware-utils').mapWithPrefix;

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
    var customRunChannel = new CustomRunChannel(opts.serviceOptions.run, notifyWithPrefix);

    var sampleRunidLength = '000001593dd81950d4ee4f3df14841769a0b'.length;
    var runidRegex = new RegExp('^(?:.{' + sampleRunidLength + '}):');

    var handlers = [
        $.extend(currentRunChannel, { name: 'current', match: prefix('current:') }),
        $.extend(customRunChannel, { name: 'custom', match: regexpMatch(runidRegex) }),
        $.extend(defaultRunChannel, { name: 'current', match: prefix('') }),
    ];

    var middleware = new Middleware(handlers, config, notifier);
    return middleware;
};
