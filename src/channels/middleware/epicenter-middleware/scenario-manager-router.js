var RunChannel = require('./run-router');

var prefix = require('channels/middleware/utils').prefix;
var withPrefix = require('channels/middleware/utils').withPrefix;

var Middleware = require('channels/middleware/channel-router');
module.exports = function (config, notifier) {
    var defaults = {
        serviceOptions: {},
        channelOptions: {},
    };
    var opts = $.extend(true, {}, defaults, config);

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
            channelOptions: {
                meta: {
                    readOnly: true
                },
                variables: {
                    readOnly: true
                }
            }
        }, opts.defaults, opts.baseline)
    , withPrefix(notifier, 'baseline:'));

    var runOptions = $.extend(true, {}, {
        serviceOptions: currentRunPromise,
    }, opts.defaults, opts.current);

    var currentRunChannel = new RunChannel(runOptions, withPrefix(notifier, 'current:'));
    var defaultRunChannel = new RunChannel(runOptions, withPrefix(notifier, ''));

    var handlers = [
        $.extend(baselineRunChannel, { name: 'baseline', match: prefix('baseline:') }),
        $.extend(currentRunChannel, { name: 'current', match: prefix('current:') }),
        $.extend(defaultRunChannel, { name: 'default', match: prefix('') }),
    ];
    
    var middleware = new Middleware(handlers, notifier);
    middleware.scenarioManager = sm;
    return middleware;
};
