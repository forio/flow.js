var MetaChannel = require('./run-meta-channel');
var VariablesChannel = require('./run-variables-channel');
var OperationsChannel = require('./run-operations-channel');
var silencable = require('./silencable');

var prefix = require('./middleware-utils').prefix;
var mapWithPrefix = require('./middleware-utils').mapWithPrefix;

module.exports = function (config, notifier) {
    var defaults = {
        serviceOptions: {},
        initialOperation: [],
        variables: {
            autoFetch: true,
            silent: false,
            readOnly: false,
        },
        operations: {
            readOnly: false,
            silent: false,
        },
        meta: {
            silent: false,
            autoFetch: true,
            readOnly: false
        },
    };
    var opts = $.extend(true, {}, defaults, config);

    var serviceOptions = _.result(opts, 'serviceOptions');
    var $initialProm = null;
    if (serviceOptions instanceof window.F.service.Run) {
        $initialProm = $.Deferred().resolve(serviceOptions).promise();
    } else if (serviceOptions.then) {
        $initialProm = serviceOptions;
    } else {
        var rs = new window.F.service.Run(serviceOptions);
        $initialProm = $.Deferred().resolve(rs).promise();
    }

    if (opts.initialOperation.length) {
        //FIXME: Move run initialization logic to run-manager, as a strategy option. Technically only it should know what to do with it.
        //For e.g, if there was a reset operation performed on the run, the run service instance will be the same so we wouldn't know
        $initialProm = $initialProm.then(function (runService) {
            if (!runService.initialize) {
                runService.initialize = runService.serial(opts.initialOperation);
            }
            return runService.initialize.then(function () {
                return runService;
            });
        });
    }

    var variableschannel = new VariablesChannel();
    //TODO: Need 2 different channel instances because the fetch is debounced, and hence will bundle variables up otherwise.
    //also, notify needs to be called twice (with different arguments). Different way?
    var defaultVariablesChannel = new VariablesChannel();
    var metaChannel = new MetaChannel();
    var operationsChannel = new OperationsChannel();

    var handlers = [
        $.extend({}, variableschannel, { name: 'variables', match: prefix('variable:') }),
        $.extend({}, metaChannel, { name: 'meta', match: prefix('meta:') }),
        $.extend({}, operationsChannel, { name: 'operations', match: prefix('operation:') }),
        $.extend({}, defaultVariablesChannel, { name: 'variables', match: prefix('') }),
    ];

    var notifyWithPrefix = function (prefix, data) {
        notifier(mapWithPrefix(data, prefix));
    };

    var publicAPI = {
        subscribeHandler: function (topics) {
            $initialProm.then(function (runService) {
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

                    var handlerOptions = opts[ph.name];
                    var shouldFetch = _.result(handlerOptions, 'autoFetch');
                    if (toFetch.myTopics.length && ph.subscribeHandler && shouldFetch) {
                        var returned = ph.subscribeHandler(runService, toFetch.myTopics);
                        if (returned && returned.then) {
                            returned.then(notifyWithPrefix.bind(null, toFetch.prefix));
                        }
                    }
                    return toFetch.otherTopics;
                }, topics);
            });
        },

        unsubscribeHandler: function (remainingTopics) {
            handlers.reduce(function (pendingTopics, ph) {
                var unsubs = ([].concat(pendingTopics)).reduce(function (accum, topic) {
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

                if (unsubs.myTopics.length && ph.unsubscribeHandler) {
                    ph.unsubscribeHandler(unsubs.myTopics);
                }
                return unsubs.otherTopics;
            }, remainingTopics);
        },

        publishHandler: function (inputObj) {
            return $initialProm.then(function (runService) {
                //TODO: This means variables are always set before operations happen, make that more dynamic and by occurence order
                //TODO: Have publish on subsmanager return a series of [{ key: val} ..] instead of 1 big object?
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

                    var handlerOptions = opts[ph.name];
                    if (_.result(handlerOptions, 'readOnly')) {
                        var msg = 'Tried to publish to a read-only operations channel';
                        console.warn(msg, myTopics);
                        return accum;
                    } 

                    var thisProm = ph.publishHandler(runService, myTopics, handlerOptions).then(function (resultObj) {
                        var unsilenced = silencable(resultObj, handlerOptions);
                        if (Object.keys(unsilenced).length && ph.name !== 'meta') {
                            //FIXME: Better way?
                            // variableschannel.fetch(runService).then(notifyWithPrefix.bind(null, 'variables:'));
                            // defaultVariablesChannel.fetch(runService).then(notifyWithPrefix.bind(null, ''));
                        }
                        var mapped = mapWithPrefix(unsilenced, topicsToHandle.prefix);
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
            });
        }
    };

    $.extend(this, publicAPI);
};
