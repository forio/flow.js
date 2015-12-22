(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.Flow = require('./flow.js');
window.Flow.version = '0.9.0'; //populated by grunt

},{"./flow.js":32}],2:[function(require,module,exports){
/**
 * ## Operations Channel
 *
 * Channels are ways for Flow.js to talk to external APIs -- primarily the [underlying Epicenter APIs](../../../../creating_your_interface/).
 *
 * The primary use cases for the Operations Channel are:
 *
 * * `publish`: Call an operation.
 * * `subscribe`: Receive notifications when an operation is called.
 *
 * For example, use `publish()` to call an operation (method) from your model:
 *
 *      Flow.channel.operations.publish('myMethod', myMethodParam);
 *
 * For reference, an equivalent call using Flow.js custom HTML attributes is:
 *
 *      <button data-f-on-click="myMethod(myMethodParam)">Click me</button>
 *
 * You can also use `subscribe()` and a callback function to listen and react when the operation has been called:
 *
 *      Flow.channel.operations.subscribe('myMethod',
 *          function() { console.log('called!'); } );
 *
 * Use `subscribe(*)` to listen for notifications on all operations.
 *
 * To use the Operations Channel, simply [initialize Flow.js in your project](../../../#custom-initialize).
 *
*/


'use strict';
var config = require('../config');

module.exports = function (options) {
    var defaults = {
        /**
         * Determine when to update state. Defaults to `false`: always trigger updates.
         *
         * Possible options are:
         *
         * * `true`: Never trigger any updates. Use this if you know your model state won't change based on operations.
         * * `false`: Always trigger updates.
         * * `[array of operation names]`: Operations in this array *will not* trigger updates; everything else will.
         * * `{ except: [array of operation names] }`: Operations in this array *will* trigger updates; nothing else will.
         *
         * To set, pass this into the `Flow.initialize()` call in the `channel.run.operations` field:
         *
         *      Flow.initialize({
         *          channel: {
         *              run: {
         *                  model: 'myModel.py',
         *                  account: 'acme-simulations',
         *                  project: 'supply-chain-game',
         *                  operations: { silent: true }
         *              }
         *          }
         *      });
         *
         * To override for a specific call to the Operations Channel, pass this as the final `options` parameter:
         *
         *       Flow.channel.operations.publish('myMethod', myMethodParam, { silent: true });
         *
         * @type {String|Array|Object}
         */
        silent: false,

        interpolate: {}
    };

    var channelOptions = $.extend(true, {}, defaults, options);
    this.options = channelOptions;

    var run = channelOptions.run;

    var publicAPI = {
        //for testing
        private: {
            options: channelOptions
        },

        listenerMap: {},

        getSubscribers: function (topic) {
            var topicSubscribers = this.listenerMap[topic] || [];
            var globalSubscribers = this.listenerMap['*'] || [];
            return topicSubscribers.concat(globalSubscribers);
        },

        //Check for updates
        /**
         * Force a check for updates on the channel, and notify all listeners.
         *
         * @param {String|Array}  executedOpns Operations which just happened.
         * @param {Any} response  Response from the operation.
         * @param {Boolean} force  Ignore all `silent` options and force refresh.
         */
        refresh: function (executedOpns, response, force) {
            // console.log('Operations refresh', executedOpns);
            var silent = channelOptions.silent;

            var toNotify = executedOpns;
            if (force === true) {
            } else if (silent === true) {
                toNotify = [];
            } else if (_.isArray(silent) && executedOpns) {
                toNotify = _.difference(executedOpns, silent);
            } else if ($.isPlainObject(silent) && executedOpns) {
                toNotify = _.intersection(silent.except, executedOpns);
            }

            _.each(toNotify, function (opn) {
                this.notify(opn, response);
            }, this);
        },

        /**
         * Alert each subscriber about the operation and its parameters. This can be used to provide an update without a round trip to the server. However, it is rarely used: you almost always want to `subscribe()` instead so that the operation is actually called in the model.
         *
         * **Example**
         *
         *      Flow.channel.operations.notify('myMethod', myMethodResponse);
         *
         * @param {String} operation Name of operation.
         * @param {String|Number|Array|Object} value Parameter values for the callback function.
        */
        notify: function (operation, value) {
            var listeners = this.getSubscribers(operation);
            var params = {};
            params[operation] = value;

            _.each(listeners, function (listener) {
                var target = listener.target;
                if (_.isFunction(target)) {
                    target.call(null, params, value, operation);
                } else if (target.trigger) {
                    listener.target.trigger(config.events.react, params);
                } else {
                    throw new Error('Unknown listener format for ' + operation);
                }
            });
        },

        interpolate: function (params) {
            var ip = this.options.interpolate;
            var match = function (p) {
                var mapped = p;
                if (ip[p]) {
                    mapped = _.isFunction(ip[p]) ? ip[p](p) : ip[p];
                }
                return mapped;
            };
            return ($.isArray(params)) ? _.map(params, match) : match(params);
        },

        /**
         * Call the operation with parameters, and alert subscribers.
         *
         * **Example**
         *
         *      Flow.channel.operations.publish('myMethod', myMethodParam);
         *      Flow.channel.operations.publish({
         *          operations: [{ name: 'myMethod', params: [myMethodParam] }]
         *      });
         *
         * @param  {String|Object} operation For one operation, pass the name of operation (string). For multiple operations, pass an object with field `operations` and value array of objects, each with `name` and `params`: `{operations: [{ name: opn, params:[] }] }`.
         * @param {String|Number|Array|Object} params (Optional)  Parameters to send to operation. Use for one operation; for multiple operations, parameters are already included in the object format.
         * @param {Object} options (Optional) Overrides for the default channel options.
         * @param {Boolean} options.silent Determine when to update state.
         *
         * @return {$promise} Promise to complete the call.
         */
        publish: function (operation, params, options) {
            var me = this;
            if ($.isPlainObject(operation) && operation.operations) {
                var fn = (operation.serial) ? run.serial : run.parallel;
                _.each(operation.operations, function (opn) {
                    opn.params = this.interpolate(opn.params);
                }, this);
                return fn.call(run, operation.operations)
                        .then(function (response) {
                            if (!params || !params.silent) {
                                me.refresh.call(me, _.pluck(operation.operations, 'name'), response);
                            }
                        });
            } else {
                var opts = ($.isPlainObject(operation)) ? params : options;
                if (!$.isPlainObject(operation) && params) {
                    params = this.interpolate(params);
                }
                return run.do.call(run, operation, params)
                    .then(function (response) {
                        if (!opts || !opts.silent) {
                            me.refresh.call(me, [operation], response);
                        }
                        return response.result;
                    });
            }
            // console.log('operations publish', operation, params);
        },

        /**
         * Subscribe to changes on a channel: Ask for notification when operations are called.
         *
         * **Example**
         *
         *      Flow.channel.operations.subscribe('myMethod',
         *          function() { console.log('called!'); });
         *
         * @param {String|Array} operations The names of the operations. Use `*` to listen for notifications on all operations.
         * @param {Object|Function} subscriber The object or function being notified. Often this is a callback function.
         *
         * @return {String} An identifying token for this subscription. Required as a parameter when unsubscribing.
        */
        subscribe: function (operations, subscriber) {
            // console.log('operations subscribe', operations, subscriber);
            operations = [].concat(operations);
            //use jquery to make event sink
            if (!subscriber.on && !_.isFunction(subscriber)) {
                subscriber = $(subscriber);
            }

            var id  = _.uniqueId('epichannel.operation');
            var data = {
                id: id,
                target: subscriber
            };

            var me = this;

            $.each(operations, function (index, opn) {
                if (!me.listenerMap[opn]) {
                    me.listenerMap[opn] = [];
                }
                me.listenerMap[opn] = me.listenerMap[opn].concat(data);
            });

            return id;
        },

        /**
         * Stop receiving notification when an operation is called.
         *
         * @param {String|Array} operation The names of the operations.
         * @param {String} token The identifying token for this subscription. (Created and returned by the `subscribe()` call.)
        */
        unsubscribe: function (operation, token) {
            this.listenerMap[operation] = _.reject(this.listenerMap[operation], function (subs) {
                return subs.id === token;
            });
        },

        /**
         * Stop receiving notifications for all operations. No parameters.
         *
         * @return {None}
        */
        unsubscribeAll: function () {
            this.listenerMap = {};
        }
    };
    return $.extend(this, publicAPI);
};

},{"../config":5}],3:[function(require,module,exports){
'use strict';

var VarsChannel = require('./variables-channel');
var OperationsChannel = require('./operations-channel');

module.exports = function (options) {
    var defaults = {
        run: {
            variables: {

            },
            operations: {

            }
        }
    };
    var config = $.extend(true, {}, defaults, options);

    var rm = new F.manager.RunManager(config);
    var rs = rm.run;

    var $creationPromise = rm.getRun();
    rs.currentPromise = $creationPromise;

    // $creationPromise
    //     .then(function () {
    //         console.log('done');
    //     })
    //     .fail(function () {
    //         console.log('failt');
    //     });

    var createAndThen = function (fn, context) {
        return _.wrap(fn, function (func) {
            var passedInParams = _.toArray(arguments).slice(1);
            return rs.currentPromise.then(function () {
                rs.currentPromise = func.apply(context, passedInParams);
                return rs.currentPromise;
            }).fail(function () {
                console.warn('This failed, but we\'re moving ahead with the next one anyway', arguments);
                rs.currentPromise = func.apply(context, passedInParams);
                return rs.currentPromise;
            });
        });
    };

    //Make sure nothing happens before the run is created
    var nonWrapped = ['variables', 'create', 'load', 'getCurrentConfig'];
    _.each(rs, function (value, name) {
        if (_.isFunction(value) && !_.contains(nonWrapped, name)) {
            rs[name] = createAndThen(value, rs);
        }
    });

    var originalVariablesFn = rs.variables;
    rs.variables = function () {
        var vs = originalVariablesFn.apply(rs, arguments);
        _.each(vs, function (value, name) {
            if (_.isFunction(value)) {
                vs[name] = createAndThen(value, vs);
            }
        });
        return vs;
    };

    this.run = rs;
    var varOptions = config.run.variables;
    this.variables = new VarsChannel($.extend(true, {}, varOptions, { run: rs }));
    this.operations = new OperationsChannel($.extend(true, {}, config.run.operations, { run: rs }));

    var me = this;
    var debouncedRefresh = _.debounce(function (data) {
        me.variables.refresh.call(me.variables, null, true);
        if (me.variables.options.autoFetch.enable) {
            me.variables.startAutoFetch();
        }
    }, 200, { leading: true });

    this.operations.subscribe('*', debouncedRefresh);
};

},{"./operations-channel":2,"./variables-channel":4}],4:[function(require,module,exports){
/**
 * ## Variables Channel
 *
 * Channels are ways for Flow.js to talk to external APIs -- primarily the [underlying Epicenter APIs](../../../../creating_your_interface/).
 *
 * The primary use cases for the Variables Channel are:
 *
 * * `publish`: Update a model variable.
 * * `subscribe`: Receive notifications when a model variable is updated.
 *
 * For example, use `publish()` to update a model variable:
 *
 *      Flow.channel.operations.publish('myVariable', newValue);
 *
 * For reference, an equivalent call using Flow.js custom HTML attributes is:
 *
 *      <input type="text" data-f-bind="myVariable" value="newValue"></input>
 *
 * where the new value is input by the user.
 *
 * You can also use `subscribe()` and a callback function to listen and react when the model variable has been updated:
 *
 *      Flow.channel.operations.subscribe('myVariable',
 *          function() { console.log('called!'); } );
 *
 * To use the Variables Channel, simply [initialize Flow.js in your project](../../../#custom-initialize).
 *
*/

'use strict';
var config = require('../config');

module.exports = function (options) {
    var defaults = {
        /**
         * Determine when to update state. Defaults to `false`: always trigger updates.
         *
         * Possible options are:
         *
         * * `true`: Never trigger any updates. Use this if you know your model state won't change based on other variables.
         * * `false`: Always trigger updates.
         * * `[array of variable names]`: Variables in this array *will not* trigger updates; everything else will.
         * * `{ except: [array of variable names] }`: Variables in this array *will* trigger updates; nothing else will.
         *
         * To set, pass this into the `Flow.initialize()` call in the `channel.run.variables` field:
         *
         *      Flow.initialize({
         *          channel: {
         *              run: {
         *                  model: 'myModel.py',
         *                  account: 'acme-simulations',
         *                  project: 'supply-chain-game',
         *                  variables: { silent: true }
         *              }
         *          }
         *      });
         *
         * To override for a specific call to the Variables Channel, pass this as the final `options` parameter:
         *
         *       Flow.channel.variables.publish('myVariable', newValue, { silent: true });
         *
         * @type {String|Array|Object}
         */
        silent: false,

        /**
         * Allows you to automatically fetch variables from the API as they're being subscribed. If this is set to `enable: false` you'll need to explicitly call `refresh()` to get data and notify your listeners.
         *
         * The properties of this object include:
         *
         * * `autoFetch.enable` *Boolean* Enable auto-fetch behavior. If set to `false` during instantiation there's no way to enable this again. Defaults to `true`.
         * * `autoFetch.start` *Boolean* If auto-fetch is enabled, control when to start fetching. Typically you'd want to start right away, but if you want to wait till something else happens (like an operation or user action) set to `false` and control using the `startAutoFetch()` function. Defaults to `true`.
         * * `autoFetch.debounce` *Number* Milliseconds to wait between calls to `subscribe()` before calling `fetch()`. See [http://drupalmotion.com/article/debounce-and-throttle-visual-explanation](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation) for an explanation of how debouncing works. Defaults to `200`.
         *
         * @type {Object}
         */
        autoFetch: {

             // Enable auto-fetch behavior. If set to `false` during instantiation there's no way to enable this again
             // @type {Boolean}
            enable: true,

             // If auto-fetch is enabled, control when to start fetching. Typically you'd want to start right away, but if you want to wait till something else happens (like an operation or user action) set to `false` and control using the `startAutoFetch()` function.
             // @type {Boolean}
            start: true,

             // Control time to wait between calls to `subscribe()` before calling `fetch()`. See [http://drupalmotion.com/article/debounce-and-throttle-visual-explanation](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation) for an explanation of how debouncing works.
             // @type {Number} Milliseconds to wait
            debounce: 200
        },

        interpolate: {}
    };

    var channelOptions = $.extend(true, {}, defaults, options);
    this.options = channelOptions;

    var vs = channelOptions.run.variables();

    var currentData = {};

    //TODO: actually compare objects and so on
    var isEqual = function (a, b) {
        return false;
    };

    var getInnerVariables = function (str) {
        var inner = str.match(/<(.*?)>/g);
        inner = _.map(inner, function (val) {
            return val.substring(1, val.length - 1);
        });
        return inner;
    };

    //Replaces stubbed out keynames in variablestointerpolate with their corresponding values
    var interpolate = function (variablesToInterpolate, values) {
        //{price[1]: price[<time>]}
        var interpolationMap = {};
        //{price[1]: 1}
        var interpolated = {};

        _.each(variablesToInterpolate, function (outerVariable) {
            var inner = getInnerVariables(outerVariable);
            var originalOuter = outerVariable;
            if (inner && inner.length) {
                $.each(inner, function (index, innerVariable) {
                    var thisval = values[innerVariable];
                    if (thisval !== null && thisval !== undefined) {
                        if (_.isArray(thisval)) {
                            //For arrayed things get the last one for interpolation purposes
                            thisval = thisval[thisval.length - 1];
                        }
                        //TODO: Regex to match spaces and so on
                        outerVariable = outerVariable.replace('<' + innerVariable + '>', thisval);
                    }
                });
                interpolationMap[outerVariable] = (interpolationMap[outerVariable]) ? [originalOuter].concat(interpolationMap[outerVariable]) : originalOuter;
            }
            interpolated[originalOuter] = outerVariable;
        });

        var op = {
            interpolated: interpolated,
            interpolationMap: interpolationMap
        };
        return op;
    };

    var publicAPI = {
        //for testing
        private: {
            getInnerVariables: getInnerVariables,
            interpolate: interpolate,
            currentData: currentData,
            options: channelOptions
        },

        subscriptions: [],

        unfetched: [],

        getSubscribers: function (topic) {
            if (topic) {
                return _.filter(this.subscriptions, function (subs) {
                    return _.contains(subs.topics, topic);
                });
            } else {
                return this.subscriptions;
            }
        },
        getAllTopics: function () {
            return _(this.subscriptions).pluck('topics').flatten().uniq().value();
        },
        getTopicDependencies: function (list) {
            if (!list) {
                list = this.getAllTopics();
            }
            var innerList = [];
            _.each(list, function (vname) {
                var inner = getInnerVariables(vname);
                if (inner.length) {
                    innerList = _.uniq(innerList.concat(inner));
                }
            });
            return innerList;
        },

        updateAndCheckForRefresh: function (topics, options) {
            if (topics) {
                this.unfetched = _.uniq(this.unfetched.concat(topics));
            }
            if (!channelOptions.autoFetch.enable || !channelOptions.autoFetch.start || !this.unfetched.length) {
                return false;
            }
            if (!this.debouncedFetch) {
                var debounceOptions = $.extend(true, {}, {
                    maxWait: channelOptions.autoFetch.debounce * 4,
                    leading: false
                }, options);

                this.debouncedFetch = _.debounce(function (topics) {
                    this.fetch(this.unfetched).then(function (changed) {
                        $.extend(currentData, changed);
                        this.unfetched = [];
                        this.notify(changed);
                    }.bind(this));
                }, channelOptions.autoFetch.debounce, debounceOptions);
            }

            this.debouncedFetch(topics);
        },

        populateInnerVariables: function (vars) {
            var unmappedVariables = [];
            var valueList = {};
            _.each(vars, function (v) {
                if (this.options.interpolate[v] !== undefined) {
                    var val = _.isFunction(this.options.interpolate[v]) ? this.options.interpolate[v](v) : this.options.interpolate[v];
                    valueList[v] = val;
                } else {
                    unmappedVariables.push(v);
                }
            }, this);
            if (unmappedVariables.length) {
                return vs.query(unmappedVariables).then(function (variableValueList) {
                    return $.extend(valueList, variableValueList);
                });
            } else {
                return $.Deferred().resolve(valueList).promise();
            }
        },

        fetch: function (variablesList) {
            // console.log('fetch called', variablesList);
            variablesList = [].concat(variablesList);
            if (!variablesList.length) {
                return $.Deferred().resolve().promise({});
            }
            var innerVariables = this.getTopicDependencies(variablesList);
            var getVariables = function (vars, interpolationMap) {
                return vs.query(vars).then(function (variables) {
                    // console.log('Got variables', variables);
                    var changeSet = {};
                    _.each(variables, function (value, vname) {
                        var oldValue = currentData[vname];
                        if (!isEqual(value, oldValue)) {
                            changeSet[vname] = value;
                            if (interpolationMap && interpolationMap[vname]) {
                                var map = [].concat(interpolationMap[vname]);
                                _.each(map, function (interpolatedName) {
                                    changeSet[interpolatedName] = value;
                                });
                            }
                        }
                    });
                    return changeSet;
                });
            };
            if (innerVariables.length) {
                return this.populateInnerVariables(innerVariables).then(function (innerVariables) {
                    //console.log('inner', innerVariables);
                    $.extend(currentData, innerVariables);
                    var ip =  interpolate(variablesList, innerVariables);
                    return getVariables(_.values(ip.interpolated), ip.interpolationMap);
                });
            } else {
                return getVariables(variablesList);
            }
        },

        startAutoFetch: function () {
            channelOptions.autoFetch.start = true;
            this.updateAndCheckForRefresh();
        },

        stopAutoFetch: function () {
            channelOptions.autoFetch.start = false;
        },

        /**
         * Force a check for updates on the channel, and notify all listeners.
         *
         * @param {Object|Array} changeList Key-value pairs of changed variables.
         * @param {Boolean} force  Ignore all `silent` options and force refresh.
         */
        refresh: function (changeList, force) {
            var me = this;
            var silent = channelOptions.silent;
            var changedVariables = _.isArray(changeList) ?  changeList : _.keys(changeList);

            var shouldSilence = silent === true;
            if (_.isArray(silent) && changedVariables) {
                shouldSilence = _.intersection(silent, changedVariables).length >= 1;
            }
            if ($.isPlainObject(silent) && changedVariables) {
                shouldSilence = _.intersection(silent.except, changedVariables).length !== changedVariables.length;
            }

            if (shouldSilence && force !== true) {
                return $.Deferred().resolve().promise();
            }

            var variables = this.getAllTopics();
            me.unfetched = [];

            return this.fetch(variables).then(function (changeSet) {
                $.extend(currentData, changeSet);
                me.notify(changeSet);
            });
        },

        /**
         * Alert each subscriber about the variable and its new value.
         *
         * **Example**
         *
         *      Flow.channel.operations.notify('myVariable', newValue);
         *
         * @param {String|Array} topics Names of variables.
         * @param {String|Number|Array|Object} value New values for the variables.
        */
        notify: function (topics, value) {
            var callTarget = function (target, params) {
                if (_.isFunction(target)) {
                    target.call(null, params);
                } else {
                    target.trigger(config.events.react, params);
                }
            };

            if (!$.isPlainObject(topics)) {
                topics = _.object([topics], [value]);
            }
            _.each(this.subscriptions, function (subscription) {
                var target = subscription.target;
                if (subscription.batch) {
                    var matchingTopics = _.pick(topics, subscription.topics);
                    if (_.size(matchingTopics) === _.size(subscription.topics)) {
                        callTarget(target, matchingTopics);
                    }
                } else {
                    _.each(subscription.topics, function (topic) {
                        var matchingTopics = _.pick(topics, topic);
                        if (_.size(matchingTopics)) {
                            callTarget(target, matchingTopics);
                        }
                    });
                }
            });
        },

        /**
         * Update the variables with new values, and alert subscribers.
         *
         * **Example**
         *
         *      Flow.channel.variables.publish('myVariable', newValue);
         *      Flow.channel.variables.publish({ myVar1: newVal1, myVar2: newVal2 });
         *
         * @param  {String|Object} variable String with name of variable. Alternatively, object in form `{ variableName: value }`.
         * @param {String|Number|Array|Object} value (Optional)  Value of the variable, if previous argument was a string.
         * @param {Object} options (Optional) Overrides for the default channel options. Supported options: `{ silent: Boolean }` and `{ batch: Boolean }`.
         *
         * @return {$promise} Promise to complete the update.
         */
        publish: function (variable, value, options) {
            // console.log('publish', arguments);
            var attrs;
            if ($.isPlainObject(variable)) {
                attrs = variable;
                options = value;
            } else {
                (attrs = {})[variable] = value;
            }
            var it = interpolate(_.keys(attrs), currentData);

            var toSave = {};
            _.each(attrs, function (val, attr) {
               var key = (it.interpolated[attr]) ? it.interpolated[attr] : attr;
               toSave[key] = val;
            });
            var me = this;
            return vs.save.call(vs, toSave)
                .then(function () {
                    if (!options || !options.silent) {
                        me.refresh.call(me, attrs);
                    }
                });
        },

        /**
         * Subscribe to changes on a channel: Ask for notification when variables are updated.
         *
         * **Example**
         *
         *      Flow.channel.variables.subscribe('myVariable',
         *          function() { console.log('called!'); });
         *
         *      Flow.channel.variables.subscribe(['price', 'cost'],
         *          function() {
         *              // this function called only once, with { price: X, cost: Y }
         *          },
         *          { batch: true });
         *
         *      Flow.channel.variables.subscribe(['price', 'cost'],
         *          function() {
         *              // this function called twice, once with { price: X }
         *              // and again with { cost: Y }
         *          },
         *          { batch: false });
         *
         * @param {String|Array} topics The names of the variables.
         * @param {Object|Function} subscriber The object or function being notified. Often this is a callback function. If this is not a function, a `trigger` method is called if available; if not, event is triggered on $(object).
         * @param {Object} options (Optional) Overrides for the default channel options.
         * @param {Boolean} options.silent Determine when to update state.
         * @param {Boolean} options.batch If you are subscribing to multiple variables, by default the callback function is called once for each item to which you subscribe: `batch: false`. When `batch` is set to `true`, the callback function is only called once, no matter how many items you are subscribing to.
         *
         * @return {String} An identifying token for this subscription. Required as a parameter when unsubscribing.
        */
        subscribe: function (topics, subscriber, options) {
            // console.log('subscribing', topics, subscriber);
            var defaults = {
                batch: false
            };

            topics = [].concat(topics);
            //use jquery to make event sink
            if (!subscriber.on && !_.isFunction(subscriber)) {
                subscriber = $(subscriber);
            }

            var id  = _.uniqueId('epichannel.variable');
            var data = $.extend({
                id: id,
                topics: topics,
                target: subscriber
            }, defaults, options);

            this.subscriptions.push(data);

            this.updateAndCheckForRefresh(topics);
            return id;
        },

        /**
         * Stop receiving notifications for all subscriptions referenced by this token.
         *
         * @param {String} token The identifying token for this subscription. (Created and returned by the `subscribe()` call.)
        */
        unsubscribe: function (token) {
            this.subscriptions = _.reject(this.subscriptions, function (subs) {
                return subs.id === token;
            });
        },

        /**
         * Stop receiving notifications for all subscriptions. No parameters.
         *
         * @return {None}
        */
        unsubscribeAll: function () {
            this.subscriptions = [];
        }
    };

    $.extend(this, publicAPI);
};

},{"../config":5}],5:[function(require,module,exports){
module.exports = {
    prefix: 'f',
    defaultAttr: 'bind',

    binderAttr: 'f-bind',

    events: {
        trigger: 'update.f.ui',
        react: 'update.f.model'
    }
};

},{}],6:[function(require,module,exports){
/**
 * ## Array Converters
 *
 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).
 *
 * In general, if the model variable is an array, the converter is applied to each element of the array. There are a few built in array converters which, rather than converting all elements of an array, select particular elements from within the array or otherwise treat array variables specially.
 *
 */


'use strict';
var list = [
    {
        /**
         * Convert the input into an array. Concatenates all elements of the input.
         *
         * @param {Array} val The array model variable.
         */
        alias: 'list',
        acceptList: true,
        convert: function (val) {
            return [].concat(val);
        }
    },
    {
        /**
         * Select only the last element of the array.
         *
         * **Example**
         *
         *      <div>
         *          In the current year, we have <span data-f-bind="Sales | last"></span> in sales.
         *      </div>
         *
         * @param {Array} val The array model variable.
         */
        alias: 'last',
        acceptList: true,
        convert: function (val) {
            val = [].concat(val);
            return val[val.length - 1];
        }
    },
        /**
         * Reverse the array.
         *
         * **Example**
         *
         *      <p>Show the history of our sales, starting with the last (most recent):</p>
         *      <ul data-f-foreach="Sales | reverse">
         *          <li></li>
         *      </ul>
         *
         * @param {Array} val The array model variable.
         */
    {
        alias: 'reverse',
        acceptList: true,
        convert: function (val) {
            val = [].concat(val);
            return val.reverse();
        }
    },
    {
        /**
         * Select only the first element of the array.
         *
         * **Example**
         *
         *      <div>
         *          Our initial investment was <span data-f-bind="Capital | first"></span>.
         *      </div>
         *
         * @param {Array} val The array model variable.
         */
        alias: 'first',
        acceptList: true,
        convert: function (val) {
            val = [].concat(val);
            return val[0];
        }
    },
    {
        /**
         * Select only the previous (second to last) element of the array.
         *
         * **Example**
         *
         *      <div>
         *          Last year we had <span data-f-bind="Sales | previous"></span> in sales.
         *      </div>
         *
         * @param {Array} val The array model variable.
         */
        alias: 'previous',
        acceptList: true,
        convert: function (val) {
            val = [].concat(val);
            return (val.length <= 1) ? val[0] : val[val.length - 2];
        }
    }
];

_.each(list, function (item) {
   var oldfn = item.convert;
   var newfn = function (val) {
       if ($.isPlainObject(val)) {
            return _.mapValues(val, oldfn);
       } else {
            return oldfn(val);
       }
   };
   item.convert = newfn;
});
module.exports = list;

},{}],7:[function(require,module,exports){
/**
 * ## Converter Manager: Make your own Converters
 *
 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
 *
 * Basic converting and formatting options are built in to Flow.js.
 *
 * You can also create your own converters. Each converter should be a function that takes in a value or values to convert. To use your converter, `register()` it in your instance of Flow.js.
 *
 */

'use strict';

//TODO: Make all underscore filters available

var normalize = function (alias, converter, acceptList) {
    var ret = [];
    //nomalize('flip', fn)
    if (_.isFunction(converter)) {
        ret.push({
            alias: alias,
            convert: converter,
            acceptList: acceptList
        });
    } else if ($.isPlainObject(converter) && converter.convert) {
        converter.alias = alias;
        converter.acceptList = acceptList;
        ret.push(converter);
    } else if ($.isPlainObject(alias)) {
        //normalize({alias: 'flip', convert: function})
        if (alias.convert) {
            ret.push(alias);
        } else {
            // normalize({flip: fun})
            $.each(alias, function (key, val) {
                ret.push({
                    alias: key,
                    convert: val,
                    acceptList: acceptList
                });
            });
        }
    }
    return ret;
};

var matchConverter = function (alias, converter) {
    if (_.isString(converter.alias)) {
        return alias === converter.alias;
    } else if (_.isFunction(converter.alias)) {
        return converter.alias(alias);
    } else if (_.isRegex(converter.alias)) {
        return converter.alias.match(alias);
    }
    return false;
};

var converterManager = {
    private: {
        matchConverter: matchConverter
    },

    list: [],
    /**
     * Add a new attribute converter to this instance of Flow.js.
     *
     * **Example**
     *
     *      Flow.dom.converters.register('max', function (value) {
     *          return _.max(value);
     *      }, true);
     *
     *      Flow.dom.converters.register({
     *          alias: 'sig',
     *          parse: $.noop,
     *          convert: function (value) {
     *              return value.firstName + ' ' + value.lastName + ', ' + value.jobTitle;
     *      }, false);
     *
     *      <div>
     *          The largest sales you had was <span data-f-bind="salesByYear | max | $#,###"></span>.
     *          The current sales manager is <span data-f-bind="salesMgr | sig"></span>.
     *      </div>
     *
     * @param  {String|Function|Regex} alias Formatter name.
     * @param  {Function|Object} converter If a function, `converter` is called with the value. If an object, should include fields for `alias` (name), `parse` (function), and `convert` (function).
     * @param {Boolean} acceptList Determines if the converter is a 'list' converter or not. List converters take in arrays as inputs, others expect single values.
     */
    register: function (alias, converter, acceptList) {
        var normalized = normalize(alias, converter, acceptList);
        this.list = normalized.concat(this.list);
    },

    /**
     * Replace an already registered converter with a new one of the same name.
     *
     * @param {String} alias Formatter name.
     * @param {Function|Object} converter If a function, `converter` is called with the value. If an object, should include fields for `alias` (name), `parse` (function), and `convert` (function).
     */
    replace: function (alias, converter) {
        var index;
        _.each(this.list, function (currentConverter, i) {
            if (matchConverter(alias, currentConverter)) {
                index = i;
                return false;
            }
        });
        this.list.splice(index, 1, normalize(alias, converter)[0]);
    },

    getConverter: function (alias) {
        return _.find(this.list, function (converter) {
            return matchConverter(alias, converter);
        });
    },

    /**
     * Pipes the value sequentially through a list of provided converters.
     *
     * @param  {Any} value Input for the converter to tag.
     * @param  {Array|Object} list List of converters (maps to converter alias).
     *
     * @return {Any} Converted value.
     */
    convert: function (value, list) {
        if (!list || !list.length) {
            return value;
        }
        list = [].concat(list);
        list = _.invoke(list, 'trim');

        var currentValue = value;
        var me = this;

        var convertArray = function (converter, val, converterName) {
            return _.map(val, function (v) {
                return converter.convert(v, converterName);
            });
        };
        var convertObject = function (converter, value, converterName) {
            return _.mapValues(value, function (val, key) {
               return convert(converter, val, converterName);
           });
        };
        var convert = function (converter, value, converterName) {
            var converted;
            if (_.isArray(value) && converter.acceptList !== true) {
                converted = convertArray(converter, value, converterName);
            } else {
                converted = converter.convert(value, converterName);
            }
            return converted;
        };
        _.each(list, function (converterName) {
            var converter = me.getConverter(converterName);
            if (!converter) {
                throw new Error('Could not find converter for ' + converterName);
            }
            if ($.isPlainObject(currentValue) && converter.acceptList !== true) {
                currentValue = convertObject(converter, currentValue, converterName);
            } else {
                currentValue = convert(converter, currentValue, converterName);
            }
        });
        return currentValue;
    },

    /**
     * Counter-part to `convert()`. Translates converted values back to their original form.
     *
     * @param  {String} value Value to parse.
     * @param  {String|Array} list  List of parsers to run the value through. Outermost is invoked first.
     * @return {Any} Original value.
     */
    parse: function (value, list) {
        if (!list || !list.length) {
            return value;
        }
        list = [].concat(list).reverse();
        list = _.invoke(list, 'trim');

        var currentValue = value;
        var me = this;
        _.each(list, function (converterName) {
            var converter = me.getConverter(converterName);
            if (converter.parse) {
                currentValue = converter.parse(currentValue, converterName);
            }
        });
        return currentValue;
    }
};


//Bootstrap
var defaultconverters = [
    require('./number-converter'),
    require('./string-converter'),
    require('./array-converter'),
    require('./underscore-utils-converter'),
    require('./numberformat-converter'),
];

$.each(defaultconverters.reverse(), function (index, converter) {
    if (_.isArray(converter)) {
        _.each(converter, function (c) {
           converterManager.register(c);
        });
    } else {
        converterManager.register(converter);
    }
});

module.exports = converterManager;

},{"./array-converter":6,"./number-converter":8,"./numberformat-converter":9,"./string-converter":10,"./underscore-utils-converter":11}],8:[function(require,module,exports){
/**
 * ## Number Converters
 *
 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).
 *
 */

'use strict';
module.exports = {
    /**
     * Convert the model variable to an integer. Often used for chaining to another converter.
     *
     * **Example**
     *
     *      <div>
     *          Your car has driven
     *          <span data-f-bind="Odometer | i | s0.0"></span> miles.
     *      </div>
     *
     * @param {Array} value The model variable.
     */
    alias: 'i',
    convert: function (value) {
        return parseFloat(value, 10);
    }
};

},{}],9:[function(require,module,exports){
/**
 * ## Number Format Converters
 *
 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).
 *
 * For model variables that are numbers (or that have been [converted to numbers](../number-converter/)), there are several special number formats you can apply.
 *
 * ####Currency Number Format
 *
 * After the `|` (pipe) character, use `$` (dollar sign), `0`, and `.` (decimal point) in your converter to describe how currency should appear. The specifications follow the Excel currency formatting conventions.
 *
 * **Example**
 *
 *      <!-- convert to dollars (include cents) -->
 *      <input type="text" data-f-bind="price[car]" data-f-convert="$0.00" />
 *      <input type="text" data-f-bind="price[car] | $0.00" />
 *
 *      <!-- convert to dollars (truncate cents) -->
 *      <input type="text" data-f-bind="price[car]" data-f-convert="$0." />
 *      <input type="text" data-f-bind="price[car] | $0." />
 *
 *
 * ####Specific Digits Number Format
 *
 * After the `|` (pipe) character, use `#` (pound) and `,` (comma) in your converter to describe how the number should appear. The specifications follow the Excel number formatting conventions.
 *
 * **Example**
 *
 *      <!-- convert to thousands -->
 *      <input type="text" data-f-bind="sales[car]" data-f-convert="#,###" />
 *      <input type="text" data-f-bind="sales[car] | #,###" />
 *
 *
 * ####Percentage Number Format
 *
 * After the `|` (pipe) character, use `%` (percent) and `0` in your converter to display the number as a percent.
 *
 * **Example**
 *
 *      <!-- convert to percentage -->
 *      <input type="text" data-f-bind="profitMargin[car]" data-f-convert="0%" />
 *      <input type="text" data-f-bind="profitMargin[car] | 0%" />
 *
 *
 * ####Short Number Format
 *
 * After the `|` (pipe) character, use `s` and `0` in your converter to describe how the number should appear.
 *
 * The `0`s describe the significant digits.
 *
 * The `s` describes the "short format," which uses 'K' for thousands, 'M' for millions, 'B' for billions. For example, `2468` converted with `s0.0` displays as `2.5K`.
 *
 * **Example**
 *
 *      <!-- convert to thousands (show 12,468 as 12.5K) -->
 *      <span type="text" data-f-bind="price[car] | s0.0"></span>
 *
 */

'use strict';
module.exports = {
    alias: function (name) {
        //TODO: Fancy regex to match number formats here
        return (name.indexOf('#') !== -1 || name.indexOf('0') !== -1);
    },

    parse: function (val) {
        val+= '';
        var isNegative = val.charAt(0) === '-';

        val  = val.replace(/,/g, '');
        var floatMatcher = /([-+]?[0-9]*\.?[0-9]+)(K?M?B?%?)/i;
        var results = floatMatcher.exec(val);
        var number, suffix = '';
        if (results && results[1]) {
            number = results[1];
        }
        if (results && results[2]) {
            suffix = results[2].toLowerCase();
        }

        switch (suffix) {
            case '%':
                number = number / 100;
                break;
            case 'k':
                number = number * 1000;
                break;
            case 'm':
                number = number * 1000000;
                break;
            case 'b':
                number = number * 1000000000;
                break;
        }
        number = parseFloat(number);
        if (isNegative && number > 0) {
            number = number * -1;
        }
        return number;
    },

    convert: (function (value) {
        var scales = ['', 'K', 'M', 'B', 'T'];

        function getDigits(value, digits) {
            value = value === 0 ? 0 : roundTo(value, Math.max(0, digits - Math.ceil(Math.log(value) / Math.LN10)));

            var TXT = '';
            var numberTXT = value.toString();
            var decimalSet = false;

            for (var iTXT = 0; iTXT < numberTXT.length; iTXT++) {
                TXT += numberTXT.charAt(iTXT);
                if (numberTXT.charAt(iTXT) === '.') {
                    decimalSet = true;
                } else {
                    digits--;
                }

                if (digits <= 0) {
                    return TXT;
                }
            }

            if (!decimalSet) {
                TXT += '.';
            }
            while (digits > 0) {
                TXT += '0';
                digits--;
            }
            return TXT;
        }

        function addDecimals(value, decimals, minDecimals, hasCommas) {
            hasCommas = (hasCommas === false) ? false : true;
            var numberTXT = value.toString();
            var hasDecimals = (numberTXT.split('.').length > 1);
            var iDec = 0;

            if (hasCommas) {
                for (var iChar = numberTXT.length - 1; iChar > 0; iChar--) {
                    if (hasDecimals) {
                        hasDecimals = (numberTXT.charAt(iChar) !== '.');
                    } else {
                        iDec = (iDec + 1) % 3;
                        if (iDec === 0) {
                            numberTXT = numberTXT.substr(0, iChar) + ',' + numberTXT.substr(iChar);
                        }
                    }
                }

            }
            if (decimals > 0) {
                var toADD;
                if (numberTXT.split('.').length <= 1) {
                    toADD = minDecimals;
                    if (toADD > 0) {
                        numberTXT += '.';
                    }
                } else {
                    toADD = minDecimals - numberTXT.split('.')[1].length;
                }

                while (toADD > 0) {
                    numberTXT += '0';
                    toADD--;
                }
            }
            return numberTXT;
        }

        function roundTo(value, digits) {
            return Math.round(value * Math.pow(10, digits)) / Math.pow(10, digits);
        }

        function getSuffix(formatTXT) {
            formatTXT = formatTXT.replace('.', '');
            var fixesTXT = formatTXT.split(new RegExp('[0|,|#]+', 'g'));
            return (fixesTXT.length > 1) ? fixesTXT[1].toString() : '';
        }

        function isCurrency(string) {
            var s = $.trim(string);

            if (s === '$' ||
                s === 'â‚¬' ||
                s === 'Â¥' ||
                s === 'Â£' ||
                s === 'â‚¡' ||
                s === 'â‚±' ||
                s === 'KÄ?' ||
                s === 'kr' ||
                s === 'Â¢' ||
                s === 'â‚ª' ||
                s === 'Æ’' ||
                s === 'â‚©' ||
                s === 'â‚«') {

                return true;
            }

            return false;
        }

        function format(number, formatTXT) {
            if (_.isArray(number)) {
                number = number[number.length - 1];
            }
            if (!_.isString(number) && !_.isNumber(number)) {
                return number;
            }

            if (!formatTXT || formatTXT.toLowerCase() === 'default') {
                return number.toString();
            }

            if (isNaN(number)) {
                return '?';
            }

            //var formatTXT;
            formatTXT = formatTXT.replace('&euro;', 'â‚¬');

            // Divide +/- Number Format
            var formats = formatTXT.split(';');
            if (formats.length > 1) {
                return format(Math.abs(number), formats[((number >= 0) ? 0 : 1)]);
            }

            // Save Sign
            var sign = (number >= 0) ? '' : '-';
            number = Math.abs(number);


            var leftOfDecimal = formatTXT;
            var d = leftOfDecimal.indexOf('.');
            if (d > -1) {
                leftOfDecimal = leftOfDecimal.substring(0, d);
            }

            var normalized = leftOfDecimal.toLowerCase();
            var index = normalized.lastIndexOf('s');
            var isShortFormat = index > -1;

            if (isShortFormat) {
                var nextChar = leftOfDecimal.charAt(index + 1);
                if (nextChar === ' ') {
                    isShortFormat = false;
                }
            }

            var leadingText = isShortFormat ? formatTXT.substring(0, index) : '';
            var rightOfPrefix = isShortFormat ? formatTXT.substr(index + 1) : formatTXT.substr(index);

            //first check to make sure 's' is actually short format and not part of some leading text
            if (isShortFormat) {
                var shortFormatTest = /[0-9#*]/;
                var shortFormatTestResult = rightOfPrefix.match(shortFormatTest);
                if (!shortFormatTestResult || shortFormatTestResult.length === 0) {
                    //no short format characters so this must be leading text ie. 'weeks '
                    isShortFormat = false;
                    leadingText = '';
                }
            }

            //if (formatTXT.charAt(0) == 's')
            if (isShortFormat) {
                var valScale = number === 0 ? 0 : Math.floor(Math.log(Math.abs(number)) / (3 * Math.LN10));
                valScale = ((number / Math.pow(10, 3 * valScale)) < 1000) ? valScale : (valScale + 1);
                valScale = Math.max(valScale, 0);
                valScale = Math.min(valScale, 4);
                number = number / Math.pow(10, 3 * valScale);
                //if (!isNaN(Number(formatTXT.substr(1) ) ) )

                if (!isNaN(Number(rightOfPrefix)) && rightOfPrefix.indexOf('.') === -1) {
                    var limitDigits = Number(rightOfPrefix);
                    if (number < Math.pow(10, limitDigits)) {
                        if (isCurrency(leadingText)) {
                            return sign + leadingText + getDigits(number, Number(rightOfPrefix)) + scales[valScale];
                        } else {
                            return leadingText + sign + getDigits(number, Number(rightOfPrefix)) + scales[valScale];
                        }
                    } else {
                        if (isCurrency(leadingText)) {
                            return sign + leadingText + Math.round(number) + scales[valScale];
                        } else {
                            return leadingText + sign + Math.round(number) + scales[valScale];
                        }
                    }
                } else {
                    //formatTXT = formatTXT.substr(1);
                    formatTXT = formatTXT.substr(index + 1);
                    var SUFFIX = getSuffix(formatTXT);
                    formatTXT = formatTXT.substr(0, formatTXT.length - SUFFIX.length);

                    var valWithoutLeading = format(((sign === '') ? 1 : -1) * number, formatTXT) + scales[valScale] + SUFFIX;
                    if (isCurrency(leadingText) && sign !== '') {
                        valWithoutLeading = valWithoutLeading.substr(sign.length);
                        return sign + leadingText + valWithoutLeading;
                    }

                    return leadingText + valWithoutLeading;
                }
            }

            var subFormats = formatTXT.split('.');
            var decimals;
            var minDecimals;
            if (subFormats.length > 1) {
                decimals = subFormats[1].length - subFormats[1].replace(new RegExp('[0|#]+', 'g'), '').length;
                minDecimals = subFormats[1].length - subFormats[1].replace(new RegExp('0+', 'g'), '').length;
                formatTXT = subFormats[0] + subFormats[1].replace(new RegExp('[0|#]+', 'g'), '');
            } else {
                decimals = 0;
            }

            var fixesTXT = formatTXT.split(new RegExp('[0|,|#]+', 'g'));
            var preffix = fixesTXT[0].toString();
            var suffix = (fixesTXT.length > 1) ? fixesTXT[1].toString() : '';

            number = number * ((formatTXT.split('%').length > 1) ? 100 : 1);
            //            if (formatTXT.indexOf('%') !== -1) number = number * 100;
            number = roundTo(number, decimals);

            sign = (number === 0) ? '' : sign;

            var hasCommas = (formatTXT.substr(formatTXT.length - 4 - suffix.length, 1) === ',');
            var formatted = sign + preffix + addDecimals(number, decimals, minDecimals, hasCommas) + suffix;

            //  console.log(originalNumber, originalFormat, formatted)
            return formatted;
        }

        return format;
    }())
};

},{}],10:[function(require,module,exports){
/**
 * ## String Converters
 *
 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).
 *
 * For model variables that are strings (or that have been converted to strings), there are several special string formats you can apply.
 */

'use strict';
module.exports = {

    /**
     * Convert the model variable to a string. Often used for chaining to another converter.
     *
     * **Example**
     *
     *      <div>
     *          This year you are in charge of sales for
     *          <span data-f-bind="salesMgr.region | s | upperCase"></span>.
     *      </div>
     *
     * @param {Array} val The model variable.
     */
    s: function (val) {
        return val + '';
    },

    /**
     * Convert the model variable to UPPER CASE.
     *
     * **Example**
     *
     *      <div>
     *          This year you are in charge of sales for
     *          <span data-f-bind="salesMgr.region | s | upperCase"></span>.
     *      </div>
     *
     * @param {Array} val The model variable.
     */
    upperCase: function (val) {
        return (val + '').toUpperCase();
    },

    /**
     * Convert the model variable to lower case.
     *
     * **Example**
     *
     *      <div>
     *          Enter your user name:
     *          <input data-f-bind="userName | lowerCase"></input>.
     *      </div>
     *
     * @param {Array} val The model variable.
     */
    lowerCase: function (val) {
        return (val + '').toLowerCase();
    },

    /**
     * Convert the model variable to Title Case.
     *
     * **Example**
     *
     *      <div>
     *          Congratulations on your promotion!
     *          Your new title is: <span data-f-bind="currentRole | titleCase"></span>.
     *      </div>
     *
     * @param {Array} val The model variable.
     */
    titleCase: function (val) {
        val = val + '';
        return val.replace(/\w\S*/g, function (txt) {return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }
};

},{}],11:[function(require,module,exports){
'use strict';
var list = [];

var supported = [
    'values', 'keys', 'compact', 'difference',
    'flatten', 'rest',
    'union',
    'uniq', 'zip', 'without',
    'xor', 'zip'
];
_.each(supported, function (fn) {
    var item = {
        alias: fn,
        acceptList: true,
        convert: function (val) {
            if ($.isPlainObject(val)) {
                return _.mapValues(val, _[fn]);
            } else {
                return _[fn](val);
            }
        }
    };
    list.push(item);
});
module.exports = list;

},{}],12:[function(require,module,exports){
/**
 * ## Attribute Manager
 *
 * Flow.js provides a set of custom DOM attributes that serve as a data binding between variables and operations in your project's model and HTML elements in your project's user interface. Under the hood, Flow.js is doing automatic conversion of these custom attributes, like `data-f-bind`, into HTML specific to the attribute's assigned value, like the current value of `myModelVar`.
 *
 * If you are looking for examples of using particular attributes, see the [specific attributes subpages](../../../../attributes-overview/).
 *
 * If you would like to extend Flow.js with your own custom attributes, you can add them to Flow.js using the Attribute Manager.
 *
 * The Attribute Manager is specific to adding custom attributes and describing their implementation (handlers). (The [Dom Manager](../../) contains the general implementation.)
 *
 *
 * **Examples**
 *
 * Built-in attribute handlers like `data-f-value` and `data-f-foreach` automatically bind variables in your project's model to particular HTML elements. However, your UI may sometimes require displaying only part of the variable (e.g. if it's an object), or "doing something" with the value of the variable, rather than simply displaying it.
 *
 * One example of when custom attribute handlers are useful is when your model variable is a complex object and you want to display the fields in a particular way, or you only want to display some of the fields. While the combination of the [`data-f-foreach` attribute](../foreach/default-foreach-attr/) and [templating](../../../../#templates) can help with this, sometimes it's easier to write your own attribute handler. (This is especially true if you will be reusing the attribute handler -- you won't have to copy your templating code over and over.)
 *
 *      Flow.dom.attributes.register('showSched', '*', function (sched) {
 *            // display all the schedule milestones
 *            // sched is an object, each element is an array
 *            // of ['Formal Milestone Name', milestoneMonth, completionPercentage]
 *
 *            var schedStr = '<ul>';
 *            var sortedSched = _.sortBy(sched, function(el) { return el[1]; });
 *
 *            for (var i = 0; i < sortedSched.length; i++) {
 *                  schedStr += '<li><strong>' + sortedSched[i][0]
 *                        + '</strong> currently scheduled for <strong>Month '
 *                        + sortedSched[i][1] + '</strong></li>';
 *            }
 *            schedStr += '</ul>';
 *
 *            this.html(schedStr);
 *      });
 *
 * Then, you can use the attribute handler in your HTML just like other Flow.js attributes:
 *
 *      <div data-f-showSched="schedule"></div>
 *
 */

'use strict';

var defaultHandlers = [
    require('./no-op-attr'),
    require('./events/init-event-attr'),
    require('./events/default-event-attr'),
    require('./foreach/default-foreach-attr'),
    require('./binds/checkbox-radio-bind-attr'),
    require('./binds/input-bind-attr'),
    require('./class-attr'),
    require('./repeat-attr'),
    require('./positive-boolean-attr'),
    require('./negative-boolean-attr'),
    require('./binds/default-bind-attr'),
    require('./default-attr')
];

var handlersList = [];

var normalize = function (attributeMatcher, nodeMatcher, handler) {
    if (!nodeMatcher) {
        nodeMatcher = '*';
    }
    if (_.isFunction(handler)) {
        handler = {
            handle: handler
        };
    }
    return $.extend(handler, { test: attributeMatcher, target: nodeMatcher });
};

$.each(defaultHandlers, function (index, handler) {
    handlersList.push(normalize(handler.test, handler.target, handler));
});


var matchAttr = function (matchExpr, attr, $el) {
    var attrMatch;

    if (_.isString(matchExpr)) {
        attrMatch = (matchExpr === '*' || (matchExpr.toLowerCase() === attr.toLowerCase()));
    } else if (_.isFunction(matchExpr)) {
        //TODO: remove element selectors from attributes
        attrMatch = matchExpr(attr, $el);
    } else if (_.isRegExp(matchExpr)) {
        attrMatch = attr.match(matchExpr);
    }
    return attrMatch;
};

var matchNode = function (target, nodeFilter) {
    return (_.isString(nodeFilter)) ? (nodeFilter === target) : nodeFilter.is(target);
};

module.exports = {
    list: handlersList,
    /**
     * Add a new attribute handler.
     *
     * @param  {String|Function|Regex} attributeMatcher Description of which attributes to match.
     * @param  {String} nodeMatcher Which nodes to add attributes to. Use [jquery Selector syntax](https://api.jquery.com/category/selectors/).
     * @param  {Function|Object} handler If `handler` is a function, the function is called with `$element` as context, and attribute value + name. If `handler` is an object, it should include two functions, and have the form: `{ init: fn,  handle: fn }`. The `init` function is called when the page loads; use this to define event handlers. The `handle` function is called with `$element` as context, and attribute value + name.
     */
    register: function (attributeMatcher, nodeMatcher, handler) {
        handlersList.unshift(normalize.apply(null, arguments));
    },

    /**
     * Find an attribute matcher matching some criteria.
     *
     * @param  {String} attrFilter Attribute to match.
     * @param  {String|$el} nodeFilter Node to match.
     *
     * @return {Array|Null} An array of matching attribute handlers, or null if no matches found.
     */
    filter: function (attrFilter, nodeFilter) {
        var filtered = _.select(handlersList, function (handler) {
            return matchAttr(handler.test, attrFilter);
        });
        if (nodeFilter) {
            filtered = _.select(filtered, function (handler) {
                return matchNode(handler.target, nodeFilter);
            });
        }
        return filtered;
    },

    /**
     * Replace an existing attribute handler.
     *
     * @param  {String} attrFilter Attribute to match.
     * @param  {String | $el} nodeFilter Node to match.
     * @param  {Function|Object} handler The updated attribute handler. If `handler` is a function, the function is called with `$element` as context, and attribute value + name. If `handler` is an object, it should include two functions, and have the form: `{ init: fn,  handle: fn }`. The `init` function is called when the page loads; use this to define event handlers. The `handle` function is called with `$element` as context, and attribute value + name.
     */
    replace: function (attrFilter, nodeFilter, handler) {
        var index;
        _.each(handlersList, function (currentHandler, i) {
            if (matchAttr(currentHandler.test, attrFilter) && matchNode(currentHandler.target, nodeFilter)) {
                index = i;
                return false;
            }
        });
        handlersList.splice(index, 1, normalize(attrFilter, nodeFilter, handler));
    },

    /**
     *  Retrieve the appropriate handler for a particular attribute. There may be multiple matching handlers, but the first (most exact) match is always used.
     *
     * @param {String} property The attribute.
     * @param {$el} $el The DOM element.
     *
     * @return {Object} The attribute handler.
     */
    getHandler: function (property, $el) {
        var filtered = this.filter(property, $el);
        //There could be multiple matches, but the top first has the most priority
        return filtered[0];
    }
};


},{"./binds/checkbox-radio-bind-attr":13,"./binds/default-bind-attr":14,"./binds/input-bind-attr":15,"./class-attr":16,"./default-attr":17,"./events/default-event-attr":18,"./events/init-event-attr":19,"./foreach/default-foreach-attr":20,"./negative-boolean-attr":21,"./no-op-attr":22,"./positive-boolean-attr":23,"./repeat-attr":24}],13:[function(require,module,exports){
/**
 * ## Checkboxes and Radio Buttons
 *
 * In the [default case](../default-bind-attr/), the `data-f-bind` attribute creates a bi-directional binding between the DOM element and the model variable. This binding is **bi-directional**, meaning that as the model changes, the interface is automatically updated; and when end users change values in the interface, the model is automatically updated.
 *
 * Flow.js provides special handling for DOM elements with `type="checkbox"` and `type="radio"`.
 *
 * In particular, if you add the `data-f-bind` attribute to an `input` with `type="checkbox"` and `type="radio"`, the checkbox or radio button is automatically selected if the `value` matches the value of the model variable referenced, or if the model variable is `true`.
 *
 * **Example**
 *
 *      <!-- radio button, selected if sampleInt is 8 -->
 *      <input type="radio" data-f-bind="sampleInt" value="8" />
 *
 *      <!-- checkbox, checked if sampleBool is true -->
 *      <input type="checkbox" data-f-bind="sampleBool" />
 *
 */

'use strict';

module.exports = {

    target: ':checkbox,:radio',

    test: 'bind',

    handle: function (value) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        var settableValue = this.attr('value'); //initial value
        /*jslint eqeq: true*/
        var isChecked = (settableValue !== undefined) ? (settableValue == value) : !!value;
        this.prop('checked', isChecked);
    }
};

},{}],14:[function(require,module,exports){
/**
 * ## Default Bi-directional Binding: data-f-bind
 *
 * The most commonly used attribute provided by Flow.js is the `data-f-bind` attribute.
 *
 * ####data-f-bind with a single value
 *
 * You can bind variables from the model in your interface by setting the `data-f-bind` attribute. This attribute binding is bi-directional, meaning that as the model changes, the interface is automatically updated; and when users change values in the interface, the model is automatically updated. Specifically:
 *
 * * The binding from the model to the interface ensures that the current value of the variable is displayed in the HTML element. This includes automatic updates to the displayed value if something else changes in the model.
 *
 * * The binding from the interface to the model ensures that if the HTML element is editable, changes are sent to the model.
 *
 * Once you set `data-f-bind`, Flow.js figures out the appropriate action to take based on the element type and the data response from your model.
 *
 * **To display and automatically update a variable in the interface:**
 *
 * 1. Add the `data-f-bind` attribute to any HTML element that normally takes a value.
 * 2. Set the value of the `data-f-bind` attribute to the name of the variable.
 *
 * **Example**
 *
 *      <span data-f-bind="salesManager.name" />
 *
 *      <input type="text" data-f-bind="sampleString" />
 *
 * **Notes:**
 *
 * * Use square brackets, `[]`, to reference arrayed variables: `sales[West]`.
 * * Use angle brackets, `<>`, to reference other variables in your array index: `sales[<currentRegion>]`.
 * * Remember that if your model is in Vensim, the time step can be the first array index or the last array index, depending on your [model.cfg](../../../../../../model_code/vensim/#creating-cfg) file.
 * * By default, all HTML elements update for any change for each variable. However, you can prevent the user interface from updating &mdash; either for all variables or for particular variables &mdash; by setting the `silent` property when you initialize Flow.js. See more on [additional options for the Flow.initialize() method](../../../../../#custom-initialize).
 *
 * ####data-f-bind with multiple values and templates
 *
 * If you have multiple variables, you can use the shortcut of listing multiple variables in an enclosing HTML element and then referencing each variable using templates. (Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).)
 *
 * **To display and automatically update multiple variables in the interface:**
 *
 * 1. Add the `data-f-bind` attribute to any HTML element from which you want to reference model variables, such as a `div` or `table`.
 * 2. Set the value of the `data-f-bind` attribute in your top-level HTML element to a comma-separated list of the variables. (The variables may or may not be case-sensitive, depending on your modeling language.)
 *
 * 3. Inside the HTML element, use templates (`<%= %>`) to reference the specific variable names. These variable names are case-sensitive: they should match the case you used in the `data-f-bind` in step 2.
 *
 * **Example**
 *
 *      <!-- make these three model variables available throughout div -->
 *
 *      <div data-f-bind="CurrentYear, Revenue, Profit">
 *          In <%= CurrentYear %>,
 *          our company earned <%= Revenue %>,
 *          resulting in <%= Profit %> profit.
 *      </div>
 *
 * This example is shorthand for repeatedly using data-f-bind. For instance, this code also generates the same output:
 *
 *      <div>
 *          In <span data-f-bind="CurrentYear"></span>,
 *          our company earned <span data-f-bind="Revenue"></span>,
 *          resulting in <span data-f-bind="Profit"> profit</span>.
 *      </div>
 *
 * **Notes:**
 *
 * * Adding `data-f-bind` to the enclosing HTML element rather than repeatedly using it within the element is a code style preference. In many cases, adding `data-f-bind` at the top level, as in the first example, can make your code easier to read and maintain.
 * * However, you might choose to repeatedly use `data-f-bind` in some cases, for example if you want different [formatting](../../../../../converter-overview/) for different variables:
 *
 *          <div>
 *              In <span data-f-bind="CurrentYear | #"></span>,
 *              our company earned <span data-f-bind="Revenue | $#,###"></span>
 *          </div>
 *
 */

'use strict';

module.exports = {

    target: '*',

    test: 'bind',

    handle: function (value) {
        var templated;
        var valueToTemplate = $.extend({}, value);
        if (!$.isPlainObject(value)) {
            var variableName = this.data('f-bind');//Hack because i don't have access to variable name here otherwise
            valueToTemplate = { value: value };
            valueToTemplate[variableName] = value;
        } else {
            valueToTemplate.value = value; //If the key has 'weird' characters like '<>' hard to get at with a template otherwise
        }
        var bindTemplate = this.data('bind-template');
        if (bindTemplate) {
            templated = _.template(bindTemplate, valueToTemplate);
            this.html(templated);
        } else {
            var oldHTML = this.html();
            var cleanedHTML = oldHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            templated = _.template(cleanedHTML, valueToTemplate);
            if (cleanedHTML === templated) { //templating did nothing
                if (_.isArray(value)) {
                    value = value[value.length - 1];
                }
                value = ($.isPlainObject(value)) ? JSON.stringify(value) : value + '';
                this.html(value);
            } else {
                this.data('bind-template', cleanedHTML);
                this.html(templated);
            }
        }
    }
};

},{}],15:[function(require,module,exports){
/**
 * ## Inputs and Selects
 *
 * In the [default case](../default-bind-attr/), the `data-f-bind` attribute creates a bi-directional binding between the DOM element and the model variable. This binding is **bi-directional**, meaning that as the model changes, the interface is automatically updated; and when end users change values in the interface, the model is automatically updated.
 *
 * Flow.js provides special handling for DOM elements `input` and `select`.
 *
 * In particular, if you add the `data-f-bind` attribute to a `select` or `input` element, the option matching the value of the model variable is automatically selected.
 *
 * **Example**
 *
 * 		<!-- option selected if sample_int is 8, 10, or 12 -->
 * 		<select data-f-bind="sample_int">
 * 			<option value="8"> 8 </option>
 * 			<option value="10"> 10 </option>
 * 			<option value="12"> 12 </option>
 * 		</select>
 *
 */

'use strict';

module.exports = {
    target: 'input, select',

    test: 'bind',

    handle: function (value) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        this.val(value);
    }
};

},{}],16:[function(require,module,exports){
/**
 * ## Class Attribute: data-f-class
 *
 * You can bind model variables to names of CSS classes, so that you can easily change the styling of HTML elements based on the values of model variables.
 *
 * **To bind model variables to CSS classes:**
 *
 * 1. Add the `data-f-class` attribute to an HTML element.
 * 2. Set the value to the name of the model variable.
 * 3. Optionally, add an additional `class` attribute to the HTML element.
 *      * If you only use the `data-f-class` attribute, the value of `data-f-class` is the class name.
 *      * If you *also* add a `class` attribute, the value of `data-f-class` is *appended* to the class name.
 * 4. Add classes to your CSS code whose names include possible values of that model variable.
 *
 * **Example**
 *
 *      <style type="text/css">
 *          .North { color: grey }
 *          .South { color: purple }
 *          .East { color: blue }
 *          .West { color: orange }
 *          .sales.good { color: green }
 *          .sales.bad { color: red }
 *          .sales.value-100 { color: yellow }
 *       </style>
 *
 *       <div data-f-class="salesMgr.region">
 *           Content colored by region
 *       </div>
 *
 *       <div data-f-class="salesMgr.performance" class="sales">
 *           Content green if salesMgr.performance is good, red if bad
 *       </div>
 *
 *       <div data-f-class="salesMgr.numRegions" class="sales">
 *           Content yellow if salesMgr.numRegions is 100
 *       </div>
 *
 */

'use strict';

module.exports = {

    test: 'class',

    target: '*',

    handle: function (value, prop) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }

        var addedClasses = this.data('added-classes');
        if (!addedClasses) {
            addedClasses = {};
        }
        if (addedClasses[prop]) {
            this.removeClass(addedClasses[prop]);
        }

        if (_.isNumber(value)) {
            value = 'value-' + value;
        }
        addedClasses[prop] = value;
        //Fixme: prop is always "class"
        this.addClass(value);
        this.data('added-classes', addedClasses);
    }
};

},{}],17:[function(require,module,exports){
/**
 * ## Default Attribute Handling: Read-only Binding
 *
 * Flow.js uses the HTML5 convention of prepending data- to any custom HTML attribute. Flow.js also adds `f` for easy identification of Flow.js. For example, Flow.js provides several custom attributes and attribute handlers -- including [data-f-bind](../binds/default-bind-attr), [data-f-foreach](../foreach/default-foreach-attr/), [data-f-on-init](../events/init-event-attr/), etc. You can also [add your own attribute handlers](../attribute-manager/).
 *
 * The default behavior for handling a known attribute is to use the value of the model variable as the value of the attribute. (There are exceptions for some [boolean attributes](../boolean-attr/).)
 *
 * This means you can bind variables from the model in your interface by adding the `data-f-` prefix to any standard DOM attribute. This attribute binding is **read-only**, so as the model changes, the interface is automatically updated; but when users change values in the interface, no action occurs.
 *
 * **To display a DOM element based on a variable from the model:**
 *
 * 1. Add the prefix `data-f-` to any attribute in any HTML element that normally takes a value.
 * 2. Set the value of the attribute to the name of the model variable.
 *
 * **Example**
 *
 * 		<!-- input element displays value of sample_int, however,
 * 			no call to the model is made if user changes sample_int
 *
 *			if sample_int is 8, this is the equivalent of <input value="8"></input> -->
 *
 *		<input data-f-value="sample_int"></input>
 *
 */

'use strict';

module.exports = {

    test: '*',

    target: '*',

    handle: function (value, prop) {
        this.prop(prop, value);
    }
};

},{}],18:[function(require,module,exports){
/**
 * ##Call Operation in Response to User Action
 *
 * Many models call particular operations in response to end user actions, such as clicking a button or submitting a form.
 *
 * ####data-f-on-event
 *
 * For any HTML attribute using `on` -- typically on click or on submit -- you can add the attribute `data-f-on-XXX`, and set the value to the name of the operation. To call multiple operations, use the `|` (pipe) character to chain operations. Operations are called serially, in the order listed.
 *
 * **Example**
 *
 *      <button data-f-on-click="reset">Reset</button>
 *
 *      <button data-f-on-click="step(1)">Advance One Step</button>
 *
 */

'use strict';

module.exports = {

    target: '*',

    test: function (attr, $node) {
        return (attr.indexOf('on-') === 0);
    },

    stopListening: function (attr) {
        attr = attr.replace('on-', '');
        this.off(attr);
    },

    init: function (attr, value) {
        attr = attr.replace('on-', '');
        var me = this;
        this.off(attr).on(attr, function () {
            var listOfOperations = _.invoke(value.split('|'), 'trim');
            listOfOperations = listOfOperations.map(function (value) {
                var fnName = value.split('(')[0];
                var params = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
                var args = ($.trim(params) !== '') ? params.split(',') : [];
                return { name: fnName, params: args };
            });

            me.trigger('f.ui.operate', { operations: listOfOperations, serial: true });
        });
        return false; //Don't bother binding on this attr. NOTE: Do readonly, true instead?;
    }
};

},{}],19:[function(require,module,exports){
/**
 * ##Call Operation when Element Added to DOM
 *
 * Many models call an initialization operation when the [run](../../../../../../glossary/#run) is first created. This is particularly common with [Vensim](../../../../../../model_code/vensim/) models, which need to initialize variables ('startGame') before stepping. You can use the `data-f-on-init` attribute to call an operation from the model when a particular element is added to the DOM.
 *
 * ####data-f-on-init
 *
 * Add the attribute `data-f-on-init`, and set the value to the name of the operation. To call multiple operations, use the `|` (pipe) character to chain operations. Operations are called serially, in the order listed. Typically you add this attribute to the `<body>` element.
 *
 * **Example**
 *
 *      <body data-f-on-init="startGame">
 *
 *      <body data-f-on-init="startGame | step(3)">
 *
 */

'use strict';

module.exports = {

    target: '*',

    test: function (attr, $node) {
        return (attr.indexOf('on-init') === 0);
    },

    init: function (attr, value) {
        attr = attr.replace('on-init', '');
        var me = this;
        $(function () {
            var listOfOperations = _.invoke(value.split('|'), 'trim');
            listOfOperations = listOfOperations.map(function (value) {
                var fnName = value.split('(')[0];
                var params = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
                var args = ($.trim(params) !== '') ? params.split(',') : [];
                return { name: fnName, params: args };
            });

            me.trigger('f.ui.operate', { operations: listOfOperations, serial: true });
        });
        return false; //Don't bother binding on this attr. NOTE: Do readonly, true instead?;
    }
};

},{}],20:[function(require,module,exports){
/**
 * ## Display Array and Object Variables: data-f-foreach
 *
 * If your model variable is an array, you can reference specific elements of the array using `data-f-bind`: `data-f-bind="sales[3]"` or `data-f-bind="sales[<currentRegion>]"`, as described under [data-f-bind](../../binds/default-bind-attr/).
 *
 * However, that's not the only option. If you want to automatically loop over all elements of the array, or all the fields of an object, you can use the `data-f-foreach` attribute to name the variable, then use templates to access its index and value for display. (Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).)
 *
 * **To display a DOM element based on an array variable from the model:**
 *
 * 1. Add the `data-f-foreach` attribute to any HTML element that has repeated sub-elements. The two most common examples are lists and tables.
 * 2. Set the value of the `data-f-foreach` attribute in your top-level HTML element to the name of the array variable.
 * 3. Add the HTML in which the value of your array variable should appear.
 * 4. Optionally, inside the inner HTML element, use templates (`<%= %>`) to reference the `index` (for arrays) or `key` (for objects) and `value` to display. The `index`, `key`, and `value` are special variables that Flow.js populates for you.
 *
 *
 * **Examples:**
 *
 * By default &mdash; that is, if you do not include templates in your HTML &mdash; the `value` of the array element or object field appears:
 *
 *      <!-- the model variable Time is an array of years
 *          create a list that shows which year -->
 *
 *      <ul data-f-foreach="Time">
 *          <li></li>
 *      </ul>
 *
 * In the third step of the model, this example generates the HTML:
 *
 *      <ul data-f-foreach="Time">
 *            <li>2015</li>
 *            <li>2016</li>
 *            <li>2017</li>
 *      </ul>
 *
 * which appears as:
 *
 *      * 2015
 *      * 2016
 *      * 2017
 *
 * Optionally, you can use templates (`<%= %>`) to reference the `index` and `value` of the array element to display.
 *
 *
 *      <!-- the model variable Time is an array of years
 *          create a list that shows which year -->
 *
 *      <ul data-f-foreach="Time">
 *          <li> Year <%= index %>: <%= value %> </li>
 *      </ul>
 *
 * In the third step of the model, this example generates:
 *
 *
 *
 * which appears as:
 *
 *      * Year 1: 2015
 *      * Year 2: 2016
 *      * Year 3: 2017
 *
 * As with other `data-f-` attributes, you can specify [converters](../../../../../converter-overview) to convert data from one form to another:
 *
 *      <ul data-f-foreach="Sales | $x,xxx">
 *          <li> Year <%= index %>: Sales of <%= value %> </li>
 *      </ul>
 *
 *
 * **Notes:**
 *
 * * You can use the `data-f-foreach` attribute with both arrays and objects. If the model variable is an object, reference the `key` instead of the `index` in your templates.
 * * The `key`, `index`, and `value` are special variables that Flow.js populates for you.
 * * The template syntax is to enclose each keyword (`index`, `key`, `variable`) in `<%=` and `%>`. Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).
 *
 */

'use strict';
var parseUtils = require('../../../utils/parse-utils');
module.exports = {

    test: 'foreach',

    target: '*',

    handle: function (value, prop) {
        value = ($.isPlainObject(value) ? value : [].concat(value));
        var loopTemplate = this.data('foreach-template');
        if (!loopTemplate) {
            loopTemplate = this.html();
            this.data('foreach-template', loopTemplate);
        }
        var $me = this.empty();
        _.each(value, function (dataval, datakey) {
            if (!dataval) {
                dataval = dataval + '';
            }
            var cloop = loopTemplate.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            var templatedLoop = _.template(cloop, { value: dataval, key: datakey, index: datakey });
            var isTemplated = templatedLoop !== cloop;
            var nodes = $(templatedLoop);

            nodes.each(function (i, newNode) {
                newNode = $(newNode);
                _.each(newNode.data(), function (val, key) {
                    newNode.data(key, parseUtils.toImplicitType(val));
                });
                if (!isTemplated && !newNode.html().trim()) {
                    newNode.html(dataval);
                }
            });
            $me.append(nodes);
        });
    }
};

},{"../../../utils/parse-utils":34}],21:[function(require,module,exports){
/**
 * ## Binding for data-f-[boolean]
 *
 * Flow.js provides special handling for HTML attributes that take Boolean values.
 *
 * In particular, for most HTML attributes that expect Boolean values, the attribute is directly set to the value of the model variable. This is true for `checked`, `selected`, `async`, `autofocus`, `autoplay`, `controls`, `defer`, `ismap`, `loop`, `multiple`, `open`, `required`, and `scoped`.
 *
 * However, there are a few notable exceptions. For the HTML attributes `disabled`, `hidden`, and `readonly`, the attribute is set to the *opposite* of the value of the model variable. This makes the resulting HTML easier to read.
 *
 * **Example**
 *
 *      <!-- this checkbox is CHECKED when sampleBool is TRUE,
 *           and UNCHECKED when sampleBool is FALSE -->
 *      <input type="checkbox" data-f-checked="sampleBool" />
 *
 *      <!-- this button is ENABLED when sampleBool is TRUE,
 *           and DISABLED when sampleBool is FALSE -->
 *      <button data-f-disabled="sampleBool">Click Me</button>
 *
 */

'use strict';

module.exports = {

    target: '*',

    test: /^(?:disabled|hidden|readonly)$/i,

    handle: function (value, prop) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        this.prop(prop, !value);
    }
};

},{}],22:[function(require,module,exports){
/**
 * ## No-op Attributes
 *
 * Flow.js provides special handling for both `data-f-model` (described [here](../../../../#using_in_project)) and `data-f-convert` (described [here](../../../../converter-overview/)). For these attributes, the default behavior is to do nothing, so that this additional special handling can take precendence.
 *
 */

'use strict';

// Attributes which are just parameters to others and can just be ignored
module.exports = {

    target: '*',

    test: /^(?:model|convert)$/i,

    handle: $.noop,

    init: function () {
        return false;
    }
};

},{}],23:[function(require,module,exports){
/**
 * ## Binding for data-f-[boolean]
 *
 * Flow.js provides special handling for HTML attributes that take Boolean values.
 *
 * In particular, for most HTML attributes that expect Boolean values, the attribute is directly set to the value of the model variable. This is true for `checked`, `selected`, `async`, `autofocus`, `autoplay`, `controls`, `defer`, `ismap`, `loop`, `multiple`, `open`, `required`, and `scoped`.
 *
 * However, there are a few notable exceptions. For the HTML attributes `disabled`, `hidden`, and `readonly`, the attribute is set to the *opposite* of the value of the model variable. This makes the resulting HTML easier to read.
 *
 * **Example**
 *
 *      <!-- this checkbox is CHECKED when sampleBool is TRUE,
 *           and UNCHECKED when sampleBool is FALSE -->
 *      <input type="checkbox" data-f-checked="sampleBool" />
 *
 *      <!-- this button is ENABLED when sampleBool is TRUE,
 *           and DISABLED when sampleBool is FALSE -->
 *      <button data-f-disabled="sampleBool">Click Me</button>
 *
 */

'use strict';

module.exports = {
    target: '*',

    test: /^(?:checked|selected|async|autofocus|autoplay|controls|defer|ismap|loop|multiple|open|required|scoped)$/i,

    handle: function (value, prop) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        /*jslint eqeq: true*/
        var val = (this.attr('value')) ? (value == this.prop('value')) : !!value;
        this.prop(prop, val);
    }
};

},{}],24:[function(require,module,exports){
'use strict';
var parseUtils = require('../../utils/parse-utils');
module.exports = {

    test: 'repeat',

    target: '*',

    handle: function (value, prop) {
        value = ($.isPlainObject(value) ? value : [].concat(value));
        var loopTemplate = this.data('repeat-template');
        var id = '';
        if (!loopTemplate) {
            loopTemplate = this.get(0).outerHTML;
            id =  _.uniqueId('repeat-');
            this.data({
                'repeat-template': loopTemplate,
                'repeat-template-id': id
            });
        } else {
            id = this.data('repeat-template-id');
            this.nextUntil(':not([' + id + '])').remove();
        }
        var last;
        var me = this;
        _.each(value, function (dataval, datakey) {
            if (!dataval) {
                dataval = dataval + '';
            }
            var cloop = loopTemplate.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            var templatedLoop = _.template(cloop, { value: dataval, key: datakey, index: datakey });
            var isTemplated = templatedLoop !== cloop;
            var nodes = $(templatedLoop);

            nodes.each(function (i, newNode) {
                newNode = $(newNode).removeAttr('data-f-repeat');
                _.each(newNode.data(), function (val, key) {
                    if (!last) {
                        me.data(key, parseUtils.toImplicitType(val));
                    } else {
                        newNode.data(key, parseUtils.toImplicitType(val));
                    }
                });
                newNode.attr(id, true);
                if (!isTemplated && !newNode.html().trim()) {
                    newNode.html(dataval);
                }
            });
            if (!last) {
                last = me.html(nodes.html());
            } else {
                last = nodes.insertAfter(last);
            }
        });
    }
};

},{"../../utils/parse-utils":34}],25:[function(require,module,exports){
/**
 * ## DOM Manager
 *
 * The Flow.js DOM Manager provides two-way data bindings from your project's user interface to the channel. The DOM Manager is the 'glue' through which HTML DOM elements -- including the attributes and attribute handlers provided by Flow.js for [variables](../../attributes-overview/), [operations](../../operations-overview/) and [conversion](../../converter-overview/), and those [you create](./attributes/attribute-manager/) -- are bound to the variable and operations [channels](../../channel-overview/) to link them with your project's model. See the [Epicenter architecture details](../../../creating_your_interface/arch_details/) for a visual description of how the DOM Manager relates to the [rest of the Epicenter stack](../../../creating_your_interface/).
 *
 * The DOM Manager is an integral part of the Flow.js architecture but, in keeping with our general philosophy of extensibility and configurability, it is also replaceable. For instance, if you want to manage your DOM state with [Backbone Views](http://backbonejs.org) or [Angular.js](https://angularjs.org), while still using the channels to handle the communication with your model, this is the piece you'd replace. [Contact us](http://forio.com/about/contact/) if you are interested in extending Flow.js in this way -- we'll be happy to talk about it in more detail.
 *
 */

module.exports = (function () {
    'use strict';
    var config = require('../config');

    var nodeManager = require('./nodes/node-manager');
    var attrManager = require('./attributes/attribute-manager');
    var converterManager = require('../converters/converter-manager');

    var parseUtils = require('../utils/parse-utils');
    var domUtils = require('../utils/dom');

    var autoUpdatePlugin = require('./plugins/auto-update-bindings');

    //Jquery selector to return everything which has a f- property set
    $.expr[':'][config.prefix] = function (obj) {
        var $this = $(obj);
        var dataprops = _.keys($this.data());

        var match = _.find(dataprops, function (attr) {
            return (attr.indexOf(config.prefix) === 0);
        });

        return !!(match);
    };

    $.expr[':'].webcomponent = function (obj) {
        return obj.nodeName.indexOf('-') !== -1;
    };

    var getMatchingElements = function (root) {
        var $root = $(root);
        var matchedElements = $root.find(':' + config.prefix);
        if ($root.is(':' + config.prefix)) {
            matchedElements = matchedElements.add($root);
        }
        return matchedElements;
    };

    var getElementOrError = function (element, context) {
        if (element instanceof $) {
            element = element.get(0);
        }
        if (!element || !element.nodeName) {
            console.error(context, 'Expected to get DOM Element, got ', element);
            throw new Error(context + ': Expected to get DOM Element, got' + (typeof element));
        }
        return element;
    };

    var publicAPI = {

        nodes: nodeManager,
        attributes: attrManager,
        converters: converterManager,
        //utils for testing
        private: {
            matchedElements: []
        },

        /**
         * Unbind the element: unsubscribe from all updates on the relevant channels.
         *
         * @param {DomElement} element The element to remove from the data binding.
         * @param {ChannelInstance} channel (Optional) The channel from which to unsubscribe. Defaults to the [variables channel](../channels/variables-channel/).
         */
        unbindElement: function (element, channel) {
            if (!channel) {
                channel = this.options.channel.variables;
            }
            element = getElementOrError(element);
            var $el = $(element);
            if (!$el.is(':' + config.prefix)) {
                return false;
            }
            this.private.matchedElements = _.without(this.private.matchedElements, element);

            //FIXME: have to readd events to be able to remove them. Ugly
            var Handler = nodeManager.getHandler($el);
            var h = new Handler.handle({
                el: element
            });
            if (h.removeEvents) {
                h.removeEvents();
            }

            $(element.attributes).each(function (index, nodeMap) {
                var attr = nodeMap.nodeName;
                var wantedPrefix = 'data-f-';
                if (attr.indexOf(wantedPrefix) === 0) {
                    attr = attr.replace(wantedPrefix, '');

                    var handler = attrManager.getHandler(attr, $el);
                    if (handler.stopListening) {
                        handler.stopListening.call($el, attr);
                    }
                }
            });

            var subsid = $el.data('f-subscription-id') || [];
            _.each(subsid, function (subs) {
                channel.unsubscribe(subs);
            });
        },

        /**
         * Bind the element: subscribe from updates on the relevant channels.
         *
         * @param {DomElement} element The element to add to the data binding.
         * @param {ChannelInstance} channel (Optional) The channel to subscribe to. Defaults to the [variables channel](../channels/variables-channel/).
         */
        bindElement: function (element, channel) {
            if (!channel) {
                channel = this.options.channel.variables;
            }
            element = getElementOrError(element);
            var $el = $(element);
            if (!$el.is(':' + config.prefix)) {
                return false;
            }
            if (!_.contains(this.private.matchedElements, element)) {
                this.private.matchedElements.push(element);
            }

            //Send to node manager to handle ui changes
            var Handler = nodeManager.getHandler($el);
            new Handler.handle({
                el: element
            });

            var subscribe = function (channel, varsToBind, $el, options) {
                if (!varsToBind || !varsToBind.length) {
                    return false;
                }
                var subsid = channel.subscribe(varsToBind, $el, options);
                var newsubs = ($el.data('f-subscription-id') || []).concat(subsid);
                $el.data('f-subscription-id', newsubs);
            };

            var attrBindings = [];
            var nonBatchableVariables = [];
            //NOTE: looping through attributes instead of .data because .data automatically camelcases properties and make it hard to retrvieve
            $(element.attributes).each(function (index, nodeMap) {
                var attr = nodeMap.nodeName;
                var attrVal = nodeMap.value;

                var wantedPrefix = 'data-f-';
                if (attr.indexOf(wantedPrefix) === 0) {
                    attr = attr.replace(wantedPrefix, '');

                    var handler = attrManager.getHandler(attr, $el);
                    var isBindableAttr = true;
                    if (handler && handler.init) {
                        isBindableAttr = handler.init.call($el, attr, attrVal);
                    }

                    if (isBindableAttr) {
                        //Convert pipes to converter attrs
                        var withConv = _.invoke(attrVal.split('|'), 'trim');
                        if (withConv.length > 1) {
                            attrVal = withConv.shift();
                            $el.data('f-convert-' + attr, withConv);
                        }

                        var binding = { attr: attr };
                        var commaRegex = /,(?![^\[]*\])/;
                        if (attrVal.indexOf('<%') !== -1) {
                            //Assume it's templated for later use

                        } else if (attrVal.split(commaRegex).length > 1) {
                            var varsToBind = _.invoke(attrVal.split(commaRegex), 'trim');
                            subscribe(channel, varsToBind, $el, { batch: true });
                            binding.topics = varsToBind;
                        } else {
                            binding.topics = [attrVal];
                            nonBatchableVariables.push(attrVal);
                        }
                        attrBindings.push(binding);
                    }
                }
            });
            $el.data('attr-bindings', attrBindings);
            if (nonBatchableVariables.length) {
                // console.log('subscribe', nonBatchableVariables, $el.get(0))
                subscribe(channel, nonBatchableVariables, $el, { batch: false });
            }
        },

        /**
         * Bind all provided elements.
         *
         * @param  {Array|jQuerySelector} elementsToBind (Optional) If not provided, binds all matching elements within default root provided at initialization.
         */
        bindAll: function (elementsToBind) {
            if (!elementsToBind) {
                elementsToBind = getMatchingElements(this.options.root);
            } else if (!_.isArray(elementsToBind)) {
                elementsToBind = getMatchingElements(elementsToBind);
            }

            var me = this;
            //parse through dom and find everything with matching attributes
            $.each(elementsToBind, function (index, element) {
                me.bindElement.call(me, element, me.options.channel.variables);
            });
        },
        /**
         * Unbind provided elements.
         *
         * @param  {Array} elementsToUnbind (Optional) If not provided, unbinds everything.
         */
        unbindAll: function (elementsToUnbind) {
            var me = this;
            if (!elementsToUnbind) {
                elementsToUnbind = this.private.matchedElements;
            }
            $.each(elementsToUnbind, function (index, element) {
                me.unbindElement.call(me, element, me.options.channel.variables);
            });
        },

        /**
         * Initialize the DOM Manager to work with a particular HTML element and all elements within that root. Data bindings between individual HTML elements and the model variables specified in the attributes will happen via the channel.
         *
         * @param {Object} options (Optional) Overrides for the default options.
         * @param {String} options.root The root HTML element being managed by this instance of the DOM Manager. Defaults to `body`.
         * @param {Object} options.channel The channel to communicate with. Defaults to the Channel Manager from [Epicenter.js](../../../api_adapters/).
         * @param {Boolean} options.autoBind If `true` (default), any variables added to the DOM after `Flow.initialize()` has been called will be automatically parsed, and subscriptions added to channels. Note, this does not work in IE versions < 11.
         */
        initialize: function (options) {
            var defaults = {
                /**
                 * Root of the element for flow.js to manage from.
                 * @type {String} jQuery selector
                 */
                root: 'body',
                channel: null,

                /**
                 * Any variables added to the DOM after `Flow.initialize()` has been called will be automatically parsed, and subscriptions added to channels. Note, this does not work in IE versions < 11.
                 * @type {Boolean}
                 */
                autoBind: true
            };
            $.extend(defaults, options);

            var channel = defaults.channel;

            this.options = defaults;

            var me = this;
            var $root = $(defaults.root);
            $(function () {
                me.bindAll();
                $root.trigger('f.domready');

                //Attach listeners
                // Listen for changes to ui and publish to api
                $root.off(config.events.trigger).on(config.events.trigger, function (evt, data) {
                    var parsedData = {}; //if not all subsequent listeners will get the modified data

                    var $el = $(evt.target);
                    var attrConverters =  domUtils.getConvertersList($el, 'bind');

                    _.each(data, function (val, key) {
                        key = key.split('|')[0].trim(); //in case the pipe formatting syntax was used
                        val = converterManager.parse(val, attrConverters);
                        parsedData[key] = parseUtils.toImplicitType(val);

                        $el.trigger('f.convert', { bind: val });
                    });

                    channel.variables.publish(parsedData);
                });

                // Listen for changes from api and update ui
                $root.off(config.events.react).on(config.events.react, function (evt, data) {
                    // console.log(evt.target, data, "root on");
                    var $el = $(evt.target);
                    var bindings = $el.data('attr-bindings');

                    var toconvert = {};
                    $.each(data, function (variableName, value) {
                        _.each(bindings, function (binding) {
                            if (_.contains(binding.topics, variableName)) {
                                if (binding.topics.length > 1) {
                                    toconvert[binding.attr] = _.pick(data, binding.topics);
                                } else {
                                    toconvert[binding.attr] = value;
                                }
                            }
                        });
                    });
                    $el.trigger('f.convert', toconvert);
                });

                // data = {proptoupdate: value} || just a value (assumes 'bind' if so)
                $root.off('f.convert').on('f.convert', function (evt, data) {
                    var $el = $(evt.target);
                    var convert = function (val, prop) {
                        prop = prop.toLowerCase();
                        var attrConverters =  domUtils.getConvertersList($el, prop);
                        var handler = attrManager.getHandler(prop, $el);
                        var convertedValue = converterManager.convert(val, attrConverters);
                        handler.handle.call($el, convertedValue, prop);
                    };

                    if ($.isPlainObject(data)) {
                        _.each(data, convert);
                    } else {
                        convert(data, 'bind');
                    }
                });

                $root.off('f.ui.operate').on('f.ui.operate', function (evt, data) {
                    data = $.extend(true, {}, data); //if not all subsequent listeners will get the modified data
                    _.each(data.operations, function (opn) {
                       opn.params = _.map(opn.params, function (val) {
                           return parseUtils.toImplicitType($.trim(val));
                       });
                    });
                    channel.operations.publish(data);
                });

                if (me.options.autoBind) {
                    autoUpdatePlugin($root.get(0), me);
                }
            });
        }
    };

    return $.extend(this, publicAPI);
}());

},{"../config":5,"../converters/converter-manager":7,"../utils/dom":33,"../utils/parse-utils":34,"./attributes/attribute-manager":12,"./nodes/node-manager":30,"./plugins/auto-update-bindings":31}],26:[function(require,module,exports){
'use strict';

var extend = function (protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
        child = protoProps.constructor;
    } else {
        child = function () { return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function () { this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) {
        _.extend(child.prototype, protoProps);
    }

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
};

var View = function (options) {
    this.$el = (options.$el) || $(options.el);
    this.el = options.el;
    this.initialize.apply(this, arguments);

};

_.extend(View.prototype, {
    initialize: function () {},
});

View.extend = extend;

module.exports = View;

},{}],27:[function(require,module,exports){
'use strict';
var config = require('../../config');
var BaseView = require('./default-node');

module.exports = BaseView.extend({
    propertyHandlers: [],

    uiChangeEvent: 'change',
    getUIValue: function () {
        return this.$el.val();
    },

    removeEvents: function () {
        this.$el.off(this.uiChangeEvent);
    },

    initialize: function () {
        var me = this;
        var propName = this.$el.data(config.binderAttr);

        if (propName) {
            this.$el.off(this.uiChangeEvent).on(this.uiChangeEvent, function () {
                var val = me.getUIValue();

                var params = {};
                params[propName] = val;

                me.$el.trigger(config.events.trigger, params);
            });
        }
        BaseView.prototype.initialize.apply(this, arguments);
    }
}, { selector: 'input, select' });

},{"../../config":5,"./default-node":28}],28:[function(require,module,exports){
'use strict';

var BaseView = require('./base');

module.exports = BaseView.extend({
    propertyHandlers: [

    ],

    initialize: function () {
    }
}, { selector: '*' });

},{"./base":26}],29:[function(require,module,exports){
'use strict';
var BaseView = require('./default-input-node');

module.exports = BaseView.extend({

    propertyHandlers: [

    ],

    getUIValue: function () {
        var $el = this.$el;
        //TODO: file a issue for the vensim manager to convert trues to 1s and set this to true and false

        var offVal =  ($el.data('f-off') !== undefined) ? $el.data('f-off') : 0;
        //attr = initial value, prop = current value
        var onVal = ($el.attr('value') !== undefined) ? $el.prop('value'): 1;

        var val = ($el.is(':checked')) ? onVal : offVal;
        return val;
    },
    initialize: function () {
        BaseView.prototype.initialize.apply(this, arguments);
    }
}, { selector: ':checkbox,:radio' });

},{"./default-input-node":27}],30:[function(require,module,exports){
'use strict';

var normalize = function (selector, handler) {
    if (_.isFunction(handler)) {
        handler = {
            handle: handler
        };
    }
    if (!selector) {
        selector = '*';
    }
    handler.selector = selector;
    return handler;
};

var match = function (toMatch, node) {
    if (_.isString(toMatch)) {
        return toMatch === node.selector;
    } else {
        return $(toMatch).is(node.selector);
    }
};

var nodeManager = {
    list: [],

    /**
     * Add a new node handler
     * @param  {string} selector jQuery-compatible selector to use to match nodes
     * @param  {function} handler  Handlers are new-able functions. They will be called with $el as context.? TODO: Think this through
     */
    register: function (selector, handler) {
        this.list.unshift(normalize(selector, handler));
    },

    getHandler: function (selector) {
        return _.find(this.list, function (node) {
            return match(selector, node);
        });
    },

    replace: function (selector, handler) {
        var index;
        _.each(this.list, function (currentHandler, i) {
            if (selector === currentHandler.selector) {
                index = i;
                return false;
            }
        });
        this.list.splice(index, 1, normalize(selector, handler));
    }
};

//bootstraps
var defaultHandlers = [
    require('./input-checkbox-node'),
    require('./default-input-node'),
    require('./default-node')
];
_.each(defaultHandlers.reverse(), function (handler) {
    nodeManager.register(handler.selector, handler);
});

module.exports = nodeManager;

},{"./default-input-node":27,"./default-node":28,"./input-checkbox-node":29}],31:[function(require,module,exports){
'use strict';

module.exports = function (target, domManager) {
    if (!window.MutationObserver) {
        return false;
    }

    // Create an observer instance
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        var added = $(mutation.addedNodes).find(':f');
        added = added.add($(mutation.addedNodes).filter(':f'));

        var removed = $(mutation.removedNodes).find(':f');
        removed = removed.add($(mutation.removedNodes).filter(':f'));

        if (added && added.length) {
            // console.log('mutation observer added', added.get(), mutation.addedNodes);
            domManager.bindAll(added);
        }
        if (removed && removed.length) {
            // console.log('mutation observer removed', removed);
            domManager.unbindAll(removed);
        }
      });
    });

    var mutconfig = {
        attributes: false,
        childList: true,
        subtree: true,
        characterData: false
    };
    observer.observe(target, mutconfig);
    // Later, you can stop observing
    // observer.disconnect();
};

},{}],32:[function(require,module,exports){
/**
 * ## Flow.js Initialization
 *
 * To use Flow.js in your project, simply call `Flow.initialize()` in your user interface. In the basic case, `Flow.initialize()` can be called without any arguments. While Flow.js needs to know the account, project, and model you are using, by default these values are extracted from the URL of Epicenter project and by the use of `data-f-model` in your `<body>` tag. See more on the [basics of using Flow.js in your project.](../../#using_in_project).
 *
 * However, sometimes you want to be explicit in your initialization call, and there are also some additional parameters that let you customize your use of Flow.js.
 *
 * ####Parameters
 *
 * The parameters for initializing Flow.js include:
 *
 * * `channel` Configuration details for the channel Flow.js uses in connecting with underlying APIs.
 * * `channel.strategy` The run creation strategy describes when to create new runs when an end user visits this page. The default is `new-if-persisted`, which creates a new run when the end user is idle for longer than your project's **Model Session Timeout** (configured in your project's [Settings](../../../updating_your_settings/)), but otherwise uses the current run.. See more on [Run Strategies](../../../api_adapters/strategy/).
 * * `channel.run` Configuration details for each run created.
 * * `channel.run.account` The **User ID** or **Team ID** for this project. By default, taken from the URL where the user interface is hosted, so you only need to supply this is you are running your project's user interface [on your own server](../../../how_to/self_hosting/).
 * * `channel.run.project` The **Project ID** for this project.
 * * `channel.run.model` Name of the primary model file for this project. By default, taken from `data-f-model` in your HTML `<body>` tag.
 * * `channel.run.variables` Configuration options for the variables being listened to on this channel.
 * * `channel.run.variables.silent` Provides granular control over when user interface updates happen for changes on this channel. See below for possible values.
 * * `channel.run.variables.autoFetch` Options for fetching variables from the API as they're being subscribed. See [Variables Channel](../channels/variables-channel/) for details.
 * * `channel.run.operations` Configuration options for the operations being listened to on this channel. Currently there is only one configuration option: `silent`.
 * * `channel.run.operations.silent` Provides granular control over when user interface updates happen for changes on this channel. See below for possible values.
 * * `channel.run.server` Object with additional server configuration, defaults to `host: 'api.forio.com'`.
 * * `channel.run.transport` An object which takes all of the jquery.ajax options at <a href="http://api.jquery.com/jQuery.ajax/">http://api.jquery.com/jQuery.ajax/</a>.
 * * `dom` Configuration options for the DOM where this instance of Flow.js is created.
 * * `dom.root` The root HTML element being managed by the Flow.js DOM Manager. Defaults to `body`.
 * * `dom.autoBind` If `true` (default), automatically parse variables added to the DOM after this `Flow.initialize()` call. Note, this does not work in IE versions < 11.
 *
 * The `silent` configuration option for the `run.variables` and `run.operations` is a flag for providing more granular control over when user interface updates happen for changes on this channel. Values can be:
 *
 * * `false`: Always update the UI for any changes (variables updated, operations called) on this channel. This is the default behavior.
 * * `true`: Never update the UI for any on changes (variables updated, operations called) on this channel.
 * * Array of variables or operations for which the UI *should not* be updated. For example, `variables: { silent: [ 'price', 'sales' ] }` means this channel is silent (no updates for the UI) when the variables 'price' or 'sales' change, and the UI is always updated for any changes to other variables. This is useful if you know that changing 'price' or 'sales' does not impact anything else in the UI directly, for instance.
 * * `except`: With array of variables or operations for which the UI *should* be updated. For example, `variables { silent: { except: [ 'price', 'sales' ] } }` is the converse of the above. The UI is always updated when anything on this channel changes *except* when the variables 'price' or 'sales' are updated.
 *
 * Although Flow.js provides a bi-directional binding between the model and the user interface, the `silent` configuration option applies only for the binding from the model to the user interface; updates in the user interface (including calls to operations) are still sent to the model.
 *
 * The `Flow.initialize()` call is based on the Epicenter.js [Run Service](../../../api_adapters/generated/run-api-service/) from the [API Adapters](../../../api_adapters/). See those pages for additional information on parameters.
 *
 * ####Example
 *
 *      Flow.initialize({
 *          channel: {
 *              strategy: 'new-if-persisted',
 *              run: {
 *                  model: 'supply-chain-game.py',
 *                  account: 'acme-simulations',
 *                  project: 'supply-chain-game',
 *                  server: { host: 'api.forio.com' },
 *                  variables: { silent: ['price', 'sales'] },
 *                  operations: { silent: false },
 *                  transport: {
 *                      beforeSend: function() { $('body').addClass('loading'); },
 *                      complete: function() { $('body').removeClass('loading'); }
 *                  }
 *              }
 *          }
 *      });
 */

'use strict';

var domManager = require('./dom/dom-manager');
var Channel = require('./channels/run-channel');

module.exports = {
    dom: domManager,

    initialize: function (config) {
        var model = $('body').data('f-model');

        var defaults = {
            channel: {
                run: {
                    account: '',
                    project: '',
                    model: model,

                    operations: {
                    },
                    variables: {
                        autoFetch: {
                            start: false
                        }
                    }
                }
            },
            dom: {
                root: 'body',
                autoBind: true
            }
        };

        var options = $.extend(true, {}, defaults, config);
        var $root = $(options.dom.root);
        var initFn = $root.data('f-on-init');
        var opnSilent = options.channel.run.operations.silent;
        var isInitOperationSilent = initFn && (opnSilent === true || (_.isArray(opnSilent) && _.contains(opnSilent, initFn)));
        var preFetchVariables = !initFn || isInitOperationSilent;

        if (preFetchVariables) {
            options.channel.run.variables.autoFetch.start = true;
        }

        if (config && config.channel && (config.channel instanceof Channel)) {
            this.channel = config.channel;
        } else {
            this.channel = new Channel(options.channel);
        }

        domManager.initialize($.extend(true, {
            channel: this.channel
        }, options.dom));
    }
};

},{"./channels/run-channel":3,"./dom/dom-manager":25}],33:[function(require,module,exports){
'use strict';

module.exports = {

    match: function (matchExpr, matchValue, context) {
        if (_.isString(matchExpr)) {
            return (matchExpr === '*' || (matchExpr.toLowerCase() === matchValue.toLowerCase()));
        } else if (_.isFunction(matchExpr)) {
            return matchExpr(matchValue, context);
        } else if (_.isRegExp(matchExpr)) {
            return matchValue.match(matchExpr);
        }
    },

    getConvertersList: function ($el, property) {
        var attrConverters = $el.data('f-convert-' + property);

        if (!attrConverters && (property === 'bind' || property === 'foreach')) {
            attrConverters = $el.data('f-convert');
            if (!attrConverters) {
                var $parentEl = $el.closest('[data-f-convert]');
                if ($parentEl) {
                    attrConverters = $parentEl.data('f-convert');
                }
            }
            if (attrConverters) {
                attrConverters = _.invoke(attrConverters.split('|'), 'trim');
            }
        }

        return attrConverters;
    }
};

},{}],34:[function(require,module,exports){
'use strict';

module.exports = {

    toImplicitType: function (data) {
        var rbrace = /^(?:\{.*\}|\[.*\])$/;
        var converted = data;
        if (typeof data === 'string') {
            data = data.trim();

            if (data === 'true') {
                converted = true;
            } else if (data === 'false') {
                converted = false;
            } else if (data === 'null') {
                converted = null;
            } else if (data === 'undefined') {
                converted = '';
            } else if (converted.charAt(0) === '\'' || converted.charAt(0) === '"') {
                converted = data.substring(1, data.length - 1);
            } else if ($.isNumeric(data)) {
                converted = +data;
            } else if (rbrace.test(data)) {
                //TODO: This only works with double quotes, i.e., [1,"2"] works but not [1,'2']
                converted = $.parseJSON(data) ;
            }
        }
        return converted;
    }
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYXBwLmpzIiwic3JjL2NoYW5uZWxzL29wZXJhdGlvbnMtY2hhbm5lbC5qcyIsInNyYy9jaGFubmVscy9ydW4tY2hhbm5lbC5qcyIsInNyYy9jaGFubmVscy92YXJpYWJsZXMtY2hhbm5lbC5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvY29udmVydGVycy9hcnJheS1jb252ZXJ0ZXIuanMiLCJzcmMvY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlci5qcyIsInNyYy9jb252ZXJ0ZXJzL251bWJlci1jb252ZXJ0ZXIuanMiLCJzcmMvY29udmVydGVycy9udW1iZXJmb3JtYXQtY29udmVydGVyLmpzIiwic3JjL2NvbnZlcnRlcnMvc3RyaW5nLWNvbnZlcnRlci5qcyIsInNyYy9jb252ZXJ0ZXJzL3VuZGVyc2NvcmUtdXRpbHMtY29udmVydGVyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2F0dHJpYnV0ZS1tYW5hZ2VyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2NoZWNrYm94LXJhZGlvLWJpbmQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9kZWZhdWx0LWJpbmQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9pbnB1dC1iaW5kLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvY2xhc3MtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9kZWZhdWx0LWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvZXZlbnRzL2RlZmF1bHQtZXZlbnQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9ldmVudHMvaW5pdC1ldmVudC1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2ZvcmVhY2gvZGVmYXVsdC1mb3JlYWNoLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvbmVnYXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL25vLW9wLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvcG9zaXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL3JlcGVhdC1hdHRyLmpzIiwic3JjL2RvbS9kb20tbWFuYWdlci5qcyIsInNyYy9kb20vbm9kZXMvYmFzZS5qcyIsInNyYy9kb20vbm9kZXMvZGVmYXVsdC1pbnB1dC1ub2RlLmpzIiwic3JjL2RvbS9ub2Rlcy9kZWZhdWx0LW5vZGUuanMiLCJzcmMvZG9tL25vZGVzL2lucHV0LWNoZWNrYm94LW5vZGUuanMiLCJzcmMvZG9tL25vZGVzL25vZGUtbWFuYWdlci5qcyIsInNyYy9kb20vcGx1Z2lucy9hdXRvLXVwZGF0ZS1iaW5kaW5ncy5qcyIsInNyYy9mbG93LmpzIiwic3JjL3V0aWxzL2RvbS5qcyIsInNyYy91dGlscy9wYXJzZS11dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIndpbmRvdy5GbG93ID0gcmVxdWlyZSgnLi9mbG93LmpzJyk7XG53aW5kb3cuRmxvdy52ZXJzaW9uID0gJzwlPSB2ZXJzaW9uICU+JzsgLy9wb3B1bGF0ZWQgYnkgZ3J1bnRcbiIsIi8qKlxuICogIyMgT3BlcmF0aW9ucyBDaGFubmVsXG4gKlxuICogQ2hhbm5lbHMgYXJlIHdheXMgZm9yIEZsb3cuanMgdG8gdGFsayB0byBleHRlcm5hbCBBUElzIC0tIHByaW1hcmlseSB0aGUgW3VuZGVybHlpbmcgRXBpY2VudGVyIEFQSXNdKC4uLy4uLy4uLy4uL2NyZWF0aW5nX3lvdXJfaW50ZXJmYWNlLykuXG4gKlxuICogVGhlIHByaW1hcnkgdXNlIGNhc2VzIGZvciB0aGUgT3BlcmF0aW9ucyBDaGFubmVsIGFyZTpcbiAqXG4gKiAqIGBwdWJsaXNoYDogQ2FsbCBhbiBvcGVyYXRpb24uXG4gKiAqIGBzdWJzY3JpYmVgOiBSZWNlaXZlIG5vdGlmaWNhdGlvbnMgd2hlbiBhbiBvcGVyYXRpb24gaXMgY2FsbGVkLlxuICpcbiAqIEZvciBleGFtcGxlLCB1c2UgYHB1Ymxpc2goKWAgdG8gY2FsbCBhbiBvcGVyYXRpb24gKG1ldGhvZCkgZnJvbSB5b3VyIG1vZGVsOlxuICpcbiAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMucHVibGlzaCgnbXlNZXRob2QnLCBteU1ldGhvZFBhcmFtKTtcbiAqXG4gKiBGb3IgcmVmZXJlbmNlLCBhbiBlcXVpdmFsZW50IGNhbGwgdXNpbmcgRmxvdy5qcyBjdXN0b20gSFRNTCBhdHRyaWJ1dGVzIGlzOlxuICpcbiAqICAgICAgPGJ1dHRvbiBkYXRhLWYtb24tY2xpY2s9XCJteU1ldGhvZChteU1ldGhvZFBhcmFtKVwiPkNsaWNrIG1lPC9idXR0b24+XG4gKlxuICogWW91IGNhbiBhbHNvIHVzZSBgc3Vic2NyaWJlKClgIGFuZCBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGxpc3RlbiBhbmQgcmVhY3Qgd2hlbiB0aGUgb3BlcmF0aW9uIGhhcyBiZWVuIGNhbGxlZDpcbiAqXG4gKiAgICAgIEZsb3cuY2hhbm5lbC5vcGVyYXRpb25zLnN1YnNjcmliZSgnbXlNZXRob2QnLFxuICogICAgICAgICAgZnVuY3Rpb24oKSB7IGNvbnNvbGUubG9nKCdjYWxsZWQhJyk7IH0gKTtcbiAqXG4gKiBVc2UgYHN1YnNjcmliZSgqKWAgdG8gbGlzdGVuIGZvciBub3RpZmljYXRpb25zIG9uIGFsbCBvcGVyYXRpb25zLlxuICpcbiAqIFRvIHVzZSB0aGUgT3BlcmF0aW9ucyBDaGFubmVsLCBzaW1wbHkgW2luaXRpYWxpemUgRmxvdy5qcyBpbiB5b3VyIHByb2plY3RdKC4uLy4uLy4uLyNjdXN0b20taW5pdGlhbGl6ZSkuXG4gKlxuKi9cblxuXG4ndXNlIHN0cmljdCc7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZXRlcm1pbmUgd2hlbiB0byB1cGRhdGUgc3RhdGUuIERlZmF1bHRzIHRvIGBmYWxzZWA6IGFsd2F5cyB0cmlnZ2VyIHVwZGF0ZXMuXG4gICAgICAgICAqXG4gICAgICAgICAqIFBvc3NpYmxlIG9wdGlvbnMgYXJlOlxuICAgICAgICAgKlxuICAgICAgICAgKiAqIGB0cnVlYDogTmV2ZXIgdHJpZ2dlciBhbnkgdXBkYXRlcy4gVXNlIHRoaXMgaWYgeW91IGtub3cgeW91ciBtb2RlbCBzdGF0ZSB3b24ndCBjaGFuZ2UgYmFzZWQgb24gb3BlcmF0aW9ucy5cbiAgICAgICAgICogKiBgZmFsc2VgOiBBbHdheXMgdHJpZ2dlciB1cGRhdGVzLlxuICAgICAgICAgKiAqIGBbYXJyYXkgb2Ygb3BlcmF0aW9uIG5hbWVzXWA6IE9wZXJhdGlvbnMgaW4gdGhpcyBhcnJheSAqd2lsbCBub3QqIHRyaWdnZXIgdXBkYXRlczsgZXZlcnl0aGluZyBlbHNlIHdpbGwuXG4gICAgICAgICAqICogYHsgZXhjZXB0OiBbYXJyYXkgb2Ygb3BlcmF0aW9uIG5hbWVzXSB9YDogT3BlcmF0aW9ucyBpbiB0aGlzIGFycmF5ICp3aWxsKiB0cmlnZ2VyIHVwZGF0ZXM7IG5vdGhpbmcgZWxzZSB3aWxsLlxuICAgICAgICAgKlxuICAgICAgICAgKiBUbyBzZXQsIHBhc3MgdGhpcyBpbnRvIHRoZSBgRmxvdy5pbml0aWFsaXplKClgIGNhbGwgaW4gdGhlIGBjaGFubmVsLnJ1bi5vcGVyYXRpb25zYCBmaWVsZDpcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICBGbG93LmluaXRpYWxpemUoe1xuICAgICAgICAgKiAgICAgICAgICBjaGFubmVsOiB7XG4gICAgICAgICAqICAgICAgICAgICAgICBydW46IHtcbiAgICAgICAgICogICAgICAgICAgICAgICAgICBtb2RlbDogJ215TW9kZWwucHknLFxuICAgICAgICAgKiAgICAgICAgICAgICAgICAgIGFjY291bnQ6ICdhY21lLXNpbXVsYXRpb25zJyxcbiAgICAgICAgICogICAgICAgICAgICAgICAgICBwcm9qZWN0OiAnc3VwcGx5LWNoYWluLWdhbWUnLFxuICAgICAgICAgKiAgICAgICAgICAgICAgICAgIG9wZXJhdGlvbnM6IHsgc2lsZW50OiB0cnVlIH1cbiAgICAgICAgICogICAgICAgICAgICAgIH1cbiAgICAgICAgICogICAgICAgICAgfVxuICAgICAgICAgKiAgICAgIH0pO1xuICAgICAgICAgKlxuICAgICAgICAgKiBUbyBvdmVycmlkZSBmb3IgYSBzcGVjaWZpYyBjYWxsIHRvIHRoZSBPcGVyYXRpb25zIENoYW5uZWwsIHBhc3MgdGhpcyBhcyB0aGUgZmluYWwgYG9wdGlvbnNgIHBhcmFtZXRlcjpcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMucHVibGlzaCgnbXlNZXRob2QnLCBteU1ldGhvZFBhcmFtLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge1N0cmluZ3xBcnJheXxPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBzaWxlbnQ6IGZhbHNlLFxuXG4gICAgICAgIGludGVycG9sYXRlOiB7fVxuICAgIH07XG5cbiAgICB2YXIgY2hhbm5lbE9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuICAgIHRoaXMub3B0aW9ucyA9IGNoYW5uZWxPcHRpb25zO1xuXG4gICAgdmFyIHJ1biA9IGNoYW5uZWxPcHRpb25zLnJ1bjtcblxuICAgIHZhciBwdWJsaWNBUEkgPSB7XG4gICAgICAgIC8vZm9yIHRlc3RpbmdcbiAgICAgICAgcHJpdmF0ZToge1xuICAgICAgICAgICAgb3B0aW9uczogY2hhbm5lbE9wdGlvbnNcbiAgICAgICAgfSxcblxuICAgICAgICBsaXN0ZW5lck1hcDoge30sXG5cbiAgICAgICAgZ2V0U3Vic2NyaWJlcnM6IGZ1bmN0aW9uICh0b3BpYykge1xuICAgICAgICAgICAgdmFyIHRvcGljU3Vic2NyaWJlcnMgPSB0aGlzLmxpc3RlbmVyTWFwW3RvcGljXSB8fCBbXTtcbiAgICAgICAgICAgIHZhciBnbG9iYWxTdWJzY3JpYmVycyA9IHRoaXMubGlzdGVuZXJNYXBbJyonXSB8fCBbXTtcbiAgICAgICAgICAgIHJldHVybiB0b3BpY1N1YnNjcmliZXJzLmNvbmNhdChnbG9iYWxTdWJzY3JpYmVycyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy9DaGVjayBmb3IgdXBkYXRlc1xuICAgICAgICAvKipcbiAgICAgICAgICogRm9yY2UgYSBjaGVjayBmb3IgdXBkYXRlcyBvbiB0aGUgY2hhbm5lbCwgYW5kIG5vdGlmeSBhbGwgbGlzdGVuZXJzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gIGV4ZWN1dGVkT3BucyBPcGVyYXRpb25zIHdoaWNoIGp1c3QgaGFwcGVuZWQuXG4gICAgICAgICAqIEBwYXJhbSB7QW55fSByZXNwb25zZSAgUmVzcG9uc2UgZnJvbSB0aGUgb3BlcmF0aW9uLlxuICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGZvcmNlICBJZ25vcmUgYWxsIGBzaWxlbnRgIG9wdGlvbnMgYW5kIGZvcmNlIHJlZnJlc2guXG4gICAgICAgICAqL1xuICAgICAgICByZWZyZXNoOiBmdW5jdGlvbiAoZXhlY3V0ZWRPcG5zLCByZXNwb25zZSwgZm9yY2UpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdPcGVyYXRpb25zIHJlZnJlc2gnLCBleGVjdXRlZE9wbnMpO1xuICAgICAgICAgICAgdmFyIHNpbGVudCA9IGNoYW5uZWxPcHRpb25zLnNpbGVudDtcblxuICAgICAgICAgICAgdmFyIHRvTm90aWZ5ID0gZXhlY3V0ZWRPcG5zO1xuICAgICAgICAgICAgaWYgKGZvcmNlID09PSB0cnVlKSB7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNpbGVudCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHRvTm90aWZ5ID0gW107XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNBcnJheShzaWxlbnQpICYmIGV4ZWN1dGVkT3Bucykge1xuICAgICAgICAgICAgICAgIHRvTm90aWZ5ID0gXy5kaWZmZXJlbmNlKGV4ZWN1dGVkT3Bucywgc2lsZW50KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJC5pc1BsYWluT2JqZWN0KHNpbGVudCkgJiYgZXhlY3V0ZWRPcG5zKSB7XG4gICAgICAgICAgICAgICAgdG9Ob3RpZnkgPSBfLmludGVyc2VjdGlvbihzaWxlbnQuZXhjZXB0LCBleGVjdXRlZE9wbnMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfLmVhY2godG9Ob3RpZnksIGZ1bmN0aW9uIChvcG4pIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5vdGlmeShvcG4sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbGVydCBlYWNoIHN1YnNjcmliZXIgYWJvdXQgdGhlIG9wZXJhdGlvbiBhbmQgaXRzIHBhcmFtZXRlcnMuIFRoaXMgY2FuIGJlIHVzZWQgdG8gcHJvdmlkZSBhbiB1cGRhdGUgd2l0aG91dCBhIHJvdW5kIHRyaXAgdG8gdGhlIHNlcnZlci4gSG93ZXZlciwgaXQgaXMgcmFyZWx5IHVzZWQ6IHlvdSBhbG1vc3QgYWx3YXlzIHdhbnQgdG8gYHN1YnNjcmliZSgpYCBpbnN0ZWFkIHNvIHRoYXQgdGhlIG9wZXJhdGlvbiBpcyBhY3R1YWxseSBjYWxsZWQgaW4gdGhlIG1vZGVsLlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC5vcGVyYXRpb25zLm5vdGlmeSgnbXlNZXRob2QnLCBteU1ldGhvZFJlc3BvbnNlKTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG9wZXJhdGlvbiBOYW1lIG9mIG9wZXJhdGlvbi5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfEFycmF5fE9iamVjdH0gdmFsdWUgUGFyYW1ldGVyIHZhbHVlcyBmb3IgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAgICAqL1xuICAgICAgICBub3RpZnk6IGZ1bmN0aW9uIChvcGVyYXRpb24sIHZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nZXRTdWJzY3JpYmVycyhvcGVyYXRpb24pO1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zW29wZXJhdGlvbl0gPSB2YWx1ZTtcblxuICAgICAgICAgICAgXy5lYWNoKGxpc3RlbmVycywgZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9IGxpc3RlbmVyLnRhcmdldDtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNhbGwobnVsbCwgcGFyYW1zLCB2YWx1ZSwgb3BlcmF0aW9uKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRhcmdldC50cmlnZ2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyLnRhcmdldC50cmlnZ2VyKGNvbmZpZy5ldmVudHMucmVhY3QsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGxpc3RlbmVyIGZvcm1hdCBmb3IgJyArIG9wZXJhdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW50ZXJwb2xhdGU6IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICAgIHZhciBpcCA9IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0ZTtcbiAgICAgICAgICAgIHZhciBtYXRjaCA9IGZ1bmN0aW9uIChwKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1hcHBlZCA9IHA7XG4gICAgICAgICAgICAgICAgaWYgKGlwW3BdKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcHBlZCA9IF8uaXNGdW5jdGlvbihpcFtwXSkgPyBpcFtwXShwKSA6IGlwW3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbWFwcGVkO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiAoJC5pc0FycmF5KHBhcmFtcykpID8gXy5tYXAocGFyYW1zLCBtYXRjaCkgOiBtYXRjaChwYXJhbXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDYWxsIHRoZSBvcGVyYXRpb24gd2l0aCBwYXJhbWV0ZXJzLCBhbmQgYWxlcnQgc3Vic2NyaWJlcnMuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMucHVibGlzaCgnbXlNZXRob2QnLCBteU1ldGhvZFBhcmFtKTtcbiAgICAgICAgICogICAgICBGbG93LmNoYW5uZWwub3BlcmF0aW9ucy5wdWJsaXNoKHtcbiAgICAgICAgICogICAgICAgICAgb3BlcmF0aW9uczogW3sgbmFtZTogJ215TWV0aG9kJywgcGFyYW1zOiBbbXlNZXRob2RQYXJhbV0gfV1cbiAgICAgICAgICogICAgICB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtICB7U3RyaW5nfE9iamVjdH0gb3BlcmF0aW9uIEZvciBvbmUgb3BlcmF0aW9uLCBwYXNzIHRoZSBuYW1lIG9mIG9wZXJhdGlvbiAoc3RyaW5nKS4gRm9yIG11bHRpcGxlIG9wZXJhdGlvbnMsIHBhc3MgYW4gb2JqZWN0IHdpdGggZmllbGQgYG9wZXJhdGlvbnNgIGFuZCB2YWx1ZSBhcnJheSBvZiBvYmplY3RzLCBlYWNoIHdpdGggYG5hbWVgIGFuZCBgcGFyYW1zYDogYHtvcGVyYXRpb25zOiBbeyBuYW1lOiBvcG4sIHBhcmFtczpbXSB9XSB9YC5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfEFycmF5fE9iamVjdH0gcGFyYW1zIChPcHRpb25hbCkgIFBhcmFtZXRlcnMgdG8gc2VuZCB0byBvcGVyYXRpb24uIFVzZSBmb3Igb25lIG9wZXJhdGlvbjsgZm9yIG11bHRpcGxlIG9wZXJhdGlvbnMsIHBhcmFtZXRlcnMgYXJlIGFscmVhZHkgaW5jbHVkZWQgaW4gdGhlIG9iamVjdCBmb3JtYXQuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIChPcHRpb25hbCkgT3ZlcnJpZGVzIGZvciB0aGUgZGVmYXVsdCBjaGFubmVsIG9wdGlvbnMuXG4gICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5zaWxlbnQgRGV0ZXJtaW5lIHdoZW4gdG8gdXBkYXRlIHN0YXRlLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJuIHskcHJvbWlzZX0gUHJvbWlzZSB0byBjb21wbGV0ZSB0aGUgY2FsbC5cbiAgICAgICAgICovXG4gICAgICAgIHB1Ymxpc2g6IGZ1bmN0aW9uIChvcGVyYXRpb24sIHBhcmFtcywgb3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3Qob3BlcmF0aW9uKSAmJiBvcGVyYXRpb24ub3BlcmF0aW9ucykge1xuICAgICAgICAgICAgICAgIHZhciBmbiA9IChvcGVyYXRpb24uc2VyaWFsKSA/IHJ1bi5zZXJpYWwgOiBydW4ucGFyYWxsZWw7XG4gICAgICAgICAgICAgICAgXy5lYWNoKG9wZXJhdGlvbi5vcGVyYXRpb25zLCBmdW5jdGlvbiAob3BuKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wbi5wYXJhbXMgPSB0aGlzLmludGVycG9sYXRlKG9wbi5wYXJhbXMpO1xuICAgICAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmbi5jYWxsKHJ1biwgb3BlcmF0aW9uLm9wZXJhdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXBhcmFtcyB8fCAhcGFyYW1zLnNpbGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUsIF8ucGx1Y2sob3BlcmF0aW9uLm9wZXJhdGlvbnMsICduYW1lJyksIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdHMgPSAoJC5pc1BsYWluT2JqZWN0KG9wZXJhdGlvbikpID8gcGFyYW1zIDogb3B0aW9ucztcbiAgICAgICAgICAgICAgICBpZiAoISQuaXNQbGFpbk9iamVjdChvcGVyYXRpb24pICYmIHBhcmFtcykge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMgPSB0aGlzLmludGVycG9sYXRlKHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBydW4uZG8uY2FsbChydW4sIG9wZXJhdGlvbiwgcGFyYW1zKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb3B0cyB8fCAhb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUsIFtvcGVyYXRpb25dLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdvcGVyYXRpb25zIHB1Ymxpc2gnLCBvcGVyYXRpb24sIHBhcmFtcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN1YnNjcmliZSB0byBjaGFuZ2VzIG9uIGEgY2hhbm5lbDogQXNrIGZvciBub3RpZmljYXRpb24gd2hlbiBvcGVyYXRpb25zIGFyZSBjYWxsZWQuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMuc3Vic2NyaWJlKCdteU1ldGhvZCcsXG4gICAgICAgICAqICAgICAgICAgIGZ1bmN0aW9uKCkgeyBjb25zb2xlLmxvZygnY2FsbGVkIScpOyB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IG9wZXJhdGlvbnMgVGhlIG5hbWVzIG9mIHRoZSBvcGVyYXRpb25zLiBVc2UgYCpgIHRvIGxpc3RlbiBmb3Igbm90aWZpY2F0aW9ucyBvbiBhbGwgb3BlcmF0aW9ucy5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R8RnVuY3Rpb259IHN1YnNjcmliZXIgVGhlIG9iamVjdCBvciBmdW5jdGlvbiBiZWluZyBub3RpZmllZC4gT2Z0ZW4gdGhpcyBpcyBhIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IEFuIGlkZW50aWZ5aW5nIHRva2VuIGZvciB0aGlzIHN1YnNjcmlwdGlvbi4gUmVxdWlyZWQgYXMgYSBwYXJhbWV0ZXIgd2hlbiB1bnN1YnNjcmliaW5nLlxuICAgICAgICAqL1xuICAgICAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uIChvcGVyYXRpb25zLCBzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnb3BlcmF0aW9ucyBzdWJzY3JpYmUnLCBvcGVyYXRpb25zLCBzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIG9wZXJhdGlvbnMgPSBbXS5jb25jYXQob3BlcmF0aW9ucyk7XG4gICAgICAgICAgICAvL3VzZSBqcXVlcnkgdG8gbWFrZSBldmVudCBzaW5rXG4gICAgICAgICAgICBpZiAoIXN1YnNjcmliZXIub24gJiYgIV8uaXNGdW5jdGlvbihzdWJzY3JpYmVyKSkge1xuICAgICAgICAgICAgICAgIHN1YnNjcmliZXIgPSAkKHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaWQgID0gXy51bmlxdWVJZCgnZXBpY2hhbm5lbC5vcGVyYXRpb24nKTtcbiAgICAgICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHN1YnNjcmliZXJcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG5cbiAgICAgICAgICAgICQuZWFjaChvcGVyYXRpb25zLCBmdW5jdGlvbiAoaW5kZXgsIG9wbikge1xuICAgICAgICAgICAgICAgIGlmICghbWUubGlzdGVuZXJNYXBbb3BuXSkge1xuICAgICAgICAgICAgICAgICAgICBtZS5saXN0ZW5lck1hcFtvcG5dID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1lLmxpc3RlbmVyTWFwW29wbl0gPSBtZS5saXN0ZW5lck1hcFtvcG5dLmNvbmNhdChkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN0b3AgcmVjZWl2aW5nIG5vdGlmaWNhdGlvbiB3aGVuIGFuIG9wZXJhdGlvbiBpcyBjYWxsZWQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBvcGVyYXRpb24gVGhlIG5hbWVzIG9mIHRoZSBvcGVyYXRpb25zLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gdG9rZW4gVGhlIGlkZW50aWZ5aW5nIHRva2VuIGZvciB0aGlzIHN1YnNjcmlwdGlvbi4gKENyZWF0ZWQgYW5kIHJldHVybmVkIGJ5IHRoZSBgc3Vic2NyaWJlKClgIGNhbGwuKVxuICAgICAgICAqL1xuICAgICAgICB1bnN1YnNjcmliZTogZnVuY3Rpb24gKG9wZXJhdGlvbiwgdG9rZW4pIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXJNYXBbb3BlcmF0aW9uXSA9IF8ucmVqZWN0KHRoaXMubGlzdGVuZXJNYXBbb3BlcmF0aW9uXSwgZnVuY3Rpb24gKHN1YnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3Vicy5pZCA9PT0gdG9rZW47XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3RvcCByZWNlaXZpbmcgbm90aWZpY2F0aW9ucyBmb3IgYWxsIG9wZXJhdGlvbnMuIE5vIHBhcmFtZXRlcnMuXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm4ge05vbmV9XG4gICAgICAgICovXG4gICAgICAgIHVuc3Vic2NyaWJlQWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlbmVyTWFwID0ge307XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiAkLmV4dGVuZCh0aGlzLCBwdWJsaWNBUEkpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFZhcnNDaGFubmVsID0gcmVxdWlyZSgnLi92YXJpYWJsZXMtY2hhbm5lbCcpO1xudmFyIE9wZXJhdGlvbnNDaGFubmVsID0gcmVxdWlyZSgnLi9vcGVyYXRpb25zLWNoYW5uZWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgcnVuOiB7XG4gICAgICAgICAgICB2YXJpYWJsZXM6IHtcblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9wZXJhdGlvbnM6IHtcblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgY29uZmlnID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgIHZhciBybSA9IG5ldyBGLm1hbmFnZXIuUnVuTWFuYWdlcihjb25maWcpO1xuICAgIHZhciBycyA9IHJtLnJ1bjtcblxuICAgIHZhciAkY3JlYXRpb25Qcm9taXNlID0gcm0uZ2V0UnVuKCk7XG4gICAgcnMuY3VycmVudFByb21pc2UgPSAkY3JlYXRpb25Qcm9taXNlO1xuXG4gICAgLy8gJGNyZWF0aW9uUHJvbWlzZVxuICAgIC8vICAgICAudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZygnZG9uZScpO1xuICAgIC8vICAgICB9KVxuICAgIC8vICAgICAuZmFpbChmdW5jdGlvbiAoKSB7XG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZygnZmFpbHQnKTtcbiAgICAvLyAgICAgfSk7XG5cbiAgICB2YXIgY3JlYXRlQW5kVGhlbiA9IGZ1bmN0aW9uIChmbiwgY29udGV4dCkge1xuICAgICAgICByZXR1cm4gXy53cmFwKGZuLCBmdW5jdGlvbiAoZnVuYykge1xuICAgICAgICAgICAgdmFyIHBhc3NlZEluUGFyYW1zID0gXy50b0FycmF5KGFyZ3VtZW50cykuc2xpY2UoMSk7XG4gICAgICAgICAgICByZXR1cm4gcnMuY3VycmVudFByb21pc2UudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcnMuY3VycmVudFByb21pc2UgPSBmdW5jLmFwcGx5KGNvbnRleHQsIHBhc3NlZEluUGFyYW1zKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcnMuY3VycmVudFByb21pc2U7XG4gICAgICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1RoaXMgZmFpbGVkLCBidXQgd2VcXCdyZSBtb3ZpbmcgYWhlYWQgd2l0aCB0aGUgbmV4dCBvbmUgYW55d2F5JywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICBycy5jdXJyZW50UHJvbWlzZSA9IGZ1bmMuYXBwbHkoY29udGV4dCwgcGFzc2VkSW5QYXJhbXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBycy5jdXJyZW50UHJvbWlzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy9NYWtlIHN1cmUgbm90aGluZyBoYXBwZW5zIGJlZm9yZSB0aGUgcnVuIGlzIGNyZWF0ZWRcbiAgICB2YXIgbm9uV3JhcHBlZCA9IFsndmFyaWFibGVzJywgJ2NyZWF0ZScsICdsb2FkJywgJ2dldEN1cnJlbnRDb25maWcnXTtcbiAgICBfLmVhY2gocnMsIGZ1bmN0aW9uICh2YWx1ZSwgbmFtZSkge1xuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSAmJiAhXy5jb250YWlucyhub25XcmFwcGVkLCBuYW1lKSkge1xuICAgICAgICAgICAgcnNbbmFtZV0gPSBjcmVhdGVBbmRUaGVuKHZhbHVlLCBycyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBvcmlnaW5hbFZhcmlhYmxlc0ZuID0gcnMudmFyaWFibGVzO1xuICAgIHJzLnZhcmlhYmxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZzID0gb3JpZ2luYWxWYXJpYWJsZXNGbi5hcHBseShycywgYXJndW1lbnRzKTtcbiAgICAgICAgXy5lYWNoKHZzLCBmdW5jdGlvbiAodmFsdWUsIG5hbWUpIHtcbiAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdnNbbmFtZV0gPSBjcmVhdGVBbmRUaGVuKHZhbHVlLCB2cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdnM7XG4gICAgfTtcblxuICAgIHRoaXMucnVuID0gcnM7XG4gICAgdmFyIHZhck9wdGlvbnMgPSBjb25maWcucnVuLnZhcmlhYmxlcztcbiAgICB0aGlzLnZhcmlhYmxlcyA9IG5ldyBWYXJzQ2hhbm5lbCgkLmV4dGVuZCh0cnVlLCB7fSwgdmFyT3B0aW9ucywgeyBydW46IHJzIH0pKTtcbiAgICB0aGlzLm9wZXJhdGlvbnMgPSBuZXcgT3BlcmF0aW9uc0NoYW5uZWwoJC5leHRlbmQodHJ1ZSwge30sIGNvbmZpZy5ydW4ub3BlcmF0aW9ucywgeyBydW46IHJzIH0pKTtcblxuICAgIHZhciBtZSA9IHRoaXM7XG4gICAgdmFyIGRlYm91bmNlZFJlZnJlc2ggPSBfLmRlYm91bmNlKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIG1lLnZhcmlhYmxlcy5yZWZyZXNoLmNhbGwobWUudmFyaWFibGVzLCBudWxsLCB0cnVlKTtcbiAgICAgICAgaWYgKG1lLnZhcmlhYmxlcy5vcHRpb25zLmF1dG9GZXRjaC5lbmFibGUpIHtcbiAgICAgICAgICAgIG1lLnZhcmlhYmxlcy5zdGFydEF1dG9GZXRjaCgpO1xuICAgICAgICB9XG4gICAgfSwgMjAwLCB7IGxlYWRpbmc6IHRydWUgfSk7XG5cbiAgICB0aGlzLm9wZXJhdGlvbnMuc3Vic2NyaWJlKCcqJywgZGVib3VuY2VkUmVmcmVzaCk7XG59O1xuIiwiLyoqXG4gKiAjIyBWYXJpYWJsZXMgQ2hhbm5lbFxuICpcbiAqIENoYW5uZWxzIGFyZSB3YXlzIGZvciBGbG93LmpzIHRvIHRhbGsgdG8gZXh0ZXJuYWwgQVBJcyAtLSBwcmltYXJpbHkgdGhlIFt1bmRlcmx5aW5nIEVwaWNlbnRlciBBUElzXSguLi8uLi8uLi8uLi9jcmVhdGluZ195b3VyX2ludGVyZmFjZS8pLlxuICpcbiAqIFRoZSBwcmltYXJ5IHVzZSBjYXNlcyBmb3IgdGhlIFZhcmlhYmxlcyBDaGFubmVsIGFyZTpcbiAqXG4gKiAqIGBwdWJsaXNoYDogVXBkYXRlIGEgbW9kZWwgdmFyaWFibGUuXG4gKiAqIGBzdWJzY3JpYmVgOiBSZWNlaXZlIG5vdGlmaWNhdGlvbnMgd2hlbiBhIG1vZGVsIHZhcmlhYmxlIGlzIHVwZGF0ZWQuXG4gKlxuICogRm9yIGV4YW1wbGUsIHVzZSBgcHVibGlzaCgpYCB0byB1cGRhdGUgYSBtb2RlbCB2YXJpYWJsZTpcbiAqXG4gKiAgICAgIEZsb3cuY2hhbm5lbC5vcGVyYXRpb25zLnB1Ymxpc2goJ215VmFyaWFibGUnLCBuZXdWYWx1ZSk7XG4gKlxuICogRm9yIHJlZmVyZW5jZSwgYW4gZXF1aXZhbGVudCBjYWxsIHVzaW5nIEZsb3cuanMgY3VzdG9tIEhUTUwgYXR0cmlidXRlcyBpczpcbiAqXG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwibXlWYXJpYWJsZVwiIHZhbHVlPVwibmV3VmFsdWVcIj48L2lucHV0PlxuICpcbiAqIHdoZXJlIHRoZSBuZXcgdmFsdWUgaXMgaW5wdXQgYnkgdGhlIHVzZXIuXG4gKlxuICogWW91IGNhbiBhbHNvIHVzZSBgc3Vic2NyaWJlKClgIGFuZCBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGxpc3RlbiBhbmQgcmVhY3Qgd2hlbiB0aGUgbW9kZWwgdmFyaWFibGUgaGFzIGJlZW4gdXBkYXRlZDpcbiAqXG4gKiAgICAgIEZsb3cuY2hhbm5lbC5vcGVyYXRpb25zLnN1YnNjcmliZSgnbXlWYXJpYWJsZScsXG4gKiAgICAgICAgICBmdW5jdGlvbigpIHsgY29uc29sZS5sb2coJ2NhbGxlZCEnKTsgfSApO1xuICpcbiAqIFRvIHVzZSB0aGUgVmFyaWFibGVzIENoYW5uZWwsIHNpbXBseSBbaW5pdGlhbGl6ZSBGbG93LmpzIGluIHlvdXIgcHJvamVjdF0oLi4vLi4vLi4vI2N1c3RvbS1pbml0aWFsaXplKS5cbiAqXG4qL1xuXG4ndXNlIHN0cmljdCc7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZXRlcm1pbmUgd2hlbiB0byB1cGRhdGUgc3RhdGUuIERlZmF1bHRzIHRvIGBmYWxzZWA6IGFsd2F5cyB0cmlnZ2VyIHVwZGF0ZXMuXG4gICAgICAgICAqXG4gICAgICAgICAqIFBvc3NpYmxlIG9wdGlvbnMgYXJlOlxuICAgICAgICAgKlxuICAgICAgICAgKiAqIGB0cnVlYDogTmV2ZXIgdHJpZ2dlciBhbnkgdXBkYXRlcy4gVXNlIHRoaXMgaWYgeW91IGtub3cgeW91ciBtb2RlbCBzdGF0ZSB3b24ndCBjaGFuZ2UgYmFzZWQgb24gb3RoZXIgdmFyaWFibGVzLlxuICAgICAgICAgKiAqIGBmYWxzZWA6IEFsd2F5cyB0cmlnZ2VyIHVwZGF0ZXMuXG4gICAgICAgICAqICogYFthcnJheSBvZiB2YXJpYWJsZSBuYW1lc11gOiBWYXJpYWJsZXMgaW4gdGhpcyBhcnJheSAqd2lsbCBub3QqIHRyaWdnZXIgdXBkYXRlczsgZXZlcnl0aGluZyBlbHNlIHdpbGwuXG4gICAgICAgICAqICogYHsgZXhjZXB0OiBbYXJyYXkgb2YgdmFyaWFibGUgbmFtZXNdIH1gOiBWYXJpYWJsZXMgaW4gdGhpcyBhcnJheSAqd2lsbCogdHJpZ2dlciB1cGRhdGVzOyBub3RoaW5nIGVsc2Ugd2lsbC5cbiAgICAgICAgICpcbiAgICAgICAgICogVG8gc2V0LCBwYXNzIHRoaXMgaW50byB0aGUgYEZsb3cuaW5pdGlhbGl6ZSgpYCBjYWxsIGluIHRoZSBgY2hhbm5lbC5ydW4udmFyaWFibGVzYCBmaWVsZDpcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICBGbG93LmluaXRpYWxpemUoe1xuICAgICAgICAgKiAgICAgICAgICBjaGFubmVsOiB7XG4gICAgICAgICAqICAgICAgICAgICAgICBydW46IHtcbiAgICAgICAgICogICAgICAgICAgICAgICAgICBtb2RlbDogJ215TW9kZWwucHknLFxuICAgICAgICAgKiAgICAgICAgICAgICAgICAgIGFjY291bnQ6ICdhY21lLXNpbXVsYXRpb25zJyxcbiAgICAgICAgICogICAgICAgICAgICAgICAgICBwcm9qZWN0OiAnc3VwcGx5LWNoYWluLWdhbWUnLFxuICAgICAgICAgKiAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczogeyBzaWxlbnQ6IHRydWUgfVxuICAgICAgICAgKiAgICAgICAgICAgICAgfVxuICAgICAgICAgKiAgICAgICAgICB9XG4gICAgICAgICAqICAgICAgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIFRvIG92ZXJyaWRlIGZvciBhIHNwZWNpZmljIGNhbGwgdG8gdGhlIFZhcmlhYmxlcyBDaGFubmVsLCBwYXNzIHRoaXMgYXMgdGhlIGZpbmFsIGBvcHRpb25zYCBwYXJhbWV0ZXI6XG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgIEZsb3cuY2hhbm5lbC52YXJpYWJsZXMucHVibGlzaCgnbXlWYXJpYWJsZScsIG5ld1ZhbHVlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge1N0cmluZ3xBcnJheXxPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBzaWxlbnQ6IGZhbHNlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbGxvd3MgeW91IHRvIGF1dG9tYXRpY2FsbHkgZmV0Y2ggdmFyaWFibGVzIGZyb20gdGhlIEFQSSBhcyB0aGV5J3JlIGJlaW5nIHN1YnNjcmliZWQuIElmIHRoaXMgaXMgc2V0IHRvIGBlbmFibGU6IGZhbHNlYCB5b3UnbGwgbmVlZCB0byBleHBsaWNpdGx5IGNhbGwgYHJlZnJlc2goKWAgdG8gZ2V0IGRhdGEgYW5kIG5vdGlmeSB5b3VyIGxpc3RlbmVycy5cbiAgICAgICAgICpcbiAgICAgICAgICogVGhlIHByb3BlcnRpZXMgb2YgdGhpcyBvYmplY3QgaW5jbHVkZTpcbiAgICAgICAgICpcbiAgICAgICAgICogKiBgYXV0b0ZldGNoLmVuYWJsZWAgKkJvb2xlYW4qIEVuYWJsZSBhdXRvLWZldGNoIGJlaGF2aW9yLiBJZiBzZXQgdG8gYGZhbHNlYCBkdXJpbmcgaW5zdGFudGlhdGlvbiB0aGVyZSdzIG5vIHdheSB0byBlbmFibGUgdGhpcyBhZ2Fpbi4gRGVmYXVsdHMgdG8gYHRydWVgLlxuICAgICAgICAgKiAqIGBhdXRvRmV0Y2guc3RhcnRgICpCb29sZWFuKiBJZiBhdXRvLWZldGNoIGlzIGVuYWJsZWQsIGNvbnRyb2wgd2hlbiB0byBzdGFydCBmZXRjaGluZy4gVHlwaWNhbGx5IHlvdSdkIHdhbnQgdG8gc3RhcnQgcmlnaHQgYXdheSwgYnV0IGlmIHlvdSB3YW50IHRvIHdhaXQgdGlsbCBzb21ldGhpbmcgZWxzZSBoYXBwZW5zIChsaWtlIGFuIG9wZXJhdGlvbiBvciB1c2VyIGFjdGlvbikgc2V0IHRvIGBmYWxzZWAgYW5kIGNvbnRyb2wgdXNpbmcgdGhlIGBzdGFydEF1dG9GZXRjaCgpYCBmdW5jdGlvbi4gRGVmYXVsdHMgdG8gYHRydWVgLlxuICAgICAgICAgKiAqIGBhdXRvRmV0Y2guZGVib3VuY2VgICpOdW1iZXIqIE1pbGxpc2Vjb25kcyB0byB3YWl0IGJldHdlZW4gY2FsbHMgdG8gYHN1YnNjcmliZSgpYCBiZWZvcmUgY2FsbGluZyBgZmV0Y2goKWAuIFNlZSBbaHR0cDovL2RydXBhbG1vdGlvbi5jb20vYXJ0aWNsZS9kZWJvdW5jZS1hbmQtdGhyb3R0bGUtdmlzdWFsLWV4cGxhbmF0aW9uXShodHRwOi8vZHJ1cGFsbW90aW9uLmNvbS9hcnRpY2xlL2RlYm91bmNlLWFuZC10aHJvdHRsZS12aXN1YWwtZXhwbGFuYXRpb24pIGZvciBhbiBleHBsYW5hdGlvbiBvZiBob3cgZGVib3VuY2luZyB3b3Jrcy4gRGVmYXVsdHMgdG8gYDIwMGAuXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBhdXRvRmV0Y2g6IHtcblxuICAgICAgICAgICAgIC8vIEVuYWJsZSBhdXRvLWZldGNoIGJlaGF2aW9yLiBJZiBzZXQgdG8gYGZhbHNlYCBkdXJpbmcgaW5zdGFudGlhdGlvbiB0aGVyZSdzIG5vIHdheSB0byBlbmFibGUgdGhpcyBhZ2FpblxuICAgICAgICAgICAgIC8vIEB0eXBlIHtCb29sZWFufVxuICAgICAgICAgICAgZW5hYmxlOiB0cnVlLFxuXG4gICAgICAgICAgICAgLy8gSWYgYXV0by1mZXRjaCBpcyBlbmFibGVkLCBjb250cm9sIHdoZW4gdG8gc3RhcnQgZmV0Y2hpbmcuIFR5cGljYWxseSB5b3UnZCB3YW50IHRvIHN0YXJ0IHJpZ2h0IGF3YXksIGJ1dCBpZiB5b3Ugd2FudCB0byB3YWl0IHRpbGwgc29tZXRoaW5nIGVsc2UgaGFwcGVucyAobGlrZSBhbiBvcGVyYXRpb24gb3IgdXNlciBhY3Rpb24pIHNldCB0byBgZmFsc2VgIGFuZCBjb250cm9sIHVzaW5nIHRoZSBgc3RhcnRBdXRvRmV0Y2goKWAgZnVuY3Rpb24uXG4gICAgICAgICAgICAgLy8gQHR5cGUge0Jvb2xlYW59XG4gICAgICAgICAgICBzdGFydDogdHJ1ZSxcblxuICAgICAgICAgICAgIC8vIENvbnRyb2wgdGltZSB0byB3YWl0IGJldHdlZW4gY2FsbHMgdG8gYHN1YnNjcmliZSgpYCBiZWZvcmUgY2FsbGluZyBgZmV0Y2goKWAuIFNlZSBbaHR0cDovL2RydXBhbG1vdGlvbi5jb20vYXJ0aWNsZS9kZWJvdW5jZS1hbmQtdGhyb3R0bGUtdmlzdWFsLWV4cGxhbmF0aW9uXShodHRwOi8vZHJ1cGFsbW90aW9uLmNvbS9hcnRpY2xlL2RlYm91bmNlLWFuZC10aHJvdHRsZS12aXN1YWwtZXhwbGFuYXRpb24pIGZvciBhbiBleHBsYW5hdGlvbiBvZiBob3cgZGVib3VuY2luZyB3b3Jrcy5cbiAgICAgICAgICAgICAvLyBAdHlwZSB7TnVtYmVyfSBNaWxsaXNlY29uZHMgdG8gd2FpdFxuICAgICAgICAgICAgZGVib3VuY2U6IDIwMFxuICAgICAgICB9LFxuXG4gICAgICAgIGludGVycG9sYXRlOiB7fVxuICAgIH07XG5cbiAgICB2YXIgY2hhbm5lbE9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuICAgIHRoaXMub3B0aW9ucyA9IGNoYW5uZWxPcHRpb25zO1xuXG4gICAgdmFyIHZzID0gY2hhbm5lbE9wdGlvbnMucnVuLnZhcmlhYmxlcygpO1xuXG4gICAgdmFyIGN1cnJlbnREYXRhID0ge307XG5cbiAgICAvL1RPRE86IGFjdHVhbGx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgc28gb25cbiAgICB2YXIgaXNFcXVhbCA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgdmFyIGdldElubmVyVmFyaWFibGVzID0gZnVuY3Rpb24gKHN0cikge1xuICAgICAgICB2YXIgaW5uZXIgPSBzdHIubWF0Y2goLzwoLio/KT4vZyk7XG4gICAgICAgIGlubmVyID0gXy5tYXAoaW5uZXIsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWwuc3Vic3RyaW5nKDEsIHZhbC5sZW5ndGggLSAxKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBpbm5lcjtcbiAgICB9O1xuXG4gICAgLy9SZXBsYWNlcyBzdHViYmVkIG91dCBrZXluYW1lcyBpbiB2YXJpYWJsZXN0b2ludGVycG9sYXRlIHdpdGggdGhlaXIgY29ycmVzcG9uZGluZyB2YWx1ZXNcbiAgICB2YXIgaW50ZXJwb2xhdGUgPSBmdW5jdGlvbiAodmFyaWFibGVzVG9JbnRlcnBvbGF0ZSwgdmFsdWVzKSB7XG4gICAgICAgIC8ve3ByaWNlWzFdOiBwcmljZVs8dGltZT5dfVxuICAgICAgICB2YXIgaW50ZXJwb2xhdGlvbk1hcCA9IHt9O1xuICAgICAgICAvL3twcmljZVsxXTogMX1cbiAgICAgICAgdmFyIGludGVycG9sYXRlZCA9IHt9O1xuXG4gICAgICAgIF8uZWFjaCh2YXJpYWJsZXNUb0ludGVycG9sYXRlLCBmdW5jdGlvbiAob3V0ZXJWYXJpYWJsZSkge1xuICAgICAgICAgICAgdmFyIGlubmVyID0gZ2V0SW5uZXJWYXJpYWJsZXMob3V0ZXJWYXJpYWJsZSk7XG4gICAgICAgICAgICB2YXIgb3JpZ2luYWxPdXRlciA9IG91dGVyVmFyaWFibGU7XG4gICAgICAgICAgICBpZiAoaW5uZXIgJiYgaW5uZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJC5lYWNoKGlubmVyLCBmdW5jdGlvbiAoaW5kZXgsIGlubmVyVmFyaWFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRoaXN2YWwgPSB2YWx1ZXNbaW5uZXJWYXJpYWJsZV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzdmFsICE9PSBudWxsICYmIHRoaXN2YWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh0aGlzdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vRm9yIGFycmF5ZWQgdGhpbmdzIGdldCB0aGUgbGFzdCBvbmUgZm9yIGludGVycG9sYXRpb24gcHVycG9zZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzdmFsID0gdGhpc3ZhbFt0aGlzdmFsLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBSZWdleCB0byBtYXRjaCBzcGFjZXMgYW5kIHNvIG9uXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRlclZhcmlhYmxlID0gb3V0ZXJWYXJpYWJsZS5yZXBsYWNlKCc8JyArIGlubmVyVmFyaWFibGUgKyAnPicsIHRoaXN2YWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaW50ZXJwb2xhdGlvbk1hcFtvdXRlclZhcmlhYmxlXSA9IChpbnRlcnBvbGF0aW9uTWFwW291dGVyVmFyaWFibGVdKSA/IFtvcmlnaW5hbE91dGVyXS5jb25jYXQoaW50ZXJwb2xhdGlvbk1hcFtvdXRlclZhcmlhYmxlXSkgOiBvcmlnaW5hbE91dGVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW50ZXJwb2xhdGVkW29yaWdpbmFsT3V0ZXJdID0gb3V0ZXJWYXJpYWJsZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIG9wID0ge1xuICAgICAgICAgICAgaW50ZXJwb2xhdGVkOiBpbnRlcnBvbGF0ZWQsXG4gICAgICAgICAgICBpbnRlcnBvbGF0aW9uTWFwOiBpbnRlcnBvbGF0aW9uTWFwXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBvcDtcbiAgICB9O1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcbiAgICAgICAgLy9mb3IgdGVzdGluZ1xuICAgICAgICBwcml2YXRlOiB7XG4gICAgICAgICAgICBnZXRJbm5lclZhcmlhYmxlczogZ2V0SW5uZXJWYXJpYWJsZXMsXG4gICAgICAgICAgICBpbnRlcnBvbGF0ZTogaW50ZXJwb2xhdGUsXG4gICAgICAgICAgICBjdXJyZW50RGF0YTogY3VycmVudERhdGEsXG4gICAgICAgICAgICBvcHRpb25zOiBjaGFubmVsT3B0aW9uc1xuICAgICAgICB9LFxuXG4gICAgICAgIHN1YnNjcmlwdGlvbnM6IFtdLFxuXG4gICAgICAgIHVuZmV0Y2hlZDogW10sXG5cbiAgICAgICAgZ2V0U3Vic2NyaWJlcnM6IGZ1bmN0aW9uICh0b3BpYykge1xuICAgICAgICAgICAgaWYgKHRvcGljKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF8uZmlsdGVyKHRoaXMuc3Vic2NyaXB0aW9ucywgZnVuY3Rpb24gKHN1YnMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF8uY29udGFpbnMoc3Vicy50b3BpY3MsIHRvcGljKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3Vic2NyaXB0aW9ucztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0QWxsVG9waWNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gXyh0aGlzLnN1YnNjcmlwdGlvbnMpLnBsdWNrKCd0b3BpY3MnKS5mbGF0dGVuKCkudW5pcSgpLnZhbHVlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFRvcGljRGVwZW5kZW5jaWVzOiBmdW5jdGlvbiAobGlzdCkge1xuICAgICAgICAgICAgaWYgKCFsaXN0KSB7XG4gICAgICAgICAgICAgICAgbGlzdCA9IHRoaXMuZ2V0QWxsVG9waWNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaW5uZXJMaXN0ID0gW107XG4gICAgICAgICAgICBfLmVhY2gobGlzdCwgZnVuY3Rpb24gKHZuYW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlubmVyID0gZ2V0SW5uZXJWYXJpYWJsZXModm5hbWUpO1xuICAgICAgICAgICAgICAgIGlmIChpbm5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5uZXJMaXN0ID0gXy51bmlxKGlubmVyTGlzdC5jb25jYXQoaW5uZXIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBpbm5lckxpc3Q7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlQW5kQ2hlY2tGb3JSZWZyZXNoOiBmdW5jdGlvbiAodG9waWNzLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAodG9waWNzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51bmZldGNoZWQgPSBfLnVuaXEodGhpcy51bmZldGNoZWQuY29uY2F0KHRvcGljcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFjaGFubmVsT3B0aW9ucy5hdXRvRmV0Y2guZW5hYmxlIHx8ICFjaGFubmVsT3B0aW9ucy5hdXRvRmV0Y2guc3RhcnQgfHwgIXRoaXMudW5mZXRjaGVkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpcy5kZWJvdW5jZWRGZXRjaCkge1xuICAgICAgICAgICAgICAgIHZhciBkZWJvdW5jZU9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7fSwge1xuICAgICAgICAgICAgICAgICAgICBtYXhXYWl0OiBjaGFubmVsT3B0aW9ucy5hdXRvRmV0Y2guZGVib3VuY2UgKiA0LFxuICAgICAgICAgICAgICAgICAgICBsZWFkaW5nOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sIG9wdGlvbnMpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5kZWJvdW5jZWRGZXRjaCA9IF8uZGVib3VuY2UoZnVuY3Rpb24gKHRvcGljcykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZldGNoKHRoaXMudW5mZXRjaGVkKS50aGVuKGZ1bmN0aW9uIChjaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkLmV4dGVuZChjdXJyZW50RGF0YSwgY2hhbmdlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVuZmV0Y2hlZCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3RpZnkoY2hhbmdlZCk7XG4gICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgfSwgY2hhbm5lbE9wdGlvbnMuYXV0b0ZldGNoLmRlYm91bmNlLCBkZWJvdW5jZU9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmRlYm91bmNlZEZldGNoKHRvcGljcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcG9wdWxhdGVJbm5lclZhcmlhYmxlczogZnVuY3Rpb24gKHZhcnMpIHtcbiAgICAgICAgICAgIHZhciB1bm1hcHBlZFZhcmlhYmxlcyA9IFtdO1xuICAgICAgICAgICAgdmFyIHZhbHVlTGlzdCA9IHt9O1xuICAgICAgICAgICAgXy5lYWNoKHZhcnMsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0ZVt2XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWwgPSBfLmlzRnVuY3Rpb24odGhpcy5vcHRpb25zLmludGVycG9sYXRlW3ZdKSA/IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0ZVt2XSh2KSA6IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0ZVt2XTtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVMaXN0W3ZdID0gdmFsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHVubWFwcGVkVmFyaWFibGVzLnB1c2godik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgICAgICBpZiAodW5tYXBwZWRWYXJpYWJsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZzLnF1ZXJ5KHVubWFwcGVkVmFyaWFibGVzKS50aGVuKGZ1bmN0aW9uICh2YXJpYWJsZVZhbHVlTGlzdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJC5leHRlbmQodmFsdWVMaXN0LCB2YXJpYWJsZVZhbHVlTGlzdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAkLkRlZmVycmVkKCkucmVzb2x2ZSh2YWx1ZUxpc3QpLnByb21pc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBmZXRjaDogZnVuY3Rpb24gKHZhcmlhYmxlc0xpc3QpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdmZXRjaCBjYWxsZWQnLCB2YXJpYWJsZXNMaXN0KTtcbiAgICAgICAgICAgIHZhcmlhYmxlc0xpc3QgPSBbXS5jb25jYXQodmFyaWFibGVzTGlzdCk7XG4gICAgICAgICAgICBpZiAoIXZhcmlhYmxlc0xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICQuRGVmZXJyZWQoKS5yZXNvbHZlKCkucHJvbWlzZSh7fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaW5uZXJWYXJpYWJsZXMgPSB0aGlzLmdldFRvcGljRGVwZW5kZW5jaWVzKHZhcmlhYmxlc0xpc3QpO1xuICAgICAgICAgICAgdmFyIGdldFZhcmlhYmxlcyA9IGZ1bmN0aW9uICh2YXJzLCBpbnRlcnBvbGF0aW9uTWFwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZzLnF1ZXJ5KHZhcnMpLnRoZW4oZnVuY3Rpb24gKHZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnR290IHZhcmlhYmxlcycsIHZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjaGFuZ2VTZXQgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKHZhcmlhYmxlcywgZnVuY3Rpb24gKHZhbHVlLCB2bmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9sZFZhbHVlID0gY3VycmVudERhdGFbdm5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0VxdWFsKHZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VTZXRbdm5hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGludGVycG9sYXRpb25NYXAgJiYgaW50ZXJwb2xhdGlvbk1hcFt2bmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1hcCA9IFtdLmNvbmNhdChpbnRlcnBvbGF0aW9uTWFwW3ZuYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uZWFjaChtYXAsIGZ1bmN0aW9uIChpbnRlcnBvbGF0ZWROYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VTZXRbaW50ZXJwb2xhdGVkTmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoYW5nZVNldDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoaW5uZXJWYXJpYWJsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucG9wdWxhdGVJbm5lclZhcmlhYmxlcyhpbm5lclZhcmlhYmxlcykudGhlbihmdW5jdGlvbiAoaW5uZXJWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnaW5uZXInLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgICQuZXh0ZW5kKGN1cnJlbnREYXRhLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpcCA9ICBpbnRlcnBvbGF0ZSh2YXJpYWJsZXNMaXN0LCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRWYXJpYWJsZXMoXy52YWx1ZXMoaXAuaW50ZXJwb2xhdGVkKSwgaXAuaW50ZXJwb2xhdGlvbk1hcCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBnZXRWYXJpYWJsZXModmFyaWFibGVzTGlzdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3RhcnRBdXRvRmV0Y2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNoYW5uZWxPcHRpb25zLmF1dG9GZXRjaC5zdGFydCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUFuZENoZWNrRm9yUmVmcmVzaCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN0b3BBdXRvRmV0Y2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNoYW5uZWxPcHRpb25zLmF1dG9GZXRjaC5zdGFydCA9IGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGb3JjZSBhIGNoZWNrIGZvciB1cGRhdGVzIG9uIHRoZSBjaGFubmVsLCBhbmQgbm90aWZ5IGFsbCBsaXN0ZW5lcnMuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBjaGFuZ2VMaXN0IEtleS12YWx1ZSBwYWlycyBvZiBjaGFuZ2VkIHZhcmlhYmxlcy5cbiAgICAgICAgICogQHBhcmFtIHtCb29sZWFufSBmb3JjZSAgSWdub3JlIGFsbCBgc2lsZW50YCBvcHRpb25zIGFuZCBmb3JjZSByZWZyZXNoLlxuICAgICAgICAgKi9cbiAgICAgICAgcmVmcmVzaDogZnVuY3Rpb24gKGNoYW5nZUxpc3QsIGZvcmNlKSB7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIHNpbGVudCA9IGNoYW5uZWxPcHRpb25zLnNpbGVudDtcbiAgICAgICAgICAgIHZhciBjaGFuZ2VkVmFyaWFibGVzID0gXy5pc0FycmF5KGNoYW5nZUxpc3QpID8gIGNoYW5nZUxpc3QgOiBfLmtleXMoY2hhbmdlTGlzdCk7XG5cbiAgICAgICAgICAgIHZhciBzaG91bGRTaWxlbmNlID0gc2lsZW50ID09PSB0cnVlO1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheShzaWxlbnQpICYmIGNoYW5nZWRWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBzaG91bGRTaWxlbmNlID0gXy5pbnRlcnNlY3Rpb24oc2lsZW50LCBjaGFuZ2VkVmFyaWFibGVzKS5sZW5ndGggPj0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3Qoc2lsZW50KSAmJiBjaGFuZ2VkVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgc2hvdWxkU2lsZW5jZSA9IF8uaW50ZXJzZWN0aW9uKHNpbGVudC5leGNlcHQsIGNoYW5nZWRWYXJpYWJsZXMpLmxlbmd0aCAhPT0gY2hhbmdlZFZhcmlhYmxlcy5sZW5ndGg7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzaG91bGRTaWxlbmNlICYmIGZvcmNlICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICQuRGVmZXJyZWQoKS5yZXNvbHZlKCkucHJvbWlzZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgdmFyaWFibGVzID0gdGhpcy5nZXRBbGxUb3BpY3MoKTtcbiAgICAgICAgICAgIG1lLnVuZmV0Y2hlZCA9IFtdO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mZXRjaCh2YXJpYWJsZXMpLnRoZW4oZnVuY3Rpb24gKGNoYW5nZVNldCkge1xuICAgICAgICAgICAgICAgICQuZXh0ZW5kKGN1cnJlbnREYXRhLCBjaGFuZ2VTZXQpO1xuICAgICAgICAgICAgICAgIG1lLm5vdGlmeShjaGFuZ2VTZXQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFsZXJ0IGVhY2ggc3Vic2NyaWJlciBhYm91dCB0aGUgdmFyaWFibGUgYW5kIGl0cyBuZXcgdmFsdWUuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMubm90aWZ5KCdteVZhcmlhYmxlJywgbmV3VmFsdWUpO1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gdG9waWNzIE5hbWVzIG9mIHZhcmlhYmxlcy5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfEFycmF5fE9iamVjdH0gdmFsdWUgTmV3IHZhbHVlcyBmb3IgdGhlIHZhcmlhYmxlcy5cbiAgICAgICAgKi9cbiAgICAgICAgbm90aWZ5OiBmdW5jdGlvbiAodG9waWNzLCB2YWx1ZSkge1xuICAgICAgICAgICAgdmFyIGNhbGxUYXJnZXQgPSBmdW5jdGlvbiAodGFyZ2V0LCBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNhbGwobnVsbCwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQudHJpZ2dlcihjb25maWcuZXZlbnRzLnJlYWN0LCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICghJC5pc1BsYWluT2JqZWN0KHRvcGljcykpIHtcbiAgICAgICAgICAgICAgICB0b3BpY3MgPSBfLm9iamVjdChbdG9waWNzXSwgW3ZhbHVlXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfLmVhY2godGhpcy5zdWJzY3JpcHRpb25zLCBmdW5jdGlvbiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9IHN1YnNjcmlwdGlvbi50YXJnZXQ7XG4gICAgICAgICAgICAgICAgaWYgKHN1YnNjcmlwdGlvbi5iYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWF0Y2hpbmdUb3BpY3MgPSBfLnBpY2sodG9waWNzLCBzdWJzY3JpcHRpb24udG9waWNzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uc2l6ZShtYXRjaGluZ1RvcGljcykgPT09IF8uc2l6ZShzdWJzY3JpcHRpb24udG9waWNzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFRhcmdldCh0YXJnZXQsIG1hdGNoaW5nVG9waWNzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaChzdWJzY3JpcHRpb24udG9waWNzLCBmdW5jdGlvbiAodG9waWMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXRjaGluZ1RvcGljcyA9IF8ucGljayh0b3BpY3MsIHRvcGljKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfLnNpemUobWF0Y2hpbmdUb3BpY3MpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFRhcmdldCh0YXJnZXQsIG1hdGNoaW5nVG9waWNzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFVwZGF0ZSB0aGUgdmFyaWFibGVzIHdpdGggbmV3IHZhbHVlcywgYW5kIGFsZXJ0IHN1YnNjcmliZXJzLlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC52YXJpYWJsZXMucHVibGlzaCgnbXlWYXJpYWJsZScsIG5ld1ZhbHVlKTtcbiAgICAgICAgICogICAgICBGbG93LmNoYW5uZWwudmFyaWFibGVzLnB1Ymxpc2goeyBteVZhcjE6IG5ld1ZhbDEsIG15VmFyMjogbmV3VmFsMiB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtICB7U3RyaW5nfE9iamVjdH0gdmFyaWFibGUgU3RyaW5nIHdpdGggbmFtZSBvZiB2YXJpYWJsZS4gQWx0ZXJuYXRpdmVseSwgb2JqZWN0IGluIGZvcm0gYHsgdmFyaWFibGVOYW1lOiB2YWx1ZSB9YC5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfEFycmF5fE9iamVjdH0gdmFsdWUgKE9wdGlvbmFsKSAgVmFsdWUgb2YgdGhlIHZhcmlhYmxlLCBpZiBwcmV2aW91cyBhcmd1bWVudCB3YXMgYSBzdHJpbmcuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIChPcHRpb25hbCkgT3ZlcnJpZGVzIGZvciB0aGUgZGVmYXVsdCBjaGFubmVsIG9wdGlvbnMuIFN1cHBvcnRlZCBvcHRpb25zOiBgeyBzaWxlbnQ6IEJvb2xlYW4gfWAgYW5kIGB7IGJhdGNoOiBCb29sZWFuIH1gLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJuIHskcHJvbWlzZX0gUHJvbWlzZSB0byBjb21wbGV0ZSB0aGUgdXBkYXRlLlxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGlzaDogZnVuY3Rpb24gKHZhcmlhYmxlLCB2YWx1ZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3B1Ymxpc2gnLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIGF0dHJzO1xuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdCh2YXJpYWJsZSkpIHtcbiAgICAgICAgICAgICAgICBhdHRycyA9IHZhcmlhYmxlO1xuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgKGF0dHJzID0ge30pW3ZhcmlhYmxlXSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGl0ID0gaW50ZXJwb2xhdGUoXy5rZXlzKGF0dHJzKSwgY3VycmVudERhdGEpO1xuXG4gICAgICAgICAgICB2YXIgdG9TYXZlID0ge307XG4gICAgICAgICAgICBfLmVhY2goYXR0cnMsIGZ1bmN0aW9uICh2YWwsIGF0dHIpIHtcbiAgICAgICAgICAgICAgIHZhciBrZXkgPSAoaXQuaW50ZXJwb2xhdGVkW2F0dHJdKSA/IGl0LmludGVycG9sYXRlZFthdHRyXSA6IGF0dHI7XG4gICAgICAgICAgICAgICB0b1NhdmVba2V5XSA9IHZhbDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIHJldHVybiB2cy5zYXZlLmNhbGwodnMsIHRvU2F2ZSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghb3B0aW9ucyB8fCAhb3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lLnJlZnJlc2guY2FsbChtZSwgYXR0cnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN1YnNjcmliZSB0byBjaGFuZ2VzIG9uIGEgY2hhbm5lbDogQXNrIGZvciBub3RpZmljYXRpb24gd2hlbiB2YXJpYWJsZXMgYXJlIHVwZGF0ZWQuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLnZhcmlhYmxlcy5zdWJzY3JpYmUoJ215VmFyaWFibGUnLFxuICAgICAgICAgKiAgICAgICAgICBmdW5jdGlvbigpIHsgY29uc29sZS5sb2coJ2NhbGxlZCEnKTsgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLnZhcmlhYmxlcy5zdWJzY3JpYmUoWydwcmljZScsICdjb3N0J10sXG4gICAgICAgICAqICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgKiAgICAgICAgICAgICAgLy8gdGhpcyBmdW5jdGlvbiBjYWxsZWQgb25seSBvbmNlLCB3aXRoIHsgcHJpY2U6IFgsIGNvc3Q6IFkgfVxuICAgICAgICAgKiAgICAgICAgICB9LFxuICAgICAgICAgKiAgICAgICAgICB7IGJhdGNoOiB0cnVlIH0pO1xuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC52YXJpYWJsZXMuc3Vic2NyaWJlKFsncHJpY2UnLCAnY29zdCddLFxuICAgICAgICAgKiAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICogICAgICAgICAgICAgIC8vIHRoaXMgZnVuY3Rpb24gY2FsbGVkIHR3aWNlLCBvbmNlIHdpdGggeyBwcmljZTogWCB9XG4gICAgICAgICAqICAgICAgICAgICAgICAvLyBhbmQgYWdhaW4gd2l0aCB7IGNvc3Q6IFkgfVxuICAgICAgICAgKiAgICAgICAgICB9LFxuICAgICAgICAgKiAgICAgICAgICB7IGJhdGNoOiBmYWxzZSB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IHRvcGljcyBUaGUgbmFtZXMgb2YgdGhlIHZhcmlhYmxlcy5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R8RnVuY3Rpb259IHN1YnNjcmliZXIgVGhlIG9iamVjdCBvciBmdW5jdGlvbiBiZWluZyBub3RpZmllZC4gT2Z0ZW4gdGhpcyBpcyBhIGNhbGxiYWNrIGZ1bmN0aW9uLiBJZiB0aGlzIGlzIG5vdCBhIGZ1bmN0aW9uLCBhIGB0cmlnZ2VyYCBtZXRob2QgaXMgY2FsbGVkIGlmIGF2YWlsYWJsZTsgaWYgbm90LCBldmVudCBpcyB0cmlnZ2VyZWQgb24gJChvYmplY3QpLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAoT3B0aW9uYWwpIE92ZXJyaWRlcyBmb3IgdGhlIGRlZmF1bHQgY2hhbm5lbCBvcHRpb25zLlxuICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuc2lsZW50IERldGVybWluZSB3aGVuIHRvIHVwZGF0ZSBzdGF0ZS5cbiAgICAgICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLmJhdGNoIElmIHlvdSBhcmUgc3Vic2NyaWJpbmcgdG8gbXVsdGlwbGUgdmFyaWFibGVzLCBieSBkZWZhdWx0IHRoZSBjYWxsYmFjayBmdW5jdGlvbiBpcyBjYWxsZWQgb25jZSBmb3IgZWFjaCBpdGVtIHRvIHdoaWNoIHlvdSBzdWJzY3JpYmU6IGBiYXRjaDogZmFsc2VgLiBXaGVuIGBiYXRjaGAgaXMgc2V0IHRvIGB0cnVlYCwgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGlzIG9ubHkgY2FsbGVkIG9uY2UsIG5vIG1hdHRlciBob3cgbWFueSBpdGVtcyB5b3UgYXJlIHN1YnNjcmliaW5nIHRvLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IEFuIGlkZW50aWZ5aW5nIHRva2VuIGZvciB0aGlzIHN1YnNjcmlwdGlvbi4gUmVxdWlyZWQgYXMgYSBwYXJhbWV0ZXIgd2hlbiB1bnN1YnNjcmliaW5nLlxuICAgICAgICAqL1xuICAgICAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uICh0b3BpY3MsIHN1YnNjcmliZXIsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdzdWJzY3JpYmluZycsIHRvcGljcywgc3Vic2NyaWJlcik7XG4gICAgICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICAgICAgYmF0Y2g6IGZhbHNlXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0b3BpY3MgPSBbXS5jb25jYXQodG9waWNzKTtcbiAgICAgICAgICAgIC8vdXNlIGpxdWVyeSB0byBtYWtlIGV2ZW50IHNpbmtcbiAgICAgICAgICAgIGlmICghc3Vic2NyaWJlci5vbiAmJiAhXy5pc0Z1bmN0aW9uKHN1YnNjcmliZXIpKSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlciA9ICQoc3Vic2NyaWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpZCAgPSBfLnVuaXF1ZUlkKCdlcGljaGFubmVsLnZhcmlhYmxlJyk7XG4gICAgICAgICAgICB2YXIgZGF0YSA9ICQuZXh0ZW5kKHtcbiAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgdG9waWNzOiB0b3BpY3MsXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBzdWJzY3JpYmVyXG4gICAgICAgICAgICB9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKGRhdGEpO1xuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUFuZENoZWNrRm9yUmVmcmVzaCh0b3BpY3MpO1xuICAgICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdG9wIHJlY2VpdmluZyBub3RpZmljYXRpb25zIGZvciBhbGwgc3Vic2NyaXB0aW9ucyByZWZlcmVuY2VkIGJ5IHRoaXMgdG9rZW4uXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSB0b2tlbiBUaGUgaWRlbnRpZnlpbmcgdG9rZW4gZm9yIHRoaXMgc3Vic2NyaXB0aW9uLiAoQ3JlYXRlZCBhbmQgcmV0dXJuZWQgYnkgdGhlIGBzdWJzY3JpYmUoKWAgY2FsbC4pXG4gICAgICAgICovXG4gICAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbiAodG9rZW4pIHtcbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucyA9IF8ucmVqZWN0KHRoaXMuc3Vic2NyaXB0aW9ucywgZnVuY3Rpb24gKHN1YnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3Vicy5pZCA9PT0gdG9rZW47XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3RvcCByZWNlaXZpbmcgbm90aWZpY2F0aW9ucyBmb3IgYWxsIHN1YnNjcmlwdGlvbnMuIE5vIHBhcmFtZXRlcnMuXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm4ge05vbmV9XG4gICAgICAgICovXG4gICAgICAgIHVuc3Vic2NyaWJlQWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnN1YnNjcmlwdGlvbnMgPSBbXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkLmV4dGVuZCh0aGlzLCBwdWJsaWNBUEkpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHByZWZpeDogJ2YnLFxuICAgIGRlZmF1bHRBdHRyOiAnYmluZCcsXG5cbiAgICBiaW5kZXJBdHRyOiAnZi1iaW5kJyxcblxuICAgIGV2ZW50czoge1xuICAgICAgICB0cmlnZ2VyOiAndXBkYXRlLmYudWknLFxuICAgICAgICByZWFjdDogJ3VwZGF0ZS5mLm1vZGVsJ1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIEFycmF5IENvbnZlcnRlcnNcbiAqXG4gKiBDb252ZXJ0ZXJzIGFsbG93IHlvdSB0byBjb252ZXJ0IGRhdGEgLS0gaW4gcGFydGljdWxhciwgbW9kZWwgdmFyaWFibGVzIHRoYXQgeW91IGRpc3BsYXkgaW4geW91ciBwcm9qZWN0J3MgdXNlciBpbnRlcmZhY2UgLS0gZnJvbSBvbmUgZm9ybSB0byBhbm90aGVyLlxuICpcbiAqIFRoZXJlIGFyZSB0d28gd2F5cyB0byBzcGVjaWZ5IGNvbnZlcnNpb24gb3IgZm9ybWF0dGluZyBmb3IgdGhlIGRpc3BsYXkgb3V0cHV0IG9mIGEgcGFydGljdWxhciBtb2RlbCB2YXJpYWJsZTpcbiAqXG4gKiAqIEFkZCB0aGUgYXR0cmlidXRlIGBkYXRhLWYtY29udmVydGAgdG8gYW55IGVsZW1lbnQgdGhhdCBhbHNvIGhhcyB0aGUgYGRhdGEtZi1iaW5kYCBvciBgZGF0YS1mLWZvcmVhY2hgLlxuICogKiBVc2UgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyIHdpdGhpbiB0aGUgdmFsdWUgb2YgYW55IGBkYXRhLWYtYCBhdHRyaWJ1dGUgKG5vdCBqdXN0IGBkYXRhLWYtYmluZGAgb3IgYGRhdGEtZi1mb3JlYWNoYCkuXG4gKlxuICogSW4gZ2VuZXJhbCwgaWYgdGhlIG1vZGVsIHZhcmlhYmxlIGlzIGFuIGFycmF5LCB0aGUgY29udmVydGVyIGlzIGFwcGxpZWQgdG8gZWFjaCBlbGVtZW50IG9mIHRoZSBhcnJheS4gVGhlcmUgYXJlIGEgZmV3IGJ1aWx0IGluIGFycmF5IGNvbnZlcnRlcnMgd2hpY2gsIHJhdGhlciB0aGFuIGNvbnZlcnRpbmcgYWxsIGVsZW1lbnRzIG9mIGFuIGFycmF5LCBzZWxlY3QgcGFydGljdWxhciBlbGVtZW50cyBmcm9tIHdpdGhpbiB0aGUgYXJyYXkgb3Igb3RoZXJ3aXNlIHRyZWF0IGFycmF5IHZhcmlhYmxlcyBzcGVjaWFsbHkuXG4gKlxuICovXG5cblxuJ3VzZSBzdHJpY3QnO1xudmFyIGxpc3QgPSBbXG4gICAge1xuICAgICAgICAvKipcbiAgICAgICAgICogQ29udmVydCB0aGUgaW5wdXQgaW50byBhbiBhcnJheS4gQ29uY2F0ZW5hdGVzIGFsbCBlbGVtZW50cyBvZiB0aGUgaW5wdXQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgYXJyYXkgbW9kZWwgdmFyaWFibGUuXG4gICAgICAgICAqL1xuICAgICAgICBhbGlhczogJ2xpc3QnLFxuICAgICAgICBhY2NlcHRMaXN0OiB0cnVlLFxuICAgICAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICByZXR1cm4gW10uY29uY2F0KHZhbCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNlbGVjdCBvbmx5IHRoZSBsYXN0IGVsZW1lbnQgb2YgdGhlIGFycmF5LlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIDxkaXY+XG4gICAgICAgICAqICAgICAgICAgIEluIHRoZSBjdXJyZW50IHllYXIsIHdlIGhhdmUgPHNwYW4gZGF0YS1mLWJpbmQ9XCJTYWxlcyB8IGxhc3RcIj48L3NwYW4+IGluIHNhbGVzLlxuICAgICAgICAgKiAgICAgIDwvZGl2PlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWwgVGhlIGFycmF5IG1vZGVsIHZhcmlhYmxlLlxuICAgICAgICAgKi9cbiAgICAgICAgYWxpYXM6ICdsYXN0JyxcbiAgICAgICAgYWNjZXB0TGlzdDogdHJ1ZSxcbiAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgdmFsID0gW10uY29uY2F0KHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gdmFsW3ZhbC5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXZlcnNlIHRoZSBhcnJheS5cbiAgICAgICAgICpcbiAgICAgICAgICogKipFeGFtcGxlKipcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICA8cD5TaG93IHRoZSBoaXN0b3J5IG9mIG91ciBzYWxlcywgc3RhcnRpbmcgd2l0aCB0aGUgbGFzdCAobW9zdCByZWNlbnQpOjwvcD5cbiAgICAgICAgICogICAgICA8dWwgZGF0YS1mLWZvcmVhY2g9XCJTYWxlcyB8IHJldmVyc2VcIj5cbiAgICAgICAgICogICAgICAgICAgPGxpPjwvbGk+XG4gICAgICAgICAqICAgICAgPC91bD5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtBcnJheX0gdmFsIFRoZSBhcnJheSBtb2RlbCB2YXJpYWJsZS5cbiAgICAgICAgICovXG4gICAge1xuICAgICAgICBhbGlhczogJ3JldmVyc2UnLFxuICAgICAgICBhY2NlcHRMaXN0OiB0cnVlLFxuICAgICAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICB2YWwgPSBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgICAgIHJldHVybiB2YWwucmV2ZXJzZSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZWxlY3Qgb25seSB0aGUgZmlyc3QgZWxlbWVudCBvZiB0aGUgYXJyYXkuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgPGRpdj5cbiAgICAgICAgICogICAgICAgICAgT3VyIGluaXRpYWwgaW52ZXN0bWVudCB3YXMgPHNwYW4gZGF0YS1mLWJpbmQ9XCJDYXBpdGFsIHwgZmlyc3RcIj48L3NwYW4+LlxuICAgICAgICAgKiAgICAgIDwvZGl2PlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWwgVGhlIGFycmF5IG1vZGVsIHZhcmlhYmxlLlxuICAgICAgICAgKi9cbiAgICAgICAgYWxpYXM6ICdmaXJzdCcsXG4gICAgICAgIGFjY2VwdExpc3Q6IHRydWUsXG4gICAgICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHZhbCA9IFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbFswXTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICAvKipcbiAgICAgICAgICogU2VsZWN0IG9ubHkgdGhlIHByZXZpb3VzIChzZWNvbmQgdG8gbGFzdCkgZWxlbWVudCBvZiB0aGUgYXJyYXkuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgPGRpdj5cbiAgICAgICAgICogICAgICAgICAgTGFzdCB5ZWFyIHdlIGhhZCA8c3BhbiBkYXRhLWYtYmluZD1cIlNhbGVzIHwgcHJldmlvdXNcIj48L3NwYW4+IGluIHNhbGVzLlxuICAgICAgICAgKiAgICAgIDwvZGl2PlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWwgVGhlIGFycmF5IG1vZGVsIHZhcmlhYmxlLlxuICAgICAgICAgKi9cbiAgICAgICAgYWxpYXM6ICdwcmV2aW91cycsXG4gICAgICAgIGFjY2VwdExpc3Q6IHRydWUsXG4gICAgICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHZhbCA9IFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICAgICAgcmV0dXJuICh2YWwubGVuZ3RoIDw9IDEpID8gdmFsWzBdIDogdmFsW3ZhbC5sZW5ndGggLSAyXTtcbiAgICAgICAgfVxuICAgIH1cbl07XG5cbl8uZWFjaChsaXN0LCBmdW5jdGlvbiAoaXRlbSkge1xuICAgdmFyIG9sZGZuID0gaXRlbS5jb252ZXJ0O1xuICAgdmFyIG5ld2ZuID0gZnVuY3Rpb24gKHZhbCkge1xuICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QodmFsKSkge1xuICAgICAgICAgICAgcmV0dXJuIF8ubWFwVmFsdWVzKHZhbCwgb2xkZm4pO1xuICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gb2xkZm4odmFsKTtcbiAgICAgICB9XG4gICB9O1xuICAgaXRlbS5jb252ZXJ0ID0gbmV3Zm47XG59KTtcbm1vZHVsZS5leHBvcnRzID0gbGlzdDtcbiIsIi8qKlxuICogIyMgQ29udmVydGVyIE1hbmFnZXI6IE1ha2UgeW91ciBvd24gQ29udmVydGVyc1xuICpcbiAqIENvbnZlcnRlcnMgYWxsb3cgeW91IHRvIGNvbnZlcnQgZGF0YSAtLSBpbiBwYXJ0aWN1bGFyLCBtb2RlbCB2YXJpYWJsZXMgdGhhdCB5b3UgZGlzcGxheSBpbiB5b3VyIHByb2plY3QncyB1c2VyIGludGVyZmFjZSAtLSBmcm9tIG9uZSBmb3JtIHRvIGFub3RoZXIuXG4gKlxuICogQmFzaWMgY29udmVydGluZyBhbmQgZm9ybWF0dGluZyBvcHRpb25zIGFyZSBidWlsdCBpbiB0byBGbG93LmpzLlxuICpcbiAqIFlvdSBjYW4gYWxzbyBjcmVhdGUgeW91ciBvd24gY29udmVydGVycy4gRWFjaCBjb252ZXJ0ZXIgc2hvdWxkIGJlIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBpbiBhIHZhbHVlIG9yIHZhbHVlcyB0byBjb252ZXJ0LiBUbyB1c2UgeW91ciBjb252ZXJ0ZXIsIGByZWdpc3RlcigpYCBpdCBpbiB5b3VyIGluc3RhbmNlIG9mIEZsb3cuanMuXG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLy9UT0RPOiBNYWtlIGFsbCB1bmRlcnNjb3JlIGZpbHRlcnMgYXZhaWxhYmxlXG5cbnZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlciwgYWNjZXB0TGlzdCkge1xuICAgIHZhciByZXQgPSBbXTtcbiAgICAvL25vbWFsaXplKCdmbGlwJywgZm4pXG4gICAgaWYgKF8uaXNGdW5jdGlvbihjb252ZXJ0ZXIpKSB7XG4gICAgICAgIHJldC5wdXNoKHtcbiAgICAgICAgICAgIGFsaWFzOiBhbGlhcyxcbiAgICAgICAgICAgIGNvbnZlcnQ6IGNvbnZlcnRlcixcbiAgICAgICAgICAgIGFjY2VwdExpc3Q6IGFjY2VwdExpc3RcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICgkLmlzUGxhaW5PYmplY3QoY29udmVydGVyKSAmJiBjb252ZXJ0ZXIuY29udmVydCkge1xuICAgICAgICBjb252ZXJ0ZXIuYWxpYXMgPSBhbGlhcztcbiAgICAgICAgY29udmVydGVyLmFjY2VwdExpc3QgPSBhY2NlcHRMaXN0O1xuICAgICAgICByZXQucHVzaChjb252ZXJ0ZXIpO1xuICAgIH0gZWxzZSBpZiAoJC5pc1BsYWluT2JqZWN0KGFsaWFzKSkge1xuICAgICAgICAvL25vcm1hbGl6ZSh7YWxpYXM6ICdmbGlwJywgY29udmVydDogZnVuY3Rpb259KVxuICAgICAgICBpZiAoYWxpYXMuY29udmVydCkge1xuICAgICAgICAgICAgcmV0LnB1c2goYWxpYXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gbm9ybWFsaXplKHtmbGlwOiBmdW59KVxuICAgICAgICAgICAgJC5lYWNoKGFsaWFzLCBmdW5jdGlvbiAoa2V5LCB2YWwpIHtcbiAgICAgICAgICAgICAgICByZXQucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIGFsaWFzOiBrZXksXG4gICAgICAgICAgICAgICAgICAgIGNvbnZlcnQ6IHZhbCxcbiAgICAgICAgICAgICAgICAgICAgYWNjZXB0TGlzdDogYWNjZXB0TGlzdFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbnZhciBtYXRjaENvbnZlcnRlciA9IGZ1bmN0aW9uIChhbGlhcywgY29udmVydGVyKSB7XG4gICAgaWYgKF8uaXNTdHJpbmcoY29udmVydGVyLmFsaWFzKSkge1xuICAgICAgICByZXR1cm4gYWxpYXMgPT09IGNvbnZlcnRlci5hbGlhcztcbiAgICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbihjb252ZXJ0ZXIuYWxpYXMpKSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0ZXIuYWxpYXMoYWxpYXMpO1xuICAgIH0gZWxzZSBpZiAoXy5pc1JlZ2V4KGNvbnZlcnRlci5hbGlhcykpIHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRlci5hbGlhcy5tYXRjaChhbGlhcyk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBjb252ZXJ0ZXJNYW5hZ2VyID0ge1xuICAgIHByaXZhdGU6IHtcbiAgICAgICAgbWF0Y2hDb252ZXJ0ZXI6IG1hdGNoQ29udmVydGVyXG4gICAgfSxcblxuICAgIGxpc3Q6IFtdLFxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBhdHRyaWJ1dGUgY29udmVydGVyIHRvIHRoaXMgaW5zdGFuY2Ugb2YgRmxvdy5qcy5cbiAgICAgKlxuICAgICAqICoqRXhhbXBsZSoqXG4gICAgICpcbiAgICAgKiAgICAgIEZsb3cuZG9tLmNvbnZlcnRlcnMucmVnaXN0ZXIoJ21heCcsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAqICAgICAgICAgIHJldHVybiBfLm1heCh2YWx1ZSk7XG4gICAgICogICAgICB9LCB0cnVlKTtcbiAgICAgKlxuICAgICAqICAgICAgRmxvdy5kb20uY29udmVydGVycy5yZWdpc3Rlcih7XG4gICAgICogICAgICAgICAgYWxpYXM6ICdzaWcnLFxuICAgICAqICAgICAgICAgIHBhcnNlOiAkLm5vb3AsXG4gICAgICogICAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICogICAgICAgICAgICAgIHJldHVybiB2YWx1ZS5maXJzdE5hbWUgKyAnICcgKyB2YWx1ZS5sYXN0TmFtZSArICcsICcgKyB2YWx1ZS5qb2JUaXRsZTtcbiAgICAgKiAgICAgIH0sIGZhbHNlKTtcbiAgICAgKlxuICAgICAqICAgICAgPGRpdj5cbiAgICAgKiAgICAgICAgICBUaGUgbGFyZ2VzdCBzYWxlcyB5b3UgaGFkIHdhcyA8c3BhbiBkYXRhLWYtYmluZD1cInNhbGVzQnlZZWFyIHwgbWF4IHwgJCMsIyMjXCI+PC9zcGFuPi5cbiAgICAgKiAgICAgICAgICBUaGUgY3VycmVudCBzYWxlcyBtYW5hZ2VyIGlzIDxzcGFuIGRhdGEtZi1iaW5kPVwic2FsZXNNZ3IgfCBzaWdcIj48L3NwYW4+LlxuICAgICAqICAgICAgPC9kaXY+XG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd8RnVuY3Rpb258UmVnZXh9IGFsaWFzIEZvcm1hdHRlciBuYW1lLlxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufE9iamVjdH0gY29udmVydGVyIElmIGEgZnVuY3Rpb24sIGBjb252ZXJ0ZXJgIGlzIGNhbGxlZCB3aXRoIHRoZSB2YWx1ZS4gSWYgYW4gb2JqZWN0LCBzaG91bGQgaW5jbHVkZSBmaWVsZHMgZm9yIGBhbGlhc2AgKG5hbWUpLCBgcGFyc2VgIChmdW5jdGlvbiksIGFuZCBgY29udmVydGAgKGZ1bmN0aW9uKS5cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGFjY2VwdExpc3QgRGV0ZXJtaW5lcyBpZiB0aGUgY29udmVydGVyIGlzIGEgJ2xpc3QnIGNvbnZlcnRlciBvciBub3QuIExpc3QgY29udmVydGVycyB0YWtlIGluIGFycmF5cyBhcyBpbnB1dHMsIG90aGVycyBleHBlY3Qgc2luZ2xlIHZhbHVlcy5cbiAgICAgKi9cbiAgICByZWdpc3RlcjogZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIsIGFjY2VwdExpc3QpIHtcbiAgICAgICAgdmFyIG5vcm1hbGl6ZWQgPSBub3JtYWxpemUoYWxpYXMsIGNvbnZlcnRlciwgYWNjZXB0TGlzdCk7XG4gICAgICAgIHRoaXMubGlzdCA9IG5vcm1hbGl6ZWQuY29uY2F0KHRoaXMubGlzdCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlcGxhY2UgYW4gYWxyZWFkeSByZWdpc3RlcmVkIGNvbnZlcnRlciB3aXRoIGEgbmV3IG9uZSBvZiB0aGUgc2FtZSBuYW1lLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGFsaWFzIEZvcm1hdHRlciBuYW1lLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fSBjb252ZXJ0ZXIgSWYgYSBmdW5jdGlvbiwgYGNvbnZlcnRlcmAgaXMgY2FsbGVkIHdpdGggdGhlIHZhbHVlLiBJZiBhbiBvYmplY3QsIHNob3VsZCBpbmNsdWRlIGZpZWxkcyBmb3IgYGFsaWFzYCAobmFtZSksIGBwYXJzZWAgKGZ1bmN0aW9uKSwgYW5kIGBjb252ZXJ0YCAoZnVuY3Rpb24pLlxuICAgICAqL1xuICAgIHJlcGxhY2U6IGZ1bmN0aW9uIChhbGlhcywgY29udmVydGVyKSB7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgXy5lYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24gKGN1cnJlbnRDb252ZXJ0ZXIsIGkpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaENvbnZlcnRlcihhbGlhcywgY3VycmVudENvbnZlcnRlcikpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5saXN0LnNwbGljZShpbmRleCwgMSwgbm9ybWFsaXplKGFsaWFzLCBjb252ZXJ0ZXIpWzBdKTtcbiAgICB9LFxuXG4gICAgZ2V0Q29udmVydGVyOiBmdW5jdGlvbiAoYWxpYXMpIHtcbiAgICAgICAgcmV0dXJuIF8uZmluZCh0aGlzLmxpc3QsIGZ1bmN0aW9uIChjb252ZXJ0ZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaENvbnZlcnRlcihhbGlhcywgY29udmVydGVyKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBpcGVzIHRoZSB2YWx1ZSBzZXF1ZW50aWFsbHkgdGhyb3VnaCBhIGxpc3Qgb2YgcHJvdmlkZWQgY29udmVydGVycy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge0FueX0gdmFsdWUgSW5wdXQgZm9yIHRoZSBjb252ZXJ0ZXIgdG8gdGFnLlxuICAgICAqIEBwYXJhbSAge0FycmF5fE9iamVjdH0gbGlzdCBMaXN0IG9mIGNvbnZlcnRlcnMgKG1hcHMgdG8gY29udmVydGVyIGFsaWFzKS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge0FueX0gQ29udmVydGVkIHZhbHVlLlxuICAgICAqL1xuICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWx1ZSwgbGlzdCkge1xuICAgICAgICBpZiAoIWxpc3QgfHwgIWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgbGlzdCA9IFtdLmNvbmNhdChsaXN0KTtcbiAgICAgICAgbGlzdCA9IF8uaW52b2tlKGxpc3QsICd0cmltJyk7XG5cbiAgICAgICAgdmFyIGN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuXG4gICAgICAgIHZhciBjb252ZXJ0QXJyYXkgPSBmdW5jdGlvbiAoY29udmVydGVyLCB2YWwsIGNvbnZlcnRlck5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBfLm1hcCh2YWwsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnZlcnRlci5jb252ZXJ0KHYsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBjb252ZXJ0T2JqZWN0ID0gZnVuY3Rpb24gKGNvbnZlcnRlciwgdmFsdWUsIGNvbnZlcnRlck5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBfLm1hcFZhbHVlcyh2YWx1ZSwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgICAgICAgICAgICByZXR1cm4gY29udmVydChjb252ZXJ0ZXIsIHZhbCwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgY29udmVydCA9IGZ1bmN0aW9uIChjb252ZXJ0ZXIsIHZhbHVlLCBjb252ZXJ0ZXJOYW1lKSB7XG4gICAgICAgICAgICB2YXIgY29udmVydGVkO1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkgJiYgY29udmVydGVyLmFjY2VwdExpc3QgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0QXJyYXkoY29udmVydGVyLCB2YWx1ZSwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRlci5jb252ZXJ0KHZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjb252ZXJ0ZWQ7XG4gICAgICAgIH07XG4gICAgICAgIF8uZWFjaChsaXN0LCBmdW5jdGlvbiAoY29udmVydGVyTmFtZSkge1xuICAgICAgICAgICAgdmFyIGNvbnZlcnRlciA9IG1lLmdldENvbnZlcnRlcihjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIGlmICghY29udmVydGVyKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCBjb252ZXJ0ZXIgZm9yICcgKyBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QoY3VycmVudFZhbHVlKSAmJiBjb252ZXJ0ZXIuYWNjZXB0TGlzdCAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9IGNvbnZlcnRPYmplY3QoY29udmVydGVyLCBjdXJyZW50VmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUgPSBjb252ZXJ0KGNvbnZlcnRlciwgY3VycmVudFZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvdW50ZXItcGFydCB0byBgY29udmVydCgpYC4gVHJhbnNsYXRlcyBjb252ZXJ0ZWQgdmFsdWVzIGJhY2sgdG8gdGhlaXIgb3JpZ2luYWwgZm9ybS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gdmFsdWUgVmFsdWUgdG8gcGFyc2UuXG4gICAgICogQHBhcmFtICB7U3RyaW5nfEFycmF5fSBsaXN0ICBMaXN0IG9mIHBhcnNlcnMgdG8gcnVuIHRoZSB2YWx1ZSB0aHJvdWdoLiBPdXRlcm1vc3QgaXMgaW52b2tlZCBmaXJzdC5cbiAgICAgKiBAcmV0dXJuIHtBbnl9IE9yaWdpbmFsIHZhbHVlLlxuICAgICAqL1xuICAgIHBhcnNlOiBmdW5jdGlvbiAodmFsdWUsIGxpc3QpIHtcbiAgICAgICAgaWYgKCFsaXN0IHx8ICFsaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGxpc3QgPSBbXS5jb25jYXQobGlzdCkucmV2ZXJzZSgpO1xuICAgICAgICBsaXN0ID0gXy5pbnZva2UobGlzdCwgJ3RyaW0nKTtcblxuICAgICAgICB2YXIgY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIF8uZWFjaChsaXN0LCBmdW5jdGlvbiAoY29udmVydGVyTmFtZSkge1xuICAgICAgICAgICAgdmFyIGNvbnZlcnRlciA9IG1lLmdldENvbnZlcnRlcihjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIGlmIChjb252ZXJ0ZXIucGFyc2UpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUgPSBjb252ZXJ0ZXIucGFyc2UoY3VycmVudFZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgfVxufTtcblxuXG4vL0Jvb3RzdHJhcFxudmFyIGRlZmF1bHRjb252ZXJ0ZXJzID0gW1xuICAgIHJlcXVpcmUoJy4vbnVtYmVyLWNvbnZlcnRlcicpLFxuICAgIHJlcXVpcmUoJy4vc3RyaW5nLWNvbnZlcnRlcicpLFxuICAgIHJlcXVpcmUoJy4vYXJyYXktY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi91bmRlcnNjb3JlLXV0aWxzLWNvbnZlcnRlcicpLFxuICAgIHJlcXVpcmUoJy4vbnVtYmVyZm9ybWF0LWNvbnZlcnRlcicpLFxuXTtcblxuJC5lYWNoKGRlZmF1bHRjb252ZXJ0ZXJzLnJldmVyc2UoKSwgZnVuY3Rpb24gKGluZGV4LCBjb252ZXJ0ZXIpIHtcbiAgICBpZiAoXy5pc0FycmF5KGNvbnZlcnRlcikpIHtcbiAgICAgICAgXy5lYWNoKGNvbnZlcnRlciwgZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgICAgY29udmVydGVyTWFuYWdlci5yZWdpc3RlcihjKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29udmVydGVyTWFuYWdlci5yZWdpc3Rlcihjb252ZXJ0ZXIpO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbnZlcnRlck1hbmFnZXI7XG4iLCIvKipcbiAqICMjIE51bWJlciBDb252ZXJ0ZXJzXG4gKlxuICogQ29udmVydGVycyBhbGxvdyB5b3UgdG8gY29udmVydCBkYXRhIC0tIGluIHBhcnRpY3VsYXIsIG1vZGVsIHZhcmlhYmxlcyB0aGF0IHlvdSBkaXNwbGF5IGluIHlvdXIgcHJvamVjdCdzIHVzZXIgaW50ZXJmYWNlIC0tIGZyb20gb25lIGZvcm0gdG8gYW5vdGhlci5cbiAqXG4gKiBUaGVyZSBhcmUgdHdvIHdheXMgdG8gc3BlY2lmeSBjb252ZXJzaW9uIG9yIGZvcm1hdHRpbmcgZm9yIHRoZSBkaXNwbGF5IG91dHB1dCBvZiBhIHBhcnRpY3VsYXIgbW9kZWwgdmFyaWFibGU6XG4gKlxuICogKiBBZGQgdGhlIGF0dHJpYnV0ZSBgZGF0YS1mLWNvbnZlcnRgIHRvIGFueSBlbGVtZW50IHRoYXQgYWxzbyBoYXMgdGhlIGBkYXRhLWYtYmluZGAgb3IgYGRhdGEtZi1mb3JlYWNoYC5cbiAqICogVXNlIHRoZSBgfGAgKHBpcGUpIGNoYXJhY3RlciB3aXRoaW4gdGhlIHZhbHVlIG9mIGFueSBgZGF0YS1mLWAgYXR0cmlidXRlIChub3QganVzdCBgZGF0YS1mLWJpbmRgIG9yIGBkYXRhLWYtZm9yZWFjaGApLlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHRoZSBtb2RlbCB2YXJpYWJsZSB0byBhbiBpbnRlZ2VyLiBPZnRlbiB1c2VkIGZvciBjaGFpbmluZyB0byBhbm90aGVyIGNvbnZlcnRlci5cbiAgICAgKlxuICAgICAqICoqRXhhbXBsZSoqXG4gICAgICpcbiAgICAgKiAgICAgIDxkaXY+XG4gICAgICogICAgICAgICAgWW91ciBjYXIgaGFzIGRyaXZlblxuICAgICAqICAgICAgICAgIDxzcGFuIGRhdGEtZi1iaW5kPVwiT2RvbWV0ZXIgfCBpIHwgczAuMFwiPjwvc3Bhbj4gbWlsZXMuXG4gICAgICogICAgICA8L2Rpdj5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlIFRoZSBtb2RlbCB2YXJpYWJsZS5cbiAgICAgKi9cbiAgICBhbGlhczogJ2knLFxuICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCh2YWx1ZSwgMTApO1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIE51bWJlciBGb3JtYXQgQ29udmVydGVyc1xuICpcbiAqIENvbnZlcnRlcnMgYWxsb3cgeW91IHRvIGNvbnZlcnQgZGF0YSAtLSBpbiBwYXJ0aWN1bGFyLCBtb2RlbCB2YXJpYWJsZXMgdGhhdCB5b3UgZGlzcGxheSBpbiB5b3VyIHByb2plY3QncyB1c2VyIGludGVyZmFjZSAtLSBmcm9tIG9uZSBmb3JtIHRvIGFub3RoZXIuXG4gKlxuICogVGhlcmUgYXJlIHR3byB3YXlzIHRvIHNwZWNpZnkgY29udmVyc2lvbiBvciBmb3JtYXR0aW5nIGZvciB0aGUgZGlzcGxheSBvdXRwdXQgb2YgYSBwYXJ0aWN1bGFyIG1vZGVsIHZhcmlhYmxlOlxuICpcbiAqICogQWRkIHRoZSBhdHRyaWJ1dGUgYGRhdGEtZi1jb252ZXJ0YCB0byBhbnkgZWxlbWVudCB0aGF0IGFsc28gaGFzIHRoZSBgZGF0YS1mLWJpbmRgIG9yIGBkYXRhLWYtZm9yZWFjaGAuXG4gKiAqIFVzZSB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIgd2l0aGluIHRoZSB2YWx1ZSBvZiBhbnkgYGRhdGEtZi1gIGF0dHJpYnV0ZSAobm90IGp1c3QgYGRhdGEtZi1iaW5kYCBvciBgZGF0YS1mLWZvcmVhY2hgKS5cbiAqXG4gKiBGb3IgbW9kZWwgdmFyaWFibGVzIHRoYXQgYXJlIG51bWJlcnMgKG9yIHRoYXQgaGF2ZSBiZWVuIFtjb252ZXJ0ZWQgdG8gbnVtYmVyc10oLi4vbnVtYmVyLWNvbnZlcnRlci8pKSwgdGhlcmUgYXJlIHNldmVyYWwgc3BlY2lhbCBudW1iZXIgZm9ybWF0cyB5b3UgY2FuIGFwcGx5LlxuICpcbiAqICMjIyNDdXJyZW5jeSBOdW1iZXIgRm9ybWF0XG4gKlxuICogQWZ0ZXIgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyLCB1c2UgYCRgIChkb2xsYXIgc2lnbiksIGAwYCwgYW5kIGAuYCAoZGVjaW1hbCBwb2ludCkgaW4geW91ciBjb252ZXJ0ZXIgdG8gZGVzY3JpYmUgaG93IGN1cnJlbmN5IHNob3VsZCBhcHBlYXIuIFRoZSBzcGVjaWZpY2F0aW9ucyBmb2xsb3cgdGhlIEV4Y2VsIGN1cnJlbmN5IGZvcm1hdHRpbmcgY29udmVudGlvbnMuXG4gKlxuICogKipFeGFtcGxlKipcbiAqXG4gKiAgICAgIDwhLS0gY29udmVydCB0byBkb2xsYXJzIChpbmNsdWRlIGNlbnRzKSAtLT5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJwcmljZVtjYXJdXCIgZGF0YS1mLWNvbnZlcnQ9XCIkMC4wMFwiIC8+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwicHJpY2VbY2FyXSB8ICQwLjAwXCIgLz5cbiAqXG4gKiAgICAgIDwhLS0gY29udmVydCB0byBkb2xsYXJzICh0cnVuY2F0ZSBjZW50cykgLS0+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwicHJpY2VbY2FyXVwiIGRhdGEtZi1jb252ZXJ0PVwiJDAuXCIgLz5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJwcmljZVtjYXJdIHwgJDAuXCIgLz5cbiAqXG4gKlxuICogIyMjI1NwZWNpZmljIERpZ2l0cyBOdW1iZXIgRm9ybWF0XG4gKlxuICogQWZ0ZXIgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyLCB1c2UgYCNgIChwb3VuZCkgYW5kIGAsYCAoY29tbWEpIGluIHlvdXIgY29udmVydGVyIHRvIGRlc2NyaWJlIGhvdyB0aGUgbnVtYmVyIHNob3VsZCBhcHBlYXIuIFRoZSBzcGVjaWZpY2F0aW9ucyBmb2xsb3cgdGhlIEV4Y2VsIG51bWJlciBmb3JtYXR0aW5nIGNvbnZlbnRpb25zLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8IS0tIGNvbnZlcnQgdG8gdGhvdXNhbmRzIC0tPlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInNhbGVzW2Nhcl1cIiBkYXRhLWYtY29udmVydD1cIiMsIyMjXCIgLz5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJzYWxlc1tjYXJdIHwgIywjIyNcIiAvPlxuICpcbiAqXG4gKiAjIyMjUGVyY2VudGFnZSBOdW1iZXIgRm9ybWF0XG4gKlxuICogQWZ0ZXIgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyLCB1c2UgYCVgIChwZXJjZW50KSBhbmQgYDBgIGluIHlvdXIgY29udmVydGVyIHRvIGRpc3BsYXkgdGhlIG51bWJlciBhcyBhIHBlcmNlbnQuXG4gKlxuICogKipFeGFtcGxlKipcbiAqXG4gKiAgICAgIDwhLS0gY29udmVydCB0byBwZXJjZW50YWdlIC0tPlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInByb2ZpdE1hcmdpbltjYXJdXCIgZGF0YS1mLWNvbnZlcnQ9XCIwJVwiIC8+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwicHJvZml0TWFyZ2luW2Nhcl0gfCAwJVwiIC8+XG4gKlxuICpcbiAqICMjIyNTaG9ydCBOdW1iZXIgRm9ybWF0XG4gKlxuICogQWZ0ZXIgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyLCB1c2UgYHNgIGFuZCBgMGAgaW4geW91ciBjb252ZXJ0ZXIgdG8gZGVzY3JpYmUgaG93IHRoZSBudW1iZXIgc2hvdWxkIGFwcGVhci5cbiAqXG4gKiBUaGUgYDBgcyBkZXNjcmliZSB0aGUgc2lnbmlmaWNhbnQgZGlnaXRzLlxuICpcbiAqIFRoZSBgc2AgZGVzY3JpYmVzIHRoZSBcInNob3J0IGZvcm1hdCxcIiB3aGljaCB1c2VzICdLJyBmb3IgdGhvdXNhbmRzLCAnTScgZm9yIG1pbGxpb25zLCAnQicgZm9yIGJpbGxpb25zLiBGb3IgZXhhbXBsZSwgYDI0NjhgIGNvbnZlcnRlZCB3aXRoIGBzMC4wYCBkaXNwbGF5cyBhcyBgMi41S2AuXG4gKlxuICogKipFeGFtcGxlKipcbiAqXG4gKiAgICAgIDwhLS0gY29udmVydCB0byB0aG91c2FuZHMgKHNob3cgMTIsNDY4IGFzIDEyLjVLKSAtLT5cbiAqICAgICAgPHNwYW4gdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInByaWNlW2Nhcl0gfCBzMC4wXCI+PC9zcGFuPlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBhbGlhczogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgLy9UT0RPOiBGYW5jeSByZWdleCB0byBtYXRjaCBudW1iZXIgZm9ybWF0cyBoZXJlXG4gICAgICAgIHJldHVybiAobmFtZS5pbmRleE9mKCcjJykgIT09IC0xIHx8IG5hbWUuaW5kZXhPZignMCcpICE9PSAtMSk7XG4gICAgfSxcblxuICAgIHBhcnNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhbCs9ICcnO1xuICAgICAgICB2YXIgaXNOZWdhdGl2ZSA9IHZhbC5jaGFyQXQoMCkgPT09ICctJztcblxuICAgICAgICB2YWwgID0gdmFsLnJlcGxhY2UoLywvZywgJycpO1xuICAgICAgICB2YXIgZmxvYXRNYXRjaGVyID0gLyhbLStdP1swLTldKlxcLj9bMC05XSspKEs/TT9CPyU/KS9pO1xuICAgICAgICB2YXIgcmVzdWx0cyA9IGZsb2F0TWF0Y2hlci5leGVjKHZhbCk7XG4gICAgICAgIHZhciBudW1iZXIsIHN1ZmZpeCA9ICcnO1xuICAgICAgICBpZiAocmVzdWx0cyAmJiByZXN1bHRzWzFdKSB7XG4gICAgICAgICAgICBudW1iZXIgPSByZXN1bHRzWzFdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHRzICYmIHJlc3VsdHNbMl0pIHtcbiAgICAgICAgICAgIHN1ZmZpeCA9IHJlc3VsdHNbMl0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAoc3VmZml4KSB7XG4gICAgICAgICAgICBjYXNlICclJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgLyAxMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdrJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAxMDAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbSc6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogMTAwMDAwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2InOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIDEwMDAwMDAwMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbnVtYmVyID0gcGFyc2VGbG9hdChudW1iZXIpO1xuICAgICAgICBpZiAoaXNOZWdhdGl2ZSAmJiBudW1iZXIgPiAwKSB7XG4gICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAtMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVtYmVyO1xuICAgIH0sXG5cbiAgICBjb252ZXJ0OiAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciBzY2FsZXMgPSBbJycsICdLJywgJ00nLCAnQicsICdUJ107XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0RGlnaXRzKHZhbHVlLCBkaWdpdHMpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUgPT09IDAgPyAwIDogcm91bmRUbyh2YWx1ZSwgTWF0aC5tYXgoMCwgZGlnaXRzIC0gTWF0aC5jZWlsKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4xMCkpKTtcblxuICAgICAgICAgICAgdmFyIFRYVCA9ICcnO1xuICAgICAgICAgICAgdmFyIG51bWJlclRYVCA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB2YXIgZGVjaW1hbFNldCA9IGZhbHNlO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpVFhUID0gMDsgaVRYVCA8IG51bWJlclRYVC5sZW5ndGg7IGlUWFQrKykge1xuICAgICAgICAgICAgICAgIFRYVCArPSBudW1iZXJUWFQuY2hhckF0KGlUWFQpO1xuICAgICAgICAgICAgICAgIGlmIChudW1iZXJUWFQuY2hhckF0KGlUWFQpID09PSAnLicpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVjaW1hbFNldCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGlnaXRzLS07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGRpZ2l0cyA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBUWFQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWRlY2ltYWxTZXQpIHtcbiAgICAgICAgICAgICAgICBUWFQgKz0gJy4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUgKGRpZ2l0cyA+IDApIHtcbiAgICAgICAgICAgICAgICBUWFQgKz0gJzAnO1xuICAgICAgICAgICAgICAgIGRpZ2l0cy0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFRYVDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFkZERlY2ltYWxzKHZhbHVlLCBkZWNpbWFscywgbWluRGVjaW1hbHMsIGhhc0NvbW1hcykge1xuICAgICAgICAgICAgaGFzQ29tbWFzID0gKGhhc0NvbW1hcyA9PT0gZmFsc2UpID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICAgICAgdmFyIG51bWJlclRYVCA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB2YXIgaGFzRGVjaW1hbHMgPSAobnVtYmVyVFhULnNwbGl0KCcuJykubGVuZ3RoID4gMSk7XG4gICAgICAgICAgICB2YXIgaURlYyA9IDA7XG5cbiAgICAgICAgICAgIGlmIChoYXNDb21tYXMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpQ2hhciA9IG51bWJlclRYVC5sZW5ndGggLSAxOyBpQ2hhciA+IDA7IGlDaGFyLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc0RlY2ltYWxzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNEZWNpbWFscyA9IChudW1iZXJUWFQuY2hhckF0KGlDaGFyKSAhPT0gJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlEZWMgPSAoaURlYyArIDEpICUgMztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpRGVjID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyVFhUID0gbnVtYmVyVFhULnN1YnN0cigwLCBpQ2hhcikgKyAnLCcgKyBudW1iZXJUWFQuc3Vic3RyKGlDaGFyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRlY2ltYWxzID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciB0b0FERDtcbiAgICAgICAgICAgICAgICBpZiAobnVtYmVyVFhULnNwbGl0KCcuJykubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9BREQgPSBtaW5EZWNpbWFscztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvQUREID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyVFhUICs9ICcuJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRvQUREID0gbWluRGVjaW1hbHMgLSBudW1iZXJUWFQuc3BsaXQoJy4nKVsxXS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgd2hpbGUgKHRvQUREID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBudW1iZXJUWFQgKz0gJzAnO1xuICAgICAgICAgICAgICAgICAgICB0b0FERC0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudW1iZXJUWFQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByb3VuZFRvKHZhbHVlLCBkaWdpdHMpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHZhbHVlICogTWF0aC5wb3coMTAsIGRpZ2l0cykpIC8gTWF0aC5wb3coMTAsIGRpZ2l0cyk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRTdWZmaXgoZm9ybWF0VFhUKSB7XG4gICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQucmVwbGFjZSgnLicsICcnKTtcbiAgICAgICAgICAgIHZhciBmaXhlc1RYVCA9IGZvcm1hdFRYVC5zcGxpdChuZXcgUmVnRXhwKCdbMHwsfCNdKycsICdnJykpO1xuICAgICAgICAgICAgcmV0dXJuIChmaXhlc1RYVC5sZW5ndGggPiAxKSA/IGZpeGVzVFhUWzFdLnRvU3RyaW5nKCkgOiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGlzQ3VycmVuY3koc3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgcyA9ICQudHJpbShzdHJpbmcpO1xuXG4gICAgICAgICAgICBpZiAocyA9PT0gJyQnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqwnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OCwqUnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OCwqMnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqEnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawrEnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ0vDhD8nIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ2tyJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDgsKiJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKqJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDhuKAmScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCqScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCqycpIHtcblxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBmb3JtYXQobnVtYmVyLCBmb3JtYXRUWFQpIHtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkobnVtYmVyKSkge1xuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlcltudW1iZXIubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIV8uaXNTdHJpbmcobnVtYmVyKSAmJiAhXy5pc051bWJlcihudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bWJlcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFmb3JtYXRUWFQgfHwgZm9ybWF0VFhULnRvTG93ZXJDYXNlKCkgPT09ICdkZWZhdWx0Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiBudW1iZXIudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGlzTmFOKG51bWJlcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJz8nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL3ZhciBmb3JtYXRUWFQ7XG4gICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQucmVwbGFjZSgnJmV1cm87JywgJ8Oi4oCawqwnKTtcblxuICAgICAgICAgICAgLy8gRGl2aWRlICsvLSBOdW1iZXIgRm9ybWF0XG4gICAgICAgICAgICB2YXIgZm9ybWF0cyA9IGZvcm1hdFRYVC5zcGxpdCgnOycpO1xuICAgICAgICAgICAgaWYgKGZvcm1hdHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmb3JtYXQoTWF0aC5hYnMobnVtYmVyKSwgZm9ybWF0c1soKG51bWJlciA+PSAwKSA/IDAgOiAxKV0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTYXZlIFNpZ25cbiAgICAgICAgICAgIHZhciBzaWduID0gKG51bWJlciA+PSAwKSA/ICcnIDogJy0nO1xuICAgICAgICAgICAgbnVtYmVyID0gTWF0aC5hYnMobnVtYmVyKTtcblxuXG4gICAgICAgICAgICB2YXIgbGVmdE9mRGVjaW1hbCA9IGZvcm1hdFRYVDtcbiAgICAgICAgICAgIHZhciBkID0gbGVmdE9mRGVjaW1hbC5pbmRleE9mKCcuJyk7XG4gICAgICAgICAgICBpZiAoZCA+IC0xKSB7XG4gICAgICAgICAgICAgICAgbGVmdE9mRGVjaW1hbCA9IGxlZnRPZkRlY2ltYWwuc3Vic3RyaW5nKDAsIGQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbm9ybWFsaXplZCA9IGxlZnRPZkRlY2ltYWwudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IG5vcm1hbGl6ZWQubGFzdEluZGV4T2YoJ3MnKTtcbiAgICAgICAgICAgIHZhciBpc1Nob3J0Rm9ybWF0ID0gaW5kZXggPiAtMTtcblxuICAgICAgICAgICAgaWYgKGlzU2hvcnRGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dENoYXIgPSBsZWZ0T2ZEZWNpbWFsLmNoYXJBdChpbmRleCArIDEpO1xuICAgICAgICAgICAgICAgIGlmIChuZXh0Q2hhciA9PT0gJyAnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzU2hvcnRGb3JtYXQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBsZWFkaW5nVGV4dCA9IGlzU2hvcnRGb3JtYXQgPyBmb3JtYXRUWFQuc3Vic3RyaW5nKDAsIGluZGV4KSA6ICcnO1xuICAgICAgICAgICAgdmFyIHJpZ2h0T2ZQcmVmaXggPSBpc1Nob3J0Rm9ybWF0ID8gZm9ybWF0VFhULnN1YnN0cihpbmRleCArIDEpIDogZm9ybWF0VFhULnN1YnN0cihpbmRleCk7XG5cbiAgICAgICAgICAgIC8vZmlyc3QgY2hlY2sgdG8gbWFrZSBzdXJlICdzJyBpcyBhY3R1YWxseSBzaG9ydCBmb3JtYXQgYW5kIG5vdCBwYXJ0IG9mIHNvbWUgbGVhZGluZyB0ZXh0XG4gICAgICAgICAgICBpZiAoaXNTaG9ydEZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHZhciBzaG9ydEZvcm1hdFRlc3QgPSAvWzAtOSMqXS87XG4gICAgICAgICAgICAgICAgdmFyIHNob3J0Rm9ybWF0VGVzdFJlc3VsdCA9IHJpZ2h0T2ZQcmVmaXgubWF0Y2goc2hvcnRGb3JtYXRUZXN0KTtcbiAgICAgICAgICAgICAgICBpZiAoIXNob3J0Rm9ybWF0VGVzdFJlc3VsdCB8fCBzaG9ydEZvcm1hdFRlc3RSZXN1bHQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vbm8gc2hvcnQgZm9ybWF0IGNoYXJhY3RlcnMgc28gdGhpcyBtdXN0IGJlIGxlYWRpbmcgdGV4dCBpZS4gJ3dlZWtzICdcbiAgICAgICAgICAgICAgICAgICAgaXNTaG9ydEZvcm1hdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBsZWFkaW5nVGV4dCA9ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9pZiAoZm9ybWF0VFhULmNoYXJBdCgwKSA9PSAncycpXG4gICAgICAgICAgICBpZiAoaXNTaG9ydEZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHZhciB2YWxTY2FsZSA9IG51bWJlciA9PT0gMCA/IDAgOiBNYXRoLmZsb29yKE1hdGgubG9nKE1hdGguYWJzKG51bWJlcikpIC8gKDMgKiBNYXRoLkxOMTApKTtcbiAgICAgICAgICAgICAgICB2YWxTY2FsZSA9ICgobnVtYmVyIC8gTWF0aC5wb3coMTAsIDMgKiB2YWxTY2FsZSkpIDwgMTAwMCkgPyB2YWxTY2FsZSA6ICh2YWxTY2FsZSArIDEpO1xuICAgICAgICAgICAgICAgIHZhbFNjYWxlID0gTWF0aC5tYXgodmFsU2NhbGUsIDApO1xuICAgICAgICAgICAgICAgIHZhbFNjYWxlID0gTWF0aC5taW4odmFsU2NhbGUsIDQpO1xuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAvIE1hdGgucG93KDEwLCAzICogdmFsU2NhbGUpO1xuICAgICAgICAgICAgICAgIC8vaWYgKCFpc05hTihOdW1iZXIoZm9ybWF0VFhULnN1YnN0cigxKSApICkgKVxuXG4gICAgICAgICAgICAgICAgaWYgKCFpc05hTihOdW1iZXIocmlnaHRPZlByZWZpeCkpICYmIHJpZ2h0T2ZQcmVmaXguaW5kZXhPZignLicpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGltaXREaWdpdHMgPSBOdW1iZXIocmlnaHRPZlByZWZpeCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChudW1iZXIgPCBNYXRoLnBvdygxMCwgbGltaXREaWdpdHMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDdXJyZW5jeShsZWFkaW5nVGV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiArIGxlYWRpbmdUZXh0ICsgZ2V0RGlnaXRzKG51bWJlciwgTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsZWFkaW5nVGV4dCArIHNpZ24gKyBnZXREaWdpdHMobnVtYmVyLCBOdW1iZXIocmlnaHRPZlByZWZpeCkpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0N1cnJlbmN5KGxlYWRpbmdUZXh0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzaWduICsgbGVhZGluZ1RleHQgKyBNYXRoLnJvdW5kKG51bWJlcikgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ1RleHQgKyBzaWduICsgTWF0aC5yb3VuZChudW1iZXIpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vZm9ybWF0VFhUID0gZm9ybWF0VFhULnN1YnN0cigxKTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnN1YnN0cihpbmRleCArIDEpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgU1VGRklYID0gZ2V0U3VmZml4KGZvcm1hdFRYVCk7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5zdWJzdHIoMCwgZm9ybWF0VFhULmxlbmd0aCAtIFNVRkZJWC5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWxXaXRob3V0TGVhZGluZyA9IGZvcm1hdCgoKHNpZ24gPT09ICcnKSA/IDEgOiAtMSkgKiBudW1iZXIsIGZvcm1hdFRYVCkgKyBzY2FsZXNbdmFsU2NhbGVdICsgU1VGRklYO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNDdXJyZW5jeShsZWFkaW5nVGV4dCkgJiYgc2lnbiAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbFdpdGhvdXRMZWFkaW5nID0gdmFsV2l0aG91dExlYWRpbmcuc3Vic3RyKHNpZ24ubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzaWduICsgbGVhZGluZ1RleHQgKyB2YWxXaXRob3V0TGVhZGluZztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsZWFkaW5nVGV4dCArIHZhbFdpdGhvdXRMZWFkaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHN1YkZvcm1hdHMgPSBmb3JtYXRUWFQuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgIHZhciBkZWNpbWFscztcbiAgICAgICAgICAgIHZhciBtaW5EZWNpbWFscztcbiAgICAgICAgICAgIGlmIChzdWJGb3JtYXRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBkZWNpbWFscyA9IHN1YkZvcm1hdHNbMV0ubGVuZ3RoIC0gc3ViRm9ybWF0c1sxXS5yZXBsYWNlKG5ldyBSZWdFeHAoJ1swfCNdKycsICdnJyksICcnKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgbWluRGVjaW1hbHMgPSBzdWJGb3JtYXRzWzFdLmxlbmd0aCAtIHN1YkZvcm1hdHNbMV0ucmVwbGFjZShuZXcgUmVnRXhwKCcwKycsICdnJyksICcnKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9ybWF0VFhUID0gc3ViRm9ybWF0c1swXSArIHN1YkZvcm1hdHNbMV0ucmVwbGFjZShuZXcgUmVnRXhwKCdbMHwjXSsnLCAnZycpLCAnJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlY2ltYWxzID0gMDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGZpeGVzVFhUID0gZm9ybWF0VFhULnNwbGl0KG5ldyBSZWdFeHAoJ1swfCx8I10rJywgJ2cnKSk7XG4gICAgICAgICAgICB2YXIgcHJlZmZpeCA9IGZpeGVzVFhUWzBdLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB2YXIgc3VmZml4ID0gKGZpeGVzVFhULmxlbmd0aCA+IDEpID8gZml4ZXNUWFRbMV0udG9TdHJpbmcoKSA6ICcnO1xuXG4gICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAoKGZvcm1hdFRYVC5zcGxpdCgnJScpLmxlbmd0aCA+IDEpID8gMTAwIDogMSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgIGlmIChmb3JtYXRUWFQuaW5kZXhPZignJScpICE9PSAtMSkgbnVtYmVyID0gbnVtYmVyICogMTAwO1xuICAgICAgICAgICAgbnVtYmVyID0gcm91bmRUbyhudW1iZXIsIGRlY2ltYWxzKTtcblxuICAgICAgICAgICAgc2lnbiA9IChudW1iZXIgPT09IDApID8gJycgOiBzaWduO1xuXG4gICAgICAgICAgICB2YXIgaGFzQ29tbWFzID0gKGZvcm1hdFRYVC5zdWJzdHIoZm9ybWF0VFhULmxlbmd0aCAtIDQgLSBzdWZmaXgubGVuZ3RoLCAxKSA9PT0gJywnKTtcbiAgICAgICAgICAgIHZhciBmb3JtYXR0ZWQgPSBzaWduICsgcHJlZmZpeCArIGFkZERlY2ltYWxzKG51bWJlciwgZGVjaW1hbHMsIG1pbkRlY2ltYWxzLCBoYXNDb21tYXMpICsgc3VmZml4O1xuXG4gICAgICAgICAgICAvLyAgY29uc29sZS5sb2cob3JpZ2luYWxOdW1iZXIsIG9yaWdpbmFsRm9ybWF0LCBmb3JtYXR0ZWQpXG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0dGVkO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdDtcbiAgICB9KCkpXG59O1xuIiwiLyoqXG4gKiAjIyBTdHJpbmcgQ29udmVydGVyc1xuICpcbiAqIENvbnZlcnRlcnMgYWxsb3cgeW91IHRvIGNvbnZlcnQgZGF0YSAtLSBpbiBwYXJ0aWN1bGFyLCBtb2RlbCB2YXJpYWJsZXMgdGhhdCB5b3UgZGlzcGxheSBpbiB5b3VyIHByb2plY3QncyB1c2VyIGludGVyZmFjZSAtLSBmcm9tIG9uZSBmb3JtIHRvIGFub3RoZXIuXG4gKlxuICogVGhlcmUgYXJlIHR3byB3YXlzIHRvIHNwZWNpZnkgY29udmVyc2lvbiBvciBmb3JtYXR0aW5nIGZvciB0aGUgZGlzcGxheSBvdXRwdXQgb2YgYSBwYXJ0aWN1bGFyIG1vZGVsIHZhcmlhYmxlOlxuICpcbiAqICogQWRkIHRoZSBhdHRyaWJ1dGUgYGRhdGEtZi1jb252ZXJ0YCB0byBhbnkgZWxlbWVudCB0aGF0IGFsc28gaGFzIHRoZSBgZGF0YS1mLWJpbmRgIG9yIGBkYXRhLWYtZm9yZWFjaGAuXG4gKiAqIFVzZSB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIgd2l0aGluIHRoZSB2YWx1ZSBvZiBhbnkgYGRhdGEtZi1gIGF0dHJpYnV0ZSAobm90IGp1c3QgYGRhdGEtZi1iaW5kYCBvciBgZGF0YS1mLWZvcmVhY2hgKS5cbiAqXG4gKiBGb3IgbW9kZWwgdmFyaWFibGVzIHRoYXQgYXJlIHN0cmluZ3MgKG9yIHRoYXQgaGF2ZSBiZWVuIGNvbnZlcnRlZCB0byBzdHJpbmdzKSwgdGhlcmUgYXJlIHNldmVyYWwgc3BlY2lhbCBzdHJpbmcgZm9ybWF0cyB5b3UgY2FuIGFwcGx5LlxuICovXG5cbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgLyoqXG4gICAgICogQ29udmVydCB0aGUgbW9kZWwgdmFyaWFibGUgdG8gYSBzdHJpbmcuIE9mdGVuIHVzZWQgZm9yIGNoYWluaW5nIHRvIGFub3RoZXIgY29udmVydGVyLlxuICAgICAqXG4gICAgICogKipFeGFtcGxlKipcbiAgICAgKlxuICAgICAqICAgICAgPGRpdj5cbiAgICAgKiAgICAgICAgICBUaGlzIHllYXIgeW91IGFyZSBpbiBjaGFyZ2Ugb2Ygc2FsZXMgZm9yXG4gICAgICogICAgICAgICAgPHNwYW4gZGF0YS1mLWJpbmQ9XCJzYWxlc01nci5yZWdpb24gfCBzIHwgdXBwZXJDYXNlXCI+PC9zcGFuPi5cbiAgICAgKiAgICAgIDwvZGl2PlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gdmFsIFRoZSBtb2RlbCB2YXJpYWJsZS5cbiAgICAgKi9cbiAgICBzOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiB2YWwgKyAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCB0aGUgbW9kZWwgdmFyaWFibGUgdG8gVVBQRVIgQ0FTRS5cbiAgICAgKlxuICAgICAqICoqRXhhbXBsZSoqXG4gICAgICpcbiAgICAgKiAgICAgIDxkaXY+XG4gICAgICogICAgICAgICAgVGhpcyB5ZWFyIHlvdSBhcmUgaW4gY2hhcmdlIG9mIHNhbGVzIGZvclxuICAgICAqICAgICAgICAgIDxzcGFuIGRhdGEtZi1iaW5kPVwic2FsZXNNZ3IucmVnaW9uIHwgcyB8IHVwcGVyQ2FzZVwiPjwvc3Bhbj4uXG4gICAgICogICAgICA8L2Rpdj5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgbW9kZWwgdmFyaWFibGUuXG4gICAgICovXG4gICAgdXBwZXJDYXNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiAodmFsICsgJycpLnRvVXBwZXJDYXNlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgdGhlIG1vZGVsIHZhcmlhYmxlIHRvIGxvd2VyIGNhc2UuXG4gICAgICpcbiAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAqXG4gICAgICogICAgICA8ZGl2PlxuICAgICAqICAgICAgICAgIEVudGVyIHlvdXIgdXNlciBuYW1lOlxuICAgICAqICAgICAgICAgIDxpbnB1dCBkYXRhLWYtYmluZD1cInVzZXJOYW1lIHwgbG93ZXJDYXNlXCI+PC9pbnB1dD4uXG4gICAgICogICAgICA8L2Rpdj5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgbW9kZWwgdmFyaWFibGUuXG4gICAgICovXG4gICAgbG93ZXJDYXNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiAodmFsICsgJycpLnRvTG93ZXJDYXNlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgdGhlIG1vZGVsIHZhcmlhYmxlIHRvIFRpdGxlIENhc2UuXG4gICAgICpcbiAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAqXG4gICAgICogICAgICA8ZGl2PlxuICAgICAqICAgICAgICAgIENvbmdyYXR1bGF0aW9ucyBvbiB5b3VyIHByb21vdGlvbiFcbiAgICAgKiAgICAgICAgICBZb3VyIG5ldyB0aXRsZSBpczogPHNwYW4gZGF0YS1mLWJpbmQ9XCJjdXJyZW50Um9sZSB8IHRpdGxlQ2FzZVwiPjwvc3Bhbj4uXG4gICAgICogICAgICA8L2Rpdj5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgbW9kZWwgdmFyaWFibGUuXG4gICAgICovXG4gICAgdGl0bGVDYXNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhbCA9IHZhbCArICcnO1xuICAgICAgICByZXR1cm4gdmFsLnJlcGxhY2UoL1xcd1xcUyovZywgZnVuY3Rpb24gKHR4dCkge3JldHVybiB0eHQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0eHQuc3Vic3RyKDEpLnRvTG93ZXJDYXNlKCk7fSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBsaXN0ID0gW107XG5cbnZhciBzdXBwb3J0ZWQgPSBbXG4gICAgJ3ZhbHVlcycsICdrZXlzJywgJ2NvbXBhY3QnLCAnZGlmZmVyZW5jZScsXG4gICAgJ2ZsYXR0ZW4nLCAncmVzdCcsXG4gICAgJ3VuaW9uJyxcbiAgICAndW5pcScsICd6aXAnLCAnd2l0aG91dCcsXG4gICAgJ3hvcicsICd6aXAnXG5dO1xuXy5lYWNoKHN1cHBvcnRlZCwgZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIGl0ZW0gPSB7XG4gICAgICAgIGFsaWFzOiBmbixcbiAgICAgICAgYWNjZXB0TGlzdDogdHJ1ZSxcbiAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdCh2YWwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF8ubWFwVmFsdWVzKHZhbCwgX1tmbl0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX1tmbl0odmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgbGlzdC5wdXNoKGl0ZW0pO1xufSk7XG5tb2R1bGUuZXhwb3J0cyA9IGxpc3Q7XG4iLCIvKipcbiAqICMjIEF0dHJpYnV0ZSBNYW5hZ2VyXG4gKlxuICogRmxvdy5qcyBwcm92aWRlcyBhIHNldCBvZiBjdXN0b20gRE9NIGF0dHJpYnV0ZXMgdGhhdCBzZXJ2ZSBhcyBhIGRhdGEgYmluZGluZyBiZXR3ZWVuIHZhcmlhYmxlcyBhbmQgb3BlcmF0aW9ucyBpbiB5b3VyIHByb2plY3QncyBtb2RlbCBhbmQgSFRNTCBlbGVtZW50cyBpbiB5b3VyIHByb2plY3QncyB1c2VyIGludGVyZmFjZS4gVW5kZXIgdGhlIGhvb2QsIEZsb3cuanMgaXMgZG9pbmcgYXV0b21hdGljIGNvbnZlcnNpb24gb2YgdGhlc2UgY3VzdG9tIGF0dHJpYnV0ZXMsIGxpa2UgYGRhdGEtZi1iaW5kYCwgaW50byBIVE1MIHNwZWNpZmljIHRvIHRoZSBhdHRyaWJ1dGUncyBhc3NpZ25lZCB2YWx1ZSwgbGlrZSB0aGUgY3VycmVudCB2YWx1ZSBvZiBgbXlNb2RlbFZhcmAuXG4gKlxuICogSWYgeW91IGFyZSBsb29raW5nIGZvciBleGFtcGxlcyBvZiB1c2luZyBwYXJ0aWN1bGFyIGF0dHJpYnV0ZXMsIHNlZSB0aGUgW3NwZWNpZmljIGF0dHJpYnV0ZXMgc3VicGFnZXNdKC4uLy4uLy4uLy4uL2F0dHJpYnV0ZXMtb3ZlcnZpZXcvKS5cbiAqXG4gKiBJZiB5b3Ugd291bGQgbGlrZSB0byBleHRlbmQgRmxvdy5qcyB3aXRoIHlvdXIgb3duIGN1c3RvbSBhdHRyaWJ1dGVzLCB5b3UgY2FuIGFkZCB0aGVtIHRvIEZsb3cuanMgdXNpbmcgdGhlIEF0dHJpYnV0ZSBNYW5hZ2VyLlxuICpcbiAqIFRoZSBBdHRyaWJ1dGUgTWFuYWdlciBpcyBzcGVjaWZpYyB0byBhZGRpbmcgY3VzdG9tIGF0dHJpYnV0ZXMgYW5kIGRlc2NyaWJpbmcgdGhlaXIgaW1wbGVtZW50YXRpb24gKGhhbmRsZXJzKS4gKFRoZSBbRG9tIE1hbmFnZXJdKC4uLy4uLykgY29udGFpbnMgdGhlIGdlbmVyYWwgaW1wbGVtZW50YXRpb24uKVxuICpcbiAqXG4gKiAqKkV4YW1wbGVzKipcbiAqXG4gKiBCdWlsdC1pbiBhdHRyaWJ1dGUgaGFuZGxlcnMgbGlrZSBgZGF0YS1mLXZhbHVlYCBhbmQgYGRhdGEtZi1mb3JlYWNoYCBhdXRvbWF0aWNhbGx5IGJpbmQgdmFyaWFibGVzIGluIHlvdXIgcHJvamVjdCdzIG1vZGVsIHRvIHBhcnRpY3VsYXIgSFRNTCBlbGVtZW50cy4gSG93ZXZlciwgeW91ciBVSSBtYXkgc29tZXRpbWVzIHJlcXVpcmUgZGlzcGxheWluZyBvbmx5IHBhcnQgb2YgdGhlIHZhcmlhYmxlIChlLmcuIGlmIGl0J3MgYW4gb2JqZWN0KSwgb3IgXCJkb2luZyBzb21ldGhpbmdcIiB3aXRoIHRoZSB2YWx1ZSBvZiB0aGUgdmFyaWFibGUsIHJhdGhlciB0aGFuIHNpbXBseSBkaXNwbGF5aW5nIGl0LlxuICpcbiAqIE9uZSBleGFtcGxlIG9mIHdoZW4gY3VzdG9tIGF0dHJpYnV0ZSBoYW5kbGVycyBhcmUgdXNlZnVsIGlzIHdoZW4geW91ciBtb2RlbCB2YXJpYWJsZSBpcyBhIGNvbXBsZXggb2JqZWN0IGFuZCB5b3Ugd2FudCB0byBkaXNwbGF5IHRoZSBmaWVsZHMgaW4gYSBwYXJ0aWN1bGFyIHdheSwgb3IgeW91IG9ubHkgd2FudCB0byBkaXNwbGF5IHNvbWUgb2YgdGhlIGZpZWxkcy4gV2hpbGUgdGhlIGNvbWJpbmF0aW9uIG9mIHRoZSBbYGRhdGEtZi1mb3JlYWNoYCBhdHRyaWJ1dGVdKC4uL2ZvcmVhY2gvZGVmYXVsdC1mb3JlYWNoLWF0dHIvKSBhbmQgW3RlbXBsYXRpbmddKC4uLy4uLy4uLy4uLyN0ZW1wbGF0ZXMpIGNhbiBoZWxwIHdpdGggdGhpcywgc29tZXRpbWVzIGl0J3MgZWFzaWVyIHRvIHdyaXRlIHlvdXIgb3duIGF0dHJpYnV0ZSBoYW5kbGVyLiAoVGhpcyBpcyBlc3BlY2lhbGx5IHRydWUgaWYgeW91IHdpbGwgYmUgcmV1c2luZyB0aGUgYXR0cmlidXRlIGhhbmRsZXIgLS0geW91IHdvbid0IGhhdmUgdG8gY29weSB5b3VyIHRlbXBsYXRpbmcgY29kZSBvdmVyIGFuZCBvdmVyLilcbiAqXG4gKiAgICAgIEZsb3cuZG9tLmF0dHJpYnV0ZXMucmVnaXN0ZXIoJ3Nob3dTY2hlZCcsICcqJywgZnVuY3Rpb24gKHNjaGVkKSB7XG4gKiAgICAgICAgICAgIC8vIGRpc3BsYXkgYWxsIHRoZSBzY2hlZHVsZSBtaWxlc3RvbmVzXG4gKiAgICAgICAgICAgIC8vIHNjaGVkIGlzIGFuIG9iamVjdCwgZWFjaCBlbGVtZW50IGlzIGFuIGFycmF5XG4gKiAgICAgICAgICAgIC8vIG9mIFsnRm9ybWFsIE1pbGVzdG9uZSBOYW1lJywgbWlsZXN0b25lTW9udGgsIGNvbXBsZXRpb25QZXJjZW50YWdlXVxuICpcbiAqICAgICAgICAgICAgdmFyIHNjaGVkU3RyID0gJzx1bD4nO1xuICogICAgICAgICAgICB2YXIgc29ydGVkU2NoZWQgPSBfLnNvcnRCeShzY2hlZCwgZnVuY3Rpb24oZWwpIHsgcmV0dXJuIGVsWzFdOyB9KTtcbiAqXG4gKiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc29ydGVkU2NoZWQubGVuZ3RoOyBpKyspIHtcbiAqICAgICAgICAgICAgICAgICAgc2NoZWRTdHIgKz0gJzxsaT48c3Ryb25nPicgKyBzb3J0ZWRTY2hlZFtpXVswXVxuICogICAgICAgICAgICAgICAgICAgICAgICArICc8L3N0cm9uZz4gY3VycmVudGx5IHNjaGVkdWxlZCBmb3IgPHN0cm9uZz5Nb250aCAnXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICsgc29ydGVkU2NoZWRbaV1bMV0gKyAnPC9zdHJvbmc+PC9saT4nO1xuICogICAgICAgICAgICB9XG4gKiAgICAgICAgICAgIHNjaGVkU3RyICs9ICc8L3VsPic7XG4gKlxuICogICAgICAgICAgICB0aGlzLmh0bWwoc2NoZWRTdHIpO1xuICogICAgICB9KTtcbiAqXG4gKiBUaGVuLCB5b3UgY2FuIHVzZSB0aGUgYXR0cmlidXRlIGhhbmRsZXIgaW4geW91ciBIVE1MIGp1c3QgbGlrZSBvdGhlciBGbG93LmpzIGF0dHJpYnV0ZXM6XG4gKlxuICogICAgICA8ZGl2IGRhdGEtZi1zaG93U2NoZWQ9XCJzY2hlZHVsZVwiPjwvZGl2PlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWZhdWx0SGFuZGxlcnMgPSBbXG4gICAgcmVxdWlyZSgnLi9uby1vcC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9ldmVudHMvaW5pdC1ldmVudC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9ldmVudHMvZGVmYXVsdC1ldmVudC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9mb3JlYWNoL2RlZmF1bHQtZm9yZWFjaC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9iaW5kcy9jaGVja2JveC1yYWRpby1iaW5kLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2JpbmRzL2lucHV0LWJpbmQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vY2xhc3MtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vcmVwZWF0LWF0dHInKSxcbiAgICByZXF1aXJlKCcuL3Bvc2l0aXZlLWJvb2xlYW4tYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vbmVnYXRpdmUtYm9vbGVhbi1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9iaW5kcy9kZWZhdWx0LWJpbmQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZGVmYXVsdC1hdHRyJylcbl07XG5cbnZhciBoYW5kbGVyc0xpc3QgPSBbXTtcblxudmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uIChhdHRyaWJ1dGVNYXRjaGVyLCBub2RlTWF0Y2hlciwgaGFuZGxlcikge1xuICAgIGlmICghbm9kZU1hdGNoZXIpIHtcbiAgICAgICAgbm9kZU1hdGNoZXIgPSAnKic7XG4gICAgfVxuICAgIGlmIChfLmlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICAgICAgaGFuZGxlciA9IHtcbiAgICAgICAgICAgIGhhbmRsZTogaGFuZGxlclxuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gJC5leHRlbmQoaGFuZGxlciwgeyB0ZXN0OiBhdHRyaWJ1dGVNYXRjaGVyLCB0YXJnZXQ6IG5vZGVNYXRjaGVyIH0pO1xufTtcblxuJC5lYWNoKGRlZmF1bHRIYW5kbGVycywgZnVuY3Rpb24gKGluZGV4LCBoYW5kbGVyKSB7XG4gICAgaGFuZGxlcnNMaXN0LnB1c2gobm9ybWFsaXplKGhhbmRsZXIudGVzdCwgaGFuZGxlci50YXJnZXQsIGhhbmRsZXIpKTtcbn0pO1xuXG5cbnZhciBtYXRjaEF0dHIgPSBmdW5jdGlvbiAobWF0Y2hFeHByLCBhdHRyLCAkZWwpIHtcbiAgICB2YXIgYXR0ck1hdGNoO1xuXG4gICAgaWYgKF8uaXNTdHJpbmcobWF0Y2hFeHByKSkge1xuICAgICAgICBhdHRyTWF0Y2ggPSAobWF0Y2hFeHByID09PSAnKicgfHwgKG1hdGNoRXhwci50b0xvd2VyQ2FzZSgpID09PSBhdHRyLnRvTG93ZXJDYXNlKCkpKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbihtYXRjaEV4cHIpKSB7XG4gICAgICAgIC8vVE9ETzogcmVtb3ZlIGVsZW1lbnQgc2VsZWN0b3JzIGZyb20gYXR0cmlidXRlc1xuICAgICAgICBhdHRyTWF0Y2ggPSBtYXRjaEV4cHIoYXR0ciwgJGVsKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNSZWdFeHAobWF0Y2hFeHByKSkge1xuICAgICAgICBhdHRyTWF0Y2ggPSBhdHRyLm1hdGNoKG1hdGNoRXhwcik7XG4gICAgfVxuICAgIHJldHVybiBhdHRyTWF0Y2g7XG59O1xuXG52YXIgbWF0Y2hOb2RlID0gZnVuY3Rpb24gKHRhcmdldCwgbm9kZUZpbHRlcikge1xuICAgIHJldHVybiAoXy5pc1N0cmluZyhub2RlRmlsdGVyKSkgPyAobm9kZUZpbHRlciA9PT0gdGFyZ2V0KSA6IG5vZGVGaWx0ZXIuaXModGFyZ2V0KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxpc3Q6IGhhbmRsZXJzTGlzdCxcbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgYXR0cmlidXRlIGhhbmRsZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd8RnVuY3Rpb258UmVnZXh9IGF0dHJpYnV0ZU1hdGNoZXIgRGVzY3JpcHRpb24gb2Ygd2hpY2ggYXR0cmlidXRlcyB0byBtYXRjaC5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IG5vZGVNYXRjaGVyIFdoaWNoIG5vZGVzIHRvIGFkZCBhdHRyaWJ1dGVzIHRvLiBVc2UgW2pxdWVyeSBTZWxlY3RvciBzeW50YXhdKGh0dHBzOi8vYXBpLmpxdWVyeS5jb20vY2F0ZWdvcnkvc2VsZWN0b3JzLykuXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb258T2JqZWN0fSBoYW5kbGVyIElmIGBoYW5kbGVyYCBpcyBhIGZ1bmN0aW9uLCB0aGUgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggYCRlbGVtZW50YCBhcyBjb250ZXh0LCBhbmQgYXR0cmlidXRlIHZhbHVlICsgbmFtZS4gSWYgYGhhbmRsZXJgIGlzIGFuIG9iamVjdCwgaXQgc2hvdWxkIGluY2x1ZGUgdHdvIGZ1bmN0aW9ucywgYW5kIGhhdmUgdGhlIGZvcm06IGB7IGluaXQ6IGZuLCAgaGFuZGxlOiBmbiB9YC4gVGhlIGBpbml0YCBmdW5jdGlvbiBpcyBjYWxsZWQgd2hlbiB0aGUgcGFnZSBsb2FkczsgdXNlIHRoaXMgdG8gZGVmaW5lIGV2ZW50IGhhbmRsZXJzLiBUaGUgYGhhbmRsZWAgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggYCRlbGVtZW50YCBhcyBjb250ZXh0LCBhbmQgYXR0cmlidXRlIHZhbHVlICsgbmFtZS5cbiAgICAgKi9cbiAgICByZWdpc3RlcjogZnVuY3Rpb24gKGF0dHJpYnV0ZU1hdGNoZXIsIG5vZGVNYXRjaGVyLCBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXJzTGlzdC51bnNoaWZ0KG5vcm1hbGl6ZS5hcHBseShudWxsLCBhcmd1bWVudHMpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmluZCBhbiBhdHRyaWJ1dGUgbWF0Y2hlciBtYXRjaGluZyBzb21lIGNyaXRlcmlhLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBhdHRyRmlsdGVyIEF0dHJpYnV0ZSB0byBtYXRjaC5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd8JGVsfSBub2RlRmlsdGVyIE5vZGUgdG8gbWF0Y2guXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtBcnJheXxOdWxsfSBBbiBhcnJheSBvZiBtYXRjaGluZyBhdHRyaWJ1dGUgaGFuZGxlcnMsIG9yIG51bGwgaWYgbm8gbWF0Y2hlcyBmb3VuZC5cbiAgICAgKi9cbiAgICBmaWx0ZXI6IGZ1bmN0aW9uIChhdHRyRmlsdGVyLCBub2RlRmlsdGVyKSB7XG4gICAgICAgIHZhciBmaWx0ZXJlZCA9IF8uc2VsZWN0KGhhbmRsZXJzTGlzdCwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaEF0dHIoaGFuZGxlci50ZXN0LCBhdHRyRmlsdGVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChub2RlRmlsdGVyKSB7XG4gICAgICAgICAgICBmaWx0ZXJlZCA9IF8uc2VsZWN0KGZpbHRlcmVkLCBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaE5vZGUoaGFuZGxlci50YXJnZXQsIG5vZGVGaWx0ZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZpbHRlcmVkO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXBsYWNlIGFuIGV4aXN0aW5nIGF0dHJpYnV0ZSBoYW5kbGVyLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBhdHRyRmlsdGVyIEF0dHJpYnV0ZSB0byBtYXRjaC5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmcgfCAkZWx9IG5vZGVGaWx0ZXIgTm9kZSB0byBtYXRjaC5cbiAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbnxPYmplY3R9IGhhbmRsZXIgVGhlIHVwZGF0ZWQgYXR0cmlidXRlIGhhbmRsZXIuIElmIGBoYW5kbGVyYCBpcyBhIGZ1bmN0aW9uLCB0aGUgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggYCRlbGVtZW50YCBhcyBjb250ZXh0LCBhbmQgYXR0cmlidXRlIHZhbHVlICsgbmFtZS4gSWYgYGhhbmRsZXJgIGlzIGFuIG9iamVjdCwgaXQgc2hvdWxkIGluY2x1ZGUgdHdvIGZ1bmN0aW9ucywgYW5kIGhhdmUgdGhlIGZvcm06IGB7IGluaXQ6IGZuLCAgaGFuZGxlOiBmbiB9YC4gVGhlIGBpbml0YCBmdW5jdGlvbiBpcyBjYWxsZWQgd2hlbiB0aGUgcGFnZSBsb2FkczsgdXNlIHRoaXMgdG8gZGVmaW5lIGV2ZW50IGhhbmRsZXJzLiBUaGUgYGhhbmRsZWAgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggYCRlbGVtZW50YCBhcyBjb250ZXh0LCBhbmQgYXR0cmlidXRlIHZhbHVlICsgbmFtZS5cbiAgICAgKi9cbiAgICByZXBsYWNlOiBmdW5jdGlvbiAoYXR0ckZpbHRlciwgbm9kZUZpbHRlciwgaGFuZGxlcikge1xuICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgIF8uZWFjaChoYW5kbGVyc0xpc3QsIGZ1bmN0aW9uIChjdXJyZW50SGFuZGxlciwgaSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoQXR0cihjdXJyZW50SGFuZGxlci50ZXN0LCBhdHRyRmlsdGVyKSAmJiBtYXRjaE5vZGUoY3VycmVudEhhbmRsZXIudGFyZ2V0LCBub2RlRmlsdGVyKSkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBoYW5kbGVyc0xpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoYXR0ckZpbHRlciwgbm9kZUZpbHRlciwgaGFuZGxlcikpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgUmV0cmlldmUgdGhlIGFwcHJvcHJpYXRlIGhhbmRsZXIgZm9yIGEgcGFydGljdWxhciBhdHRyaWJ1dGUuIFRoZXJlIG1heSBiZSBtdWx0aXBsZSBtYXRjaGluZyBoYW5kbGVycywgYnV0IHRoZSBmaXJzdCAobW9zdCBleGFjdCkgbWF0Y2ggaXMgYWx3YXlzIHVzZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHkgVGhlIGF0dHJpYnV0ZS5cbiAgICAgKiBAcGFyYW0geyRlbH0gJGVsIFRoZSBET00gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIGF0dHJpYnV0ZSBoYW5kbGVyLlxuICAgICAqL1xuICAgIGdldEhhbmRsZXI6IGZ1bmN0aW9uIChwcm9wZXJ0eSwgJGVsKSB7XG4gICAgICAgIHZhciBmaWx0ZXJlZCA9IHRoaXMuZmlsdGVyKHByb3BlcnR5LCAkZWwpO1xuICAgICAgICAvL1RoZXJlIGNvdWxkIGJlIG11bHRpcGxlIG1hdGNoZXMsIGJ1dCB0aGUgdG9wIGZpcnN0IGhhcyB0aGUgbW9zdCBwcmlvcml0eVxuICAgICAgICByZXR1cm4gZmlsdGVyZWRbMF07XG4gICAgfVxufTtcblxuIiwiLyoqXG4gKiAjIyBDaGVja2JveGVzIGFuZCBSYWRpbyBCdXR0b25zXG4gKlxuICogSW4gdGhlIFtkZWZhdWx0IGNhc2VdKC4uL2RlZmF1bHQtYmluZC1hdHRyLyksIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZSBjcmVhdGVzIGEgYmktZGlyZWN0aW9uYWwgYmluZGluZyBiZXR3ZWVuIHRoZSBET00gZWxlbWVudCBhbmQgdGhlIG1vZGVsIHZhcmlhYmxlLiBUaGlzIGJpbmRpbmcgaXMgKipiaS1kaXJlY3Rpb25hbCoqLCBtZWFuaW5nIHRoYXQgYXMgdGhlIG1vZGVsIGNoYW5nZXMsIHRoZSBpbnRlcmZhY2UgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkOyBhbmQgd2hlbiBlbmQgdXNlcnMgY2hhbmdlIHZhbHVlcyBpbiB0aGUgaW50ZXJmYWNlLCB0aGUgbW9kZWwgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkLlxuICpcbiAqIEZsb3cuanMgcHJvdmlkZXMgc3BlY2lhbCBoYW5kbGluZyBmb3IgRE9NIGVsZW1lbnRzIHdpdGggYHR5cGU9XCJjaGVja2JveFwiYCBhbmQgYHR5cGU9XCJyYWRpb1wiYC5cbiAqXG4gKiBJbiBwYXJ0aWN1bGFyLCBpZiB5b3UgYWRkIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZSB0byBhbiBgaW5wdXRgIHdpdGggYHR5cGU9XCJjaGVja2JveFwiYCBhbmQgYHR5cGU9XCJyYWRpb1wiYCwgdGhlIGNoZWNrYm94IG9yIHJhZGlvIGJ1dHRvbiBpcyBhdXRvbWF0aWNhbGx5IHNlbGVjdGVkIGlmIHRoZSBgdmFsdWVgIG1hdGNoZXMgdGhlIHZhbHVlIG9mIHRoZSBtb2RlbCB2YXJpYWJsZSByZWZlcmVuY2VkLCBvciBpZiB0aGUgbW9kZWwgdmFyaWFibGUgaXMgYHRydWVgLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8IS0tIHJhZGlvIGJ1dHRvbiwgc2VsZWN0ZWQgaWYgc2FtcGxlSW50IGlzIDggLS0+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwicmFkaW9cIiBkYXRhLWYtYmluZD1cInNhbXBsZUludFwiIHZhbHVlPVwiOFwiIC8+XG4gKlxuICogICAgICA8IS0tIGNoZWNrYm94LCBjaGVja2VkIGlmIHNhbXBsZUJvb2wgaXMgdHJ1ZSAtLT5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGRhdGEtZi1iaW5kPVwic2FtcGxlQm9vbFwiIC8+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICc6Y2hlY2tib3gsOnJhZGlvJyxcblxuICAgIHRlc3Q6ICdiaW5kJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzZXR0YWJsZVZhbHVlID0gdGhpcy5hdHRyKCd2YWx1ZScpOyAvL2luaXRpYWwgdmFsdWVcbiAgICAgICAgLypqc2xpbnQgZXFlcTogdHJ1ZSovXG4gICAgICAgIHZhciBpc0NoZWNrZWQgPSAoc2V0dGFibGVWYWx1ZSAhPT0gdW5kZWZpbmVkKSA/IChzZXR0YWJsZVZhbHVlID09IHZhbHVlKSA6ICEhdmFsdWU7XG4gICAgICAgIHRoaXMucHJvcCgnY2hlY2tlZCcsIGlzQ2hlY2tlZCk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgRGVmYXVsdCBCaS1kaXJlY3Rpb25hbCBCaW5kaW5nOiBkYXRhLWYtYmluZFxuICpcbiAqIFRoZSBtb3N0IGNvbW1vbmx5IHVzZWQgYXR0cmlidXRlIHByb3ZpZGVkIGJ5IEZsb3cuanMgaXMgdGhlIGBkYXRhLWYtYmluZGAgYXR0cmlidXRlLlxuICpcbiAqICMjIyNkYXRhLWYtYmluZCB3aXRoIGEgc2luZ2xlIHZhbHVlXG4gKlxuICogWW91IGNhbiBiaW5kIHZhcmlhYmxlcyBmcm9tIHRoZSBtb2RlbCBpbiB5b3VyIGludGVyZmFjZSBieSBzZXR0aW5nIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZS4gVGhpcyBhdHRyaWJ1dGUgYmluZGluZyBpcyBiaS1kaXJlY3Rpb25hbCwgbWVhbmluZyB0aGF0IGFzIHRoZSBtb2RlbCBjaGFuZ2VzLCB0aGUgaW50ZXJmYWNlIGlzIGF1dG9tYXRpY2FsbHkgdXBkYXRlZDsgYW5kIHdoZW4gdXNlcnMgY2hhbmdlIHZhbHVlcyBpbiB0aGUgaW50ZXJmYWNlLCB0aGUgbW9kZWwgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkLiBTcGVjaWZpY2FsbHk6XG4gKlxuICogKiBUaGUgYmluZGluZyBmcm9tIHRoZSBtb2RlbCB0byB0aGUgaW50ZXJmYWNlIGVuc3VyZXMgdGhhdCB0aGUgY3VycmVudCB2YWx1ZSBvZiB0aGUgdmFyaWFibGUgaXMgZGlzcGxheWVkIGluIHRoZSBIVE1MIGVsZW1lbnQuIFRoaXMgaW5jbHVkZXMgYXV0b21hdGljIHVwZGF0ZXMgdG8gdGhlIGRpc3BsYXllZCB2YWx1ZSBpZiBzb21ldGhpbmcgZWxzZSBjaGFuZ2VzIGluIHRoZSBtb2RlbC5cbiAqXG4gKiAqIFRoZSBiaW5kaW5nIGZyb20gdGhlIGludGVyZmFjZSB0byB0aGUgbW9kZWwgZW5zdXJlcyB0aGF0IGlmIHRoZSBIVE1MIGVsZW1lbnQgaXMgZWRpdGFibGUsIGNoYW5nZXMgYXJlIHNlbnQgdG8gdGhlIG1vZGVsLlxuICpcbiAqIE9uY2UgeW91IHNldCBgZGF0YS1mLWJpbmRgLCBGbG93LmpzIGZpZ3VyZXMgb3V0IHRoZSBhcHByb3ByaWF0ZSBhY3Rpb24gdG8gdGFrZSBiYXNlZCBvbiB0aGUgZWxlbWVudCB0eXBlIGFuZCB0aGUgZGF0YSByZXNwb25zZSBmcm9tIHlvdXIgbW9kZWwuXG4gKlxuICogKipUbyBkaXNwbGF5IGFuZCBhdXRvbWF0aWNhbGx5IHVwZGF0ZSBhIHZhcmlhYmxlIGluIHRoZSBpbnRlcmZhY2U6KipcbiAqXG4gKiAxLiBBZGQgdGhlIGBkYXRhLWYtYmluZGAgYXR0cmlidXRlIHRvIGFueSBIVE1MIGVsZW1lbnQgdGhhdCBub3JtYWxseSB0YWtlcyBhIHZhbHVlLlxuICogMi4gU2V0IHRoZSB2YWx1ZSBvZiB0aGUgYGRhdGEtZi1iaW5kYCBhdHRyaWJ1dGUgdG8gdGhlIG5hbWUgb2YgdGhlIHZhcmlhYmxlLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8c3BhbiBkYXRhLWYtYmluZD1cInNhbGVzTWFuYWdlci5uYW1lXCIgLz5cbiAqXG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwic2FtcGxlU3RyaW5nXCIgLz5cbiAqXG4gKiAqKk5vdGVzOioqXG4gKlxuICogKiBVc2Ugc3F1YXJlIGJyYWNrZXRzLCBgW11gLCB0byByZWZlcmVuY2UgYXJyYXllZCB2YXJpYWJsZXM6IGBzYWxlc1tXZXN0XWAuXG4gKiAqIFVzZSBhbmdsZSBicmFja2V0cywgYDw+YCwgdG8gcmVmZXJlbmNlIG90aGVyIHZhcmlhYmxlcyBpbiB5b3VyIGFycmF5IGluZGV4OiBgc2FsZXNbPGN1cnJlbnRSZWdpb24+XWAuXG4gKiAqIFJlbWVtYmVyIHRoYXQgaWYgeW91ciBtb2RlbCBpcyBpbiBWZW5zaW0sIHRoZSB0aW1lIHN0ZXAgY2FuIGJlIHRoZSBmaXJzdCBhcnJheSBpbmRleCBvciB0aGUgbGFzdCBhcnJheSBpbmRleCwgZGVwZW5kaW5nIG9uIHlvdXIgW21vZGVsLmNmZ10oLi4vLi4vLi4vLi4vLi4vLi4vbW9kZWxfY29kZS92ZW5zaW0vI2NyZWF0aW5nLWNmZykgZmlsZS5cbiAqICogQnkgZGVmYXVsdCwgYWxsIEhUTUwgZWxlbWVudHMgdXBkYXRlIGZvciBhbnkgY2hhbmdlIGZvciBlYWNoIHZhcmlhYmxlLiBIb3dldmVyLCB5b3UgY2FuIHByZXZlbnQgdGhlIHVzZXIgaW50ZXJmYWNlIGZyb20gdXBkYXRpbmcgJm1kYXNoOyBlaXRoZXIgZm9yIGFsbCB2YXJpYWJsZXMgb3IgZm9yIHBhcnRpY3VsYXIgdmFyaWFibGVzICZtZGFzaDsgYnkgc2V0dGluZyB0aGUgYHNpbGVudGAgcHJvcGVydHkgd2hlbiB5b3UgaW5pdGlhbGl6ZSBGbG93LmpzLiBTZWUgbW9yZSBvbiBbYWRkaXRpb25hbCBvcHRpb25zIGZvciB0aGUgRmxvdy5pbml0aWFsaXplKCkgbWV0aG9kXSguLi8uLi8uLi8uLi8uLi8jY3VzdG9tLWluaXRpYWxpemUpLlxuICpcbiAqICMjIyNkYXRhLWYtYmluZCB3aXRoIG11bHRpcGxlIHZhbHVlcyBhbmQgdGVtcGxhdGVzXG4gKlxuICogSWYgeW91IGhhdmUgbXVsdGlwbGUgdmFyaWFibGVzLCB5b3UgY2FuIHVzZSB0aGUgc2hvcnRjdXQgb2YgbGlzdGluZyBtdWx0aXBsZSB2YXJpYWJsZXMgaW4gYW4gZW5jbG9zaW5nIEhUTUwgZWxlbWVudCBhbmQgdGhlbiByZWZlcmVuY2luZyBlYWNoIHZhcmlhYmxlIHVzaW5nIHRlbXBsYXRlcy4gKFRlbXBsYXRlcyBhcmUgYXZhaWxhYmxlIGFzIHBhcnQgb2YgRmxvdy5qcydzIGxvZGFzaCBkZXBlbmRlbmN5LiBTZWUgbW9yZSBiYWNrZ3JvdW5kIG9uIFt3b3JraW5nIHdpdGggdGVtcGxhdGVzXSguLi8uLi8uLi8uLi8uLi8jdGVtcGxhdGVzKS4pXG4gKlxuICogKipUbyBkaXNwbGF5IGFuZCBhdXRvbWF0aWNhbGx5IHVwZGF0ZSBtdWx0aXBsZSB2YXJpYWJsZXMgaW4gdGhlIGludGVyZmFjZToqKlxuICpcbiAqIDEuIEFkZCB0aGUgYGRhdGEtZi1iaW5kYCBhdHRyaWJ1dGUgdG8gYW55IEhUTUwgZWxlbWVudCBmcm9tIHdoaWNoIHlvdSB3YW50IHRvIHJlZmVyZW5jZSBtb2RlbCB2YXJpYWJsZXMsIHN1Y2ggYXMgYSBgZGl2YCBvciBgdGFibGVgLlxuICogMi4gU2V0IHRoZSB2YWx1ZSBvZiB0aGUgYGRhdGEtZi1iaW5kYCBhdHRyaWJ1dGUgaW4geW91ciB0b3AtbGV2ZWwgSFRNTCBlbGVtZW50IHRvIGEgY29tbWEtc2VwYXJhdGVkIGxpc3Qgb2YgdGhlIHZhcmlhYmxlcy4gKFRoZSB2YXJpYWJsZXMgbWF5IG9yIG1heSBub3QgYmUgY2FzZS1zZW5zaXRpdmUsIGRlcGVuZGluZyBvbiB5b3VyIG1vZGVsaW5nIGxhbmd1YWdlLilcbiAqXG4gKiAzLiBJbnNpZGUgdGhlIEhUTUwgZWxlbWVudCwgdXNlIHRlbXBsYXRlcyAoYDwlPSAlPmApIHRvIHJlZmVyZW5jZSB0aGUgc3BlY2lmaWMgdmFyaWFibGUgbmFtZXMuIFRoZXNlIHZhcmlhYmxlIG5hbWVzIGFyZSBjYXNlLXNlbnNpdGl2ZTogdGhleSBzaG91bGQgbWF0Y2ggdGhlIGNhc2UgeW91IHVzZWQgaW4gdGhlIGBkYXRhLWYtYmluZGAgaW4gc3RlcCAyLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8IS0tIG1ha2UgdGhlc2UgdGhyZWUgbW9kZWwgdmFyaWFibGVzIGF2YWlsYWJsZSB0aHJvdWdob3V0IGRpdiAtLT5cbiAqXG4gKiAgICAgIDxkaXYgZGF0YS1mLWJpbmQ9XCJDdXJyZW50WWVhciwgUmV2ZW51ZSwgUHJvZml0XCI+XG4gKiAgICAgICAgICBJbiA8JT0gQ3VycmVudFllYXIgJT4sXG4gKiAgICAgICAgICBvdXIgY29tcGFueSBlYXJuZWQgPCU9IFJldmVudWUgJT4sXG4gKiAgICAgICAgICByZXN1bHRpbmcgaW4gPCU9IFByb2ZpdCAlPiBwcm9maXQuXG4gKiAgICAgIDwvZGl2PlxuICpcbiAqIFRoaXMgZXhhbXBsZSBpcyBzaG9ydGhhbmQgZm9yIHJlcGVhdGVkbHkgdXNpbmcgZGF0YS1mLWJpbmQuIEZvciBpbnN0YW5jZSwgdGhpcyBjb2RlIGFsc28gZ2VuZXJhdGVzIHRoZSBzYW1lIG91dHB1dDpcbiAqXG4gKiAgICAgIDxkaXY+XG4gKiAgICAgICAgICBJbiA8c3BhbiBkYXRhLWYtYmluZD1cIkN1cnJlbnRZZWFyXCI+PC9zcGFuPixcbiAqICAgICAgICAgIG91ciBjb21wYW55IGVhcm5lZCA8c3BhbiBkYXRhLWYtYmluZD1cIlJldmVudWVcIj48L3NwYW4+LFxuICogICAgICAgICAgcmVzdWx0aW5nIGluIDxzcGFuIGRhdGEtZi1iaW5kPVwiUHJvZml0XCI+IHByb2ZpdDwvc3Bhbj4uXG4gKiAgICAgIDwvZGl2PlxuICpcbiAqICoqTm90ZXM6KipcbiAqXG4gKiAqIEFkZGluZyBgZGF0YS1mLWJpbmRgIHRvIHRoZSBlbmNsb3NpbmcgSFRNTCBlbGVtZW50IHJhdGhlciB0aGFuIHJlcGVhdGVkbHkgdXNpbmcgaXQgd2l0aGluIHRoZSBlbGVtZW50IGlzIGEgY29kZSBzdHlsZSBwcmVmZXJlbmNlLiBJbiBtYW55IGNhc2VzLCBhZGRpbmcgYGRhdGEtZi1iaW5kYCBhdCB0aGUgdG9wIGxldmVsLCBhcyBpbiB0aGUgZmlyc3QgZXhhbXBsZSwgY2FuIG1ha2UgeW91ciBjb2RlIGVhc2llciB0byByZWFkIGFuZCBtYWludGFpbi5cbiAqICogSG93ZXZlciwgeW91IG1pZ2h0IGNob29zZSB0byByZXBlYXRlZGx5IHVzZSBgZGF0YS1mLWJpbmRgIGluIHNvbWUgY2FzZXMsIGZvciBleGFtcGxlIGlmIHlvdSB3YW50IGRpZmZlcmVudCBbZm9ybWF0dGluZ10oLi4vLi4vLi4vLi4vLi4vY29udmVydGVyLW92ZXJ2aWV3LykgZm9yIGRpZmZlcmVudCB2YXJpYWJsZXM6XG4gKlxuICogICAgICAgICAgPGRpdj5cbiAqICAgICAgICAgICAgICBJbiA8c3BhbiBkYXRhLWYtYmluZD1cIkN1cnJlbnRZZWFyIHwgI1wiPjwvc3Bhbj4sXG4gKiAgICAgICAgICAgICAgb3VyIGNvbXBhbnkgZWFybmVkIDxzcGFuIGRhdGEtZi1iaW5kPVwiUmV2ZW51ZSB8ICQjLCMjI1wiPjwvc3Bhbj5cbiAqICAgICAgICAgIDwvZGl2PlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAnYmluZCcsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgdGVtcGxhdGVkO1xuICAgICAgICB2YXIgdmFsdWVUb1RlbXBsYXRlID0gJC5leHRlbmQoe30sIHZhbHVlKTtcbiAgICAgICAgaWYgKCEkLmlzUGxhaW5PYmplY3QodmFsdWUpKSB7XG4gICAgICAgICAgICB2YXIgdmFyaWFibGVOYW1lID0gdGhpcy5kYXRhKCdmLWJpbmQnKTsvL0hhY2sgYmVjYXVzZSBpIGRvbid0IGhhdmUgYWNjZXNzIHRvIHZhcmlhYmxlIG5hbWUgaGVyZSBvdGhlcndpc2VcbiAgICAgICAgICAgIHZhbHVlVG9UZW1wbGF0ZSA9IHsgdmFsdWU6IHZhbHVlIH07XG4gICAgICAgICAgICB2YWx1ZVRvVGVtcGxhdGVbdmFyaWFibGVOYW1lXSA9IHZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWVUb1RlbXBsYXRlLnZhbHVlID0gdmFsdWU7IC8vSWYgdGhlIGtleSBoYXMgJ3dlaXJkJyBjaGFyYWN0ZXJzIGxpa2UgJzw+JyBoYXJkIHRvIGdldCBhdCB3aXRoIGEgdGVtcGxhdGUgb3RoZXJ3aXNlXG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJpbmRUZW1wbGF0ZSA9IHRoaXMuZGF0YSgnYmluZC10ZW1wbGF0ZScpO1xuICAgICAgICBpZiAoYmluZFRlbXBsYXRlKSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZWQgPSBfLnRlbXBsYXRlKGJpbmRUZW1wbGF0ZSwgdmFsdWVUb1RlbXBsYXRlKTtcbiAgICAgICAgICAgIHRoaXMuaHRtbCh0ZW1wbGF0ZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG9sZEhUTUwgPSB0aGlzLmh0bWwoKTtcbiAgICAgICAgICAgIHZhciBjbGVhbmVkSFRNTCA9IG9sZEhUTUwucmVwbGFjZSgvJmx0Oy9nLCAnPCcpLnJlcGxhY2UoLyZndDsvZywgJz4nKTtcbiAgICAgICAgICAgIHRlbXBsYXRlZCA9IF8udGVtcGxhdGUoY2xlYW5lZEhUTUwsIHZhbHVlVG9UZW1wbGF0ZSk7XG4gICAgICAgICAgICBpZiAoY2xlYW5lZEhUTUwgPT09IHRlbXBsYXRlZCkgeyAvL3RlbXBsYXRpbmcgZGlkIG5vdGhpbmdcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YWx1ZSA9ICgkLmlzUGxhaW5PYmplY3QodmFsdWUpKSA/IEpTT04uc3RyaW5naWZ5KHZhbHVlKSA6IHZhbHVlICsgJyc7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sKHZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhKCdiaW5kLXRlbXBsYXRlJywgY2xlYW5lZEhUTUwpO1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbCh0ZW1wbGF0ZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgSW5wdXRzIGFuZCBTZWxlY3RzXG4gKlxuICogSW4gdGhlIFtkZWZhdWx0IGNhc2VdKC4uL2RlZmF1bHQtYmluZC1hdHRyLyksIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZSBjcmVhdGVzIGEgYmktZGlyZWN0aW9uYWwgYmluZGluZyBiZXR3ZWVuIHRoZSBET00gZWxlbWVudCBhbmQgdGhlIG1vZGVsIHZhcmlhYmxlLiBUaGlzIGJpbmRpbmcgaXMgKipiaS1kaXJlY3Rpb25hbCoqLCBtZWFuaW5nIHRoYXQgYXMgdGhlIG1vZGVsIGNoYW5nZXMsIHRoZSBpbnRlcmZhY2UgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkOyBhbmQgd2hlbiBlbmQgdXNlcnMgY2hhbmdlIHZhbHVlcyBpbiB0aGUgaW50ZXJmYWNlLCB0aGUgbW9kZWwgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkLlxuICpcbiAqIEZsb3cuanMgcHJvdmlkZXMgc3BlY2lhbCBoYW5kbGluZyBmb3IgRE9NIGVsZW1lbnRzIGBpbnB1dGAgYW5kIGBzZWxlY3RgLlxuICpcbiAqIEluIHBhcnRpY3VsYXIsIGlmIHlvdSBhZGQgdGhlIGBkYXRhLWYtYmluZGAgYXR0cmlidXRlIHRvIGEgYHNlbGVjdGAgb3IgYGlucHV0YCBlbGVtZW50LCB0aGUgb3B0aW9uIG1hdGNoaW5nIHRoZSB2YWx1ZSBvZiB0aGUgbW9kZWwgdmFyaWFibGUgaXMgYXV0b21hdGljYWxseSBzZWxlY3RlZC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqIFx0XHQ8IS0tIG9wdGlvbiBzZWxlY3RlZCBpZiBzYW1wbGVfaW50IGlzIDgsIDEwLCBvciAxMiAtLT5cbiAqIFx0XHQ8c2VsZWN0IGRhdGEtZi1iaW5kPVwic2FtcGxlX2ludFwiPlxuICogXHRcdFx0PG9wdGlvbiB2YWx1ZT1cIjhcIj4gOCA8L29wdGlvbj5cbiAqIFx0XHRcdDxvcHRpb24gdmFsdWU9XCIxMFwiPiAxMCA8L29wdGlvbj5cbiAqIFx0XHRcdDxvcHRpb24gdmFsdWU9XCIxMlwiPiAxMiA8L29wdGlvbj5cbiAqIFx0XHQ8L3NlbGVjdD5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICB0YXJnZXQ6ICdpbnB1dCwgc2VsZWN0JyxcblxuICAgIHRlc3Q6ICdiaW5kJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudmFsKHZhbHVlKTtcbiAgICB9XG59O1xuIiwiLyoqXG4gKiAjIyBDbGFzcyBBdHRyaWJ1dGU6IGRhdGEtZi1jbGFzc1xuICpcbiAqIFlvdSBjYW4gYmluZCBtb2RlbCB2YXJpYWJsZXMgdG8gbmFtZXMgb2YgQ1NTIGNsYXNzZXMsIHNvIHRoYXQgeW91IGNhbiBlYXNpbHkgY2hhbmdlIHRoZSBzdHlsaW5nIG9mIEhUTUwgZWxlbWVudHMgYmFzZWQgb24gdGhlIHZhbHVlcyBvZiBtb2RlbCB2YXJpYWJsZXMuXG4gKlxuICogKipUbyBiaW5kIG1vZGVsIHZhcmlhYmxlcyB0byBDU1MgY2xhc3NlczoqKlxuICpcbiAqIDEuIEFkZCB0aGUgYGRhdGEtZi1jbGFzc2AgYXR0cmlidXRlIHRvIGFuIEhUTUwgZWxlbWVudC5cbiAqIDIuIFNldCB0aGUgdmFsdWUgdG8gdGhlIG5hbWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlLlxuICogMy4gT3B0aW9uYWxseSwgYWRkIGFuIGFkZGl0aW9uYWwgYGNsYXNzYCBhdHRyaWJ1dGUgdG8gdGhlIEhUTUwgZWxlbWVudC5cbiAqICAgICAgKiBJZiB5b3Ugb25seSB1c2UgdGhlIGBkYXRhLWYtY2xhc3NgIGF0dHJpYnV0ZSwgdGhlIHZhbHVlIG9mIGBkYXRhLWYtY2xhc3NgIGlzIHRoZSBjbGFzcyBuYW1lLlxuICogICAgICAqIElmIHlvdSAqYWxzbyogYWRkIGEgYGNsYXNzYCBhdHRyaWJ1dGUsIHRoZSB2YWx1ZSBvZiBgZGF0YS1mLWNsYXNzYCBpcyAqYXBwZW5kZWQqIHRvIHRoZSBjbGFzcyBuYW1lLlxuICogNC4gQWRkIGNsYXNzZXMgdG8geW91ciBDU1MgY29kZSB3aG9zZSBuYW1lcyBpbmNsdWRlIHBvc3NpYmxlIHZhbHVlcyBvZiB0aGF0IG1vZGVsIHZhcmlhYmxlLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8c3R5bGUgdHlwZT1cInRleHQvY3NzXCI+XG4gKiAgICAgICAgICAuTm9ydGggeyBjb2xvcjogZ3JleSB9XG4gKiAgICAgICAgICAuU291dGggeyBjb2xvcjogcHVycGxlIH1cbiAqICAgICAgICAgIC5FYXN0IHsgY29sb3I6IGJsdWUgfVxuICogICAgICAgICAgLldlc3QgeyBjb2xvcjogb3JhbmdlIH1cbiAqICAgICAgICAgIC5zYWxlcy5nb29kIHsgY29sb3I6IGdyZWVuIH1cbiAqICAgICAgICAgIC5zYWxlcy5iYWQgeyBjb2xvcjogcmVkIH1cbiAqICAgICAgICAgIC5zYWxlcy52YWx1ZS0xMDAgeyBjb2xvcjogeWVsbG93IH1cbiAqICAgICAgIDwvc3R5bGU+XG4gKlxuICogICAgICAgPGRpdiBkYXRhLWYtY2xhc3M9XCJzYWxlc01nci5yZWdpb25cIj5cbiAqICAgICAgICAgICBDb250ZW50IGNvbG9yZWQgYnkgcmVnaW9uXG4gKiAgICAgICA8L2Rpdj5cbiAqXG4gKiAgICAgICA8ZGl2IGRhdGEtZi1jbGFzcz1cInNhbGVzTWdyLnBlcmZvcm1hbmNlXCIgY2xhc3M9XCJzYWxlc1wiPlxuICogICAgICAgICAgIENvbnRlbnQgZ3JlZW4gaWYgc2FsZXNNZ3IucGVyZm9ybWFuY2UgaXMgZ29vZCwgcmVkIGlmIGJhZFxuICogICAgICAgPC9kaXY+XG4gKlxuICogICAgICAgPGRpdiBkYXRhLWYtY2xhc3M9XCJzYWxlc01nci5udW1SZWdpb25zXCIgY2xhc3M9XCJzYWxlc1wiPlxuICogICAgICAgICAgIENvbnRlbnQgeWVsbG93IGlmIHNhbGVzTWdyLm51bVJlZ2lvbnMgaXMgMTAwXG4gKiAgICAgICA8L2Rpdj5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRlc3Q6ICdjbGFzcycsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFkZGVkQ2xhc3NlcyA9IHRoaXMuZGF0YSgnYWRkZWQtY2xhc3NlcycpO1xuICAgICAgICBpZiAoIWFkZGVkQ2xhc3Nlcykge1xuICAgICAgICAgICAgYWRkZWRDbGFzc2VzID0ge307XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFkZGVkQ2xhc3Nlc1twcm9wXSkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVDbGFzcyhhZGRlZENsYXNzZXNbcHJvcF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8uaXNOdW1iZXIodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9ICd2YWx1ZS0nICsgdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgYWRkZWRDbGFzc2VzW3Byb3BdID0gdmFsdWU7XG4gICAgICAgIC8vRml4bWU6IHByb3AgaXMgYWx3YXlzIFwiY2xhc3NcIlxuICAgICAgICB0aGlzLmFkZENsYXNzKHZhbHVlKTtcbiAgICAgICAgdGhpcy5kYXRhKCdhZGRlZC1jbGFzc2VzJywgYWRkZWRDbGFzc2VzKTtcbiAgICB9XG59O1xuIiwiLyoqXG4gKiAjIyBEZWZhdWx0IEF0dHJpYnV0ZSBIYW5kbGluZzogUmVhZC1vbmx5IEJpbmRpbmdcbiAqXG4gKiBGbG93LmpzIHVzZXMgdGhlIEhUTUw1IGNvbnZlbnRpb24gb2YgcHJlcGVuZGluZyBkYXRhLSB0byBhbnkgY3VzdG9tIEhUTUwgYXR0cmlidXRlLiBGbG93LmpzIGFsc28gYWRkcyBgZmAgZm9yIGVhc3kgaWRlbnRpZmljYXRpb24gb2YgRmxvdy5qcy4gRm9yIGV4YW1wbGUsIEZsb3cuanMgcHJvdmlkZXMgc2V2ZXJhbCBjdXN0b20gYXR0cmlidXRlcyBhbmQgYXR0cmlidXRlIGhhbmRsZXJzIC0tIGluY2x1ZGluZyBbZGF0YS1mLWJpbmRdKC4uL2JpbmRzL2RlZmF1bHQtYmluZC1hdHRyKSwgW2RhdGEtZi1mb3JlYWNoXSguLi9mb3JlYWNoL2RlZmF1bHQtZm9yZWFjaC1hdHRyLyksIFtkYXRhLWYtb24taW5pdF0oLi4vZXZlbnRzL2luaXQtZXZlbnQtYXR0ci8pLCBldGMuIFlvdSBjYW4gYWxzbyBbYWRkIHlvdXIgb3duIGF0dHJpYnV0ZSBoYW5kbGVyc10oLi4vYXR0cmlidXRlLW1hbmFnZXIvKS5cbiAqXG4gKiBUaGUgZGVmYXVsdCBiZWhhdmlvciBmb3IgaGFuZGxpbmcgYSBrbm93biBhdHRyaWJ1dGUgaXMgdG8gdXNlIHRoZSB2YWx1ZSBvZiB0aGUgbW9kZWwgdmFyaWFibGUgYXMgdGhlIHZhbHVlIG9mIHRoZSBhdHRyaWJ1dGUuIChUaGVyZSBhcmUgZXhjZXB0aW9ucyBmb3Igc29tZSBbYm9vbGVhbiBhdHRyaWJ1dGVzXSguLi9ib29sZWFuLWF0dHIvKS4pXG4gKlxuICogVGhpcyBtZWFucyB5b3UgY2FuIGJpbmQgdmFyaWFibGVzIGZyb20gdGhlIG1vZGVsIGluIHlvdXIgaW50ZXJmYWNlIGJ5IGFkZGluZyB0aGUgYGRhdGEtZi1gIHByZWZpeCB0byBhbnkgc3RhbmRhcmQgRE9NIGF0dHJpYnV0ZS4gVGhpcyBhdHRyaWJ1dGUgYmluZGluZyBpcyAqKnJlYWQtb25seSoqLCBzbyBhcyB0aGUgbW9kZWwgY2hhbmdlcywgdGhlIGludGVyZmFjZSBpcyBhdXRvbWF0aWNhbGx5IHVwZGF0ZWQ7IGJ1dCB3aGVuIHVzZXJzIGNoYW5nZSB2YWx1ZXMgaW4gdGhlIGludGVyZmFjZSwgbm8gYWN0aW9uIG9jY3Vycy5cbiAqXG4gKiAqKlRvIGRpc3BsYXkgYSBET00gZWxlbWVudCBiYXNlZCBvbiBhIHZhcmlhYmxlIGZyb20gdGhlIG1vZGVsOioqXG4gKlxuICogMS4gQWRkIHRoZSBwcmVmaXggYGRhdGEtZi1gIHRvIGFueSBhdHRyaWJ1dGUgaW4gYW55IEhUTUwgZWxlbWVudCB0aGF0IG5vcm1hbGx5IHRha2VzIGEgdmFsdWUuXG4gKiAyLiBTZXQgdGhlIHZhbHVlIG9mIHRoZSBhdHRyaWJ1dGUgdG8gdGhlIG5hbWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogXHRcdDwhLS0gaW5wdXQgZWxlbWVudCBkaXNwbGF5cyB2YWx1ZSBvZiBzYW1wbGVfaW50LCBob3dldmVyLFxuICogXHRcdFx0bm8gY2FsbCB0byB0aGUgbW9kZWwgaXMgbWFkZSBpZiB1c2VyIGNoYW5nZXMgc2FtcGxlX2ludFxuICpcbiAqXHRcdFx0aWYgc2FtcGxlX2ludCBpcyA4LCB0aGlzIGlzIHRoZSBlcXVpdmFsZW50IG9mIDxpbnB1dCB2YWx1ZT1cIjhcIj48L2lucHV0PiAtLT5cbiAqXG4gKlx0XHQ8aW5wdXQgZGF0YS1mLXZhbHVlPVwic2FtcGxlX2ludFwiPjwvaW5wdXQ+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0ZXN0OiAnKicsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCB2YWx1ZSk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyNDYWxsIE9wZXJhdGlvbiBpbiBSZXNwb25zZSB0byBVc2VyIEFjdGlvblxuICpcbiAqIE1hbnkgbW9kZWxzIGNhbGwgcGFydGljdWxhciBvcGVyYXRpb25zIGluIHJlc3BvbnNlIHRvIGVuZCB1c2VyIGFjdGlvbnMsIHN1Y2ggYXMgY2xpY2tpbmcgYSBidXR0b24gb3Igc3VibWl0dGluZyBhIGZvcm0uXG4gKlxuICogIyMjI2RhdGEtZi1vbi1ldmVudFxuICpcbiAqIEZvciBhbnkgSFRNTCBhdHRyaWJ1dGUgdXNpbmcgYG9uYCAtLSB0eXBpY2FsbHkgb24gY2xpY2sgb3Igb24gc3VibWl0IC0tIHlvdSBjYW4gYWRkIHRoZSBhdHRyaWJ1dGUgYGRhdGEtZi1vbi1YWFhgLCBhbmQgc2V0IHRoZSB2YWx1ZSB0byB0aGUgbmFtZSBvZiB0aGUgb3BlcmF0aW9uLiBUbyBjYWxsIG11bHRpcGxlIG9wZXJhdGlvbnMsIHVzZSB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIgdG8gY2hhaW4gb3BlcmF0aW9ucy4gT3BlcmF0aW9ucyBhcmUgY2FsbGVkIHNlcmlhbGx5LCBpbiB0aGUgb3JkZXIgbGlzdGVkLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8YnV0dG9uIGRhdGEtZi1vbi1jbGljaz1cInJlc2V0XCI+UmVzZXQ8L2J1dHRvbj5cbiAqXG4gKiAgICAgIDxidXR0b24gZGF0YS1mLW9uLWNsaWNrPVwic3RlcCgxKVwiPkFkdmFuY2UgT25lIFN0ZXA8L2J1dHRvbj5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogZnVuY3Rpb24gKGF0dHIsICRub2RlKSB7XG4gICAgICAgIHJldHVybiAoYXR0ci5pbmRleE9mKCdvbi0nKSA9PT0gMCk7XG4gICAgfSxcblxuICAgIHN0b3BMaXN0ZW5pbmc6IGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICAgIGF0dHIgPSBhdHRyLnJlcGxhY2UoJ29uLScsICcnKTtcbiAgICAgICAgdGhpcy5vZmYoYXR0cik7XG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChhdHRyLCB2YWx1ZSkge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi0nLCAnJyk7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIHRoaXMub2ZmKGF0dHIpLm9uKGF0dHIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBsaXN0T2ZPcGVyYXRpb25zID0gXy5pbnZva2UodmFsdWUuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgIGxpc3RPZk9wZXJhdGlvbnMgPSBsaXN0T2ZPcGVyYXRpb25zLm1hcChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm5OYW1lID0gdmFsdWUuc3BsaXQoJygnKVswXTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gdmFsdWUuc3Vic3RyaW5nKHZhbHVlLmluZGV4T2YoJygnKSArIDEsIHZhbHVlLmluZGV4T2YoJyknKSk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSAoJC50cmltKHBhcmFtcykgIT09ICcnKSA/IHBhcmFtcy5zcGxpdCgnLCcpIDogW107XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogZm5OYW1lLCBwYXJhbXM6IGFyZ3MgfTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtZS50cmlnZ2VyKCdmLnVpLm9wZXJhdGUnLCB7IG9wZXJhdGlvbnM6IGxpc3RPZk9wZXJhdGlvbnMsIHNlcmlhbDogdHJ1ZSB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy9Eb24ndCBib3RoZXIgYmluZGluZyBvbiB0aGlzIGF0dHIuIE5PVEU6IERvIHJlYWRvbmx5LCB0cnVlIGluc3RlYWQ/O1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjQ2FsbCBPcGVyYXRpb24gd2hlbiBFbGVtZW50IEFkZGVkIHRvIERPTVxuICpcbiAqIE1hbnkgbW9kZWxzIGNhbGwgYW4gaW5pdGlhbGl6YXRpb24gb3BlcmF0aW9uIHdoZW4gdGhlIFtydW5dKC4uLy4uLy4uLy4uLy4uLy4uL2dsb3NzYXJ5LyNydW4pIGlzIGZpcnN0IGNyZWF0ZWQuIFRoaXMgaXMgcGFydGljdWxhcmx5IGNvbW1vbiB3aXRoIFtWZW5zaW1dKC4uLy4uLy4uLy4uLy4uLy4uL21vZGVsX2NvZGUvdmVuc2ltLykgbW9kZWxzLCB3aGljaCBuZWVkIHRvIGluaXRpYWxpemUgdmFyaWFibGVzICgnc3RhcnRHYW1lJykgYmVmb3JlIHN0ZXBwaW5nLiBZb3UgY2FuIHVzZSB0aGUgYGRhdGEtZi1vbi1pbml0YCBhdHRyaWJ1dGUgdG8gY2FsbCBhbiBvcGVyYXRpb24gZnJvbSB0aGUgbW9kZWwgd2hlbiBhIHBhcnRpY3VsYXIgZWxlbWVudCBpcyBhZGRlZCB0byB0aGUgRE9NLlxuICpcbiAqICMjIyNkYXRhLWYtb24taW5pdFxuICpcbiAqIEFkZCB0aGUgYXR0cmlidXRlIGBkYXRhLWYtb24taW5pdGAsIGFuZCBzZXQgdGhlIHZhbHVlIHRvIHRoZSBuYW1lIG9mIHRoZSBvcGVyYXRpb24uIFRvIGNhbGwgbXVsdGlwbGUgb3BlcmF0aW9ucywgdXNlIHRoZSBgfGAgKHBpcGUpIGNoYXJhY3RlciB0byBjaGFpbiBvcGVyYXRpb25zLiBPcGVyYXRpb25zIGFyZSBjYWxsZWQgc2VyaWFsbHksIGluIHRoZSBvcmRlciBsaXN0ZWQuIFR5cGljYWxseSB5b3UgYWRkIHRoaXMgYXR0cmlidXRlIHRvIHRoZSBgPGJvZHk+YCBlbGVtZW50LlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8Ym9keSBkYXRhLWYtb24taW5pdD1cInN0YXJ0R2FtZVwiPlxuICpcbiAqICAgICAgPGJvZHkgZGF0YS1mLW9uLWluaXQ9XCJzdGFydEdhbWUgfCBzdGVwKDMpXCI+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IGZ1bmN0aW9uIChhdHRyLCAkbm9kZSkge1xuICAgICAgICByZXR1cm4gKGF0dHIuaW5kZXhPZignb24taW5pdCcpID09PSAwKTtcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24gKGF0dHIsIHZhbHVlKSB7XG4gICAgICAgIGF0dHIgPSBhdHRyLnJlcGxhY2UoJ29uLWluaXQnLCAnJyk7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGxpc3RPZk9wZXJhdGlvbnMgPSBfLmludm9rZSh2YWx1ZS5zcGxpdCgnfCcpLCAndHJpbScpO1xuICAgICAgICAgICAgbGlzdE9mT3BlcmF0aW9ucyA9IGxpc3RPZk9wZXJhdGlvbnMubWFwKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHZhciBmbk5hbWUgPSB2YWx1ZS5zcGxpdCgnKCcpWzBdO1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB2YWx1ZS5zdWJzdHJpbmcodmFsdWUuaW5kZXhPZignKCcpICsgMSwgdmFsdWUuaW5kZXhPZignKScpKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9ICgkLnRyaW0ocGFyYW1zKSAhPT0gJycpID8gcGFyYW1zLnNwbGl0KCcsJykgOiBbXTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBmbk5hbWUsIHBhcmFtczogYXJncyB9O1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIG1lLnRyaWdnZXIoJ2YudWkub3BlcmF0ZScsIHsgb3BlcmF0aW9uczogbGlzdE9mT3BlcmF0aW9ucywgc2VyaWFsOiB0cnVlIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvL0Rvbid0IGJvdGhlciBiaW5kaW5nIG9uIHRoaXMgYXR0ci4gTk9URTogRG8gcmVhZG9ubHksIHRydWUgaW5zdGVhZD87XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgRGlzcGxheSBBcnJheSBhbmQgT2JqZWN0IFZhcmlhYmxlczogZGF0YS1mLWZvcmVhY2hcbiAqXG4gKiBJZiB5b3VyIG1vZGVsIHZhcmlhYmxlIGlzIGFuIGFycmF5LCB5b3UgY2FuIHJlZmVyZW5jZSBzcGVjaWZpYyBlbGVtZW50cyBvZiB0aGUgYXJyYXkgdXNpbmcgYGRhdGEtZi1iaW5kYDogYGRhdGEtZi1iaW5kPVwic2FsZXNbM11cImAgb3IgYGRhdGEtZi1iaW5kPVwic2FsZXNbPGN1cnJlbnRSZWdpb24+XVwiYCwgYXMgZGVzY3JpYmVkIHVuZGVyIFtkYXRhLWYtYmluZF0oLi4vLi4vYmluZHMvZGVmYXVsdC1iaW5kLWF0dHIvKS5cbiAqXG4gKiBIb3dldmVyLCB0aGF0J3Mgbm90IHRoZSBvbmx5IG9wdGlvbi4gSWYgeW91IHdhbnQgdG8gYXV0b21hdGljYWxseSBsb29wIG92ZXIgYWxsIGVsZW1lbnRzIG9mIHRoZSBhcnJheSwgb3IgYWxsIHRoZSBmaWVsZHMgb2YgYW4gb2JqZWN0LCB5b3UgY2FuIHVzZSB0aGUgYGRhdGEtZi1mb3JlYWNoYCBhdHRyaWJ1dGUgdG8gbmFtZSB0aGUgdmFyaWFibGUsIHRoZW4gdXNlIHRlbXBsYXRlcyB0byBhY2Nlc3MgaXRzIGluZGV4IGFuZCB2YWx1ZSBmb3IgZGlzcGxheS4gKFRlbXBsYXRlcyBhcmUgYXZhaWxhYmxlIGFzIHBhcnQgb2YgRmxvdy5qcydzIGxvZGFzaCBkZXBlbmRlbmN5LiBTZWUgbW9yZSBiYWNrZ3JvdW5kIG9uIFt3b3JraW5nIHdpdGggdGVtcGxhdGVzXSguLi8uLi8uLi8uLi8uLi8jdGVtcGxhdGVzKS4pXG4gKlxuICogKipUbyBkaXNwbGF5IGEgRE9NIGVsZW1lbnQgYmFzZWQgb24gYW4gYXJyYXkgdmFyaWFibGUgZnJvbSB0aGUgbW9kZWw6KipcbiAqXG4gKiAxLiBBZGQgdGhlIGBkYXRhLWYtZm9yZWFjaGAgYXR0cmlidXRlIHRvIGFueSBIVE1MIGVsZW1lbnQgdGhhdCBoYXMgcmVwZWF0ZWQgc3ViLWVsZW1lbnRzLiBUaGUgdHdvIG1vc3QgY29tbW9uIGV4YW1wbGVzIGFyZSBsaXN0cyBhbmQgdGFibGVzLlxuICogMi4gU2V0IHRoZSB2YWx1ZSBvZiB0aGUgYGRhdGEtZi1mb3JlYWNoYCBhdHRyaWJ1dGUgaW4geW91ciB0b3AtbGV2ZWwgSFRNTCBlbGVtZW50IHRvIHRoZSBuYW1lIG9mIHRoZSBhcnJheSB2YXJpYWJsZS5cbiAqIDMuIEFkZCB0aGUgSFRNTCBpbiB3aGljaCB0aGUgdmFsdWUgb2YgeW91ciBhcnJheSB2YXJpYWJsZSBzaG91bGQgYXBwZWFyLlxuICogNC4gT3B0aW9uYWxseSwgaW5zaWRlIHRoZSBpbm5lciBIVE1MIGVsZW1lbnQsIHVzZSB0ZW1wbGF0ZXMgKGA8JT0gJT5gKSB0byByZWZlcmVuY2UgdGhlIGBpbmRleGAgKGZvciBhcnJheXMpIG9yIGBrZXlgIChmb3Igb2JqZWN0cykgYW5kIGB2YWx1ZWAgdG8gZGlzcGxheS4gVGhlIGBpbmRleGAsIGBrZXlgLCBhbmQgYHZhbHVlYCBhcmUgc3BlY2lhbCB2YXJpYWJsZXMgdGhhdCBGbG93LmpzIHBvcHVsYXRlcyBmb3IgeW91LlxuICpcbiAqXG4gKiAqKkV4YW1wbGVzOioqXG4gKlxuICogQnkgZGVmYXVsdCAmbWRhc2g7IHRoYXQgaXMsIGlmIHlvdSBkbyBub3QgaW5jbHVkZSB0ZW1wbGF0ZXMgaW4geW91ciBIVE1MICZtZGFzaDsgdGhlIGB2YWx1ZWAgb2YgdGhlIGFycmF5IGVsZW1lbnQgb3Igb2JqZWN0IGZpZWxkIGFwcGVhcnM6XG4gKlxuICogICAgICA8IS0tIHRoZSBtb2RlbCB2YXJpYWJsZSBUaW1lIGlzIGFuIGFycmF5IG9mIHllYXJzXG4gKiAgICAgICAgICBjcmVhdGUgYSBsaXN0IHRoYXQgc2hvd3Mgd2hpY2ggeWVhciAtLT5cbiAqXG4gKiAgICAgIDx1bCBkYXRhLWYtZm9yZWFjaD1cIlRpbWVcIj5cbiAqICAgICAgICAgIDxsaT48L2xpPlxuICogICAgICA8L3VsPlxuICpcbiAqIEluIHRoZSB0aGlyZCBzdGVwIG9mIHRoZSBtb2RlbCwgdGhpcyBleGFtcGxlIGdlbmVyYXRlcyB0aGUgSFRNTDpcbiAqXG4gKiAgICAgIDx1bCBkYXRhLWYtZm9yZWFjaD1cIlRpbWVcIj5cbiAqICAgICAgICAgICAgPGxpPjIwMTU8L2xpPlxuICogICAgICAgICAgICA8bGk+MjAxNjwvbGk+XG4gKiAgICAgICAgICAgIDxsaT4yMDE3PC9saT5cbiAqICAgICAgPC91bD5cbiAqXG4gKiB3aGljaCBhcHBlYXJzIGFzOlxuICpcbiAqICAgICAgKiAyMDE1XG4gKiAgICAgICogMjAxNlxuICogICAgICAqIDIwMTdcbiAqXG4gKiBPcHRpb25hbGx5LCB5b3UgY2FuIHVzZSB0ZW1wbGF0ZXMgKGA8JT0gJT5gKSB0byByZWZlcmVuY2UgdGhlIGBpbmRleGAgYW5kIGB2YWx1ZWAgb2YgdGhlIGFycmF5IGVsZW1lbnQgdG8gZGlzcGxheS5cbiAqXG4gKlxuICogICAgICA8IS0tIHRoZSBtb2RlbCB2YXJpYWJsZSBUaW1lIGlzIGFuIGFycmF5IG9mIHllYXJzXG4gKiAgICAgICAgICBjcmVhdGUgYSBsaXN0IHRoYXQgc2hvd3Mgd2hpY2ggeWVhciAtLT5cbiAqXG4gKiAgICAgIDx1bCBkYXRhLWYtZm9yZWFjaD1cIlRpbWVcIj5cbiAqICAgICAgICAgIDxsaT4gWWVhciA8JT0gaW5kZXggJT46IDwlPSB2YWx1ZSAlPiA8L2xpPlxuICogICAgICA8L3VsPlxuICpcbiAqIEluIHRoZSB0aGlyZCBzdGVwIG9mIHRoZSBtb2RlbCwgdGhpcyBleGFtcGxlIGdlbmVyYXRlczpcbiAqXG4gKlxuICpcbiAqIHdoaWNoIGFwcGVhcnMgYXM6XG4gKlxuICogICAgICAqIFllYXIgMTogMjAxNVxuICogICAgICAqIFllYXIgMjogMjAxNlxuICogICAgICAqIFllYXIgMzogMjAxN1xuICpcbiAqIEFzIHdpdGggb3RoZXIgYGRhdGEtZi1gIGF0dHJpYnV0ZXMsIHlvdSBjYW4gc3BlY2lmeSBbY29udmVydGVyc10oLi4vLi4vLi4vLi4vLi4vY29udmVydGVyLW92ZXJ2aWV3KSB0byBjb252ZXJ0IGRhdGEgZnJvbSBvbmUgZm9ybSB0byBhbm90aGVyOlxuICpcbiAqICAgICAgPHVsIGRhdGEtZi1mb3JlYWNoPVwiU2FsZXMgfCAkeCx4eHhcIj5cbiAqICAgICAgICAgIDxsaT4gWWVhciA8JT0gaW5kZXggJT46IFNhbGVzIG9mIDwlPSB2YWx1ZSAlPiA8L2xpPlxuICogICAgICA8L3VsPlxuICpcbiAqXG4gKiAqKk5vdGVzOioqXG4gKlxuICogKiBZb3UgY2FuIHVzZSB0aGUgYGRhdGEtZi1mb3JlYWNoYCBhdHRyaWJ1dGUgd2l0aCBib3RoIGFycmF5cyBhbmQgb2JqZWN0cy4gSWYgdGhlIG1vZGVsIHZhcmlhYmxlIGlzIGFuIG9iamVjdCwgcmVmZXJlbmNlIHRoZSBga2V5YCBpbnN0ZWFkIG9mIHRoZSBgaW5kZXhgIGluIHlvdXIgdGVtcGxhdGVzLlxuICogKiBUaGUgYGtleWAsIGBpbmRleGAsIGFuZCBgdmFsdWVgIGFyZSBzcGVjaWFsIHZhcmlhYmxlcyB0aGF0IEZsb3cuanMgcG9wdWxhdGVzIGZvciB5b3UuXG4gKiAqIFRoZSB0ZW1wbGF0ZSBzeW50YXggaXMgdG8gZW5jbG9zZSBlYWNoIGtleXdvcmQgKGBpbmRleGAsIGBrZXlgLCBgdmFyaWFibGVgKSBpbiBgPCU9YCBhbmQgYCU+YC4gVGVtcGxhdGVzIGFyZSBhdmFpbGFibGUgYXMgcGFydCBvZiBGbG93LmpzJ3MgbG9kYXNoIGRlcGVuZGVuY3kuIFNlZSBtb3JlIGJhY2tncm91bmQgb24gW3dvcmtpbmcgd2l0aCB0ZW1wbGF0ZXNdKC4uLy4uLy4uLy4uLy4uLyN0ZW1wbGF0ZXMpLlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG52YXIgcGFyc2VVdGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uL3V0aWxzL3BhcnNlLXV0aWxzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRlc3Q6ICdmb3JlYWNoJyxcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgdmFsdWUgPSAoJC5pc1BsYWluT2JqZWN0KHZhbHVlKSA/IHZhbHVlIDogW10uY29uY2F0KHZhbHVlKSk7XG4gICAgICAgIHZhciBsb29wVGVtcGxhdGUgPSB0aGlzLmRhdGEoJ2ZvcmVhY2gtdGVtcGxhdGUnKTtcbiAgICAgICAgaWYgKCFsb29wVGVtcGxhdGUpIHtcbiAgICAgICAgICAgIGxvb3BUZW1wbGF0ZSA9IHRoaXMuaHRtbCgpO1xuICAgICAgICAgICAgdGhpcy5kYXRhKCdmb3JlYWNoLXRlbXBsYXRlJywgbG9vcFRlbXBsYXRlKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgJG1lID0gdGhpcy5lbXB0eSgpO1xuICAgICAgICBfLmVhY2godmFsdWUsIGZ1bmN0aW9uIChkYXRhdmFsLCBkYXRha2V5KSB7XG4gICAgICAgICAgICBpZiAoIWRhdGF2YWwpIHtcbiAgICAgICAgICAgICAgICBkYXRhdmFsID0gZGF0YXZhbCArICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGNsb29wID0gbG9vcFRlbXBsYXRlLnJlcGxhY2UoLyZsdDsvZywgJzwnKS5yZXBsYWNlKC8mZ3Q7L2csICc+Jyk7XG4gICAgICAgICAgICB2YXIgdGVtcGxhdGVkTG9vcCA9IF8udGVtcGxhdGUoY2xvb3AsIHsgdmFsdWU6IGRhdGF2YWwsIGtleTogZGF0YWtleSwgaW5kZXg6IGRhdGFrZXkgfSk7XG4gICAgICAgICAgICB2YXIgaXNUZW1wbGF0ZWQgPSB0ZW1wbGF0ZWRMb29wICE9PSBjbG9vcDtcbiAgICAgICAgICAgIHZhciBub2RlcyA9ICQodGVtcGxhdGVkTG9vcCk7XG5cbiAgICAgICAgICAgIG5vZGVzLmVhY2goZnVuY3Rpb24gKGksIG5ld05vZGUpIHtcbiAgICAgICAgICAgICAgICBuZXdOb2RlID0gJChuZXdOb2RlKTtcbiAgICAgICAgICAgICAgICBfLmVhY2gobmV3Tm9kZS5kYXRhKCksIGZ1bmN0aW9uICh2YWwsIGtleSkge1xuICAgICAgICAgICAgICAgICAgICBuZXdOb2RlLmRhdGEoa2V5LCBwYXJzZVV0aWxzLnRvSW1wbGljaXRUeXBlKHZhbCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmICghaXNUZW1wbGF0ZWQgJiYgIW5ld05vZGUuaHRtbCgpLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgICAgICBuZXdOb2RlLmh0bWwoZGF0YXZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkbWUuYXBwZW5kKG5vZGVzKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgQmluZGluZyBmb3IgZGF0YS1mLVtib29sZWFuXVxuICpcbiAqIEZsb3cuanMgcHJvdmlkZXMgc3BlY2lhbCBoYW5kbGluZyBmb3IgSFRNTCBhdHRyaWJ1dGVzIHRoYXQgdGFrZSBCb29sZWFuIHZhbHVlcy5cbiAqXG4gKiBJbiBwYXJ0aWN1bGFyLCBmb3IgbW9zdCBIVE1MIGF0dHJpYnV0ZXMgdGhhdCBleHBlY3QgQm9vbGVhbiB2YWx1ZXMsIHRoZSBhdHRyaWJ1dGUgaXMgZGlyZWN0bHkgc2V0IHRvIHRoZSB2YWx1ZSBvZiB0aGUgbW9kZWwgdmFyaWFibGUuIFRoaXMgaXMgdHJ1ZSBmb3IgYGNoZWNrZWRgLCBgc2VsZWN0ZWRgLCBgYXN5bmNgLCBgYXV0b2ZvY3VzYCwgYGF1dG9wbGF5YCwgYGNvbnRyb2xzYCwgYGRlZmVyYCwgYGlzbWFwYCwgYGxvb3BgLCBgbXVsdGlwbGVgLCBgb3BlbmAsIGByZXF1aXJlZGAsIGFuZCBgc2NvcGVkYC5cbiAqXG4gKiBIb3dldmVyLCB0aGVyZSBhcmUgYSBmZXcgbm90YWJsZSBleGNlcHRpb25zLiBGb3IgdGhlIEhUTUwgYXR0cmlidXRlcyBgZGlzYWJsZWRgLCBgaGlkZGVuYCwgYW5kIGByZWFkb25seWAsIHRoZSBhdHRyaWJ1dGUgaXMgc2V0IHRvIHRoZSAqb3Bwb3NpdGUqIG9mIHRoZSB2YWx1ZSBvZiB0aGUgbW9kZWwgdmFyaWFibGUuIFRoaXMgbWFrZXMgdGhlIHJlc3VsdGluZyBIVE1MIGVhc2llciB0byByZWFkLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8IS0tIHRoaXMgY2hlY2tib3ggaXMgQ0hFQ0tFRCB3aGVuIHNhbXBsZUJvb2wgaXMgVFJVRSxcbiAqICAgICAgICAgICBhbmQgVU5DSEVDS0VEIHdoZW4gc2FtcGxlQm9vbCBpcyBGQUxTRSAtLT5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGRhdGEtZi1jaGVja2VkPVwic2FtcGxlQm9vbFwiIC8+XG4gKlxuICogICAgICA8IS0tIHRoaXMgYnV0dG9uIGlzIEVOQUJMRUQgd2hlbiBzYW1wbGVCb29sIGlzIFRSVUUsXG4gKiAgICAgICAgICAgYW5kIERJU0FCTEVEIHdoZW4gc2FtcGxlQm9vbCBpcyBGQUxTRSAtLT5cbiAqICAgICAgPGJ1dHRvbiBkYXRhLWYtZGlzYWJsZWQ9XCJzYW1wbGVCb29sXCI+Q2xpY2sgTWU8L2J1dHRvbj5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogL14oPzpkaXNhYmxlZHxoaWRkZW58cmVhZG9ubHkpJC9pLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcm9wKHByb3AsICF2YWx1ZSk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgTm8tb3AgQXR0cmlidXRlc1xuICpcbiAqIEZsb3cuanMgcHJvdmlkZXMgc3BlY2lhbCBoYW5kbGluZyBmb3IgYm90aCBgZGF0YS1mLW1vZGVsYCAoZGVzY3JpYmVkIFtoZXJlXSguLi8uLi8uLi8uLi8jdXNpbmdfaW5fcHJvamVjdCkpIGFuZCBgZGF0YS1mLWNvbnZlcnRgIChkZXNjcmliZWQgW2hlcmVdKC4uLy4uLy4uLy4uL2NvbnZlcnRlci1vdmVydmlldy8pKS4gRm9yIHRoZXNlIGF0dHJpYnV0ZXMsIHRoZSBkZWZhdWx0IGJlaGF2aW9yIGlzIHRvIGRvIG5vdGhpbmcsIHNvIHRoYXQgdGhpcyBhZGRpdGlvbmFsIHNwZWNpYWwgaGFuZGxpbmcgY2FuIHRha2UgcHJlY2VuZGVuY2UuXG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLy8gQXR0cmlidXRlcyB3aGljaCBhcmUganVzdCBwYXJhbWV0ZXJzIHRvIG90aGVycyBhbmQgY2FuIGp1c3QgYmUgaWdub3JlZFxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IC9eKD86bW9kZWx8Y29udmVydCkkL2ksXG5cbiAgICBoYW5kbGU6ICQubm9vcCxcblxuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIEJpbmRpbmcgZm9yIGRhdGEtZi1bYm9vbGVhbl1cbiAqXG4gKiBGbG93LmpzIHByb3ZpZGVzIHNwZWNpYWwgaGFuZGxpbmcgZm9yIEhUTUwgYXR0cmlidXRlcyB0aGF0IHRha2UgQm9vbGVhbiB2YWx1ZXMuXG4gKlxuICogSW4gcGFydGljdWxhciwgZm9yIG1vc3QgSFRNTCBhdHRyaWJ1dGVzIHRoYXQgZXhwZWN0IEJvb2xlYW4gdmFsdWVzLCB0aGUgYXR0cmlidXRlIGlzIGRpcmVjdGx5IHNldCB0byB0aGUgdmFsdWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlLiBUaGlzIGlzIHRydWUgZm9yIGBjaGVja2VkYCwgYHNlbGVjdGVkYCwgYGFzeW5jYCwgYGF1dG9mb2N1c2AsIGBhdXRvcGxheWAsIGBjb250cm9sc2AsIGBkZWZlcmAsIGBpc21hcGAsIGBsb29wYCwgYG11bHRpcGxlYCwgYG9wZW5gLCBgcmVxdWlyZWRgLCBhbmQgYHNjb3BlZGAuXG4gKlxuICogSG93ZXZlciwgdGhlcmUgYXJlIGEgZmV3IG5vdGFibGUgZXhjZXB0aW9ucy4gRm9yIHRoZSBIVE1MIGF0dHJpYnV0ZXMgYGRpc2FibGVkYCwgYGhpZGRlbmAsIGFuZCBgcmVhZG9ubHlgLCB0aGUgYXR0cmlidXRlIGlzIHNldCB0byB0aGUgKm9wcG9zaXRlKiBvZiB0aGUgdmFsdWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlLiBUaGlzIG1ha2VzIHRoZSByZXN1bHRpbmcgSFRNTCBlYXNpZXIgdG8gcmVhZC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPCEtLSB0aGlzIGNoZWNrYm94IGlzIENIRUNLRUQgd2hlbiBzYW1wbGVCb29sIGlzIFRSVUUsXG4gKiAgICAgICAgICAgYW5kIFVOQ0hFQ0tFRCB3aGVuIHNhbXBsZUJvb2wgaXMgRkFMU0UgLS0+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBkYXRhLWYtY2hlY2tlZD1cInNhbXBsZUJvb2xcIiAvPlxuICpcbiAqICAgICAgPCEtLSB0aGlzIGJ1dHRvbiBpcyBFTkFCTEVEIHdoZW4gc2FtcGxlQm9vbCBpcyBUUlVFLFxuICogICAgICAgICAgIGFuZCBESVNBQkxFRCB3aGVuIHNhbXBsZUJvb2wgaXMgRkFMU0UgLS0+XG4gKiAgICAgIDxidXR0b24gZGF0YS1mLWRpc2FibGVkPVwic2FtcGxlQm9vbFwiPkNsaWNrIE1lPC9idXR0b24+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/OmNoZWNrZWR8c2VsZWN0ZWR8YXN5bmN8YXV0b2ZvY3VzfGF1dG9wbGF5fGNvbnRyb2xzfGRlZmVyfGlzbWFwfGxvb3B8bXVsdGlwbGV8b3BlbnxyZXF1aXJlZHxzY29wZWQpJC9pLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgLypqc2xpbnQgZXFlcTogdHJ1ZSovXG4gICAgICAgIHZhciB2YWwgPSAodGhpcy5hdHRyKCd2YWx1ZScpKSA/ICh2YWx1ZSA9PSB0aGlzLnByb3AoJ3ZhbHVlJykpIDogISF2YWx1ZTtcbiAgICAgICAgdGhpcy5wcm9wKHByb3AsIHZhbCk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBwYXJzZVV0aWxzID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMvcGFyc2UtdXRpbHMnKTtcbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGVzdDogJ3JlcGVhdCcsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIHZhbHVlID0gKCQuaXNQbGFpbk9iamVjdCh2YWx1ZSkgPyB2YWx1ZSA6IFtdLmNvbmNhdCh2YWx1ZSkpO1xuICAgICAgICB2YXIgbG9vcFRlbXBsYXRlID0gdGhpcy5kYXRhKCdyZXBlYXQtdGVtcGxhdGUnKTtcbiAgICAgICAgdmFyIGlkID0gJyc7XG4gICAgICAgIGlmICghbG9vcFRlbXBsYXRlKSB7XG4gICAgICAgICAgICBsb29wVGVtcGxhdGUgPSB0aGlzLmdldCgwKS5vdXRlckhUTUw7XG4gICAgICAgICAgICBpZCA9ICBfLnVuaXF1ZUlkKCdyZXBlYXQtJyk7XG4gICAgICAgICAgICB0aGlzLmRhdGEoe1xuICAgICAgICAgICAgICAgICdyZXBlYXQtdGVtcGxhdGUnOiBsb29wVGVtcGxhdGUsXG4gICAgICAgICAgICAgICAgJ3JlcGVhdC10ZW1wbGF0ZS1pZCc6IGlkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlkID0gdGhpcy5kYXRhKCdyZXBlYXQtdGVtcGxhdGUtaWQnKTtcbiAgICAgICAgICAgIHRoaXMubmV4dFVudGlsKCc6bm90KFsnICsgaWQgKyAnXSknKS5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbGFzdDtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgXy5lYWNoKHZhbHVlLCBmdW5jdGlvbiAoZGF0YXZhbCwgZGF0YWtleSkge1xuICAgICAgICAgICAgaWYgKCFkYXRhdmFsKSB7XG4gICAgICAgICAgICAgICAgZGF0YXZhbCA9IGRhdGF2YWwgKyAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjbG9vcCA9IGxvb3BUZW1wbGF0ZS5yZXBsYWNlKC8mbHQ7L2csICc8JykucmVwbGFjZSgvJmd0Oy9nLCAnPicpO1xuICAgICAgICAgICAgdmFyIHRlbXBsYXRlZExvb3AgPSBfLnRlbXBsYXRlKGNsb29wLCB7IHZhbHVlOiBkYXRhdmFsLCBrZXk6IGRhdGFrZXksIGluZGV4OiBkYXRha2V5IH0pO1xuICAgICAgICAgICAgdmFyIGlzVGVtcGxhdGVkID0gdGVtcGxhdGVkTG9vcCAhPT0gY2xvb3A7XG4gICAgICAgICAgICB2YXIgbm9kZXMgPSAkKHRlbXBsYXRlZExvb3ApO1xuXG4gICAgICAgICAgICBub2Rlcy5lYWNoKGZ1bmN0aW9uIChpLCBuZXdOb2RlKSB7XG4gICAgICAgICAgICAgICAgbmV3Tm9kZSA9ICQobmV3Tm9kZSkucmVtb3ZlQXR0cignZGF0YS1mLXJlcGVhdCcpO1xuICAgICAgICAgICAgICAgIF8uZWFjaChuZXdOb2RlLmRhdGEoKSwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbGFzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWUuZGF0YShrZXksIHBhcnNlVXRpbHMudG9JbXBsaWNpdFR5cGUodmFsKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdOb2RlLmRhdGEoa2V5LCBwYXJzZVV0aWxzLnRvSW1wbGljaXRUeXBlKHZhbCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbmV3Tm9kZS5hdHRyKGlkLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzVGVtcGxhdGVkICYmICFuZXdOb2RlLmh0bWwoKS50cmltKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3Tm9kZS5odG1sKGRhdGF2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFsYXN0KSB7XG4gICAgICAgICAgICAgICAgbGFzdCA9IG1lLmh0bWwobm9kZXMuaHRtbCgpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGFzdCA9IG5vZGVzLmluc2VydEFmdGVyKGxhc3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuIiwiLyoqXG4gKiAjIyBET00gTWFuYWdlclxuICpcbiAqIFRoZSBGbG93LmpzIERPTSBNYW5hZ2VyIHByb3ZpZGVzIHR3by13YXkgZGF0YSBiaW5kaW5ncyBmcm9tIHlvdXIgcHJvamVjdCdzIHVzZXIgaW50ZXJmYWNlIHRvIHRoZSBjaGFubmVsLiBUaGUgRE9NIE1hbmFnZXIgaXMgdGhlICdnbHVlJyB0aHJvdWdoIHdoaWNoIEhUTUwgRE9NIGVsZW1lbnRzIC0tIGluY2x1ZGluZyB0aGUgYXR0cmlidXRlcyBhbmQgYXR0cmlidXRlIGhhbmRsZXJzIHByb3ZpZGVkIGJ5IEZsb3cuanMgZm9yIFt2YXJpYWJsZXNdKC4uLy4uL2F0dHJpYnV0ZXMtb3ZlcnZpZXcvKSwgW29wZXJhdGlvbnNdKC4uLy4uL29wZXJhdGlvbnMtb3ZlcnZpZXcvKSBhbmQgW2NvbnZlcnNpb25dKC4uLy4uL2NvbnZlcnRlci1vdmVydmlldy8pLCBhbmQgdGhvc2UgW3lvdSBjcmVhdGVdKC4vYXR0cmlidXRlcy9hdHRyaWJ1dGUtbWFuYWdlci8pIC0tIGFyZSBib3VuZCB0byB0aGUgdmFyaWFibGUgYW5kIG9wZXJhdGlvbnMgW2NoYW5uZWxzXSguLi8uLi9jaGFubmVsLW92ZXJ2aWV3LykgdG8gbGluayB0aGVtIHdpdGggeW91ciBwcm9qZWN0J3MgbW9kZWwuIFNlZSB0aGUgW0VwaWNlbnRlciBhcmNoaXRlY3R1cmUgZGV0YWlsc10oLi4vLi4vLi4vY3JlYXRpbmdfeW91cl9pbnRlcmZhY2UvYXJjaF9kZXRhaWxzLykgZm9yIGEgdmlzdWFsIGRlc2NyaXB0aW9uIG9mIGhvdyB0aGUgRE9NIE1hbmFnZXIgcmVsYXRlcyB0byB0aGUgW3Jlc3Qgb2YgdGhlIEVwaWNlbnRlciBzdGFja10oLi4vLi4vLi4vY3JlYXRpbmdfeW91cl9pbnRlcmZhY2UvKS5cbiAqXG4gKiBUaGUgRE9NIE1hbmFnZXIgaXMgYW4gaW50ZWdyYWwgcGFydCBvZiB0aGUgRmxvdy5qcyBhcmNoaXRlY3R1cmUgYnV0LCBpbiBrZWVwaW5nIHdpdGggb3VyIGdlbmVyYWwgcGhpbG9zb3BoeSBvZiBleHRlbnNpYmlsaXR5IGFuZCBjb25maWd1cmFiaWxpdHksIGl0IGlzIGFsc28gcmVwbGFjZWFibGUuIEZvciBpbnN0YW5jZSwgaWYgeW91IHdhbnQgdG8gbWFuYWdlIHlvdXIgRE9NIHN0YXRlIHdpdGggW0JhY2tib25lIFZpZXdzXShodHRwOi8vYmFja2JvbmVqcy5vcmcpIG9yIFtBbmd1bGFyLmpzXShodHRwczovL2FuZ3VsYXJqcy5vcmcpLCB3aGlsZSBzdGlsbCB1c2luZyB0aGUgY2hhbm5lbHMgdG8gaGFuZGxlIHRoZSBjb21tdW5pY2F0aW9uIHdpdGggeW91ciBtb2RlbCwgdGhpcyBpcyB0aGUgcGllY2UgeW91J2QgcmVwbGFjZS4gW0NvbnRhY3QgdXNdKGh0dHA6Ly9mb3Jpby5jb20vYWJvdXQvY29udGFjdC8pIGlmIHlvdSBhcmUgaW50ZXJlc3RlZCBpbiBleHRlbmRpbmcgRmxvdy5qcyBpbiB0aGlzIHdheSAtLSB3ZSdsbCBiZSBoYXBweSB0byB0YWxrIGFib3V0IGl0IGluIG1vcmUgZGV0YWlsLlxuICpcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIHZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKTtcblxuICAgIHZhciBub2RlTWFuYWdlciA9IHJlcXVpcmUoJy4vbm9kZXMvbm9kZS1tYW5hZ2VyJyk7XG4gICAgdmFyIGF0dHJNYW5hZ2VyID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGVzL2F0dHJpYnV0ZS1tYW5hZ2VyJyk7XG4gICAgdmFyIGNvbnZlcnRlck1hbmFnZXIgPSByZXF1aXJlKCcuLi9jb252ZXJ0ZXJzL2NvbnZlcnRlci1tYW5hZ2VyJyk7XG5cbiAgICB2YXIgcGFyc2VVdGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzL3BhcnNlLXV0aWxzJyk7XG4gICAgdmFyIGRvbVV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvZG9tJyk7XG5cbiAgICB2YXIgYXV0b1VwZGF0ZVBsdWdpbiA9IHJlcXVpcmUoJy4vcGx1Z2lucy9hdXRvLXVwZGF0ZS1iaW5kaW5ncycpO1xuXG4gICAgLy9KcXVlcnkgc2VsZWN0b3IgdG8gcmV0dXJuIGV2ZXJ5dGhpbmcgd2hpY2ggaGFzIGEgZi0gcHJvcGVydHkgc2V0XG4gICAgJC5leHByWyc6J11bY29uZmlnLnByZWZpeF0gPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHZhciAkdGhpcyA9ICQob2JqKTtcbiAgICAgICAgdmFyIGRhdGFwcm9wcyA9IF8ua2V5cygkdGhpcy5kYXRhKCkpO1xuXG4gICAgICAgIHZhciBtYXRjaCA9IF8uZmluZChkYXRhcHJvcHMsIGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICAgICAgICByZXR1cm4gKGF0dHIuaW5kZXhPZihjb25maWcucHJlZml4KSA9PT0gMCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiAhIShtYXRjaCk7XG4gICAgfTtcblxuICAgICQuZXhwclsnOiddLndlYmNvbXBvbmVudCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgcmV0dXJuIG9iai5ub2RlTmFtZS5pbmRleE9mKCctJykgIT09IC0xO1xuICAgIH07XG5cbiAgICB2YXIgZ2V0TWF0Y2hpbmdFbGVtZW50cyA9IGZ1bmN0aW9uIChyb290KSB7XG4gICAgICAgIHZhciAkcm9vdCA9ICQocm9vdCk7XG4gICAgICAgIHZhciBtYXRjaGVkRWxlbWVudHMgPSAkcm9vdC5maW5kKCc6JyArIGNvbmZpZy5wcmVmaXgpO1xuICAgICAgICBpZiAoJHJvb3QuaXMoJzonICsgY29uZmlnLnByZWZpeCkpIHtcbiAgICAgICAgICAgIG1hdGNoZWRFbGVtZW50cyA9IG1hdGNoZWRFbGVtZW50cy5hZGQoJHJvb3QpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYXRjaGVkRWxlbWVudHM7XG4gICAgfTtcblxuICAgIHZhciBnZXRFbGVtZW50T3JFcnJvciA9IGZ1bmN0aW9uIChlbGVtZW50LCBjb250ZXh0KSB7XG4gICAgICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgJCkge1xuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQuZ2V0KDApO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZWxlbWVudCB8fCAhZWxlbWVudC5ub2RlTmFtZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihjb250ZXh0LCAnRXhwZWN0ZWQgdG8gZ2V0IERPTSBFbGVtZW50LCBnb3QgJywgZWxlbWVudCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoY29udGV4dCArICc6IEV4cGVjdGVkIHRvIGdldCBET00gRWxlbWVudCwgZ290JyArICh0eXBlb2YgZWxlbWVudCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH07XG5cbiAgICB2YXIgcHVibGljQVBJID0ge1xuXG4gICAgICAgIG5vZGVzOiBub2RlTWFuYWdlcixcbiAgICAgICAgYXR0cmlidXRlczogYXR0ck1hbmFnZXIsXG4gICAgICAgIGNvbnZlcnRlcnM6IGNvbnZlcnRlck1hbmFnZXIsXG4gICAgICAgIC8vdXRpbHMgZm9yIHRlc3RpbmdcbiAgICAgICAgcHJpdmF0ZToge1xuICAgICAgICAgICAgbWF0Y2hlZEVsZW1lbnRzOiBbXVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBVbmJpbmQgdGhlIGVsZW1lbnQ6IHVuc3Vic2NyaWJlIGZyb20gYWxsIHVwZGF0ZXMgb24gdGhlIHJlbGV2YW50IGNoYW5uZWxzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge0RvbUVsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdG8gcmVtb3ZlIGZyb20gdGhlIGRhdGEgYmluZGluZy5cbiAgICAgICAgICogQHBhcmFtIHtDaGFubmVsSW5zdGFuY2V9IGNoYW5uZWwgKE9wdGlvbmFsKSBUaGUgY2hhbm5lbCBmcm9tIHdoaWNoIHRvIHVuc3Vic2NyaWJlLiBEZWZhdWx0cyB0byB0aGUgW3ZhcmlhYmxlcyBjaGFubmVsXSguLi9jaGFubmVscy92YXJpYWJsZXMtY2hhbm5lbC8pLlxuICAgICAgICAgKi9cbiAgICAgICAgdW5iaW5kRWxlbWVudDogZnVuY3Rpb24gKGVsZW1lbnQsIGNoYW5uZWwpIHtcbiAgICAgICAgICAgIGlmICghY2hhbm5lbCkge1xuICAgICAgICAgICAgICAgIGNoYW5uZWwgPSB0aGlzLm9wdGlvbnMuY2hhbm5lbC52YXJpYWJsZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtZW50ID0gZ2V0RWxlbWVudE9yRXJyb3IoZWxlbWVudCk7XG4gICAgICAgICAgICB2YXIgJGVsID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGlmICghJGVsLmlzKCc6JyArIGNvbmZpZy5wcmVmaXgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5wcml2YXRlLm1hdGNoZWRFbGVtZW50cyA9IF8ud2l0aG91dCh0aGlzLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzLCBlbGVtZW50KTtcblxuICAgICAgICAgICAgLy9GSVhNRTogaGF2ZSB0byByZWFkZCBldmVudHMgdG8gYmUgYWJsZSB0byByZW1vdmUgdGhlbS4gVWdseVxuICAgICAgICAgICAgdmFyIEhhbmRsZXIgPSBub2RlTWFuYWdlci5nZXRIYW5kbGVyKCRlbCk7XG4gICAgICAgICAgICB2YXIgaCA9IG5ldyBIYW5kbGVyLmhhbmRsZSh7XG4gICAgICAgICAgICAgICAgZWw6IGVsZW1lbnRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGgucmVtb3ZlRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgaC5yZW1vdmVFdmVudHMoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJChlbGVtZW50LmF0dHJpYnV0ZXMpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBub2RlTWFwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGF0dHIgPSBub2RlTWFwLm5vZGVOYW1lO1xuICAgICAgICAgICAgICAgIHZhciB3YW50ZWRQcmVmaXggPSAnZGF0YS1mLSc7XG4gICAgICAgICAgICAgICAgaWYgKGF0dHIuaW5kZXhPZih3YW50ZWRQcmVmaXgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGF0dHIgPSBhdHRyLnJlcGxhY2Uod2FudGVkUHJlZml4LCAnJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBhdHRyTWFuYWdlci5nZXRIYW5kbGVyKGF0dHIsICRlbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYW5kbGVyLnN0b3BMaXN0ZW5pbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXIuc3RvcExpc3RlbmluZy5jYWxsKCRlbCwgYXR0cik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIHN1YnNpZCA9ICRlbC5kYXRhKCdmLXN1YnNjcmlwdGlvbi1pZCcpIHx8IFtdO1xuICAgICAgICAgICAgXy5lYWNoKHN1YnNpZCwgZnVuY3Rpb24gKHN1YnMpIHtcbiAgICAgICAgICAgICAgICBjaGFubmVsLnVuc3Vic2NyaWJlKHN1YnMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEJpbmQgdGhlIGVsZW1lbnQ6IHN1YnNjcmliZSBmcm9tIHVwZGF0ZXMgb24gdGhlIHJlbGV2YW50IGNoYW5uZWxzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge0RvbUVsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdG8gYWRkIHRvIHRoZSBkYXRhIGJpbmRpbmcuXG4gICAgICAgICAqIEBwYXJhbSB7Q2hhbm5lbEluc3RhbmNlfSBjaGFubmVsIChPcHRpb25hbCkgVGhlIGNoYW5uZWwgdG8gc3Vic2NyaWJlIHRvLiBEZWZhdWx0cyB0byB0aGUgW3ZhcmlhYmxlcyBjaGFubmVsXSguLi9jaGFubmVscy92YXJpYWJsZXMtY2hhbm5lbC8pLlxuICAgICAgICAgKi9cbiAgICAgICAgYmluZEVsZW1lbnQ6IGZ1bmN0aW9uIChlbGVtZW50LCBjaGFubmVsKSB7XG4gICAgICAgICAgICBpZiAoIWNoYW5uZWwpIHtcbiAgICAgICAgICAgICAgICBjaGFubmVsID0gdGhpcy5vcHRpb25zLmNoYW5uZWwudmFyaWFibGVzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxlbWVudCA9IGdldEVsZW1lbnRPckVycm9yKGVsZW1lbnQpO1xuICAgICAgICAgICAgdmFyICRlbCA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoISRlbC5pcygnOicgKyBjb25maWcucHJlZml4KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghXy5jb250YWlucyh0aGlzLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzLCBlbGVtZW50KSkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpdmF0ZS5tYXRjaGVkRWxlbWVudHMucHVzaChlbGVtZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9TZW5kIHRvIG5vZGUgbWFuYWdlciB0byBoYW5kbGUgdWkgY2hhbmdlc1xuICAgICAgICAgICAgdmFyIEhhbmRsZXIgPSBub2RlTWFuYWdlci5nZXRIYW5kbGVyKCRlbCk7XG4gICAgICAgICAgICBuZXcgSGFuZGxlci5oYW5kbGUoe1xuICAgICAgICAgICAgICAgIGVsOiBlbGVtZW50XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIHN1YnNjcmliZSA9IGZ1bmN0aW9uIChjaGFubmVsLCB2YXJzVG9CaW5kLCAkZWwsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXZhcnNUb0JpbmQgfHwgIXZhcnNUb0JpbmQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHN1YnNpZCA9IGNoYW5uZWwuc3Vic2NyaWJlKHZhcnNUb0JpbmQsICRlbCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgdmFyIG5ld3N1YnMgPSAoJGVsLmRhdGEoJ2Ytc3Vic2NyaXB0aW9uLWlkJykgfHwgW10pLmNvbmNhdChzdWJzaWQpO1xuICAgICAgICAgICAgICAgICRlbC5kYXRhKCdmLXN1YnNjcmlwdGlvbi1pZCcsIG5ld3N1YnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIGF0dHJCaW5kaW5ncyA9IFtdO1xuICAgICAgICAgICAgdmFyIG5vbkJhdGNoYWJsZVZhcmlhYmxlcyA9IFtdO1xuICAgICAgICAgICAgLy9OT1RFOiBsb29waW5nIHRocm91Z2ggYXR0cmlidXRlcyBpbnN0ZWFkIG9mIC5kYXRhIGJlY2F1c2UgLmRhdGEgYXV0b21hdGljYWxseSBjYW1lbGNhc2VzIHByb3BlcnRpZXMgYW5kIG1ha2UgaXQgaGFyZCB0byByZXRydmlldmVcbiAgICAgICAgICAgICQoZWxlbWVudC5hdHRyaWJ1dGVzKS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgbm9kZU1hcCkge1xuICAgICAgICAgICAgICAgIHZhciBhdHRyID0gbm9kZU1hcC5ub2RlTmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgYXR0clZhbCA9IG5vZGVNYXAudmFsdWU7XG5cbiAgICAgICAgICAgICAgICB2YXIgd2FudGVkUHJlZml4ID0gJ2RhdGEtZi0nO1xuICAgICAgICAgICAgICAgIGlmIChhdHRyLmluZGV4T2Yod2FudGVkUHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKHdhbnRlZFByZWZpeCwgJycpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGVyID0gYXR0ck1hbmFnZXIuZ2V0SGFuZGxlcihhdHRyLCAkZWwpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgaXNCaW5kYWJsZUF0dHIgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmluaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQmluZGFibGVBdHRyID0gaGFuZGxlci5pbml0LmNhbGwoJGVsLCBhdHRyLCBhdHRyVmFsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0JpbmRhYmxlQXR0cikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9Db252ZXJ0IHBpcGVzIHRvIGNvbnZlcnRlciBhdHRyc1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHdpdGhDb252ID0gXy5pbnZva2UoYXR0clZhbC5zcGxpdCgnfCcpLCAndHJpbScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdpdGhDb252Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyVmFsID0gd2l0aENvbnYuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZWwuZGF0YSgnZi1jb252ZXJ0LScgKyBhdHRyLCB3aXRoQ29udik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBiaW5kaW5nID0geyBhdHRyOiBhdHRyIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29tbWFSZWdleCA9IC8sKD8hW15cXFtdKlxcXSkvO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJWYWwuaW5kZXhPZignPCUnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL0Fzc3VtZSBpdCdzIHRlbXBsYXRlZCBmb3IgbGF0ZXIgdXNlXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYXR0clZhbC5zcGxpdChjb21tYVJlZ2V4KS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhcnNUb0JpbmQgPSBfLmludm9rZShhdHRyVmFsLnNwbGl0KGNvbW1hUmVnZXgpLCAndHJpbScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZShjaGFubmVsLCB2YXJzVG9CaW5kLCAkZWwsIHsgYmF0Y2g6IHRydWUgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmluZGluZy50b3BpY3MgPSB2YXJzVG9CaW5kO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiaW5kaW5nLnRvcGljcyA9IFthdHRyVmFsXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub25CYXRjaGFibGVWYXJpYWJsZXMucHVzaChhdHRyVmFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJCaW5kaW5ncy5wdXNoKGJpbmRpbmcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkZWwuZGF0YSgnYXR0ci1iaW5kaW5ncycsIGF0dHJCaW5kaW5ncyk7XG4gICAgICAgICAgICBpZiAobm9uQmF0Y2hhYmxlVmFyaWFibGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdzdWJzY3JpYmUnLCBub25CYXRjaGFibGVWYXJpYWJsZXMsICRlbC5nZXQoMCkpXG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlKGNoYW5uZWwsIG5vbkJhdGNoYWJsZVZhcmlhYmxlcywgJGVsLCB7IGJhdGNoOiBmYWxzZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQmluZCBhbGwgcHJvdmlkZWQgZWxlbWVudHMuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSAge0FycmF5fGpRdWVyeVNlbGVjdG9yfSBlbGVtZW50c1RvQmluZCAoT3B0aW9uYWwpIElmIG5vdCBwcm92aWRlZCwgYmluZHMgYWxsIG1hdGNoaW5nIGVsZW1lbnRzIHdpdGhpbiBkZWZhdWx0IHJvb3QgcHJvdmlkZWQgYXQgaW5pdGlhbGl6YXRpb24uXG4gICAgICAgICAqL1xuICAgICAgICBiaW5kQWxsOiBmdW5jdGlvbiAoZWxlbWVudHNUb0JpbmQpIHtcbiAgICAgICAgICAgIGlmICghZWxlbWVudHNUb0JpbmQpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50c1RvQmluZCA9IGdldE1hdGNoaW5nRWxlbWVudHModGhpcy5vcHRpb25zLnJvb3QpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghXy5pc0FycmF5KGVsZW1lbnRzVG9CaW5kKSkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzVG9CaW5kID0gZ2V0TWF0Y2hpbmdFbGVtZW50cyhlbGVtZW50c1RvQmluZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICAvL3BhcnNlIHRocm91Z2ggZG9tIGFuZCBmaW5kIGV2ZXJ5dGhpbmcgd2l0aCBtYXRjaGluZyBhdHRyaWJ1dGVzXG4gICAgICAgICAgICAkLmVhY2goZWxlbWVudHNUb0JpbmQsIGZ1bmN0aW9uIChpbmRleCwgZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIG1lLmJpbmRFbGVtZW50LmNhbGwobWUsIGVsZW1lbnQsIG1lLm9wdGlvbnMuY2hhbm5lbC52YXJpYWJsZXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBVbmJpbmQgcHJvdmlkZWQgZWxlbWVudHMuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSAge0FycmF5fSBlbGVtZW50c1RvVW5iaW5kIChPcHRpb25hbCkgSWYgbm90IHByb3ZpZGVkLCB1bmJpbmRzIGV2ZXJ5dGhpbmcuXG4gICAgICAgICAqL1xuICAgICAgICB1bmJpbmRBbGw6IGZ1bmN0aW9uIChlbGVtZW50c1RvVW5iaW5kKSB7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgaWYgKCFlbGVtZW50c1RvVW5iaW5kKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudHNUb1VuYmluZCA9IHRoaXMucHJpdmF0ZS5tYXRjaGVkRWxlbWVudHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkLmVhY2goZWxlbWVudHNUb1VuYmluZCwgZnVuY3Rpb24gKGluZGV4LCBlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgbWUudW5iaW5kRWxlbWVudC5jYWxsKG1lLCBlbGVtZW50LCBtZS5vcHRpb25zLmNoYW5uZWwudmFyaWFibGVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbml0aWFsaXplIHRoZSBET00gTWFuYWdlciB0byB3b3JrIHdpdGggYSBwYXJ0aWN1bGFyIEhUTUwgZWxlbWVudCBhbmQgYWxsIGVsZW1lbnRzIHdpdGhpbiB0aGF0IHJvb3QuIERhdGEgYmluZGluZ3MgYmV0d2VlbiBpbmRpdmlkdWFsIEhUTUwgZWxlbWVudHMgYW5kIHRoZSBtb2RlbCB2YXJpYWJsZXMgc3BlY2lmaWVkIGluIHRoZSBhdHRyaWJ1dGVzIHdpbGwgaGFwcGVuIHZpYSB0aGUgY2hhbm5lbC5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgKE9wdGlvbmFsKSBPdmVycmlkZXMgZm9yIHRoZSBkZWZhdWx0IG9wdGlvbnMuXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRpb25zLnJvb3QgVGhlIHJvb3QgSFRNTCBlbGVtZW50IGJlaW5nIG1hbmFnZWQgYnkgdGhpcyBpbnN0YW5jZSBvZiB0aGUgRE9NIE1hbmFnZXIuIERlZmF1bHRzIHRvIGBib2R5YC5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMuY2hhbm5lbCBUaGUgY2hhbm5lbCB0byBjb21tdW5pY2F0ZSB3aXRoLiBEZWZhdWx0cyB0byB0aGUgQ2hhbm5lbCBNYW5hZ2VyIGZyb20gW0VwaWNlbnRlci5qc10oLi4vLi4vLi4vYXBpX2FkYXB0ZXJzLykuXG4gICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5hdXRvQmluZCBJZiBgdHJ1ZWAgKGRlZmF1bHQpLCBhbnkgdmFyaWFibGVzIGFkZGVkIHRvIHRoZSBET00gYWZ0ZXIgYEZsb3cuaW5pdGlhbGl6ZSgpYCBoYXMgYmVlbiBjYWxsZWQgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHBhcnNlZCwgYW5kIHN1YnNjcmlwdGlvbnMgYWRkZWQgdG8gY2hhbm5lbHMuIE5vdGUsIHRoaXMgZG9lcyBub3Qgd29yayBpbiBJRSB2ZXJzaW9ucyA8IDExLlxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSb290IG9mIHRoZSBlbGVtZW50IGZvciBmbG93LmpzIHRvIG1hbmFnZSBmcm9tLlxuICAgICAgICAgICAgICAgICAqIEB0eXBlIHtTdHJpbmd9IGpRdWVyeSBzZWxlY3RvclxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJvb3Q6ICdib2R5JyxcbiAgICAgICAgICAgICAgICBjaGFubmVsOiBudWxsLFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQW55IHZhcmlhYmxlcyBhZGRlZCB0byB0aGUgRE9NIGFmdGVyIGBGbG93LmluaXRpYWxpemUoKWAgaGFzIGJlZW4gY2FsbGVkIHdpbGwgYmUgYXV0b21hdGljYWxseSBwYXJzZWQsIGFuZCBzdWJzY3JpcHRpb25zIGFkZGVkIHRvIGNoYW5uZWxzLiBOb3RlLCB0aGlzIGRvZXMgbm90IHdvcmsgaW4gSUUgdmVyc2lvbnMgPCAxMS5cbiAgICAgICAgICAgICAgICAgKiBAdHlwZSB7Qm9vbGVhbn1cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBhdXRvQmluZDogdHJ1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICQuZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgICAgICAgdmFyIGNoYW5uZWwgPSBkZWZhdWx0cy5jaGFubmVsO1xuXG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMgPSBkZWZhdWx0cztcblxuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIHZhciAkcm9vdCA9ICQoZGVmYXVsdHMucm9vdCk7XG4gICAgICAgICAgICAkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBtZS5iaW5kQWxsKCk7XG4gICAgICAgICAgICAgICAgJHJvb3QudHJpZ2dlcignZi5kb21yZWFkeScpO1xuXG4gICAgICAgICAgICAgICAgLy9BdHRhY2ggbGlzdGVuZXJzXG4gICAgICAgICAgICAgICAgLy8gTGlzdGVuIGZvciBjaGFuZ2VzIHRvIHVpIGFuZCBwdWJsaXNoIHRvIGFwaVxuICAgICAgICAgICAgICAgICRyb290Lm9mZihjb25maWcuZXZlbnRzLnRyaWdnZXIpLm9uKGNvbmZpZy5ldmVudHMudHJpZ2dlciwgZnVuY3Rpb24gKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyc2VkRGF0YSA9IHt9OyAvL2lmIG5vdCBhbGwgc3Vic2VxdWVudCBsaXN0ZW5lcnMgd2lsbCBnZXQgdGhlIG1vZGlmaWVkIGRhdGFcblxuICAgICAgICAgICAgICAgICAgICB2YXIgJGVsID0gJChldnQudGFyZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJDb252ZXJ0ZXJzID0gIGRvbVV0aWxzLmdldENvbnZlcnRlcnNMaXN0KCRlbCwgJ2JpbmQnKTtcblxuICAgICAgICAgICAgICAgICAgICBfLmVhY2goZGF0YSwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXkgPSBrZXkuc3BsaXQoJ3wnKVswXS50cmltKCk7IC8vaW4gY2FzZSB0aGUgcGlwZSBmb3JtYXR0aW5nIHN5bnRheCB3YXMgdXNlZFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gY29udmVydGVyTWFuYWdlci5wYXJzZSh2YWwsIGF0dHJDb252ZXJ0ZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlZERhdGFba2V5XSA9IHBhcnNlVXRpbHMudG9JbXBsaWNpdFR5cGUodmFsKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgJGVsLnRyaWdnZXIoJ2YuY29udmVydCcsIHsgYmluZDogdmFsIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBjaGFubmVsLnZhcmlhYmxlcy5wdWJsaXNoKHBhcnNlZERhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTGlzdGVuIGZvciBjaGFuZ2VzIGZyb20gYXBpIGFuZCB1cGRhdGUgdWlcbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoY29uZmlnLmV2ZW50cy5yZWFjdCkub24oY29uZmlnLmV2ZW50cy5yZWFjdCwgZnVuY3Rpb24gKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhldnQudGFyZ2V0LCBkYXRhLCBcInJvb3Qgb25cIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkZWwgPSAkKGV2dC50YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYmluZGluZ3MgPSAkZWwuZGF0YSgnYXR0ci1iaW5kaW5ncycpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciB0b2NvbnZlcnQgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgJC5lYWNoKGRhdGEsIGZ1bmN0aW9uICh2YXJpYWJsZU5hbWUsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLmVhY2goYmluZGluZ3MsIGZ1bmN0aW9uIChiaW5kaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF8uY29udGFpbnMoYmluZGluZy50b3BpY3MsIHZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJpbmRpbmcudG9waWNzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvY29udmVydFtiaW5kaW5nLmF0dHJdID0gXy5waWNrKGRhdGEsIGJpbmRpbmcudG9waWNzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvY29udmVydFtiaW5kaW5nLmF0dHJdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICRlbC50cmlnZ2VyKCdmLmNvbnZlcnQnLCB0b2NvbnZlcnQpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gZGF0YSA9IHtwcm9wdG91cGRhdGU6IHZhbHVlfSB8fCBqdXN0IGEgdmFsdWUgKGFzc3VtZXMgJ2JpbmQnIGlmIHNvKVxuICAgICAgICAgICAgICAgICRyb290Lm9mZignZi5jb252ZXJ0Jykub24oJ2YuY29udmVydCcsIGZ1bmN0aW9uIChldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRlbCA9ICQoZXZ0LnRhcmdldCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb252ZXJ0ID0gZnVuY3Rpb24gKHZhbCwgcHJvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcCA9IHByb3AudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdHRyQ29udmVydGVycyA9ICBkb21VdGlscy5nZXRDb252ZXJ0ZXJzTGlzdCgkZWwsIHByb3ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBhdHRyTWFuYWdlci5nZXRIYW5kbGVyKHByb3AsICRlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29udmVydGVkVmFsdWUgPSBjb252ZXJ0ZXJNYW5hZ2VyLmNvbnZlcnQodmFsLCBhdHRyQ29udmVydGVycyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyLmhhbmRsZS5jYWxsKCRlbCwgY29udmVydGVkVmFsdWUsIHByb3ApO1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZWFjaChkYXRhLCBjb252ZXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnZlcnQoZGF0YSwgJ2JpbmQnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKCdmLnVpLm9wZXJhdGUnKS5vbignZi51aS5vcGVyYXRlJywgZnVuY3Rpb24gKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gJC5leHRlbmQodHJ1ZSwge30sIGRhdGEpOyAvL2lmIG5vdCBhbGwgc3Vic2VxdWVudCBsaXN0ZW5lcnMgd2lsbCBnZXQgdGhlIG1vZGlmaWVkIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGRhdGEub3BlcmF0aW9ucywgZnVuY3Rpb24gKG9wbikge1xuICAgICAgICAgICAgICAgICAgICAgICBvcG4ucGFyYW1zID0gXy5tYXAob3BuLnBhcmFtcywgZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVXRpbHMudG9JbXBsaWNpdFR5cGUoJC50cmltKHZhbCkpO1xuICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5uZWwub3BlcmF0aW9ucy5wdWJsaXNoKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1lLm9wdGlvbnMuYXV0b0JpbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgYXV0b1VwZGF0ZVBsdWdpbigkcm9vdC5nZXQoMCksIG1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gJC5leHRlbmQodGhpcywgcHVibGljQVBJKTtcbn0oKSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBleHRlbmQgPSBmdW5jdGlvbiAocHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICB2YXIgY2hpbGQ7XG5cbiAgICAvLyBUaGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIHRoZSBuZXcgc3ViY2xhc3MgaXMgZWl0aGVyIGRlZmluZWQgYnkgeW91XG4gICAgLy8gKHRoZSBcImNvbnN0cnVjdG9yXCIgcHJvcGVydHkgaW4geW91ciBgZXh0ZW5kYCBkZWZpbml0aW9uKSwgb3IgZGVmYXVsdGVkXG4gICAgLy8gYnkgdXMgdG8gc2ltcGx5IGNhbGwgdGhlIHBhcmVudCdzIGNvbnN0cnVjdG9yLlxuICAgIGlmIChwcm90b1Byb3BzICYmIF8uaGFzKHByb3RvUHJvcHMsICdjb25zdHJ1Y3RvcicpKSB7XG4gICAgICAgIGNoaWxkID0gcHJvdG9Qcm9wcy5jb25zdHJ1Y3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHBhcmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyB9O1xuICAgIH1cblxuICAgIC8vIEFkZCBzdGF0aWMgcHJvcGVydGllcyB0byB0aGUgY29uc3RydWN0b3IgZnVuY3Rpb24sIGlmIHN1cHBsaWVkLlxuICAgIF8uZXh0ZW5kKGNoaWxkLCBwYXJlbnQsIHN0YXRpY1Byb3BzKTtcblxuICAgIC8vIFNldCB0aGUgcHJvdG90eXBlIGNoYWluIHRvIGluaGVyaXQgZnJvbSBgcGFyZW50YCwgd2l0aG91dCBjYWxsaW5nXG4gICAgLy8gYHBhcmVudGAncyBjb25zdHJ1Y3RvciBmdW5jdGlvbi5cbiAgICB2YXIgU3Vycm9nYXRlID0gZnVuY3Rpb24gKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gY2hpbGQ7IH07XG4gICAgU3Vycm9nYXRlLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XG4gICAgY2hpbGQucHJvdG90eXBlID0gbmV3IFN1cnJvZ2F0ZSgpO1xuXG4gICAgLy8gQWRkIHByb3RvdHlwZSBwcm9wZXJ0aWVzIChpbnN0YW5jZSBwcm9wZXJ0aWVzKSB0byB0aGUgc3ViY2xhc3MsXG4gICAgLy8gaWYgc3VwcGxpZWQuXG4gICAgaWYgKHByb3RvUHJvcHMpIHtcbiAgICAgICAgXy5leHRlbmQoY2hpbGQucHJvdG90eXBlLCBwcm90b1Byb3BzKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgYSBjb252ZW5pZW5jZSBwcm9wZXJ0eSBpbiBjYXNlIHRoZSBwYXJlbnQncyBwcm90b3R5cGUgaXMgbmVlZGVkXG4gICAgLy8gbGF0ZXIuXG4gICAgY2hpbGQuX19zdXBlcl9fID0gcGFyZW50LnByb3RvdHlwZTtcblxuICAgIHJldHVybiBjaGlsZDtcbn07XG5cbnZhciBWaWV3ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbCA9IChvcHRpb25zLiRlbCkgfHwgJChvcHRpb25zLmVsKTtcbiAgICB0aGlzLmVsID0gb3B0aW9ucy5lbDtcbiAgICB0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxufTtcblxuXy5leHRlbmQoVmlldy5wcm90b3R5cGUsIHtcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7fSxcbn0pO1xuXG5WaWV3LmV4dGVuZCA9IGV4dGVuZDtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3O1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uLy4uL2NvbmZpZycpO1xudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9kZWZhdWx0LW5vZGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIHByb3BlcnR5SGFuZGxlcnM6IFtdLFxuXG4gICAgdWlDaGFuZ2VFdmVudDogJ2NoYW5nZScsXG4gICAgZ2V0VUlWYWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy4kZWwudmFsKCk7XG4gICAgfSxcblxuICAgIHJlbW92ZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLiRlbC5vZmYodGhpcy51aUNoYW5nZUV2ZW50KTtcbiAgICB9LFxuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICB2YXIgcHJvcE5hbWUgPSB0aGlzLiRlbC5kYXRhKGNvbmZpZy5iaW5kZXJBdHRyKTtcblxuICAgICAgICBpZiAocHJvcE5hbWUpIHtcbiAgICAgICAgICAgIHRoaXMuJGVsLm9mZih0aGlzLnVpQ2hhbmdlRXZlbnQpLm9uKHRoaXMudWlDaGFuZ2VFdmVudCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciB2YWwgPSBtZS5nZXRVSVZhbHVlKCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0ge307XG4gICAgICAgICAgICAgICAgcGFyYW1zW3Byb3BOYW1lXSA9IHZhbDtcblxuICAgICAgICAgICAgICAgIG1lLiRlbC50cmlnZ2VyKGNvbmZpZy5ldmVudHMudHJpZ2dlciwgcGFyYW1zKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIEJhc2VWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxufSwgeyBzZWxlY3RvcjogJ2lucHV0LCBzZWxlY3QnIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL2Jhc2UnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIHByb3BlcnR5SGFuZGxlcnM6IFtcblxuICAgIF0sXG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgfVxufSwgeyBzZWxlY3RvcjogJyonIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9kZWZhdWx0LWlucHV0LW5vZGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoe1xuXG4gICAgcHJvcGVydHlIYW5kbGVyczogW1xuXG4gICAgXSxcblxuICAgIGdldFVJVmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICRlbCA9IHRoaXMuJGVsO1xuICAgICAgICAvL1RPRE86IGZpbGUgYSBpc3N1ZSBmb3IgdGhlIHZlbnNpbSBtYW5hZ2VyIHRvIGNvbnZlcnQgdHJ1ZXMgdG8gMXMgYW5kIHNldCB0aGlzIHRvIHRydWUgYW5kIGZhbHNlXG5cbiAgICAgICAgdmFyIG9mZlZhbCA9ICAoJGVsLmRhdGEoJ2Ytb2ZmJykgIT09IHVuZGVmaW5lZCkgPyAkZWwuZGF0YSgnZi1vZmYnKSA6IDA7XG4gICAgICAgIC8vYXR0ciA9IGluaXRpYWwgdmFsdWUsIHByb3AgPSBjdXJyZW50IHZhbHVlXG4gICAgICAgIHZhciBvblZhbCA9ICgkZWwuYXR0cigndmFsdWUnKSAhPT0gdW5kZWZpbmVkKSA/ICRlbC5wcm9wKCd2YWx1ZScpOiAxO1xuXG4gICAgICAgIHZhciB2YWwgPSAoJGVsLmlzKCc6Y2hlY2tlZCcpKSA/IG9uVmFsIDogb2ZmVmFsO1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBCYXNlVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbn0sIHsgc2VsZWN0b3I6ICc6Y2hlY2tib3gsOnJhZGlvJyB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uIChzZWxlY3RvciwgaGFuZGxlcikge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICAgICAgaGFuZGxlciA9IHtcbiAgICAgICAgICAgIGhhbmRsZTogaGFuZGxlclxuICAgICAgICB9O1xuICAgIH1cbiAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICAgIHNlbGVjdG9yID0gJyonO1xuICAgIH1cbiAgICBoYW5kbGVyLnNlbGVjdG9yID0gc2VsZWN0b3I7XG4gICAgcmV0dXJuIGhhbmRsZXI7XG59O1xuXG52YXIgbWF0Y2ggPSBmdW5jdGlvbiAodG9NYXRjaCwgbm9kZSkge1xuICAgIGlmIChfLmlzU3RyaW5nKHRvTWF0Y2gpKSB7XG4gICAgICAgIHJldHVybiB0b01hdGNoID09PSBub2RlLnNlbGVjdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAkKHRvTWF0Y2gpLmlzKG5vZGUuc2VsZWN0b3IpO1xuICAgIH1cbn07XG5cbnZhciBub2RlTWFuYWdlciA9IHtcbiAgICBsaXN0OiBbXSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBub2RlIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmd9IHNlbGVjdG9yIGpRdWVyeS1jb21wYXRpYmxlIHNlbGVjdG9yIHRvIHVzZSB0byBtYXRjaCBub2Rlc1xuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufSBoYW5kbGVyICBIYW5kbGVycyBhcmUgbmV3LWFibGUgZnVuY3Rpb25zLiBUaGV5IHdpbGwgYmUgY2FsbGVkIHdpdGggJGVsIGFzIGNvbnRleHQuPyBUT0RPOiBUaGluayB0aGlzIHRocm91Z2hcbiAgICAgKi9cbiAgICByZWdpc3RlcjogZnVuY3Rpb24gKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMubGlzdC51bnNoaWZ0KG5vcm1hbGl6ZShzZWxlY3RvciwgaGFuZGxlcikpO1xuICAgIH0sXG5cbiAgICBnZXRIYW5kbGVyOiBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIF8uZmluZCh0aGlzLmxpc3QsIGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2goc2VsZWN0b3IsIG5vZGUpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgcmVwbGFjZTogZnVuY3Rpb24gKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgXy5lYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24gKGN1cnJlbnRIYW5kbGVyLCBpKSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09IGN1cnJlbnRIYW5kbGVyLnNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGlzdC5zcGxpY2UoaW5kZXgsIDEsIG5vcm1hbGl6ZShzZWxlY3RvciwgaGFuZGxlcikpO1xuICAgIH1cbn07XG5cbi8vYm9vdHN0cmFwc1xudmFyIGRlZmF1bHRIYW5kbGVycyA9IFtcbiAgICByZXF1aXJlKCcuL2lucHV0LWNoZWNrYm94LW5vZGUnKSxcbiAgICByZXF1aXJlKCcuL2RlZmF1bHQtaW5wdXQtbm9kZScpLFxuICAgIHJlcXVpcmUoJy4vZGVmYXVsdC1ub2RlJylcbl07XG5fLmVhY2goZGVmYXVsdEhhbmRsZXJzLnJldmVyc2UoKSwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICBub2RlTWFuYWdlci5yZWdpc3RlcihoYW5kbGVyLnNlbGVjdG9yLCBoYW5kbGVyKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5vZGVNYW5hZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh0YXJnZXQsIGRvbU1hbmFnZXIpIHtcbiAgICBpZiAoIXdpbmRvdy5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYW4gb2JzZXJ2ZXIgaW5zdGFuY2VcbiAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAobXV0YXRpb25zKSB7XG4gICAgICBtdXRhdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAobXV0YXRpb24pIHtcbiAgICAgICAgdmFyIGFkZGVkID0gJChtdXRhdGlvbi5hZGRlZE5vZGVzKS5maW5kKCc6ZicpO1xuICAgICAgICBhZGRlZCA9IGFkZGVkLmFkZCgkKG11dGF0aW9uLmFkZGVkTm9kZXMpLmZpbHRlcignOmYnKSk7XG5cbiAgICAgICAgdmFyIHJlbW92ZWQgPSAkKG11dGF0aW9uLnJlbW92ZWROb2RlcykuZmluZCgnOmYnKTtcbiAgICAgICAgcmVtb3ZlZCA9IHJlbW92ZWQuYWRkKCQobXV0YXRpb24ucmVtb3ZlZE5vZGVzKS5maWx0ZXIoJzpmJykpO1xuXG4gICAgICAgIGlmIChhZGRlZCAmJiBhZGRlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdtdXRhdGlvbiBvYnNlcnZlciBhZGRlZCcsIGFkZGVkLmdldCgpLCBtdXRhdGlvbi5hZGRlZE5vZGVzKTtcbiAgICAgICAgICAgIGRvbU1hbmFnZXIuYmluZEFsbChhZGRlZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlbW92ZWQgJiYgcmVtb3ZlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdtdXRhdGlvbiBvYnNlcnZlciByZW1vdmVkJywgcmVtb3ZlZCk7XG4gICAgICAgICAgICBkb21NYW5hZ2VyLnVuYmluZEFsbChyZW1vdmVkKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB2YXIgbXV0Y29uZmlnID0ge1xuICAgICAgICBhdHRyaWJ1dGVzOiBmYWxzZSxcbiAgICAgICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgICAgICBzdWJ0cmVlOiB0cnVlLFxuICAgICAgICBjaGFyYWN0ZXJEYXRhOiBmYWxzZVxuICAgIH07XG4gICAgb2JzZXJ2ZXIub2JzZXJ2ZSh0YXJnZXQsIG11dGNvbmZpZyk7XG4gICAgLy8gTGF0ZXIsIHlvdSBjYW4gc3RvcCBvYnNlcnZpbmdcbiAgICAvLyBvYnNlcnZlci5kaXNjb25uZWN0KCk7XG59O1xuIiwiLyoqXG4gKiAjIyBGbG93LmpzIEluaXRpYWxpemF0aW9uXG4gKlxuICogVG8gdXNlIEZsb3cuanMgaW4geW91ciBwcm9qZWN0LCBzaW1wbHkgY2FsbCBgRmxvdy5pbml0aWFsaXplKClgIGluIHlvdXIgdXNlciBpbnRlcmZhY2UuIEluIHRoZSBiYXNpYyBjYXNlLCBgRmxvdy5pbml0aWFsaXplKClgIGNhbiBiZSBjYWxsZWQgd2l0aG91dCBhbnkgYXJndW1lbnRzLiBXaGlsZSBGbG93LmpzIG5lZWRzIHRvIGtub3cgdGhlIGFjY291bnQsIHByb2plY3QsIGFuZCBtb2RlbCB5b3UgYXJlIHVzaW5nLCBieSBkZWZhdWx0IHRoZXNlIHZhbHVlcyBhcmUgZXh0cmFjdGVkIGZyb20gdGhlIFVSTCBvZiBFcGljZW50ZXIgcHJvamVjdCBhbmQgYnkgdGhlIHVzZSBvZiBgZGF0YS1mLW1vZGVsYCBpbiB5b3VyIGA8Ym9keT5gIHRhZy4gU2VlIG1vcmUgb24gdGhlIFtiYXNpY3Mgb2YgdXNpbmcgRmxvdy5qcyBpbiB5b3VyIHByb2plY3QuXSguLi8uLi8jdXNpbmdfaW5fcHJvamVjdCkuXG4gKlxuICogSG93ZXZlciwgc29tZXRpbWVzIHlvdSB3YW50IHRvIGJlIGV4cGxpY2l0IGluIHlvdXIgaW5pdGlhbGl6YXRpb24gY2FsbCwgYW5kIHRoZXJlIGFyZSBhbHNvIHNvbWUgYWRkaXRpb25hbCBwYXJhbWV0ZXJzIHRoYXQgbGV0IHlvdSBjdXN0b21pemUgeW91ciB1c2Ugb2YgRmxvdy5qcy5cbiAqXG4gKiAjIyMjUGFyYW1ldGVyc1xuICpcbiAqIFRoZSBwYXJhbWV0ZXJzIGZvciBpbml0aWFsaXppbmcgRmxvdy5qcyBpbmNsdWRlOlxuICpcbiAqICogYGNoYW5uZWxgIENvbmZpZ3VyYXRpb24gZGV0YWlscyBmb3IgdGhlIGNoYW5uZWwgRmxvdy5qcyB1c2VzIGluIGNvbm5lY3Rpbmcgd2l0aCB1bmRlcmx5aW5nIEFQSXMuXG4gKiAqIGBjaGFubmVsLnN0cmF0ZWd5YCBUaGUgcnVuIGNyZWF0aW9uIHN0cmF0ZWd5IGRlc2NyaWJlcyB3aGVuIHRvIGNyZWF0ZSBuZXcgcnVucyB3aGVuIGFuIGVuZCB1c2VyIHZpc2l0cyB0aGlzIHBhZ2UuIFRoZSBkZWZhdWx0IGlzIGBuZXctaWYtcGVyc2lzdGVkYCwgd2hpY2ggY3JlYXRlcyBhIG5ldyBydW4gd2hlbiB0aGUgZW5kIHVzZXIgaXMgaWRsZSBmb3IgbG9uZ2VyIHRoYW4geW91ciBwcm9qZWN0J3MgKipNb2RlbCBTZXNzaW9uIFRpbWVvdXQqKiAoY29uZmlndXJlZCBpbiB5b3VyIHByb2plY3QncyBbU2V0dGluZ3NdKC4uLy4uLy4uL3VwZGF0aW5nX3lvdXJfc2V0dGluZ3MvKSksIGJ1dCBvdGhlcndpc2UgdXNlcyB0aGUgY3VycmVudCBydW4uLiBTZWUgbW9yZSBvbiBbUnVuIFN0cmF0ZWdpZXNdKC4uLy4uLy4uL2FwaV9hZGFwdGVycy9zdHJhdGVneS8pLlxuICogKiBgY2hhbm5lbC5ydW5gIENvbmZpZ3VyYXRpb24gZGV0YWlscyBmb3IgZWFjaCBydW4gY3JlYXRlZC5cbiAqICogYGNoYW5uZWwucnVuLmFjY291bnRgIFRoZSAqKlVzZXIgSUQqKiBvciAqKlRlYW0gSUQqKiBmb3IgdGhpcyBwcm9qZWN0LiBCeSBkZWZhdWx0LCB0YWtlbiBmcm9tIHRoZSBVUkwgd2hlcmUgdGhlIHVzZXIgaW50ZXJmYWNlIGlzIGhvc3RlZCwgc28geW91IG9ubHkgbmVlZCB0byBzdXBwbHkgdGhpcyBpcyB5b3UgYXJlIHJ1bm5pbmcgeW91ciBwcm9qZWN0J3MgdXNlciBpbnRlcmZhY2UgW29uIHlvdXIgb3duIHNlcnZlcl0oLi4vLi4vLi4vaG93X3RvL3NlbGZfaG9zdGluZy8pLlxuICogKiBgY2hhbm5lbC5ydW4ucHJvamVjdGAgVGhlICoqUHJvamVjdCBJRCoqIGZvciB0aGlzIHByb2plY3QuXG4gKiAqIGBjaGFubmVsLnJ1bi5tb2RlbGAgTmFtZSBvZiB0aGUgcHJpbWFyeSBtb2RlbCBmaWxlIGZvciB0aGlzIHByb2plY3QuIEJ5IGRlZmF1bHQsIHRha2VuIGZyb20gYGRhdGEtZi1tb2RlbGAgaW4geW91ciBIVE1MIGA8Ym9keT5gIHRhZy5cbiAqICogYGNoYW5uZWwucnVuLnZhcmlhYmxlc2AgQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgdmFyaWFibGVzIGJlaW5nIGxpc3RlbmVkIHRvIG9uIHRoaXMgY2hhbm5lbC5cbiAqICogYGNoYW5uZWwucnVuLnZhcmlhYmxlcy5zaWxlbnRgIFByb3ZpZGVzIGdyYW51bGFyIGNvbnRyb2wgb3ZlciB3aGVuIHVzZXIgaW50ZXJmYWNlIHVwZGF0ZXMgaGFwcGVuIGZvciBjaGFuZ2VzIG9uIHRoaXMgY2hhbm5lbC4gU2VlIGJlbG93IGZvciBwb3NzaWJsZSB2YWx1ZXMuXG4gKiAqIGBjaGFubmVsLnJ1bi52YXJpYWJsZXMuYXV0b0ZldGNoYCBPcHRpb25zIGZvciBmZXRjaGluZyB2YXJpYWJsZXMgZnJvbSB0aGUgQVBJIGFzIHRoZXkncmUgYmVpbmcgc3Vic2NyaWJlZC4gU2VlIFtWYXJpYWJsZXMgQ2hhbm5lbF0oLi4vY2hhbm5lbHMvdmFyaWFibGVzLWNoYW5uZWwvKSBmb3IgZGV0YWlscy5cbiAqICogYGNoYW5uZWwucnVuLm9wZXJhdGlvbnNgIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIG9wZXJhdGlvbnMgYmVpbmcgbGlzdGVuZWQgdG8gb24gdGhpcyBjaGFubmVsLiBDdXJyZW50bHkgdGhlcmUgaXMgb25seSBvbmUgY29uZmlndXJhdGlvbiBvcHRpb246IGBzaWxlbnRgLlxuICogKiBgY2hhbm5lbC5ydW4ub3BlcmF0aW9ucy5zaWxlbnRgIFByb3ZpZGVzIGdyYW51bGFyIGNvbnRyb2wgb3ZlciB3aGVuIHVzZXIgaW50ZXJmYWNlIHVwZGF0ZXMgaGFwcGVuIGZvciBjaGFuZ2VzIG9uIHRoaXMgY2hhbm5lbC4gU2VlIGJlbG93IGZvciBwb3NzaWJsZSB2YWx1ZXMuXG4gKiAqIGBjaGFubmVsLnJ1bi5zZXJ2ZXJgIE9iamVjdCB3aXRoIGFkZGl0aW9uYWwgc2VydmVyIGNvbmZpZ3VyYXRpb24sIGRlZmF1bHRzIHRvIGBob3N0OiAnYXBpLmZvcmlvLmNvbSdgLlxuICogKiBgY2hhbm5lbC5ydW4udHJhbnNwb3J0YCBBbiBvYmplY3Qgd2hpY2ggdGFrZXMgYWxsIG9mIHRoZSBqcXVlcnkuYWpheCBvcHRpb25zIGF0IDxhIGhyZWY9XCJodHRwOi8vYXBpLmpxdWVyeS5jb20valF1ZXJ5LmFqYXgvXCI+aHR0cDovL2FwaS5qcXVlcnkuY29tL2pRdWVyeS5hamF4LzwvYT4uXG4gKiAqIGBkb21gIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIERPTSB3aGVyZSB0aGlzIGluc3RhbmNlIG9mIEZsb3cuanMgaXMgY3JlYXRlZC5cbiAqICogYGRvbS5yb290YCBUaGUgcm9vdCBIVE1MIGVsZW1lbnQgYmVpbmcgbWFuYWdlZCBieSB0aGUgRmxvdy5qcyBET00gTWFuYWdlci4gRGVmYXVsdHMgdG8gYGJvZHlgLlxuICogKiBgZG9tLmF1dG9CaW5kYCBJZiBgdHJ1ZWAgKGRlZmF1bHQpLCBhdXRvbWF0aWNhbGx5IHBhcnNlIHZhcmlhYmxlcyBhZGRlZCB0byB0aGUgRE9NIGFmdGVyIHRoaXMgYEZsb3cuaW5pdGlhbGl6ZSgpYCBjYWxsLiBOb3RlLCB0aGlzIGRvZXMgbm90IHdvcmsgaW4gSUUgdmVyc2lvbnMgPCAxMS5cbiAqXG4gKiBUaGUgYHNpbGVudGAgY29uZmlndXJhdGlvbiBvcHRpb24gZm9yIHRoZSBgcnVuLnZhcmlhYmxlc2AgYW5kIGBydW4ub3BlcmF0aW9uc2AgaXMgYSBmbGFnIGZvciBwcm92aWRpbmcgbW9yZSBncmFudWxhciBjb250cm9sIG92ZXIgd2hlbiB1c2VyIGludGVyZmFjZSB1cGRhdGVzIGhhcHBlbiBmb3IgY2hhbmdlcyBvbiB0aGlzIGNoYW5uZWwuIFZhbHVlcyBjYW4gYmU6XG4gKlxuICogKiBgZmFsc2VgOiBBbHdheXMgdXBkYXRlIHRoZSBVSSBmb3IgYW55IGNoYW5nZXMgKHZhcmlhYmxlcyB1cGRhdGVkLCBvcGVyYXRpb25zIGNhbGxlZCkgb24gdGhpcyBjaGFubmVsLiBUaGlzIGlzIHRoZSBkZWZhdWx0IGJlaGF2aW9yLlxuICogKiBgdHJ1ZWA6IE5ldmVyIHVwZGF0ZSB0aGUgVUkgZm9yIGFueSBvbiBjaGFuZ2VzICh2YXJpYWJsZXMgdXBkYXRlZCwgb3BlcmF0aW9ucyBjYWxsZWQpIG9uIHRoaXMgY2hhbm5lbC5cbiAqICogQXJyYXkgb2YgdmFyaWFibGVzIG9yIG9wZXJhdGlvbnMgZm9yIHdoaWNoIHRoZSBVSSAqc2hvdWxkIG5vdCogYmUgdXBkYXRlZC4gRm9yIGV4YW1wbGUsIGB2YXJpYWJsZXM6IHsgc2lsZW50OiBbICdwcmljZScsICdzYWxlcycgXSB9YCBtZWFucyB0aGlzIGNoYW5uZWwgaXMgc2lsZW50IChubyB1cGRhdGVzIGZvciB0aGUgVUkpIHdoZW4gdGhlIHZhcmlhYmxlcyAncHJpY2UnIG9yICdzYWxlcycgY2hhbmdlLCBhbmQgdGhlIFVJIGlzIGFsd2F5cyB1cGRhdGVkIGZvciBhbnkgY2hhbmdlcyB0byBvdGhlciB2YXJpYWJsZXMuIFRoaXMgaXMgdXNlZnVsIGlmIHlvdSBrbm93IHRoYXQgY2hhbmdpbmcgJ3ByaWNlJyBvciAnc2FsZXMnIGRvZXMgbm90IGltcGFjdCBhbnl0aGluZyBlbHNlIGluIHRoZSBVSSBkaXJlY3RseSwgZm9yIGluc3RhbmNlLlxuICogKiBgZXhjZXB0YDogV2l0aCBhcnJheSBvZiB2YXJpYWJsZXMgb3Igb3BlcmF0aW9ucyBmb3Igd2hpY2ggdGhlIFVJICpzaG91bGQqIGJlIHVwZGF0ZWQuIEZvciBleGFtcGxlLCBgdmFyaWFibGVzIHsgc2lsZW50OiB7IGV4Y2VwdDogWyAncHJpY2UnLCAnc2FsZXMnIF0gfSB9YCBpcyB0aGUgY29udmVyc2Ugb2YgdGhlIGFib3ZlLiBUaGUgVUkgaXMgYWx3YXlzIHVwZGF0ZWQgd2hlbiBhbnl0aGluZyBvbiB0aGlzIGNoYW5uZWwgY2hhbmdlcyAqZXhjZXB0KiB3aGVuIHRoZSB2YXJpYWJsZXMgJ3ByaWNlJyBvciAnc2FsZXMnIGFyZSB1cGRhdGVkLlxuICpcbiAqIEFsdGhvdWdoIEZsb3cuanMgcHJvdmlkZXMgYSBiaS1kaXJlY3Rpb25hbCBiaW5kaW5nIGJldHdlZW4gdGhlIG1vZGVsIGFuZCB0aGUgdXNlciBpbnRlcmZhY2UsIHRoZSBgc2lsZW50YCBjb25maWd1cmF0aW9uIG9wdGlvbiBhcHBsaWVzIG9ubHkgZm9yIHRoZSBiaW5kaW5nIGZyb20gdGhlIG1vZGVsIHRvIHRoZSB1c2VyIGludGVyZmFjZTsgdXBkYXRlcyBpbiB0aGUgdXNlciBpbnRlcmZhY2UgKGluY2x1ZGluZyBjYWxscyB0byBvcGVyYXRpb25zKSBhcmUgc3RpbGwgc2VudCB0byB0aGUgbW9kZWwuXG4gKlxuICogVGhlIGBGbG93LmluaXRpYWxpemUoKWAgY2FsbCBpcyBiYXNlZCBvbiB0aGUgRXBpY2VudGVyLmpzIFtSdW4gU2VydmljZV0oLi4vLi4vLi4vYXBpX2FkYXB0ZXJzL2dlbmVyYXRlZC9ydW4tYXBpLXNlcnZpY2UvKSBmcm9tIHRoZSBbQVBJIEFkYXB0ZXJzXSguLi8uLi8uLi9hcGlfYWRhcHRlcnMvKS4gU2VlIHRob3NlIHBhZ2VzIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uIG9uIHBhcmFtZXRlcnMuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgIEZsb3cuaW5pdGlhbGl6ZSh7XG4gKiAgICAgICAgICBjaGFubmVsOiB7XG4gKiAgICAgICAgICAgICAgc3RyYXRlZ3k6ICduZXctaWYtcGVyc2lzdGVkJyxcbiAqICAgICAgICAgICAgICBydW46IHtcbiAqICAgICAgICAgICAgICAgICAgbW9kZWw6ICdzdXBwbHktY2hhaW4tZ2FtZS5weScsXG4gKiAgICAgICAgICAgICAgICAgIGFjY291bnQ6ICdhY21lLXNpbXVsYXRpb25zJyxcbiAqICAgICAgICAgICAgICAgICAgcHJvamVjdDogJ3N1cHBseS1jaGFpbi1nYW1lJyxcbiAqICAgICAgICAgICAgICAgICAgc2VydmVyOiB7IGhvc3Q6ICdhcGkuZm9yaW8uY29tJyB9LFxuICogICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6IHsgc2lsZW50OiBbJ3ByaWNlJywgJ3NhbGVzJ10gfSxcbiAqICAgICAgICAgICAgICAgICAgb3BlcmF0aW9uczogeyBzaWxlbnQ6IGZhbHNlIH0sXG4gKiAgICAgICAgICAgICAgICAgIHRyYW5zcG9ydDoge1xuICogICAgICAgICAgICAgICAgICAgICAgYmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7ICQoJ2JvZHknKS5hZGRDbGFzcygnbG9hZGluZycpOyB9LFxuICogICAgICAgICAgICAgICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uKCkgeyAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTsgfVxuICogICAgICAgICAgICAgICAgICB9XG4gKiAgICAgICAgICAgICAgfVxuICogICAgICAgICAgfVxuICogICAgICB9KTtcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkb21NYW5hZ2VyID0gcmVxdWlyZSgnLi9kb20vZG9tLW1hbmFnZXInKTtcbnZhciBDaGFubmVsID0gcmVxdWlyZSgnLi9jaGFubmVscy9ydW4tY2hhbm5lbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkb206IGRvbU1hbmFnZXIsXG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgICAgIHZhciBtb2RlbCA9ICQoJ2JvZHknKS5kYXRhKCdmLW1vZGVsJyk7XG5cbiAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgY2hhbm5lbDoge1xuICAgICAgICAgICAgICAgIHJ1bjoge1xuICAgICAgICAgICAgICAgICAgICBhY2NvdW50OiAnJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvamVjdDogJycsXG4gICAgICAgICAgICAgICAgICAgIG1vZGVsOiBtb2RlbCxcblxuICAgICAgICAgICAgICAgICAgICBvcGVyYXRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXV0b0ZldGNoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZG9tOiB7XG4gICAgICAgICAgICAgICAgcm9vdDogJ2JvZHknLFxuICAgICAgICAgICAgICAgIGF1dG9CaW5kOiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIG9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIGNvbmZpZyk7XG4gICAgICAgIHZhciAkcm9vdCA9ICQob3B0aW9ucy5kb20ucm9vdCk7XG4gICAgICAgIHZhciBpbml0Rm4gPSAkcm9vdC5kYXRhKCdmLW9uLWluaXQnKTtcbiAgICAgICAgdmFyIG9wblNpbGVudCA9IG9wdGlvbnMuY2hhbm5lbC5ydW4ub3BlcmF0aW9ucy5zaWxlbnQ7XG4gICAgICAgIHZhciBpc0luaXRPcGVyYXRpb25TaWxlbnQgPSBpbml0Rm4gJiYgKG9wblNpbGVudCA9PT0gdHJ1ZSB8fCAoXy5pc0FycmF5KG9wblNpbGVudCkgJiYgXy5jb250YWlucyhvcG5TaWxlbnQsIGluaXRGbikpKTtcbiAgICAgICAgdmFyIHByZUZldGNoVmFyaWFibGVzID0gIWluaXRGbiB8fCBpc0luaXRPcGVyYXRpb25TaWxlbnQ7XG5cbiAgICAgICAgaWYgKHByZUZldGNoVmFyaWFibGVzKSB7XG4gICAgICAgICAgICBvcHRpb25zLmNoYW5uZWwucnVuLnZhcmlhYmxlcy5hdXRvRmV0Y2guc3RhcnQgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZyAmJiBjb25maWcuY2hhbm5lbCAmJiAoY29uZmlnLmNoYW5uZWwgaW5zdGFuY2VvZiBDaGFubmVsKSkge1xuICAgICAgICAgICAgdGhpcy5jaGFubmVsID0gY29uZmlnLmNoYW5uZWw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNoYW5uZWwgPSBuZXcgQ2hhbm5lbChvcHRpb25zLmNoYW5uZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgZG9tTWFuYWdlci5pbml0aWFsaXplKCQuZXh0ZW5kKHRydWUsIHtcbiAgICAgICAgICAgIGNoYW5uZWw6IHRoaXMuY2hhbm5lbFxuICAgICAgICB9LCBvcHRpb25zLmRvbSkpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgbWF0Y2g6IGZ1bmN0aW9uIChtYXRjaEV4cHIsIG1hdGNoVmFsdWUsIGNvbnRleHQpIHtcbiAgICAgICAgaWYgKF8uaXNTdHJpbmcobWF0Y2hFeHByKSkge1xuICAgICAgICAgICAgcmV0dXJuIChtYXRjaEV4cHIgPT09ICcqJyB8fCAobWF0Y2hFeHByLnRvTG93ZXJDYXNlKCkgPT09IG1hdGNoVmFsdWUudG9Mb3dlckNhc2UoKSkpO1xuICAgICAgICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbihtYXRjaEV4cHIpKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hFeHByKG1hdGNoVmFsdWUsIGNvbnRleHQpO1xuICAgICAgICB9IGVsc2UgaWYgKF8uaXNSZWdFeHAobWF0Y2hFeHByKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoVmFsdWUubWF0Y2gobWF0Y2hFeHByKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBnZXRDb252ZXJ0ZXJzTGlzdDogZnVuY3Rpb24gKCRlbCwgcHJvcGVydHkpIHtcbiAgICAgICAgdmFyIGF0dHJDb252ZXJ0ZXJzID0gJGVsLmRhdGEoJ2YtY29udmVydC0nICsgcHJvcGVydHkpO1xuXG4gICAgICAgIGlmICghYXR0ckNvbnZlcnRlcnMgJiYgKHByb3BlcnR5ID09PSAnYmluZCcgfHwgcHJvcGVydHkgPT09ICdmb3JlYWNoJykpIHtcbiAgICAgICAgICAgIGF0dHJDb252ZXJ0ZXJzID0gJGVsLmRhdGEoJ2YtY29udmVydCcpO1xuICAgICAgICAgICAgaWYgKCFhdHRyQ29udmVydGVycykge1xuICAgICAgICAgICAgICAgIHZhciAkcGFyZW50RWwgPSAkZWwuY2xvc2VzdCgnW2RhdGEtZi1jb252ZXJ0XScpO1xuICAgICAgICAgICAgICAgIGlmICgkcGFyZW50RWwpIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSAkcGFyZW50RWwuZGF0YSgnZi1jb252ZXJ0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGF0dHJDb252ZXJ0ZXJzKSB7XG4gICAgICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSBfLmludm9rZShhdHRyQ29udmVydGVycy5zcGxpdCgnfCcpLCAndHJpbScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGF0dHJDb252ZXJ0ZXJzO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdG9JbXBsaWNpdFR5cGU6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHZhciByYnJhY2UgPSAvXig/Olxcey4qXFx9fFxcWy4qXFxdKSQvO1xuICAgICAgICB2YXIgY29udmVydGVkID0gZGF0YTtcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZGF0YSA9IGRhdGEudHJpbSgpO1xuXG4gICAgICAgICAgICBpZiAoZGF0YSA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YSA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhID09PSAnbnVsbCcpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9ICcnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjb252ZXJ0ZWQuY2hhckF0KDApID09PSAnXFwnJyB8fCBjb252ZXJ0ZWQuY2hhckF0KDApID09PSAnXCInKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gZGF0YS5zdWJzdHJpbmcoMSwgZGF0YS5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJC5pc051bWVyaWMoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSArZGF0YTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmJyYWNlLnRlc3QoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAvL1RPRE86IFRoaXMgb25seSB3b3JrcyB3aXRoIGRvdWJsZSBxdW90ZXMsIGkuZS4sIFsxLFwiMlwiXSB3b3JrcyBidXQgbm90IFsxLCcyJ11cbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSAkLnBhcnNlSlNPTihkYXRhKSA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnZlcnRlZDtcbiAgICB9XG59O1xuIl19
