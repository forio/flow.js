var RunChannel = require('./run-middleware');

var prefix = require('./middleware-utils').prefix;
var mapWithPrefix = require('./middleware-utils').mapWithPrefix;

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

    var sampleRunid = '000001593dd81950d4ee4f3df14841769a0b';
   
    var knownRunIDServiceChannels = {};
    var handlers = [
        $.extend(baselineRunChannel, { name: 'baseline', match: prefix('baseline:') }),
        { 
            name: 'custom', 
            match: function (topic) { 
                var topicRoot = topic.split(':')[0];
                return (topicRoot.length === sampleRunid.length) ? topicRoot + ':' : false;
            },
            subscribeHandler: function (topics, prefix) {
                prefix = prefix.replace(':', '');
                if (!knownRunIDServiceChannels[prefix]) {
                    var newNotifier = notifyWithPrefix.bind(null, prefix + ':');
                    var runOptions = $.extend(true, {}, opts.serviceOptions.run, { id: prefix });
                    var runChannel = new RunChannel({ serviceOptions: runOptions }, newNotifier);

                    knownRunIDServiceChannels[prefix] = runChannel;
                }
                return knownRunIDServiceChannels[prefix].subscribeHandler(topics);
            },
            publishHandler: function (topics, prefix) {
                prefix = prefix.replace(':', '');
                if (!knownRunIDServiceChannels[prefix]) {
                    var newNotifier = notifyWithPrefix.bind(null, prefix + ':');
                    var runOptions = $.extend(true, {}, opts.serviceOptions.run, { id: prefix });
                    var runChannel = new RunChannel({ serviceOptions: runOptions }, newNotifier);
                    knownRunIDServiceChannels[prefix] = runChannel;
                }
                return knownRunIDServiceChannels[prefix].publishHandler(topics);
            }
        },
        $.extend(currentRunChannel, { name: 'current', match: prefix('current:') }),
        $.extend(defaultRunChannel, { name: 'default', match: prefix('') }),
    ];
    
    var middleware = new Middleware(handlers, config, notifier);
    middleware.scenarioManager = sm;
    return middleware;
};
