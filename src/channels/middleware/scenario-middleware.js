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

    var notifyWithPrefix = function (prefix, data) {
        notifier(mapWithPrefix(data, prefix));
    };
    var sm = new window.F.manager.ScenarioManager(opts.serviceOptions);

    var baselinePromise = sm.baseline.getRun().then(function () {
        return sm.baseline.run;
    });
    var currentRunPromise = sm.current.getRun().then(function () {
        return sm.current.run;
    });
    var baselineRunChannel = new RunChannel( 
        $.extend(true, {}, {
            serviceOptions: baselinePromise,
            meta: {
                readOnly: true
            },
            variables: {
                readOnly: true
            }
        }, opts.defaults, opts.baseline)
    , notifyWithPrefix.bind(null, 'baseline:'));
    var currentRunChannel = new RunChannel($.extend(true, {}, {
        serviceOptions: currentRunPromise,
    }, opts.defaults, opts.current), notifyWithPrefix.bind(null, 'current:'));
    var defaultRunChannel = new RunChannel($.extend(true, {}, {
        serviceOptions: currentRunPromise,
    }, opts.defaults, opts.current), notifyWithPrefix.bind(null, ''));

    var sampleRunidLength = '000001593dd81950d4ee4f3df14841769a0b'.length;
    var runidRegex = new RegExp('^(?:.{' + sampleRunidLength + '}):');
    var handlers = [
        $.extend(baselineRunChannel, { name: 'baseline', match: prefix('baseline:') }),
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
        $.extend(currentRunChannel, { name: 'current', match: prefix('current:') }),
        $.extend(defaultRunChannel, { name: 'default', match: prefix('') }),
    ];
    
    var middleware = new Middleware(handlers, config, notifier);
    middleware.scenarioManager = sm;
    return middleware;
};
