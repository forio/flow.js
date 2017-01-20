var MetaChannel = require('./run-meta-channel');
var VariablesChannel = require('./run-variables-channel');
var OperationsChannel = require('./run-operations-channel');
var silencable = require('channels/middleware/utils/silencable');

var prefix = require('channels/middleware/utils').prefix;
var mapWithPrefix = require('channels/middleware/utils').mapWithPrefix;
var channelUtils = require('channels/channel-utils');

module.exports = function (config, notifier) {
    var defaults = {
        serviceOptions: {},
        channelOptions: {
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
        }
    };
    var opts = $.extend(true, {}, defaults, config);

    var serviceOptions = _.result(opts, 'serviceOptions');
    var channelOptions = opts.channelOptions;

    var $initialProm = null;
    if (serviceOptions instanceof window.F.service.Run) {
        $initialProm = $.Deferred().resolve(serviceOptions).promise();
    } else if (serviceOptions.then) {
        $initialProm = serviceOptions;
    } else {
        var rs = new window.F.service.Run(serviceOptions);
        $initialProm = $.Deferred().resolve(rs).promise();
    }

    if (channelOptions.initialOperation.length) {
        //FIXME: Move run initialization logic to run-manager, as a strategy option. Technically only it should know what to do with it.
        //For e.g, if there was a reset operation performed on the run, the run service instance will be the same so we wouldn't know
        $initialProm = $initialProm.then(function (runService) {
            if (!runService.initialize) {
                runService.initialize = runService.serial(channelOptions.initialOperation);
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
                var grouped = channelUtils.groupByHandlers(topics, handlers);
                grouped.forEach(function (handler) {
                    var handlerOptions = channelOptions[handler.name];
                    var shouldFetch = _.result(handlerOptions, 'autoFetch');
                    if (handler.subscribeHandler && shouldFetch) {
                        var returned = handler.subscribeHandler(runService, handler.topics);
                        if (returned && returned.then) {
                            returned.then(notifyWithPrefix.bind(null, handler.match));
                        }
                    }
                });
            });
        },

        unsubscribeHandler: function (remainingTopics) {
            var grouped = channelUtils.groupByHandlers(remainingTopics, handlers);
            grouped.forEach(function (handler) {
                if (handler && handler.unsubscribeHandler) {
                    handler.unsubscribeHandler(handler.topics);
                }
            });
        },

        publishHandler: function (publishData) {
            var grouped = channelUtils.groupSequentiallyByHandlers(publishData, handlers);

            return $initialProm.then(function (runService) {
                var $prom = $.Deferred().resolve({}).promise();
                grouped.forEach(function (handler) {
                    var handlerOptions = channelOptions[handler.name];
                    if (_.result(handlerOptions, 'readOnly')) {
                        var msg = 'Tried to publish to a read-only operations channel';
                        console.warn(msg, handler.data);
                    } else {
                        $prom = $prom.then(function (dataSoFar) {
                            return handler.publishHandler(runService, handler.data, handlerOptions).then(function (resultObj) {
                                var unsilenced = silencable(resultObj, handlerOptions);
                                var mapped = mapWithPrefix(unsilenced, handler.match);
                                return mapped;
                            }).then(function (unsilenced) {
                                if (Object.keys(unsilenced).length && handler.name !== 'meta') {
                                    //FIXME: Better way?
                                    // variableschannel.fetch(runService).then(notifyWithPrefix.bind(null, 'variables:'));
                                    // defaultVariablesChannel.fetch(runService).then(notifyWithPrefix.bind(null, ''));
                                }
                                return unsilenced;
                            }).then(function (unsilenced) {
                                return $.extend(dataSoFar, unsilenced);
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
