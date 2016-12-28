var RunChannel = require('./run-middleware');

var prefix = require('./middleware-utils').prefix;
var mapWithPrefix = require('./middleware-utils').mapWithPrefix;

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
    var currentRunChannel = new RunChannel($.extend(true, { serviceOptions: $creationPromise }, opts.current), notifyWithPrefix.bind(null, 'current:'));
    var defaultRunChannel = new RunChannel($.extend(true, { serviceOptions: $creationPromise }, opts.current), notifier);

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

    return {
        subscribeHandler: function (topics) {
            handlers.reduce(function (pendingTopics, ph) {
                var toFetch = ([].concat(pendingTopics)).reduce(function (accum, topic) {
                    var prefixMatch = ph.match(topic, ph.prefix);
                    if (prefixMatch !== false) {
                        var stripped = topic.replace(prefixMatch, '');
                        accum.myTopics.push(stripped);
                        accum.prefix = prefixMatch;
                    } else {
                        accum.otherTopics.push(topic);
                    }
                    return accum;
                }, { myTopics: [], otherTopics: [], prefix: '' });

                // var handlerOptions = opts[ph.name];
                if (toFetch.myTopics.length && ph.subscribeHandler) {
                    var returned = ph.subscribeHandler(toFetch.myTopics, toFetch.prefix);
                    if (returned && returned.then) {
                        returned.then(notifyWithPrefix.bind(null, toFetch.prefix));
                    }
                }
                return toFetch.otherTopics;
            }, topics);
        },
        publishHandler: function (inputObj) {
            var status = handlers.reduce(function (accum, ph) {
                var topicsToHandle = Object.keys(accum.unhandled).reduce(function (soFar, inputKey) {
                    var value = accum.unhandled[inputKey];
                    var prefixMatch = ph.match(inputKey, ph.prefix);
                    if (prefixMatch !== false) {
                        var cleanedKey = inputKey.replace(prefixMatch, '');
                        soFar.myTopics[cleanedKey] = value;
                        soFar.prefix = prefixMatch;
                    } else {
                        soFar.otherTopics[inputKey] = value;
                    }
                    return soFar;
                }, { myTopics: {}, otherTopics: {}, prefix: '' });
                var myTopics = topicsToHandle.myTopics;
                if (!Object.keys(myTopics).length) {
                    return accum;
                }

                var thisProm = ph.publishHandler(myTopics, topicsToHandle.prefix).then(function (resultObj) {
                    var mapped = mapWithPrefix(resultObj, topicsToHandle.prefix);
                    return mapped;
                });
                accum.promises.push(thisProm);
                accum.unhandled = topicsToHandle.otherTopics;
                return accum;
            }, { promises: [], unhandled: inputObj });

            return $.when.apply(null, status.promises).then(function () {
                var args = Array.apply(null, arguments);
                var merged = args.reduce(function (accum, arg) {
                    return $.extend(true, {}, accum, arg);
                }, {});
                return merged;
            });
        },
    };
};
