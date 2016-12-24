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
    var sm = new window.F.manager.ScenarioManager(opts.serviceOptions);

    var BASELINE_PREFIX = 'baseline:';
    var CURRENT_RUN_PREFIX = 'current:';

    var VARIABLES_PREFIX = 'variable:';
    var META_PREFIX = 'meta:';
    var OPERATIONS_PREFIX = 'operation:';

    var $getBaseLinePromise = sm.baseline.getRun();
    var $currentRunPromise = sm.current.getRun();

    var notifyWithPrefix = function (prefix, dataObj) {
        var toNotify = _.reduce(dataObj, function (accum, value, key) {
            var prefixEd = prefix + key;
            accum[prefixEd] = value;
            return accum;
        }, {});
        notifier(toNotify);
    };

    var debouncedFetch = debounceAndMerge(function (variables, runService, notifyCallback) {
        runService.variables().query(variables).then(notifyCallback);
    }, 200, [function mergeVariables(accum, newval) {
        if (!accum) {
            accum = [];
        }
        return _.uniq(accum.concat(newval));
    }]);

    var publicAPI = {
        subscribeInterceptor: function (topics) {
            var split = ([].concat(topics)).reduce(function (accum, topic) {
                if (topic.indexOf(BASELINE_PREFIX) === 0) {
                    accum.baseline.push(topic.replace(BASELINE_PREFIX, ''));
                } else if (topic.indexOf(CURRENT_RUN_PREFIX) === 0) {
                    accum.current.push(topic.replace(CURRENT_RUN_PREFIX, ''));
                }
                return accum;
            }, { baseline: [], current: [] });

            if (split.baseline.length) {
                var toFetch = split.baseline.reduce(function (accum, topic) {
                    if (topic.indexOf(VARIABLES_PREFIX) === 0) {
                        accum.variables.push(topic.replace(VARIABLES_PREFIX, ''));
                    } else if (topic.indexOf(META_PREFIX) === 0) {
                        accum.meta.push(topic.replace(META_PREFIX, ''));
                    }
                    return accum;
                }, { variables: [], meta: [] });

                if (toFetch.variables.length) {
                    $getBaseLinePromise.then(function (runData) {
                        debouncedFetch(toFetch.variables, sm.baseline.run, notifyWithPrefix.bind(null, BASELINE_PREFIX + VARIABLES_PREFIX));
                    });
                }
                if (toFetch.meta.length) {
                    $getBaseLinePromise.then(function (runData) {
                        var toSend = toFetch.meta.reduce(function (accum, meta) {
                            if (runData[meta] !== undefined) {
                                accum[BASELINE_PREFIX + META_PREFIX + meta] = runData[meta];
                            }
                            return accum;
                        }, {});
                        notifier(toSend);
                    });
                }
            }
            if (split.current.length) {
                var toFetchCurrent = split.current.reduce(function (accum, topic) {
                    if (topic.indexOf(VARIABLES_PREFIX) === 0) {
                        accum.variables.push(topic.replace(VARIABLES_PREFIX, ''));
                    } else if (topic.indexOf(META_PREFIX) === 0) {
                        accum.meta.push(topic.replace(META_PREFIX, ''));
                    }
                    return accum;
                }, { variables: [], meta: [] });

                if (toFetchCurrent.variables.length) {
                    $currentRunPromise.then(function (runData) {
                        debouncedFetch(toFetchCurrent.variables, sm.current.run, notifyWithPrefix.bind(null, CURRENT_RUN_PREFIX + VARIABLES_PREFIX));
                    });
                }
                if (toFetchCurrent.meta.length) {
                    $currentRunPromise.then(function (runData) {
                        var toSend = toFetchCurrent.meta.reduce(function (accum, meta) {
                            if (runData[meta] !== undefined) {
                                accum[CURRENT_RUN_PREFIX + META_PREFIX + meta] = runData[meta];
                            }
                            return accum;
                        }, {});
                        notifier(toSend);
                    });
                }
            }
        },
        publishInterceptor: function (inputObj) {
            var split = Object.keys(inputObj).reduce(function (accum, key) {
                var val = inputObj[key];
                if (key.indexOf(BASELINE_PREFIX) === 0) {
                    key = key.replace(BASELINE_PREFIX, '');
                    accum.baseline[key] = val;
                } else if (key.indexOf(CURRENT_RUN_PREFIX) === 0) {
                    key = key.replace(CURRENT_RUN_PREFIX, '');
                    accum.current[key] = val;
                } 
                return accum;
            }, { baseline: {}, current: {} });

            var prom = $.Deferred().resolve().promise();
            if (!_.isEmpty(split.baseline)) {
                var toSave = Object.keys(split.baseline).reduce(function (accum, key) {
                    var val = inputObj[key];
                    if (key.indexOf(VARIABLES_PREFIX) === 0) {
                        console.error('Cannot set variables on baseline');
                    } else if (key.indexOf(OPERATIONS_PREFIX) === 0) {
                        console.error('Cannot do operations on baseline');
                    } else if (key.indexOf(META_PREFIX) === 0) {
                        key = key.replace(META_PREFIX, '');
                        accum.meta[key] = val;
                    }
                    return accum;
                }, { meta: {} });

                if (!_.isEmpty(toSave.meta)) {
                    prom = prom.then(function () {
                        return sm.baseline.save(toSave.meta).then(function() {
                            return inputObj;
                        });
                    });
                }
            }

            if (!_.isEmpty(split.current)) {
                var toSaveCurrent = Object.keys(split.current).reduce(function (accum, key) {
                    var val = inputObj[key];
                    if (key.indexOf(VARIABLES_PREFIX) === 0) {
                        key = key.replace(VARIABLES_PREFIX, '');
                        accum.variables[key] = val;
                    } else if (key.indexOf(OPERATIONS_PREFIX) === 0) {
                        key = key.replace(OPERATIONS_PREFIX, '');
                        accum.operations.push({ name: key, params: val });
                    } else if (key.indexOf(META_PREFIX) === 0) {
                        key = key.replace(META_PREFIX, '');
                        accum.meta[key] = val;
                    }
                    return accum;
                }, { variables: {}, operations: {}, meta: {} });

                if (!_.isEmpty(toSaveCurrent.variables)) {
                    prom = prom.then(function () {
                        return $currentRunPromise.then(function (runData) {

                        });
                    });
                }
            }

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
