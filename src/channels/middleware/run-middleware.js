var debounceAndMerge = require('utils/general').debounceAndMerge;

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
    var OPERATIONS_PREFIX = 'operation:';
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
            var toFetch = ([].concat(topics)).reduce(function (accum, topic) {
                if (topic.indexOf(VARIABLES_PREFIX) === 0) {
                    var vname = topic.replace(VARIABLES_PREFIX, '');
                    subscribedVariables[vname] = true;
                    accum.variables.push(vname);
                } else if (topic.indexOf(META_PREFIX) === 0) {
                    var metaName = topic.replace(META_PREFIX, '');
                    accum.meta.push(metaName);
                }
                return accum;
            }, { variables: [], meta: [] });

            if (_.result(opts.meta, 'autoFetch') && toFetch.meta.length) {
                $creationPromise.then(function (runData) {
                    var toSend = toFetch.meta.reduce(function (accum, meta) {
                        if (runData[meta] !== undefined) {
                            accum[META_PREFIX + meta] = runData[meta];
                        }
                        return accum;
                    }, {});
                    notifier(toSend);
                });
            }
            if (_.result(opts.variables, 'autoFetch') && toFetch.variables.length) {
                return $creationPromise.then(function (runData) {
                    debouncedFetch(toFetch.variables, rm.run, notifier);
                });
            }
        },

        //TODO: Break this into multiple middlewares?
        publishInterceptor: function (inputObj) {
            return $creationPromise.then(function (runData) {
                //TODO: This means variables are always set before operations happen, make that more dynamic and by occurence order
                //TODO: Have publish on subsmanager return a series of [{ key: val} ..] instead of 1 big object?
                var toSave = Object.keys(inputObj).reduce(function (accum, key) {
                    var val = inputObj[key];
                    if (key.indexOf(VARIABLES_PREFIX) === 0) {
                        key = key.replace(VARIABLES_PREFIX, '');
                        accum.variables[key] = val; //TODO: Delete this on unsubscribe
                    } else if (key.indexOf(OPERATIONS_PREFIX) === 0) {
                        key = key.replace(OPERATIONS_PREFIX, '');
                        accum.operations.push({ name: key, params: val });
                    } else if (key.indexOf(META_PREFIX) === 0) {
                        key = key.replace(META_PREFIX, '');
                        accum.meta[key] = val;
                    }
                    return accum;
                }, { variables: {}, operations: [], meta: {} });

                var prom = $.Deferred().resolve().promise();
                var msg = '';
                if (!_.isEmpty(toSave.meta)) {
                    if (_.result(opts.meta, 'readOnly')) {
                        msg = 'Tried to publish to a read-only meta channel';
                        console.warn(msg, toSave.meta);
                        return $.Deferred().reject(msg).promise();
                    }
                    prom = prom.then(function () {
                        return rm.run.save(toSave.meta);
                    }).then(function () {
                        return inputObj;
                    });
                }
                if (!_.isEmpty(toSave.variables)) {
                    if (_.result(opts.variables, 'readOnly')) {
                        msg = 'Tried to publish to a read-only variables channel';
                        console.warn(msg, toSave.variables);
                        return $.Deferred().reject(msg).promise();
                    }
                    prom = prom.then(function () {
                        return rm.run.variables().save(toSave.variables).then(function (changeList) {
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
                            $creationPromise.then(function (runService) { //this isn't a publish dependency, so don't return this
                                debouncedFetch(variables, runService, notifier);
                            });
                            return changeList;
                        });
                    }).then(function () {
                        return inputObj;
                    });
                }
                if (!_.isEmpty(toSave.operations)) {
                    if (_.result(opts.operations, 'readOnly')) {
                        msg = 'Tried to publish to a read-only operations channel';
                        console.warn(msg, toSave.operations);
                        return $.Deferred().reject(msg).promise();
                    }
                    prom = prom.then(function () {
                        //TODO: Check serial vs parallel here.
                        return rm.run.serial(toSave.operations).then(function (publishedOperations) {
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
                            $creationPromise.then(function (runService) { //this isn't a publish dependency, so don't return this
                                debouncedFetch(variables, runService, notifier);
                            });
                            return publishedOperations;
                        });
                    }).then(function (result) {
                        ([].concat(result)).forEach(function (res) {
                            var key = OPERATIONS_PREFIX + res.name;
                            inputObj[key] = res.result;
                        });
                        return inputObj;
                    });
                }
                return prom;
            });
        }
    };

    $.extend(this, publicAPI);
};
