module.exports = function (config) {
    //TODO: Pass in a 'notify' function here?
    //
    var defaults = {
        variables: {
            autoFetch: {
                start: false
            },
            readOnly: false,
        },
        operations: {
            readOnly: false,
        }
    };
    var opts = $.extend(true, {}, defaults, config);
    var rm = new window.F.manager.RunManager({ run: opts });
    // var rs = rm.run;

    var $creationPromise = rm.getRun().then(function () {
        return rm.run;
    });
    // rs.currentPromise = $creationPromise;

    //TODO: Figure out 'on init'
    var VARIABLES_PREFIX = 'variable:';
    var OPERATIONS_PREFIX = 'operation:';

    
    function debounce(fn) {
        var timer = null;
        var debounceInterval = 200;
        var unfetched = [];
        return function (variables) {
            unfetched = _.uniq(unfetched.concat(variables));
            if (timer) {
                clearTimeout(timer);
                timer = setTimeout(function () {
                    timer = null;
                    fn(unfetched);
                }, debounceInterval);
            } else {
                unfetched = [];
                fn(unfetched);
            }
        };
    }

    var publicAPI = {
        //TODO: Need to 'refresh' variables when operations are called. So keep track of subscriptions internally?
        subscribeInterceptor: function (topics, notifyCallback) {
            var variablesToFetch = ([].concat(topics)).reduce(function (accum, topic) {
                if (topic.indexOf(VARIABLES_PREFIX) === 0) {
                    accum.push(topic.replace(VARIABLES_PREFIX, ''));
                }
                return accum;
            }, []);
            // TODO: Pre-fetch checking happens here
            if (_.result(opts.variables, 'autoFetch') && variablesToFetch.length) {
                return $creationPromise.then(function (runService) {
                    return runService.variables().query(variablesToFetch).then(function (result) {
                        var toNotify = _.reduce(result, function (accum, value, variable) {
                            var key = VARIABLES_PREFIX + variable;
                            accum[key] = value;
                            return accum;
                        }, {});
                        unfetched = [];
                        return notifyCallback(toNotify);
                    });
                });
            }
           
        },
        publishInterceptor: function (inputObj) {
            return $creationPromise.then(function (runService) {
                //TODO: This means variables are always set before operations happen, make that more dynamic and by occurence order
                //TODO: Have publish on subsmanager return a series of [{ key: val} ..] instead of 1 big object?
                var toSave = Object.keys(inputObj).reduce(function (accum, key) {
                    var val = inputObj[key];
                    if (key.indexOf(VARIABLES_PREFIX) === 0) {
                        key = key.replace(VARIABLES_PREFIX, '');
                        accum.variables[key] = val;
                    } else if (key.indexOf(OPERATIONS_PREFIX) === 0) {
                        key = key.replace(OPERATIONS_PREFIX, '');
                        accum.operations.push({ name: key, params: val });
                    }
                    return accum;
                }, { variables: {}, operations: [] });

                var prom = $.Deferred().resolve().promise();
                var msg = '';
                if (!_.isEmpty(toSave.variables)) {
                    if (_.result(opts.variables, 'readOnly')) {
                        msg = 'Tried to publish to a read-only variables channel';
                        console.warn(msg, toSave.variables);
                        return $.Deferred().reject(msg).promise();
                    }
                    prom = prom.then(function () {
                        return runService.variables().save(toSave.variables).then(function (result) {
                            var toNotify = _.reduce(result, function (accum, value, variable) {
                                var key = VARIABLES_PREFIX + variable;
                                accum[key] = value;
                                return accum;
                            }, {});
                            return toNotify;
                        });
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
                        return runService.serial(toSave.operations).then(function (result) {
                            var toNotify = _.reduce([].concat(result), function (accum, res) {
                                var key = OPERATIONS_PREFIX + res.name;
                                accum[key] = res.result;
                                return accum;
                            }, {});
                            return toNotify;
                        });
                    });
                }
                return prom;
            });
        }
    };

    $.extend(this, publicAPI);
};
