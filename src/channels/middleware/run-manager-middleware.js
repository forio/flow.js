var RunChannel = require('./run-middleware');

var prefix = require('./middleware-utils').prefix;
var mapWithPrefix = require('./middleware-utils').mapWithPrefix;

module.exports = function (config, notifier) {
    var defaults = {
        serviceOptions: {},
        initialOperation: '',
    };
    var opts = $.extend(true, {}, defaults, config);

    var rm = new window.F.manager.RunManager(opts.serviceOptions);
    var $creationPromise = rm.getRun();
    if (opts.initialOperation) { //TODO: Only do this for newly created runs;
        $creationPromise = $creationPromise.then(function (rundata) {
            return rm.run.do(opts.initialOperation).then(function () {
                return rundata;
            });
        });
    }
    $creationPromise = $creationPromise.then(function () {
        return rm.run;
    });
    var currentRunChannel = new RunChannel({ serviceOptions: $creationPromise }, notifier);
    var defaultRunChannel = new RunChannel({ serviceOptions: $creationPromise }, notifier);

    var sampleRunid = '000001593dd81950d4ee4f3df14841769a0b';
    var notifyWithPrefix = function (prefix, data) {
        notifier(mapWithPrefix(data, prefix));
    };
    //define a match function
    //define a prefix function which takes in the match result as a parameter
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
                if (!knownRunIDServiceChannels[prefix]) {
                    var newNotifier = notifyWithPrefix.bind(null, prefix + ':');
                    var runOptions = $.extend(true, {}, opts.serviceOptions.run, { id: prefix });
                    var runChannel = new RunChannel({ serviceOptions: runOptions }, newNotifier);
                    knownRunIDServiceChannels[prefix] = runChannel;
                }
                return knownRunIDServiceChannels[prefix].publishHandler(topics);
            }
        },
        // $.extend({ name: 'custom', match: function () {
            
        // }})
        // $.extend(metaChannel, { name: 'meta', prefix: 'meta:' }),
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
                if (ph.subscribeHandler) {
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
                    if (inputKey.indexOf(ph.prefix) !== -1) {
                        var cleanedKey = inputKey.replace(ph.prefix, '');
                        soFar.myTopics[cleanedKey] = value;
                    } else {
                        soFar.otherTopics[inputKey] = value;
                    }
                    return soFar;
                }, { myTopics: {}, otherTopics: {} });

                var myTopics = topicsToHandle.myTopics;
                if (!Object.keys(myTopics).length) {
                    return accum;
                }

                var thisProm = ph.publishHandler(myTopics).then(function (resultObj) {
                    var mapped = mapWithPrefix(resultObj, ph.prefix);
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
