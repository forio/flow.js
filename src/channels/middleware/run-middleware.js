var MetaChannel = require('./run-meta-channel');
var VariablesChannel = require('./run-variables-channel');
var OperationsChannel = require('./run-operations-channel');
var silencable = require('./silencable');

function addPrefixToKey(obj, prefix) {
    return Object.keys(obj).reduce(function (accum, key) {
        accum[key] = obj[key];
        return accum;
    }, {});
}
module.exports = function (config, notifier) {
    var defaults = {
        serviceOptions: {},
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
            silent: true,
            autoFetch: true,
            readOnly: false
        },
        initialOperation: '',
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

    var variableschannel = new VariablesChannel();
    var metaChannel = new MetaChannel();
    var operationsChannel = new OperationsChannel();

    var handlers = [
        $.extend(variableschannel, { name: 'variables', prefix: 'variables:' }),
        $.extend(metaChannel, { name: 'meta', prefix: 'meta:' }),
        $.extend(operationsChannel, { name: 'operations', prefix: 'operations:' }),
    ];

    var notifyWithPrefix = function (prefix, data) {
        var toNotify = _.reduce(data, function (accum, value, variable) {
            var key = prefix + variable;
            accum[key] = value;
            return accum;
        }, {});
        notifier(toNotify);
    };

    var publicAPI = {
        subscribeInterceptor: function (topics) {
            $initialProm.then(function (runService) {
                handlers.forEach(function (ph) {
                    var toFetch = ([].concat(topics)).reduce(function (accum, topic) {
                        if (topic.indexOf(ph.prefix) === 0) {
                            var metaName = topic.replace(ph.prefix, '');
                            accum.push(metaName);
                        }
                        return accum;
                    }, []);

                    var handlerOptions = opts[ph.name];
                    var shouldFetch = _.result(handlerOptions, 'autoFetch');
                    if (toFetch.length && ph.subscribeHandler && shouldFetch) {
                        var returned = ph.subscribeHandler(runService, toFetch);
                        if (returned && returned.then) {
                            returned.then(notifyWithPrefix.bind(null, ph.prefix));
                        }
                    }
                });
            });
        },

        //TODO: Break this into multiple middlewares?
        publishInterceptor: function (inputObj) {
            return $initialProm.then(function (runService) {
                //TODO: This means variables are always set before operations happen, make that more dynamic and by occurence order
                //TODO: Have publish on subsmanager return a series of [{ key: val} ..] instead of 1 big object?
                var promises = handlers.reduce(function (promisesSoFar, ph) {
                    var topicsToHandle = Object.keys(inputObj).reduce(function (accum, inputKey) {
                        if (inputKey.indexOf(ph.prefix) !== -1) {
                            var cleanedKey = inputKey.replace(ph.prefix, '');
                            accum[cleanedKey] = inputObj[inputKey];
                        }
                        return accum;
                    }, {});

                    if (!Object.keys(topicsToHandle).length) {
                        return promisesSoFar;
                    }

                    var handlerOptions = opts[ph.name];
                    if (_.result(handlerOptions, 'readOnly')) {
                        var msg = 'Tried to publish to a read-only operations channel';
                        console.warn(msg, topicsToHandle);
                        return promisesSoFar;
                    } 

                    var thisProm = ph.publishHander(runService, topicsToHandle, opts[ph.name]).then(function (resultObj) {
                        var unsilenced = silencable(resultObj, opts[ph.name]);
                        if (Object.keys(unsilenced).length) {
                            variableschannel.fetch(runService).then(notifyWithPrefix.bind(null, variableschannel.prefix));
                        }
                        var mapped = addPrefixToKey(unsilenced, ph.prefix);
                        return mapped;
                    });
                    promisesSoFar.push(thisProm);
                    return promisesSoFar;
                }, []);

                return $.when.apply(null, promises).then(function () {
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
