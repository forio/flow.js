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

        publishHandler: function (publishData, options) {
            function findBestHandler(handlers, topic) {
                for (var i = 0; i < handlers.length; i++) {
                    var thishandler = handlers[i];
                    var match = thishandler.match(topic);
                    if (match) {
                        return $.extend(true, {}, thishandler, { prefix: match });
                    }
                }
            }

            return $initialProm.then(function (runService) {
                var grouped = publishData.reduce(function (accum, dataPt) {
                    var lastHandler = accum.handled[accum.handled.length - 1];
                    var bestHandler = findBestHandler(handlers, dataPt.name);
                    if (lastHandler && bestHandler.prefix === lastHandler.prefix) {
                        dataPt.name = dataPt.name.replace(lastHandler.prefix, '');
                        lastHandler.data.push(dataPt);
                    } else {
                        accum.handled.push({ data: [dataPt], handler: bestHandler });
                    }
                    return accum;
                }, []);

                var $prom = $.Deferred().resolve().promise;
                grouped.forEach(function (grouping) {
                    var handler = grouping.handler;
                    var handlerOptions = opts[handler.name];
                    if (_.result(handlerOptions, 'readOnly')) {
                        var msg = 'Tried to publish to a read-only operations channel';
                        console.warn(msg, grouping.toPublish);
                    } else {
                        $prom = $prom.then(function () {
                            return handler.publishHandler(runService, grouping.toPublish, handlerOptions).then(function (resultObj) {
                                var unsilenced = silencable(resultObj, handlerOptions);
                                if (Object.keys(unsilenced).length && handler.name !== 'meta') {
                                    //FIXME: Better way?
                                    // variableschannel.fetch(runService).then(notifyWithPrefix.bind(null, 'variables:'));
                                    // defaultVariablesChannel.fetch(runService).then(notifyWithPrefix.bind(null, ''));
                                }
                                var mapped = mapWithPrefix(unsilenced, handler.prefix);
                                return mapped;
                            });
                        });
                    }
                });
                return $prom;

            });
        }
    };

    $.extend(this, publicAPI);
};
