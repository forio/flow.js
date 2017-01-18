var RunChannel = require('./run-middleware');

var prefix = require('./middleware-utils').prefix;
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
    var currentRunChannel = new RunChannel($.extend(true, 
        { serviceOptions: $creationPromise }, opts.defaults, opts.current), notifyWithPrefix.bind(null, 'current:'));
    var defaultRunChannel = new RunChannel($.extend(true, 
        { serviceOptions: $creationPromise }, opts.defaults, opts.current), notifier);

    var sampleRunid = '000001593dd81950d4ee4f3df14841769a0b';
   
    // create a new channel and push onto handlers to catch further
    var knownRunIDServiceChannels = {};
    var handlers = [
        $.extend(currentRunChannel, { name: 'current', match: prefix('current:') }),
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
        $.extend(defaultRunChannel, { name: 'current', match: prefix('') }),
    ];

    var middleware = new Middleware(handlers, config, notifier);
    return middleware;
};
