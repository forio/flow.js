var debounceAndMerge = require('utils/general').debounceAndMerge;

var metaChannel = require('./run-meta-channel');
var variablesChannel = require('./run-variables-channel');
var operationsChannel = require('./run-operations-channel');

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
            autoFetch: true,
            readOnly: false
        },
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

    var VARIABLES_PREFIX = 'variable:';
    var META_PREFIX = 'meta:';

    var debouncedFetch = debounceAndMerge(function (variables, runService, notifyCallback) {
        runService.variables().query(variables).then(function (result) {
            var toNotify = _.reduce(result, function (accum, value, variable) {
                var key = VARIABLES_PREFIX + variable;
                accum[key] = value;
                return accum;
            }, {});
            notifyCallback(toNotify);
        });
    }, 200, [function mergeVariables(accum, newval) {
        if (!accum) {
            accum = [];
        }
        return _.uniq(accum.concat(newval));
    }]);

    var subscribedVariables = {};

    var publicAPI = {
        subscribeInterceptor: function (topics) {
            $creationPromise.then(function (runData) {
                metaChannel.subscribeHandler(topics, opts.meta, rm.run, runData, notifier);
                variablesChannel.subscribeHandler(topics, opts.meta, rm.run, runData, notifier);
            });
        },

        //TODO: Break this into multiple middlewares?
        publishInterceptor: function (inputObj) {
            return $creationPromise.then(function (runData) {
                //TODO: This means variables are always set before operations happen, make that more dynamic and by occurence order
                //TODO: Have publish on subsmanager return a series of [{ key: val} ..] instead of 1 big object?
                var prom = $.Deferred().resolve().promise();
                prom = prom.then(function () {
                    return metaChannel.publishHander(rm.run, inputObj, opts.meta);
                });
                prom = prom.then(function () {
                    return variablesChannel.publishHander(rm.run, inputObj, opts.variables).then(function (changeList) {
                        var changedVariables = _.isArray(changeList) ? changeList : _.keys(changeList);

                        var silent = opts.variables.silent;
                        var shouldSilence = silent === true;
                        if (_.isArray(silent) && changedVariables) {
                            shouldSilence = _.intersection(silent, changedVariables).length >= 1;
                        }
                        if ($.isPlainObject(silent) && changedVariables) {
                            shouldSilence = _.intersection(silent.except, changedVariables).length !== changedVariables.length;
                        }
                        if (shouldSilence) {
                            return changeList;
                        }

                        var variables = Object.keys(subscribedVariables);
                        debouncedFetch(variables, rm.run, notifier);
                        return changeList;
                    });
                });
                prom = prom.then(function () {
                    return operationsChannel.publishHander(rm.run, inputObj, opts.operations).then(function (publishedOperations) {
                        var operationNames = ([].concat(publishedOperations)).map(function (operation) {
                            return operation.name;
                        });

                        var silent = opts.operations.silent;
                        var shouldSilence = silent === true;
                        if (_.isArray(silent) && operationNames) {
                            shouldSilence = _.intersection(silent, operationNames).length >= 1;
                        }
                        if ($.isPlainObject(silent) && operationNames) {
                            shouldSilence = _.intersection(silent.except, operationNames).length !== operationNames.length;
                        }
                        if (shouldSilence) {
                            return publishedOperations;
                        }

                        var variables = Object.keys(subscribedVariables);
                        debouncedFetch(variables, rm.run, notifier);
                        return publishedOperations;
                    });
                });
                return prom;
            });
        }
    };

    $.extend(this, publicAPI);
};
