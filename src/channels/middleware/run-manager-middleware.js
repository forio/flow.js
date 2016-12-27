var RunChannel = require('./run-middleware');

function addPrefixToKey(obj, prefix) {
    return Object.keys(obj).reduce(function (accum, key) {
        accum[prefix + key] = obj[key];
        return accum;
    }, {});
}

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
    //define a match function
    //define a prefix function which takes in the match result as a parameter
    // create a new channel and push onto handlers to catch further
    var handlers = [
        $.extend(currentRunChannel, { name: 'current', prefix: 'current:' }),
        // $.extend({ name: 'custom', match: function () {
            
        // }})
        // $.extend(metaChannel, { name: 'meta', prefix: 'meta:' }),
        $.extend(defaultRunChannel, { name: 'current', prefix: '' }),
    ];

    var notifyWithPrefix = function (prefix, data) {
        var toNotify = _.reduce(data, function (accum, value, variable) {
            var key = prefix + variable;
            accum[key] = value;
            return accum;
        }, {});
        notifier(toNotify);
    };

    return {
        subscribeHandler: function (topics) {
            handlers.reduce(function (pendingTopics, ph) {
                var toFetch = ([].concat(pendingTopics)).reduce(function (accum, topic) {
                    // var notify = 
                    if (ph.match && ph.match(topic)) {
                        var match = ph.match(topic);
                        var cleaned = topic.replace(match, '');
                        accum.myTopics.push(cleaned);
                    } else if (topic.indexOf(ph.prefix) === 0) {
                        var stripped = topic.replace(ph.prefix, '');
                        accum.myTopics.push(stripped);
                    } else {
                        accum.otherTopics.push(topic);
                    }
                    return accum;
                }, { myTopics: [], otherTopics: [] });

                // var handlerOptions = opts[ph.name];
                if (ph.subscribeHandler) {
                    var returned = ph.subscribeHandler(toFetch.myTopics);
                    if (returned && returned.then) {
                        returned.then(notifyWithPrefix.bind(null, ph.prefix));
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
                    var mapped = addPrefixToKey(resultObj, ph.prefix);
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
