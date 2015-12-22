(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.Flow = require('./flow.js');
window.Flow.version = '0.9.0'; //populated by grunt

},{"./flow.js":31}],2:[function(require,module,exports){
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


},{"./binds/checkbox-radio-bind-attr":13,"./binds/default-bind-attr":14,"./binds/input-bind-attr":15,"./class-attr":16,"./default-attr":17,"./events/default-event-attr":18,"./events/init-event-attr":19,"./foreach/default-foreach-attr":20,"./negative-boolean-attr":21,"./no-op-attr":22,"./positive-boolean-attr":23}],13:[function(require,module,exports){
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
 *      <div>
 *          In <span data-f-bind="CurrentYear | #"></span>,
 *          our company earned <span data-f-bind="Revenue | $#,###"></span>
 *      </div>
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
 * In the third step of the model, this example generates:
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

},{"../../../utils/parse-utils":33}],21:[function(require,module,exports){
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

},{"../config":5,"../converters/converter-manager":7,"../utils/dom":32,"../utils/parse-utils":33,"./attributes/attribute-manager":12,"./nodes/node-manager":29,"./plugins/auto-update-bindings":30}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
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

},{"../../config":5,"./default-node":27}],27:[function(require,module,exports){
'use strict';

var BaseView = require('./base');

module.exports = BaseView.extend({
    propertyHandlers: [

    ],

    initialize: function () {
    }
}, { selector: '*' });

},{"./base":25}],28:[function(require,module,exports){
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

},{"./default-input-node":26}],29:[function(require,module,exports){
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

},{"./default-input-node":26,"./default-node":27,"./input-checkbox-node":28}],30:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
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

},{"./channels/run-channel":3,"./dom/dom-manager":24}],32:[function(require,module,exports){
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
            //Only bind inherits from parents
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

},{}],33:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYXBwLmpzIiwic3JjL2NoYW5uZWxzL29wZXJhdGlvbnMtY2hhbm5lbC5qcyIsInNyYy9jaGFubmVscy9ydW4tY2hhbm5lbC5qcyIsInNyYy9jaGFubmVscy92YXJpYWJsZXMtY2hhbm5lbC5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvY29udmVydGVycy9hcnJheS1jb252ZXJ0ZXIuanMiLCJzcmMvY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlci5qcyIsInNyYy9jb252ZXJ0ZXJzL251bWJlci1jb252ZXJ0ZXIuanMiLCJzcmMvY29udmVydGVycy9udW1iZXJmb3JtYXQtY29udmVydGVyLmpzIiwic3JjL2NvbnZlcnRlcnMvc3RyaW5nLWNvbnZlcnRlci5qcyIsInNyYy9jb252ZXJ0ZXJzL3VuZGVyc2NvcmUtdXRpbHMtY29udmVydGVyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2F0dHJpYnV0ZS1tYW5hZ2VyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2NoZWNrYm94LXJhZGlvLWJpbmQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9kZWZhdWx0LWJpbmQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9pbnB1dC1iaW5kLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvY2xhc3MtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9kZWZhdWx0LWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvZXZlbnRzL2RlZmF1bHQtZXZlbnQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9ldmVudHMvaW5pdC1ldmVudC1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2ZvcmVhY2gvZGVmYXVsdC1mb3JlYWNoLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvbmVnYXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL25vLW9wLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvcG9zaXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwic3JjL2RvbS9kb20tbWFuYWdlci5qcyIsInNyYy9kb20vbm9kZXMvYmFzZS5qcyIsInNyYy9kb20vbm9kZXMvZGVmYXVsdC1pbnB1dC1ub2RlLmpzIiwic3JjL2RvbS9ub2Rlcy9kZWZhdWx0LW5vZGUuanMiLCJzcmMvZG9tL25vZGVzL2lucHV0LWNoZWNrYm94LW5vZGUuanMiLCJzcmMvZG9tL25vZGVzL25vZGUtbWFuYWdlci5qcyIsInNyYy9kb20vcGx1Z2lucy9hdXRvLXVwZGF0ZS1iaW5kaW5ncy5qcyIsInNyYy9mbG93LmpzIiwic3JjL3V0aWxzL2RvbS5qcyIsInNyYy91dGlscy9wYXJzZS11dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwid2luZG93LkZsb3cgPSByZXF1aXJlKCcuL2Zsb3cuanMnKTtcbndpbmRvdy5GbG93LnZlcnNpb24gPSAnPCU9IHZlcnNpb24gJT4nOyAvL3BvcHVsYXRlZCBieSBncnVudFxuIiwiLyoqXG4gKiAjIyBPcGVyYXRpb25zIENoYW5uZWxcbiAqXG4gKiBDaGFubmVscyBhcmUgd2F5cyBmb3IgRmxvdy5qcyB0byB0YWxrIHRvIGV4dGVybmFsIEFQSXMgLS0gcHJpbWFyaWx5IHRoZSBbdW5kZXJseWluZyBFcGljZW50ZXIgQVBJc10oLi4vLi4vLi4vLi4vY3JlYXRpbmdfeW91cl9pbnRlcmZhY2UvKS5cbiAqXG4gKiBUaGUgcHJpbWFyeSB1c2UgY2FzZXMgZm9yIHRoZSBPcGVyYXRpb25zIENoYW5uZWwgYXJlOlxuICpcbiAqICogYHB1Ymxpc2hgOiBDYWxsIGFuIG9wZXJhdGlvbi5cbiAqICogYHN1YnNjcmliZWA6IFJlY2VpdmUgbm90aWZpY2F0aW9ucyB3aGVuIGFuIG9wZXJhdGlvbiBpcyBjYWxsZWQuXG4gKlxuICogRm9yIGV4YW1wbGUsIHVzZSBgcHVibGlzaCgpYCB0byBjYWxsIGFuIG9wZXJhdGlvbiAobWV0aG9kKSBmcm9tIHlvdXIgbW9kZWw6XG4gKlxuICogICAgICBGbG93LmNoYW5uZWwub3BlcmF0aW9ucy5wdWJsaXNoKCdteU1ldGhvZCcsIG15TWV0aG9kUGFyYW0pO1xuICpcbiAqIEZvciByZWZlcmVuY2UsIGFuIGVxdWl2YWxlbnQgY2FsbCB1c2luZyBGbG93LmpzIGN1c3RvbSBIVE1MIGF0dHJpYnV0ZXMgaXM6XG4gKlxuICogICAgICA8YnV0dG9uIGRhdGEtZi1vbi1jbGljaz1cIm15TWV0aG9kKG15TWV0aG9kUGFyYW0pXCI+Q2xpY2sgbWU8L2J1dHRvbj5cbiAqXG4gKiBZb3UgY2FuIGFsc28gdXNlIGBzdWJzY3JpYmUoKWAgYW5kIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gbGlzdGVuIGFuZCByZWFjdCB3aGVuIHRoZSBvcGVyYXRpb24gaGFzIGJlZW4gY2FsbGVkOlxuICpcbiAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMuc3Vic2NyaWJlKCdteU1ldGhvZCcsXG4gKiAgICAgICAgICBmdW5jdGlvbigpIHsgY29uc29sZS5sb2coJ2NhbGxlZCEnKTsgfSApO1xuICpcbiAqIFVzZSBgc3Vic2NyaWJlKCopYCB0byBsaXN0ZW4gZm9yIG5vdGlmaWNhdGlvbnMgb24gYWxsIG9wZXJhdGlvbnMuXG4gKlxuICogVG8gdXNlIHRoZSBPcGVyYXRpb25zIENoYW5uZWwsIHNpbXBseSBbaW5pdGlhbGl6ZSBGbG93LmpzIGluIHlvdXIgcHJvamVjdF0oLi4vLi4vLi4vI2N1c3RvbS1pbml0aWFsaXplKS5cbiAqXG4qL1xuXG5cbid1c2Ugc3RyaWN0JztcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERldGVybWluZSB3aGVuIHRvIHVwZGF0ZSBzdGF0ZS4gRGVmYXVsdHMgdG8gYGZhbHNlYDogYWx3YXlzIHRyaWdnZXIgdXBkYXRlcy5cbiAgICAgICAgICpcbiAgICAgICAgICogUG9zc2libGUgb3B0aW9ucyBhcmU6XG4gICAgICAgICAqXG4gICAgICAgICAqICogYHRydWVgOiBOZXZlciB0cmlnZ2VyIGFueSB1cGRhdGVzLiBVc2UgdGhpcyBpZiB5b3Uga25vdyB5b3VyIG1vZGVsIHN0YXRlIHdvbid0IGNoYW5nZSBiYXNlZCBvbiBvcGVyYXRpb25zLlxuICAgICAgICAgKiAqIGBmYWxzZWA6IEFsd2F5cyB0cmlnZ2VyIHVwZGF0ZXMuXG4gICAgICAgICAqICogYFthcnJheSBvZiBvcGVyYXRpb24gbmFtZXNdYDogT3BlcmF0aW9ucyBpbiB0aGlzIGFycmF5ICp3aWxsIG5vdCogdHJpZ2dlciB1cGRhdGVzOyBldmVyeXRoaW5nIGVsc2Ugd2lsbC5cbiAgICAgICAgICogKiBgeyBleGNlcHQ6IFthcnJheSBvZiBvcGVyYXRpb24gbmFtZXNdIH1gOiBPcGVyYXRpb25zIGluIHRoaXMgYXJyYXkgKndpbGwqIHRyaWdnZXIgdXBkYXRlczsgbm90aGluZyBlbHNlIHdpbGwuXG4gICAgICAgICAqXG4gICAgICAgICAqIFRvIHNldCwgcGFzcyB0aGlzIGludG8gdGhlIGBGbG93LmluaXRpYWxpemUoKWAgY2FsbCBpbiB0aGUgYGNoYW5uZWwucnVuLm9wZXJhdGlvbnNgIGZpZWxkOlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuaW5pdGlhbGl6ZSh7XG4gICAgICAgICAqICAgICAgICAgIGNoYW5uZWw6IHtcbiAgICAgICAgICogICAgICAgICAgICAgIHJ1bjoge1xuICAgICAgICAgKiAgICAgICAgICAgICAgICAgIG1vZGVsOiAnbXlNb2RlbC5weScsXG4gICAgICAgICAqICAgICAgICAgICAgICAgICAgYWNjb3VudDogJ2FjbWUtc2ltdWxhdGlvbnMnLFxuICAgICAgICAgKiAgICAgICAgICAgICAgICAgIHByb2plY3Q6ICdzdXBwbHktY2hhaW4tZ2FtZScsXG4gICAgICAgICAqICAgICAgICAgICAgICAgICAgb3BlcmF0aW9uczogeyBzaWxlbnQ6IHRydWUgfVxuICAgICAgICAgKiAgICAgICAgICAgICAgfVxuICAgICAgICAgKiAgICAgICAgICB9XG4gICAgICAgICAqICAgICAgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIFRvIG92ZXJyaWRlIGZvciBhIHNwZWNpZmljIGNhbGwgdG8gdGhlIE9wZXJhdGlvbnMgQ2hhbm5lbCwgcGFzcyB0aGlzIGFzIHRoZSBmaW5hbCBgb3B0aW9uc2AgcGFyYW1ldGVyOlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgICBGbG93LmNoYW5uZWwub3BlcmF0aW9ucy5wdWJsaXNoKCdteU1ldGhvZCcsIG15TWV0aG9kUGFyYW0sIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7U3RyaW5nfEFycmF5fE9iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIHNpbGVudDogZmFsc2UsXG5cbiAgICAgICAgaW50ZXJwb2xhdGU6IHt9XG4gICAgfTtcblxuICAgIHZhciBjaGFubmVsT3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgdGhpcy5vcHRpb25zID0gY2hhbm5lbE9wdGlvbnM7XG5cbiAgICB2YXIgcnVuID0gY2hhbm5lbE9wdGlvbnMucnVuO1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcbiAgICAgICAgLy9mb3IgdGVzdGluZ1xuICAgICAgICBwcml2YXRlOiB7XG4gICAgICAgICAgICBvcHRpb25zOiBjaGFubmVsT3B0aW9uc1xuICAgICAgICB9LFxuXG4gICAgICAgIGxpc3RlbmVyTWFwOiB7fSxcblxuICAgICAgICBnZXRTdWJzY3JpYmVyczogZnVuY3Rpb24gKHRvcGljKSB7XG4gICAgICAgICAgICB2YXIgdG9waWNTdWJzY3JpYmVycyA9IHRoaXMubGlzdGVuZXJNYXBbdG9waWNdIHx8IFtdO1xuICAgICAgICAgICAgdmFyIGdsb2JhbFN1YnNjcmliZXJzID0gdGhpcy5saXN0ZW5lck1hcFsnKiddIHx8IFtdO1xuICAgICAgICAgICAgcmV0dXJuIHRvcGljU3Vic2NyaWJlcnMuY29uY2F0KGdsb2JhbFN1YnNjcmliZXJzKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvL0NoZWNrIGZvciB1cGRhdGVzXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGb3JjZSBhIGNoZWNrIGZvciB1cGRhdGVzIG9uIHRoZSBjaGFubmVsLCBhbmQgbm90aWZ5IGFsbCBsaXN0ZW5lcnMuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSAgZXhlY3V0ZWRPcG5zIE9wZXJhdGlvbnMgd2hpY2gganVzdCBoYXBwZW5lZC5cbiAgICAgICAgICogQHBhcmFtIHtBbnl9IHJlc3BvbnNlICBSZXNwb25zZSBmcm9tIHRoZSBvcGVyYXRpb24uXG4gICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gZm9yY2UgIElnbm9yZSBhbGwgYHNpbGVudGAgb3B0aW9ucyBhbmQgZm9yY2UgcmVmcmVzaC5cbiAgICAgICAgICovXG4gICAgICAgIHJlZnJlc2g6IGZ1bmN0aW9uIChleGVjdXRlZE9wbnMsIHJlc3BvbnNlLCBmb3JjZSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ09wZXJhdGlvbnMgcmVmcmVzaCcsIGV4ZWN1dGVkT3Bucyk7XG4gICAgICAgICAgICB2YXIgc2lsZW50ID0gY2hhbm5lbE9wdGlvbnMuc2lsZW50O1xuXG4gICAgICAgICAgICB2YXIgdG9Ob3RpZnkgPSBleGVjdXRlZE9wbnM7XG4gICAgICAgICAgICBpZiAoZm9yY2UgPT09IHRydWUpIHtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2lsZW50ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgdG9Ob3RpZnkgPSBbXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KHNpbGVudCkgJiYgZXhlY3V0ZWRPcG5zKSB7XG4gICAgICAgICAgICAgICAgdG9Ob3RpZnkgPSBfLmRpZmZlcmVuY2UoZXhlY3V0ZWRPcG5zLCBzaWxlbnQpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkLmlzUGxhaW5PYmplY3Qoc2lsZW50KSAmJiBleGVjdXRlZE9wbnMpIHtcbiAgICAgICAgICAgICAgICB0b05vdGlmeSA9IF8uaW50ZXJzZWN0aW9uKHNpbGVudC5leGNlcHQsIGV4ZWN1dGVkT3Bucyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF8uZWFjaCh0b05vdGlmeSwgZnVuY3Rpb24gKG9wbikge1xuICAgICAgICAgICAgICAgIHRoaXMubm90aWZ5KG9wbiwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFsZXJ0IGVhY2ggc3Vic2NyaWJlciBhYm91dCB0aGUgb3BlcmF0aW9uIGFuZCBpdHMgcGFyYW1ldGVycy4gVGhpcyBjYW4gYmUgdXNlZCB0byBwcm92aWRlIGFuIHVwZGF0ZSB3aXRob3V0IGEgcm91bmQgdHJpcCB0byB0aGUgc2VydmVyLiBIb3dldmVyLCBpdCBpcyByYXJlbHkgdXNlZDogeW91IGFsbW9zdCBhbHdheXMgd2FudCB0byBgc3Vic2NyaWJlKClgIGluc3RlYWQgc28gdGhhdCB0aGUgb3BlcmF0aW9uIGlzIGFjdHVhbGx5IGNhbGxlZCBpbiB0aGUgbW9kZWwuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMubm90aWZ5KCdteU1ldGhvZCcsIG15TWV0aG9kUmVzcG9uc2UpO1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3BlcmF0aW9uIE5hbWUgb2Ygb3BlcmF0aW9uLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ8QXJyYXl8T2JqZWN0fSB2YWx1ZSBQYXJhbWV0ZXIgdmFsdWVzIGZvciB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICAgICovXG4gICAgICAgIG5vdGlmeTogZnVuY3Rpb24gKG9wZXJhdGlvbiwgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmdldFN1YnNjcmliZXJzKG9wZXJhdGlvbik7XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge307XG4gICAgICAgICAgICBwYXJhbXNbb3BlcmF0aW9uXSA9IHZhbHVlO1xuXG4gICAgICAgICAgICBfLmVhY2gobGlzdGVuZXJzLCBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gbGlzdGVuZXIudGFyZ2V0O1xuICAgICAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQuY2FsbChudWxsLCBwYXJhbXMsIHZhbHVlLCBvcGVyYXRpb24pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGFyZ2V0LnRyaWdnZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXIudGFyZ2V0LnRyaWdnZXIoY29uZmlnLmV2ZW50cy5yZWFjdCwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbGlzdGVuZXIgZm9ybWF0IGZvciAnICsgb3BlcmF0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBpbnRlcnBvbGF0ZTogZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgdmFyIGlwID0gdGhpcy5vcHRpb25zLmludGVycG9sYXRlO1xuICAgICAgICAgICAgdmFyIG1hdGNoID0gZnVuY3Rpb24gKHApIHtcbiAgICAgICAgICAgICAgICB2YXIgbWFwcGVkID0gcDtcbiAgICAgICAgICAgICAgICBpZiAoaXBbcF0pIHtcbiAgICAgICAgICAgICAgICAgICAgbWFwcGVkID0gXy5pc0Z1bmN0aW9uKGlwW3BdKSA/IGlwW3BdKHApIDogaXBbcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBtYXBwZWQ7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuICgkLmlzQXJyYXkocGFyYW1zKSkgPyBfLm1hcChwYXJhbXMsIG1hdGNoKSA6IG1hdGNoKHBhcmFtcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENhbGwgdGhlIG9wZXJhdGlvbiB3aXRoIHBhcmFtZXRlcnMsIGFuZCBhbGVydCBzdWJzY3JpYmVycy5cbiAgICAgICAgICpcbiAgICAgICAgICogKipFeGFtcGxlKipcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICBGbG93LmNoYW5uZWwub3BlcmF0aW9ucy5wdWJsaXNoKCdteU1ldGhvZCcsIG15TWV0aG9kUGFyYW0pO1xuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC5vcGVyYXRpb25zLnB1Ymxpc2goe1xuICAgICAgICAgKiAgICAgICAgICBvcGVyYXRpb25zOiBbeyBuYW1lOiAnbXlNZXRob2QnLCBwYXJhbXM6IFtteU1ldGhvZFBhcmFtXSB9XVxuICAgICAgICAgKiAgICAgIH0pO1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gIHtTdHJpbmd8T2JqZWN0fSBvcGVyYXRpb24gRm9yIG9uZSBvcGVyYXRpb24sIHBhc3MgdGhlIG5hbWUgb2Ygb3BlcmF0aW9uIChzdHJpbmcpLiBGb3IgbXVsdGlwbGUgb3BlcmF0aW9ucywgcGFzcyBhbiBvYmplY3Qgd2l0aCBmaWVsZCBgb3BlcmF0aW9uc2AgYW5kIHZhbHVlIGFycmF5IG9mIG9iamVjdHMsIGVhY2ggd2l0aCBgbmFtZWAgYW5kIGBwYXJhbXNgOiBge29wZXJhdGlvbnM6IFt7IG5hbWU6IG9wbiwgcGFyYW1zOltdIH1dIH1gLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ8QXJyYXl8T2JqZWN0fSBwYXJhbXMgKE9wdGlvbmFsKSAgUGFyYW1ldGVycyB0byBzZW5kIHRvIG9wZXJhdGlvbi4gVXNlIGZvciBvbmUgb3BlcmF0aW9uOyBmb3IgbXVsdGlwbGUgb3BlcmF0aW9ucywgcGFyYW1ldGVycyBhcmUgYWxyZWFkeSBpbmNsdWRlZCBpbiB0aGUgb2JqZWN0IGZvcm1hdC5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgKE9wdGlvbmFsKSBPdmVycmlkZXMgZm9yIHRoZSBkZWZhdWx0IGNoYW5uZWwgb3B0aW9ucy5cbiAgICAgICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnNpbGVudCBEZXRlcm1pbmUgd2hlbiB0byB1cGRhdGUgc3RhdGUuXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm4geyRwcm9taXNlfSBQcm9taXNlIHRvIGNvbXBsZXRlIHRoZSBjYWxsLlxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGlzaDogZnVuY3Rpb24gKG9wZXJhdGlvbiwgcGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChvcGVyYXRpb24pICYmIG9wZXJhdGlvbi5vcGVyYXRpb25zKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuID0gKG9wZXJhdGlvbi5zZXJpYWwpID8gcnVuLnNlcmlhbCA6IHJ1bi5wYXJhbGxlbDtcbiAgICAgICAgICAgICAgICBfLmVhY2gob3BlcmF0aW9uLm9wZXJhdGlvbnMsIGZ1bmN0aW9uIChvcG4pIHtcbiAgICAgICAgICAgICAgICAgICAgb3BuLnBhcmFtcyA9IHRoaXMuaW50ZXJwb2xhdGUob3BuLnBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLmNhbGwocnVuLCBvcGVyYXRpb24ub3BlcmF0aW9ucylcbiAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcGFyYW1zIHx8ICFwYXJhbXMuc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lLnJlZnJlc2guY2FsbChtZSwgXy5wbHVjayhvcGVyYXRpb24ub3BlcmF0aW9ucywgJ25hbWUnKSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgb3B0cyA9ICgkLmlzUGxhaW5PYmplY3Qob3BlcmF0aW9uKSkgPyBwYXJhbXMgOiBvcHRpb25zO1xuICAgICAgICAgICAgICAgIGlmICghJC5pc1BsYWluT2JqZWN0KG9wZXJhdGlvbikgJiYgcGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcyA9IHRoaXMuaW50ZXJwb2xhdGUocGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJ1bi5kby5jYWxsKHJ1biwgb3BlcmF0aW9uLCBwYXJhbXMpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvcHRzIHx8ICFvcHRzLnNpbGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lLnJlZnJlc2guY2FsbChtZSwgW29wZXJhdGlvbl0sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ29wZXJhdGlvbnMgcHVibGlzaCcsIG9wZXJhdGlvbiwgcGFyYW1zKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3Vic2NyaWJlIHRvIGNoYW5nZXMgb24gYSBjaGFubmVsOiBBc2sgZm9yIG5vdGlmaWNhdGlvbiB3aGVuIG9wZXJhdGlvbnMgYXJlIGNhbGxlZC5cbiAgICAgICAgICpcbiAgICAgICAgICogKipFeGFtcGxlKipcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICBGbG93LmNoYW5uZWwub3BlcmF0aW9ucy5zdWJzY3JpYmUoJ215TWV0aG9kJyxcbiAgICAgICAgICogICAgICAgICAgZnVuY3Rpb24oKSB7IGNvbnNvbGUubG9nKCdjYWxsZWQhJyk7IH0pO1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gb3BlcmF0aW9ucyBUaGUgbmFtZXMgb2YgdGhlIG9wZXJhdGlvbnMuIFVzZSBgKmAgdG8gbGlzdGVuIGZvciBub3RpZmljYXRpb25zIG9uIGFsbCBvcGVyYXRpb25zLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdHxGdW5jdGlvbn0gc3Vic2NyaWJlciBUaGUgb2JqZWN0IG9yIGZ1bmN0aW9uIGJlaW5nIG5vdGlmaWVkLiBPZnRlbiB0aGlzIGlzIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gQW4gaWRlbnRpZnlpbmcgdG9rZW4gZm9yIHRoaXMgc3Vic2NyaXB0aW9uLiBSZXF1aXJlZCBhcyBhIHBhcmFtZXRlciB3aGVuIHVuc3Vic2NyaWJpbmcuXG4gICAgICAgICovXG4gICAgICAgIHN1YnNjcmliZTogZnVuY3Rpb24gKG9wZXJhdGlvbnMsIHN1YnNjcmliZXIpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdvcGVyYXRpb25zIHN1YnNjcmliZScsIG9wZXJhdGlvbnMsIHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgb3BlcmF0aW9ucyA9IFtdLmNvbmNhdChvcGVyYXRpb25zKTtcbiAgICAgICAgICAgIC8vdXNlIGpxdWVyeSB0byBtYWtlIGV2ZW50IHNpbmtcbiAgICAgICAgICAgIGlmICghc3Vic2NyaWJlci5vbiAmJiAhXy5pc0Z1bmN0aW9uKHN1YnNjcmliZXIpKSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlciA9ICQoc3Vic2NyaWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpZCAgPSBfLnVuaXF1ZUlkKCdlcGljaGFubmVsLm9wZXJhdGlvbicpO1xuICAgICAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgIHRhcmdldDogc3Vic2NyaWJlclxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcblxuICAgICAgICAgICAgJC5lYWNoKG9wZXJhdGlvbnMsIGZ1bmN0aW9uIChpbmRleCwgb3BuKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtZS5saXN0ZW5lck1hcFtvcG5dKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lLmxpc3RlbmVyTWFwW29wbl0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbWUubGlzdGVuZXJNYXBbb3BuXSA9IG1lLmxpc3RlbmVyTWFwW29wbl0uY29uY2F0KGRhdGEpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBpZDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3RvcCByZWNlaXZpbmcgbm90aWZpY2F0aW9uIHdoZW4gYW4gb3BlcmF0aW9uIGlzIGNhbGxlZC5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IG9wZXJhdGlvbiBUaGUgbmFtZXMgb2YgdGhlIG9wZXJhdGlvbnMuXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSB0b2tlbiBUaGUgaWRlbnRpZnlpbmcgdG9rZW4gZm9yIHRoaXMgc3Vic2NyaXB0aW9uLiAoQ3JlYXRlZCBhbmQgcmV0dXJuZWQgYnkgdGhlIGBzdWJzY3JpYmUoKWAgY2FsbC4pXG4gICAgICAgICovXG4gICAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbiAob3BlcmF0aW9uLCB0b2tlbikge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5lck1hcFtvcGVyYXRpb25dID0gXy5yZWplY3QodGhpcy5saXN0ZW5lck1hcFtvcGVyYXRpb25dLCBmdW5jdGlvbiAoc3Vicykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWJzLmlkID09PSB0b2tlbjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdG9wIHJlY2VpdmluZyBub3RpZmljYXRpb25zIGZvciBhbGwgb3BlcmF0aW9ucy4gTm8gcGFyYW1ldGVycy5cbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybiB7Tm9uZX1cbiAgICAgICAgKi9cbiAgICAgICAgdW5zdWJzY3JpYmVBbGw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXJNYXAgPSB7fTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuICQuZXh0ZW5kKHRoaXMsIHB1YmxpY0FQSSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVmFyc0NoYW5uZWwgPSByZXF1aXJlKCcuL3ZhcmlhYmxlcy1jaGFubmVsJyk7XG52YXIgT3BlcmF0aW9uc0NoYW5uZWwgPSByZXF1aXJlKCcuL29wZXJhdGlvbnMtY2hhbm5lbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICBydW46IHtcbiAgICAgICAgICAgIHZhcmlhYmxlczoge1xuXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3BlcmF0aW9uczoge1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBjb25maWcgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gICAgdmFyIHJtID0gbmV3IEYubWFuYWdlci5SdW5NYW5hZ2VyKGNvbmZpZyk7XG4gICAgdmFyIHJzID0gcm0ucnVuO1xuXG4gICAgdmFyICRjcmVhdGlvblByb21pc2UgPSBybS5nZXRSdW4oKTtcbiAgICBycy5jdXJyZW50UHJvbWlzZSA9ICRjcmVhdGlvblByb21pc2U7XG5cbiAgICAvLyAkY3JlYXRpb25Qcm9taXNlXG4gICAgLy8gICAgIC50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKCdkb25lJyk7XG4gICAgLy8gICAgIH0pXG4gICAgLy8gICAgIC5mYWlsKGZ1bmN0aW9uICgpIHtcbiAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKCdmYWlsdCcpO1xuICAgIC8vICAgICB9KTtcblxuICAgIHZhciBjcmVhdGVBbmRUaGVuID0gZnVuY3Rpb24gKGZuLCBjb250ZXh0KSB7XG4gICAgICAgIHJldHVybiBfLndyYXAoZm4sIGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgICAgICAgICB2YXIgcGFzc2VkSW5QYXJhbXMgPSBfLnRvQXJyYXkoYXJndW1lbnRzKS5zbGljZSgxKTtcbiAgICAgICAgICAgIHJldHVybiBycy5jdXJyZW50UHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBycy5jdXJyZW50UHJvbWlzZSA9IGZ1bmMuYXBwbHkoY29udGV4dCwgcGFzc2VkSW5QYXJhbXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBycy5jdXJyZW50UHJvbWlzZTtcbiAgICAgICAgICAgIH0pLmZhaWwoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignVGhpcyBmYWlsZWQsIGJ1dCB3ZVxcJ3JlIG1vdmluZyBhaGVhZCB3aXRoIHRoZSBuZXh0IG9uZSBhbnl3YXknLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIHJzLmN1cnJlbnRQcm9taXNlID0gZnVuYy5hcHBseShjb250ZXh0LCBwYXNzZWRJblBhcmFtcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJzLmN1cnJlbnRQcm9taXNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvL01ha2Ugc3VyZSBub3RoaW5nIGhhcHBlbnMgYmVmb3JlIHRoZSBydW4gaXMgY3JlYXRlZFxuICAgIHZhciBub25XcmFwcGVkID0gWyd2YXJpYWJsZXMnLCAnY3JlYXRlJywgJ2xvYWQnLCAnZ2V0Q3VycmVudENvbmZpZyddO1xuICAgIF8uZWFjaChycywgZnVuY3Rpb24gKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpICYmICFfLmNvbnRhaW5zKG5vbldyYXBwZWQsIG5hbWUpKSB7XG4gICAgICAgICAgICByc1tuYW1lXSA9IGNyZWF0ZUFuZFRoZW4odmFsdWUsIHJzKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIG9yaWdpbmFsVmFyaWFibGVzRm4gPSBycy52YXJpYWJsZXM7XG4gICAgcnMudmFyaWFibGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdnMgPSBvcmlnaW5hbFZhcmlhYmxlc0ZuLmFwcGx5KHJzLCBhcmd1bWVudHMpO1xuICAgICAgICBfLmVhY2godnMsIGZ1bmN0aW9uICh2YWx1ZSwgbmFtZSkge1xuICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB2c1tuYW1lXSA9IGNyZWF0ZUFuZFRoZW4odmFsdWUsIHZzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB2cztcbiAgICB9O1xuXG4gICAgdGhpcy5ydW4gPSBycztcbiAgICB2YXIgdmFyT3B0aW9ucyA9IGNvbmZpZy5ydW4udmFyaWFibGVzO1xuICAgIHRoaXMudmFyaWFibGVzID0gbmV3IFZhcnNDaGFubmVsKCQuZXh0ZW5kKHRydWUsIHt9LCB2YXJPcHRpb25zLCB7IHJ1bjogcnMgfSkpO1xuICAgIHRoaXMub3BlcmF0aW9ucyA9IG5ldyBPcGVyYXRpb25zQ2hhbm5lbCgkLmV4dGVuZCh0cnVlLCB7fSwgY29uZmlnLnJ1bi5vcGVyYXRpb25zLCB7IHJ1bjogcnMgfSkpO1xuXG4gICAgdmFyIG1lID0gdGhpcztcbiAgICB2YXIgZGVib3VuY2VkUmVmcmVzaCA9IF8uZGVib3VuY2UoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgbWUudmFyaWFibGVzLnJlZnJlc2guY2FsbChtZS52YXJpYWJsZXMsIG51bGwsIHRydWUpO1xuICAgICAgICBpZiAobWUudmFyaWFibGVzLm9wdGlvbnMuYXV0b0ZldGNoLmVuYWJsZSkge1xuICAgICAgICAgICAgbWUudmFyaWFibGVzLnN0YXJ0QXV0b0ZldGNoKCk7XG4gICAgICAgIH1cbiAgICB9LCAyMDAsIHsgbGVhZGluZzogdHJ1ZSB9KTtcblxuICAgIHRoaXMub3BlcmF0aW9ucy5zdWJzY3JpYmUoJyonLCBkZWJvdW5jZWRSZWZyZXNoKTtcbn07XG4iLCIvKipcbiAqICMjIFZhcmlhYmxlcyBDaGFubmVsXG4gKlxuICogQ2hhbm5lbHMgYXJlIHdheXMgZm9yIEZsb3cuanMgdG8gdGFsayB0byBleHRlcm5hbCBBUElzIC0tIHByaW1hcmlseSB0aGUgW3VuZGVybHlpbmcgRXBpY2VudGVyIEFQSXNdKC4uLy4uLy4uLy4uL2NyZWF0aW5nX3lvdXJfaW50ZXJmYWNlLykuXG4gKlxuICogVGhlIHByaW1hcnkgdXNlIGNhc2VzIGZvciB0aGUgVmFyaWFibGVzIENoYW5uZWwgYXJlOlxuICpcbiAqICogYHB1Ymxpc2hgOiBVcGRhdGUgYSBtb2RlbCB2YXJpYWJsZS5cbiAqICogYHN1YnNjcmliZWA6IFJlY2VpdmUgbm90aWZpY2F0aW9ucyB3aGVuIGEgbW9kZWwgdmFyaWFibGUgaXMgdXBkYXRlZC5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgdXNlIGBwdWJsaXNoKClgIHRvIHVwZGF0ZSBhIG1vZGVsIHZhcmlhYmxlOlxuICpcbiAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMucHVibGlzaCgnbXlWYXJpYWJsZScsIG5ld1ZhbHVlKTtcbiAqXG4gKiBGb3IgcmVmZXJlbmNlLCBhbiBlcXVpdmFsZW50IGNhbGwgdXNpbmcgRmxvdy5qcyBjdXN0b20gSFRNTCBhdHRyaWJ1dGVzIGlzOlxuICpcbiAqICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJteVZhcmlhYmxlXCIgdmFsdWU9XCJuZXdWYWx1ZVwiPjwvaW5wdXQ+XG4gKlxuICogd2hlcmUgdGhlIG5ldyB2YWx1ZSBpcyBpbnB1dCBieSB0aGUgdXNlci5cbiAqXG4gKiBZb3UgY2FuIGFsc28gdXNlIGBzdWJzY3JpYmUoKWAgYW5kIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gbGlzdGVuIGFuZCByZWFjdCB3aGVuIHRoZSBtb2RlbCB2YXJpYWJsZSBoYXMgYmVlbiB1cGRhdGVkOlxuICpcbiAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMuc3Vic2NyaWJlKCdteVZhcmlhYmxlJyxcbiAqICAgICAgICAgIGZ1bmN0aW9uKCkgeyBjb25zb2xlLmxvZygnY2FsbGVkIScpOyB9ICk7XG4gKlxuICogVG8gdXNlIHRoZSBWYXJpYWJsZXMgQ2hhbm5lbCwgc2ltcGx5IFtpbml0aWFsaXplIEZsb3cuanMgaW4geW91ciBwcm9qZWN0XSguLi8uLi8uLi8jY3VzdG9tLWluaXRpYWxpemUpLlxuICpcbiovXG5cbid1c2Ugc3RyaWN0JztcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERldGVybWluZSB3aGVuIHRvIHVwZGF0ZSBzdGF0ZS4gRGVmYXVsdHMgdG8gYGZhbHNlYDogYWx3YXlzIHRyaWdnZXIgdXBkYXRlcy5cbiAgICAgICAgICpcbiAgICAgICAgICogUG9zc2libGUgb3B0aW9ucyBhcmU6XG4gICAgICAgICAqXG4gICAgICAgICAqICogYHRydWVgOiBOZXZlciB0cmlnZ2VyIGFueSB1cGRhdGVzLiBVc2UgdGhpcyBpZiB5b3Uga25vdyB5b3VyIG1vZGVsIHN0YXRlIHdvbid0IGNoYW5nZSBiYXNlZCBvbiBvdGhlciB2YXJpYWJsZXMuXG4gICAgICAgICAqICogYGZhbHNlYDogQWx3YXlzIHRyaWdnZXIgdXBkYXRlcy5cbiAgICAgICAgICogKiBgW2FycmF5IG9mIHZhcmlhYmxlIG5hbWVzXWA6IFZhcmlhYmxlcyBpbiB0aGlzIGFycmF5ICp3aWxsIG5vdCogdHJpZ2dlciB1cGRhdGVzOyBldmVyeXRoaW5nIGVsc2Ugd2lsbC5cbiAgICAgICAgICogKiBgeyBleGNlcHQ6IFthcnJheSBvZiB2YXJpYWJsZSBuYW1lc10gfWA6IFZhcmlhYmxlcyBpbiB0aGlzIGFycmF5ICp3aWxsKiB0cmlnZ2VyIHVwZGF0ZXM7IG5vdGhpbmcgZWxzZSB3aWxsLlxuICAgICAgICAgKlxuICAgICAgICAgKiBUbyBzZXQsIHBhc3MgdGhpcyBpbnRvIHRoZSBgRmxvdy5pbml0aWFsaXplKClgIGNhbGwgaW4gdGhlIGBjaGFubmVsLnJ1bi52YXJpYWJsZXNgIGZpZWxkOlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuaW5pdGlhbGl6ZSh7XG4gICAgICAgICAqICAgICAgICAgIGNoYW5uZWw6IHtcbiAgICAgICAgICogICAgICAgICAgICAgIHJ1bjoge1xuICAgICAgICAgKiAgICAgICAgICAgICAgICAgIG1vZGVsOiAnbXlNb2RlbC5weScsXG4gICAgICAgICAqICAgICAgICAgICAgICAgICAgYWNjb3VudDogJ2FjbWUtc2ltdWxhdGlvbnMnLFxuICAgICAgICAgKiAgICAgICAgICAgICAgICAgIHByb2plY3Q6ICdzdXBwbHktY2hhaW4tZ2FtZScsXG4gICAgICAgICAqICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOiB7IHNpbGVudDogdHJ1ZSB9XG4gICAgICAgICAqICAgICAgICAgICAgICB9XG4gICAgICAgICAqICAgICAgICAgIH1cbiAgICAgICAgICogICAgICB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogVG8gb3ZlcnJpZGUgZm9yIGEgc3BlY2lmaWMgY2FsbCB0byB0aGUgVmFyaWFibGVzIENoYW5uZWwsIHBhc3MgdGhpcyBhcyB0aGUgZmluYWwgYG9wdGlvbnNgIHBhcmFtZXRlcjpcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICAgRmxvdy5jaGFubmVsLnZhcmlhYmxlcy5wdWJsaXNoKCdteVZhcmlhYmxlJywgbmV3VmFsdWUsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7U3RyaW5nfEFycmF5fE9iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIHNpbGVudDogZmFsc2UsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFsbG93cyB5b3UgdG8gYXV0b21hdGljYWxseSBmZXRjaCB2YXJpYWJsZXMgZnJvbSB0aGUgQVBJIGFzIHRoZXkncmUgYmVpbmcgc3Vic2NyaWJlZC4gSWYgdGhpcyBpcyBzZXQgdG8gYGVuYWJsZTogZmFsc2VgIHlvdSdsbCBuZWVkIHRvIGV4cGxpY2l0bHkgY2FsbCBgcmVmcmVzaCgpYCB0byBnZXQgZGF0YSBhbmQgbm90aWZ5IHlvdXIgbGlzdGVuZXJzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBUaGUgcHJvcGVydGllcyBvZiB0aGlzIG9iamVjdCBpbmNsdWRlOlxuICAgICAgICAgKlxuICAgICAgICAgKiAqIGBhdXRvRmV0Y2guZW5hYmxlYCAqQm9vbGVhbiogRW5hYmxlIGF1dG8tZmV0Y2ggYmVoYXZpb3IuIElmIHNldCB0byBgZmFsc2VgIGR1cmluZyBpbnN0YW50aWF0aW9uIHRoZXJlJ3Mgbm8gd2F5IHRvIGVuYWJsZSB0aGlzIGFnYWluLiBEZWZhdWx0cyB0byBgdHJ1ZWAuXG4gICAgICAgICAqICogYGF1dG9GZXRjaC5zdGFydGAgKkJvb2xlYW4qIElmIGF1dG8tZmV0Y2ggaXMgZW5hYmxlZCwgY29udHJvbCB3aGVuIHRvIHN0YXJ0IGZldGNoaW5nLiBUeXBpY2FsbHkgeW91J2Qgd2FudCB0byBzdGFydCByaWdodCBhd2F5LCBidXQgaWYgeW91IHdhbnQgdG8gd2FpdCB0aWxsIHNvbWV0aGluZyBlbHNlIGhhcHBlbnMgKGxpa2UgYW4gb3BlcmF0aW9uIG9yIHVzZXIgYWN0aW9uKSBzZXQgdG8gYGZhbHNlYCBhbmQgY29udHJvbCB1c2luZyB0aGUgYHN0YXJ0QXV0b0ZldGNoKClgIGZ1bmN0aW9uLiBEZWZhdWx0cyB0byBgdHJ1ZWAuXG4gICAgICAgICAqICogYGF1dG9GZXRjaC5kZWJvdW5jZWAgKk51bWJlciogTWlsbGlzZWNvbmRzIHRvIHdhaXQgYmV0d2VlbiBjYWxscyB0byBgc3Vic2NyaWJlKClgIGJlZm9yZSBjYWxsaW5nIGBmZXRjaCgpYC4gU2VlIFtodHRwOi8vZHJ1cGFsbW90aW9uLmNvbS9hcnRpY2xlL2RlYm91bmNlLWFuZC10aHJvdHRsZS12aXN1YWwtZXhwbGFuYXRpb25dKGh0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbikgZm9yIGFuIGV4cGxhbmF0aW9uIG9mIGhvdyBkZWJvdW5jaW5nIHdvcmtzLiBEZWZhdWx0cyB0byBgMjAwYC5cbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIGF1dG9GZXRjaDoge1xuXG4gICAgICAgICAgICAgLy8gRW5hYmxlIGF1dG8tZmV0Y2ggYmVoYXZpb3IuIElmIHNldCB0byBgZmFsc2VgIGR1cmluZyBpbnN0YW50aWF0aW9uIHRoZXJlJ3Mgbm8gd2F5IHRvIGVuYWJsZSB0aGlzIGFnYWluXG4gICAgICAgICAgICAgLy8gQHR5cGUge0Jvb2xlYW59XG4gICAgICAgICAgICBlbmFibGU6IHRydWUsXG5cbiAgICAgICAgICAgICAvLyBJZiBhdXRvLWZldGNoIGlzIGVuYWJsZWQsIGNvbnRyb2wgd2hlbiB0byBzdGFydCBmZXRjaGluZy4gVHlwaWNhbGx5IHlvdSdkIHdhbnQgdG8gc3RhcnQgcmlnaHQgYXdheSwgYnV0IGlmIHlvdSB3YW50IHRvIHdhaXQgdGlsbCBzb21ldGhpbmcgZWxzZSBoYXBwZW5zIChsaWtlIGFuIG9wZXJhdGlvbiBvciB1c2VyIGFjdGlvbikgc2V0IHRvIGBmYWxzZWAgYW5kIGNvbnRyb2wgdXNpbmcgdGhlIGBzdGFydEF1dG9GZXRjaCgpYCBmdW5jdGlvbi5cbiAgICAgICAgICAgICAvLyBAdHlwZSB7Qm9vbGVhbn1cbiAgICAgICAgICAgIHN0YXJ0OiB0cnVlLFxuXG4gICAgICAgICAgICAgLy8gQ29udHJvbCB0aW1lIHRvIHdhaXQgYmV0d2VlbiBjYWxscyB0byBgc3Vic2NyaWJlKClgIGJlZm9yZSBjYWxsaW5nIGBmZXRjaCgpYC4gU2VlIFtodHRwOi8vZHJ1cGFsbW90aW9uLmNvbS9hcnRpY2xlL2RlYm91bmNlLWFuZC10aHJvdHRsZS12aXN1YWwtZXhwbGFuYXRpb25dKGh0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbikgZm9yIGFuIGV4cGxhbmF0aW9uIG9mIGhvdyBkZWJvdW5jaW5nIHdvcmtzLlxuICAgICAgICAgICAgIC8vIEB0eXBlIHtOdW1iZXJ9IE1pbGxpc2Vjb25kcyB0byB3YWl0XG4gICAgICAgICAgICBkZWJvdW5jZTogMjAwXG4gICAgICAgIH0sXG5cbiAgICAgICAgaW50ZXJwb2xhdGU6IHt9XG4gICAgfTtcblxuICAgIHZhciBjaGFubmVsT3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgdGhpcy5vcHRpb25zID0gY2hhbm5lbE9wdGlvbnM7XG5cbiAgICB2YXIgdnMgPSBjaGFubmVsT3B0aW9ucy5ydW4udmFyaWFibGVzKCk7XG5cbiAgICB2YXIgY3VycmVudERhdGEgPSB7fTtcblxuICAgIC8vVE9ETzogYWN0dWFsbHkgY29tcGFyZSBvYmplY3RzIGFuZCBzbyBvblxuICAgIHZhciBpc0VxdWFsID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICB2YXIgZ2V0SW5uZXJWYXJpYWJsZXMgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgICAgIHZhciBpbm5lciA9IHN0ci5tYXRjaCgvPCguKj8pPi9nKTtcbiAgICAgICAgaW5uZXIgPSBfLm1hcChpbm5lciwgZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbC5zdWJzdHJpbmcoMSwgdmFsLmxlbmd0aCAtIDEpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGlubmVyO1xuICAgIH07XG5cbiAgICAvL1JlcGxhY2VzIHN0dWJiZWQgb3V0IGtleW5hbWVzIGluIHZhcmlhYmxlc3RvaW50ZXJwb2xhdGUgd2l0aCB0aGVpciBjb3JyZXNwb25kaW5nIHZhbHVlc1xuICAgIHZhciBpbnRlcnBvbGF0ZSA9IGZ1bmN0aW9uICh2YXJpYWJsZXNUb0ludGVycG9sYXRlLCB2YWx1ZXMpIHtcbiAgICAgICAgLy97cHJpY2VbMV06IHByaWNlWzx0aW1lPl19XG4gICAgICAgIHZhciBpbnRlcnBvbGF0aW9uTWFwID0ge307XG4gICAgICAgIC8ve3ByaWNlWzFdOiAxfVxuICAgICAgICB2YXIgaW50ZXJwb2xhdGVkID0ge307XG5cbiAgICAgICAgXy5lYWNoKHZhcmlhYmxlc1RvSW50ZXJwb2xhdGUsIGZ1bmN0aW9uIChvdXRlclZhcmlhYmxlKSB7XG4gICAgICAgICAgICB2YXIgaW5uZXIgPSBnZXRJbm5lclZhcmlhYmxlcyhvdXRlclZhcmlhYmxlKTtcbiAgICAgICAgICAgIHZhciBvcmlnaW5hbE91dGVyID0gb3V0ZXJWYXJpYWJsZTtcbiAgICAgICAgICAgIGlmIChpbm5lciAmJiBpbm5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkLmVhY2goaW5uZXIsIGZ1bmN0aW9uIChpbmRleCwgaW5uZXJWYXJpYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGhpc3ZhbCA9IHZhbHVlc1tpbm5lclZhcmlhYmxlXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXN2YWwgIT09IG51bGwgJiYgdGhpc3ZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoXy5pc0FycmF5KHRoaXN2YWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9Gb3IgYXJyYXllZCB0aGluZ3MgZ2V0IHRoZSBsYXN0IG9uZSBmb3IgaW50ZXJwb2xhdGlvbiBwdXJwb3Nlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXN2YWwgPSB0aGlzdmFsW3RoaXN2YWwubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvL1RPRE86IFJlZ2V4IHRvIG1hdGNoIHNwYWNlcyBhbmQgc28gb25cbiAgICAgICAgICAgICAgICAgICAgICAgIG91dGVyVmFyaWFibGUgPSBvdXRlclZhcmlhYmxlLnJlcGxhY2UoJzwnICsgaW5uZXJWYXJpYWJsZSArICc+JywgdGhpc3ZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpbnRlcnBvbGF0aW9uTWFwW291dGVyVmFyaWFibGVdID0gKGludGVycG9sYXRpb25NYXBbb3V0ZXJWYXJpYWJsZV0pID8gW29yaWdpbmFsT3V0ZXJdLmNvbmNhdChpbnRlcnBvbGF0aW9uTWFwW291dGVyVmFyaWFibGVdKSA6IG9yaWdpbmFsT3V0ZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpbnRlcnBvbGF0ZWRbb3JpZ2luYWxPdXRlcl0gPSBvdXRlclZhcmlhYmxlO1xuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgb3AgPSB7XG4gICAgICAgICAgICBpbnRlcnBvbGF0ZWQ6IGludGVycG9sYXRlZCxcbiAgICAgICAgICAgIGludGVycG9sYXRpb25NYXA6IGludGVycG9sYXRpb25NYXBcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIG9wO1xuICAgIH07XG5cbiAgICB2YXIgcHVibGljQVBJID0ge1xuICAgICAgICAvL2ZvciB0ZXN0aW5nXG4gICAgICAgIHByaXZhdGU6IHtcbiAgICAgICAgICAgIGdldElubmVyVmFyaWFibGVzOiBnZXRJbm5lclZhcmlhYmxlcyxcbiAgICAgICAgICAgIGludGVycG9sYXRlOiBpbnRlcnBvbGF0ZSxcbiAgICAgICAgICAgIGN1cnJlbnREYXRhOiBjdXJyZW50RGF0YSxcbiAgICAgICAgICAgIG9wdGlvbnM6IGNoYW5uZWxPcHRpb25zXG4gICAgICAgIH0sXG5cbiAgICAgICAgc3Vic2NyaXB0aW9uczogW10sXG5cbiAgICAgICAgdW5mZXRjaGVkOiBbXSxcblxuICAgICAgICBnZXRTdWJzY3JpYmVyczogZnVuY3Rpb24gKHRvcGljKSB7XG4gICAgICAgICAgICBpZiAodG9waWMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXy5maWx0ZXIodGhpcy5zdWJzY3JpcHRpb25zLCBmdW5jdGlvbiAoc3Vicykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXy5jb250YWlucyhzdWJzLnRvcGljcywgdG9waWMpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zdWJzY3JpcHRpb25zO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBnZXRBbGxUb3BpY3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBfKHRoaXMuc3Vic2NyaXB0aW9ucykucGx1Y2soJ3RvcGljcycpLmZsYXR0ZW4oKS51bmlxKCkudmFsdWUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0VG9waWNEZXBlbmRlbmNpZXM6IGZ1bmN0aW9uIChsaXN0KSB7XG4gICAgICAgICAgICBpZiAoIWxpc3QpIHtcbiAgICAgICAgICAgICAgICBsaXN0ID0gdGhpcy5nZXRBbGxUb3BpY3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpbm5lckxpc3QgPSBbXTtcbiAgICAgICAgICAgIF8uZWFjaChsaXN0LCBmdW5jdGlvbiAodm5hbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5uZXIgPSBnZXRJbm5lclZhcmlhYmxlcyh2bmFtZSk7XG4gICAgICAgICAgICAgICAgaWYgKGlubmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBpbm5lckxpc3QgPSBfLnVuaXEoaW5uZXJMaXN0LmNvbmNhdChpbm5lcikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGlubmVyTGlzdDtcbiAgICAgICAgfSxcblxuICAgICAgICB1cGRhdGVBbmRDaGVja0ZvclJlZnJlc2g6IGZ1bmN0aW9uICh0b3BpY3MsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmICh0b3BpY3MpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVuZmV0Y2hlZCA9IF8udW5pcSh0aGlzLnVuZmV0Y2hlZC5jb25jYXQodG9waWNzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWNoYW5uZWxPcHRpb25zLmF1dG9GZXRjaC5lbmFibGUgfHwgIWNoYW5uZWxPcHRpb25zLmF1dG9GZXRjaC5zdGFydCB8fCAhdGhpcy51bmZldGNoZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF0aGlzLmRlYm91bmNlZEZldGNoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRlYm91bmNlT3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCB7XG4gICAgICAgICAgICAgICAgICAgIG1heFdhaXQ6IGNoYW5uZWxPcHRpb25zLmF1dG9GZXRjaC5kZWJvdW5jZSAqIDQsXG4gICAgICAgICAgICAgICAgICAgIGxlYWRpbmc6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmRlYm91bmNlZEZldGNoID0gXy5kZWJvdW5jZShmdW5jdGlvbiAodG9waWNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmV0Y2godGhpcy51bmZldGNoZWQpLnRoZW4oZnVuY3Rpb24gKGNoYW5nZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQuZXh0ZW5kKGN1cnJlbnREYXRhLCBjaGFuZ2VkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudW5mZXRjaGVkID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5vdGlmeShjaGFuZ2VkKTtcbiAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICB9LCBjaGFubmVsT3B0aW9ucy5hdXRvRmV0Y2guZGVib3VuY2UsIGRlYm91bmNlT3B0aW9ucyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuZGVib3VuY2VkRmV0Y2godG9waWNzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBwb3B1bGF0ZUlubmVyVmFyaWFibGVzOiBmdW5jdGlvbiAodmFycykge1xuICAgICAgICAgICAgdmFyIHVubWFwcGVkVmFyaWFibGVzID0gW107XG4gICAgICAgICAgICB2YXIgdmFsdWVMaXN0ID0ge307XG4gICAgICAgICAgICBfLmVhY2godmFycywgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmludGVycG9sYXRlW3ZdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbCA9IF8uaXNGdW5jdGlvbih0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGVbdl0pID8gdGhpcy5vcHRpb25zLmludGVycG9sYXRlW3ZdKHYpIDogdGhpcy5vcHRpb25zLmludGVycG9sYXRlW3ZdO1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZUxpc3Rbdl0gPSB2YWw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdW5tYXBwZWRWYXJpYWJsZXMucHVzaCh2KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgICAgIGlmICh1bm1hcHBlZFZhcmlhYmxlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdnMucXVlcnkodW5tYXBwZWRWYXJpYWJsZXMpLnRoZW4oZnVuY3Rpb24gKHZhcmlhYmxlVmFsdWVMaXN0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkLmV4dGVuZCh2YWx1ZUxpc3QsIHZhcmlhYmxlVmFsdWVMaXN0KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICQuRGVmZXJyZWQoKS5yZXNvbHZlKHZhbHVlTGlzdCkucHJvbWlzZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGZldGNoOiBmdW5jdGlvbiAodmFyaWFibGVzTGlzdCkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ2ZldGNoIGNhbGxlZCcsIHZhcmlhYmxlc0xpc3QpO1xuICAgICAgICAgICAgdmFyaWFibGVzTGlzdCA9IFtdLmNvbmNhdCh2YXJpYWJsZXNMaXN0KTtcbiAgICAgICAgICAgIGlmICghdmFyaWFibGVzTGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJC5EZWZlcnJlZCgpLnJlc29sdmUoKS5wcm9taXNlKHt9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpbm5lclZhcmlhYmxlcyA9IHRoaXMuZ2V0VG9waWNEZXBlbmRlbmNpZXModmFyaWFibGVzTGlzdCk7XG4gICAgICAgICAgICB2YXIgZ2V0VmFyaWFibGVzID0gZnVuY3Rpb24gKHZhcnMsIGludGVycG9sYXRpb25NYXApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdnMucXVlcnkodmFycykudGhlbihmdW5jdGlvbiAodmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdHb3QgdmFyaWFibGVzJywgdmFyaWFibGVzKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoYW5nZVNldCA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBfLmVhY2godmFyaWFibGVzLCBmdW5jdGlvbiAodmFsdWUsIHZuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgb2xkVmFsdWUgPSBjdXJyZW50RGF0YVt2bmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzRXF1YWwodmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZVNldFt2bmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW50ZXJwb2xhdGlvbk1hcCAmJiBpbnRlcnBvbGF0aW9uTWFwW3ZuYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWFwID0gW10uY29uY2F0KGludGVycG9sYXRpb25NYXBbdm5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5lYWNoKG1hcCwgZnVuY3Rpb24gKGludGVycG9sYXRlZE5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZVNldFtpbnRlcnBvbGF0ZWROYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hhbmdlU2V0O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChpbm5lclZhcmlhYmxlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wb3B1bGF0ZUlubmVyVmFyaWFibGVzKGlubmVyVmFyaWFibGVzKS50aGVuKGZ1bmN0aW9uIChpbm5lclZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdpbm5lcicsIGlubmVyVmFyaWFibGVzKTtcbiAgICAgICAgICAgICAgICAgICAgJC5leHRlbmQoY3VycmVudERhdGEsIGlubmVyVmFyaWFibGVzKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlwID0gIGludGVycG9sYXRlKHZhcmlhYmxlc0xpc3QsIGlubmVyVmFyaWFibGVzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFZhcmlhYmxlcyhfLnZhbHVlcyhpcC5pbnRlcnBvbGF0ZWQpLCBpcC5pbnRlcnBvbGF0aW9uTWFwKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldFZhcmlhYmxlcyh2YXJpYWJsZXNMaXN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBzdGFydEF1dG9GZXRjaDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2hhbm5lbE9wdGlvbnMuYXV0b0ZldGNoLnN0YXJ0ID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQW5kQ2hlY2tGb3JSZWZyZXNoKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3RvcEF1dG9GZXRjaDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2hhbm5lbE9wdGlvbnMuYXV0b0ZldGNoLnN0YXJ0ID0gZmFsc2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZvcmNlIGEgY2hlY2sgZm9yIHVwZGF0ZXMgb24gdGhlIGNoYW5uZWwsIGFuZCBub3RpZnkgYWxsIGxpc3RlbmVycy5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IGNoYW5nZUxpc3QgS2V5LXZhbHVlIHBhaXJzIG9mIGNoYW5nZWQgdmFyaWFibGVzLlxuICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGZvcmNlICBJZ25vcmUgYWxsIGBzaWxlbnRgIG9wdGlvbnMgYW5kIGZvcmNlIHJlZnJlc2guXG4gICAgICAgICAqL1xuICAgICAgICByZWZyZXNoOiBmdW5jdGlvbiAoY2hhbmdlTGlzdCwgZm9yY2UpIHtcbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgc2lsZW50ID0gY2hhbm5lbE9wdGlvbnMuc2lsZW50O1xuICAgICAgICAgICAgdmFyIGNoYW5nZWRWYXJpYWJsZXMgPSBfLmlzQXJyYXkoY2hhbmdlTGlzdCkgPyAgY2hhbmdlTGlzdCA6IF8ua2V5cyhjaGFuZ2VMaXN0KTtcblxuICAgICAgICAgICAgdmFyIHNob3VsZFNpbGVuY2UgPSBzaWxlbnQgPT09IHRydWU7XG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KHNpbGVudCkgJiYgY2hhbmdlZFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIHNob3VsZFNpbGVuY2UgPSBfLmludGVyc2VjdGlvbihzaWxlbnQsIGNoYW5nZWRWYXJpYWJsZXMpLmxlbmd0aCA+PSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChzaWxlbnQpICYmIGNoYW5nZWRWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBzaG91bGRTaWxlbmNlID0gXy5pbnRlcnNlY3Rpb24oc2lsZW50LmV4Y2VwdCwgY2hhbmdlZFZhcmlhYmxlcykubGVuZ3RoICE9PSBjaGFuZ2VkVmFyaWFibGVzLmxlbmd0aDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNob3VsZFNpbGVuY2UgJiYgZm9yY2UgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJC5EZWZlcnJlZCgpLnJlc29sdmUoKS5wcm9taXNlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciB2YXJpYWJsZXMgPSB0aGlzLmdldEFsbFRvcGljcygpO1xuICAgICAgICAgICAgbWUudW5mZXRjaGVkID0gW107XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZldGNoKHZhcmlhYmxlcykudGhlbihmdW5jdGlvbiAoY2hhbmdlU2V0KSB7XG4gICAgICAgICAgICAgICAgJC5leHRlbmQoY3VycmVudERhdGEsIGNoYW5nZVNldCk7XG4gICAgICAgICAgICAgICAgbWUubm90aWZ5KGNoYW5nZVNldCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWxlcnQgZWFjaCBzdWJzY3JpYmVyIGFib3V0IHRoZSB2YXJpYWJsZSBhbmQgaXRzIG5ldyB2YWx1ZS5cbiAgICAgICAgICpcbiAgICAgICAgICogKipFeGFtcGxlKipcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICBGbG93LmNoYW5uZWwub3BlcmF0aW9ucy5ub3RpZnkoJ215VmFyaWFibGUnLCBuZXdWYWx1ZSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSB0b3BpY3MgTmFtZXMgb2YgdmFyaWFibGVzLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ8QXJyYXl8T2JqZWN0fSB2YWx1ZSBOZXcgdmFsdWVzIGZvciB0aGUgdmFyaWFibGVzLlxuICAgICAgICAqL1xuICAgICAgICBub3RpZnk6IGZ1bmN0aW9uICh0b3BpY3MsIHZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgY2FsbFRhcmdldCA9IGZ1bmN0aW9uICh0YXJnZXQsIHBhcmFtcykge1xuICAgICAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQuY2FsbChudWxsLCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC50cmlnZ2VyKGNvbmZpZy5ldmVudHMucmVhY3QsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKCEkLmlzUGxhaW5PYmplY3QodG9waWNzKSkge1xuICAgICAgICAgICAgICAgIHRvcGljcyA9IF8ub2JqZWN0KFt0b3BpY3NdLCBbdmFsdWVdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF8uZWFjaCh0aGlzLnN1YnNjcmlwdGlvbnMsIGZ1bmN0aW9uIChzdWJzY3JpcHRpb24pIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gc3Vic2NyaXB0aW9uLnRhcmdldDtcbiAgICAgICAgICAgICAgICBpZiAoc3Vic2NyaXB0aW9uLmJhdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXRjaGluZ1RvcGljcyA9IF8ucGljayh0b3BpY3MsIHN1YnNjcmlwdGlvbi50b3BpY3MpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoXy5zaXplKG1hdGNoaW5nVG9waWNzKSA9PT0gXy5zaXplKHN1YnNjcmlwdGlvbi50b3BpY3MpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsVGFyZ2V0KHRhcmdldCwgbWF0Y2hpbmdUb3BpY3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKHN1YnNjcmlwdGlvbi50b3BpY3MsIGZ1bmN0aW9uICh0b3BpYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1hdGNoaW5nVG9waWNzID0gXy5waWNrKHRvcGljcywgdG9waWMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF8uc2l6ZShtYXRjaGluZ1RvcGljcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsVGFyZ2V0KHRhcmdldCwgbWF0Y2hpbmdUb3BpY3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogVXBkYXRlIHRoZSB2YXJpYWJsZXMgd2l0aCBuZXcgdmFsdWVzLCBhbmQgYWxlcnQgc3Vic2NyaWJlcnMuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLnZhcmlhYmxlcy5wdWJsaXNoKCdteVZhcmlhYmxlJywgbmV3VmFsdWUpO1xuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC52YXJpYWJsZXMucHVibGlzaCh7IG15VmFyMTogbmV3VmFsMSwgbXlWYXIyOiBuZXdWYWwyIH0pO1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gIHtTdHJpbmd8T2JqZWN0fSB2YXJpYWJsZSBTdHJpbmcgd2l0aCBuYW1lIG9mIHZhcmlhYmxlLiBBbHRlcm5hdGl2ZWx5LCBvYmplY3QgaW4gZm9ybSBgeyB2YXJpYWJsZU5hbWU6IHZhbHVlIH1gLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ8QXJyYXl8T2JqZWN0fSB2YWx1ZSAoT3B0aW9uYWwpICBWYWx1ZSBvZiB0aGUgdmFyaWFibGUsIGlmIHByZXZpb3VzIGFyZ3VtZW50IHdhcyBhIHN0cmluZy5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgKE9wdGlvbmFsKSBPdmVycmlkZXMgZm9yIHRoZSBkZWZhdWx0IGNoYW5uZWwgb3B0aW9ucy4gU3VwcG9ydGVkIG9wdGlvbnM6IGB7IHNpbGVudDogQm9vbGVhbiB9YCBhbmQgYHsgYmF0Y2g6IEJvb2xlYW4gfWAuXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm4geyRwcm9taXNlfSBQcm9taXNlIHRvIGNvbXBsZXRlIHRoZSB1cGRhdGUuXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaXNoOiBmdW5jdGlvbiAodmFyaWFibGUsIHZhbHVlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygncHVibGlzaCcsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgYXR0cnM7XG4gICAgICAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KHZhcmlhYmxlKSkge1xuICAgICAgICAgICAgICAgIGF0dHJzID0gdmFyaWFibGU7XG4gICAgICAgICAgICAgICAgb3B0aW9ucyA9IHZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAoYXR0cnMgPSB7fSlbdmFyaWFibGVdID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaXQgPSBpbnRlcnBvbGF0ZShfLmtleXMoYXR0cnMpLCBjdXJyZW50RGF0YSk7XG5cbiAgICAgICAgICAgIHZhciB0b1NhdmUgPSB7fTtcbiAgICAgICAgICAgIF8uZWFjaChhdHRycywgZnVuY3Rpb24gKHZhbCwgYXR0cikge1xuICAgICAgICAgICAgICAgdmFyIGtleSA9IChpdC5pbnRlcnBvbGF0ZWRbYXR0cl0pID8gaXQuaW50ZXJwb2xhdGVkW2F0dHJdIDogYXR0cjtcbiAgICAgICAgICAgICAgIHRvU2F2ZVtrZXldID0gdmFsO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgcmV0dXJuIHZzLnNhdmUuY2FsbCh2cywgdG9TYXZlKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zIHx8ICFvcHRpb25zLnNpbGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWUucmVmcmVzaC5jYWxsKG1lLCBhdHRycyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3Vic2NyaWJlIHRvIGNoYW5nZXMgb24gYSBjaGFubmVsOiBBc2sgZm9yIG5vdGlmaWNhdGlvbiB3aGVuIHZhcmlhYmxlcyBhcmUgdXBkYXRlZC5cbiAgICAgICAgICpcbiAgICAgICAgICogKipFeGFtcGxlKipcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICBGbG93LmNoYW5uZWwudmFyaWFibGVzLnN1YnNjcmliZSgnbXlWYXJpYWJsZScsXG4gICAgICAgICAqICAgICAgICAgIGZ1bmN0aW9uKCkgeyBjb25zb2xlLmxvZygnY2FsbGVkIScpOyB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICBGbG93LmNoYW5uZWwudmFyaWFibGVzLnN1YnNjcmliZShbJ3ByaWNlJywgJ2Nvc3QnXSxcbiAgICAgICAgICogICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAqICAgICAgICAgICAgICAvLyB0aGlzIGZ1bmN0aW9uIGNhbGxlZCBvbmx5IG9uY2UsIHdpdGggeyBwcmljZTogWCwgY29zdDogWSB9XG4gICAgICAgICAqICAgICAgICAgIH0sXG4gICAgICAgICAqICAgICAgICAgIHsgYmF0Y2g6IHRydWUgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLnZhcmlhYmxlcy5zdWJzY3JpYmUoWydwcmljZScsICdjb3N0J10sXG4gICAgICAgICAqICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgKiAgICAgICAgICAgICAgLy8gdGhpcyBmdW5jdGlvbiBjYWxsZWQgdHdpY2UsIG9uY2Ugd2l0aCB7IHByaWNlOiBYIH1cbiAgICAgICAgICogICAgICAgICAgICAgIC8vIGFuZCBhZ2FpbiB3aXRoIHsgY29zdDogWSB9XG4gICAgICAgICAqICAgICAgICAgIH0sXG4gICAgICAgICAqICAgICAgICAgIHsgYmF0Y2g6IGZhbHNlIH0pO1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gdG9waWNzIFRoZSBuYW1lcyBvZiB0aGUgdmFyaWFibGVzLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdHxGdW5jdGlvbn0gc3Vic2NyaWJlciBUaGUgb2JqZWN0IG9yIGZ1bmN0aW9uIGJlaW5nIG5vdGlmaWVkLiBPZnRlbiB0aGlzIGlzIGEgY2FsbGJhY2sgZnVuY3Rpb24uIElmIHRoaXMgaXMgbm90IGEgZnVuY3Rpb24sIGEgYHRyaWdnZXJgIG1ldGhvZCBpcyBjYWxsZWQgaWYgYXZhaWxhYmxlOyBpZiBub3QsIGV2ZW50IGlzIHRyaWdnZXJlZCBvbiAkKG9iamVjdCkuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIChPcHRpb25hbCkgT3ZlcnJpZGVzIGZvciB0aGUgZGVmYXVsdCBjaGFubmVsIG9wdGlvbnMuXG4gICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5zaWxlbnQgRGV0ZXJtaW5lIHdoZW4gdG8gdXBkYXRlIHN0YXRlLlxuICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuYmF0Y2ggSWYgeW91IGFyZSBzdWJzY3JpYmluZyB0byBtdWx0aXBsZSB2YXJpYWJsZXMsIGJ5IGRlZmF1bHQgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbmNlIGZvciBlYWNoIGl0ZW0gdG8gd2hpY2ggeW91IHN1YnNjcmliZTogYGJhdGNoOiBmYWxzZWAuIFdoZW4gYGJhdGNoYCBpcyBzZXQgdG8gYHRydWVgLCB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gaXMgb25seSBjYWxsZWQgb25jZSwgbm8gbWF0dGVyIGhvdyBtYW55IGl0ZW1zIHlvdSBhcmUgc3Vic2NyaWJpbmcgdG8uXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gQW4gaWRlbnRpZnlpbmcgdG9rZW4gZm9yIHRoaXMgc3Vic2NyaXB0aW9uLiBSZXF1aXJlZCBhcyBhIHBhcmFtZXRlciB3aGVuIHVuc3Vic2NyaWJpbmcuXG4gICAgICAgICovXG4gICAgICAgIHN1YnNjcmliZTogZnVuY3Rpb24gKHRvcGljcywgc3Vic2NyaWJlciwgb3B0aW9ucykge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3N1YnNjcmliaW5nJywgdG9waWNzLCBzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgICAgICBiYXRjaDogZmFsc2VcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRvcGljcyA9IFtdLmNvbmNhdCh0b3BpY3MpO1xuICAgICAgICAgICAgLy91c2UganF1ZXJ5IHRvIG1ha2UgZXZlbnQgc2lua1xuICAgICAgICAgICAgaWYgKCFzdWJzY3JpYmVyLm9uICYmICFfLmlzRnVuY3Rpb24oc3Vic2NyaWJlcikpIHtcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmVyID0gJChzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGlkICA9IF8udW5pcXVlSWQoJ2VwaWNoYW5uZWwudmFyaWFibGUnKTtcbiAgICAgICAgICAgIHZhciBkYXRhID0gJC5leHRlbmQoe1xuICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICB0b3BpY3M6IHRvcGljcyxcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHN1YnNjcmliZXJcbiAgICAgICAgICAgIH0sIGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgICAgICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2goZGF0YSk7XG5cbiAgICAgICAgICAgIHRoaXMudXBkYXRlQW5kQ2hlY2tGb3JSZWZyZXNoKHRvcGljcyk7XG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN0b3AgcmVjZWl2aW5nIG5vdGlmaWNhdGlvbnMgZm9yIGFsbCBzdWJzY3JpcHRpb25zIHJlZmVyZW5jZWQgYnkgdGhpcyB0b2tlbi5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHRva2VuIFRoZSBpZGVudGlmeWluZyB0b2tlbiBmb3IgdGhpcyBzdWJzY3JpcHRpb24uIChDcmVhdGVkIGFuZCByZXR1cm5lZCBieSB0aGUgYHN1YnNjcmliZSgpYCBjYWxsLilcbiAgICAgICAgKi9cbiAgICAgICAgdW5zdWJzY3JpYmU6IGZ1bmN0aW9uICh0b2tlbikge1xuICAgICAgICAgICAgdGhpcy5zdWJzY3JpcHRpb25zID0gXy5yZWplY3QodGhpcy5zdWJzY3JpcHRpb25zLCBmdW5jdGlvbiAoc3Vicykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWJzLmlkID09PSB0b2tlbjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdG9wIHJlY2VpdmluZyBub3RpZmljYXRpb25zIGZvciBhbGwgc3Vic2NyaXB0aW9ucy4gTm8gcGFyYW1ldGVycy5cbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybiB7Tm9uZX1cbiAgICAgICAgKi9cbiAgICAgICAgdW5zdWJzY3JpYmVBbGw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucyA9IFtdO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgICQuZXh0ZW5kKHRoaXMsIHB1YmxpY0FQSSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJlZml4OiAnZicsXG4gICAgZGVmYXVsdEF0dHI6ICdiaW5kJyxcblxuICAgIGJpbmRlckF0dHI6ICdmLWJpbmQnLFxuXG4gICAgZXZlbnRzOiB7XG4gICAgICAgIHRyaWdnZXI6ICd1cGRhdGUuZi51aScsXG4gICAgICAgIHJlYWN0OiAndXBkYXRlLmYubW9kZWwnXG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgQXJyYXkgQ29udmVydGVyc1xuICpcbiAqIENvbnZlcnRlcnMgYWxsb3cgeW91IHRvIGNvbnZlcnQgZGF0YSAtLSBpbiBwYXJ0aWN1bGFyLCBtb2RlbCB2YXJpYWJsZXMgdGhhdCB5b3UgZGlzcGxheSBpbiB5b3VyIHByb2plY3QncyB1c2VyIGludGVyZmFjZSAtLSBmcm9tIG9uZSBmb3JtIHRvIGFub3RoZXIuXG4gKlxuICogVGhlcmUgYXJlIHR3byB3YXlzIHRvIHNwZWNpZnkgY29udmVyc2lvbiBvciBmb3JtYXR0aW5nIGZvciB0aGUgZGlzcGxheSBvdXRwdXQgb2YgYSBwYXJ0aWN1bGFyIG1vZGVsIHZhcmlhYmxlOlxuICpcbiAqICogQWRkIHRoZSBhdHRyaWJ1dGUgYGRhdGEtZi1jb252ZXJ0YCB0byBhbnkgZWxlbWVudCB0aGF0IGFsc28gaGFzIHRoZSBgZGF0YS1mLWJpbmRgIG9yIGBkYXRhLWYtZm9yZWFjaGAuXG4gKiAqIFVzZSB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIgd2l0aGluIHRoZSB2YWx1ZSBvZiBhbnkgYGRhdGEtZi1gIGF0dHJpYnV0ZSAobm90IGp1c3QgYGRhdGEtZi1iaW5kYCBvciBgZGF0YS1mLWZvcmVhY2hgKS5cbiAqXG4gKiBJbiBnZW5lcmFsLCBpZiB0aGUgbW9kZWwgdmFyaWFibGUgaXMgYW4gYXJyYXksIHRoZSBjb252ZXJ0ZXIgaXMgYXBwbGllZCB0byBlYWNoIGVsZW1lbnQgb2YgdGhlIGFycmF5LiBUaGVyZSBhcmUgYSBmZXcgYnVpbHQgaW4gYXJyYXkgY29udmVydGVycyB3aGljaCwgcmF0aGVyIHRoYW4gY29udmVydGluZyBhbGwgZWxlbWVudHMgb2YgYW4gYXJyYXksIHNlbGVjdCBwYXJ0aWN1bGFyIGVsZW1lbnRzIGZyb20gd2l0aGluIHRoZSBhcnJheSBvciBvdGhlcndpc2UgdHJlYXQgYXJyYXkgdmFyaWFibGVzIHNwZWNpYWxseS5cbiAqXG4gKi9cblxuXG4ndXNlIHN0cmljdCc7XG52YXIgbGlzdCA9IFtcbiAgICB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb252ZXJ0IHRoZSBpbnB1dCBpbnRvIGFuIGFycmF5LiBDb25jYXRlbmF0ZXMgYWxsIGVsZW1lbnRzIG9mIHRoZSBpbnB1dC5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtBcnJheX0gdmFsIFRoZSBhcnJheSBtb2RlbCB2YXJpYWJsZS5cbiAgICAgICAgICovXG4gICAgICAgIGFsaWFzOiAnbGlzdCcsXG4gICAgICAgIGFjY2VwdExpc3Q6IHRydWUsXG4gICAgICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICAvKipcbiAgICAgICAgICogU2VsZWN0IG9ubHkgdGhlIGxhc3QgZWxlbWVudCBvZiB0aGUgYXJyYXkuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgPGRpdj5cbiAgICAgICAgICogICAgICAgICAgSW4gdGhlIGN1cnJlbnQgeWVhciwgd2UgaGF2ZSA8c3BhbiBkYXRhLWYtYmluZD1cIlNhbGVzIHwgbGFzdFwiPjwvc3Bhbj4gaW4gc2FsZXMuXG4gICAgICAgICAqICAgICAgPC9kaXY+XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgYXJyYXkgbW9kZWwgdmFyaWFibGUuXG4gICAgICAgICAqL1xuICAgICAgICBhbGlhczogJ2xhc3QnLFxuICAgICAgICBhY2NlcHRMaXN0OiB0cnVlLFxuICAgICAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICB2YWwgPSBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgICAgIHJldHVybiB2YWxbdmFsLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldmVyc2UgdGhlIGFycmF5LlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIDxwPlNob3cgdGhlIGhpc3Rvcnkgb2Ygb3VyIHNhbGVzLCBzdGFydGluZyB3aXRoIHRoZSBsYXN0IChtb3N0IHJlY2VudCk6PC9wPlxuICAgICAgICAgKiAgICAgIDx1bCBkYXRhLWYtZm9yZWFjaD1cIlNhbGVzIHwgcmV2ZXJzZVwiPlxuICAgICAgICAgKiAgICAgICAgICA8bGk+PC9saT5cbiAgICAgICAgICogICAgICA8L3VsPlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWwgVGhlIGFycmF5IG1vZGVsIHZhcmlhYmxlLlxuICAgICAgICAgKi9cbiAgICB7XG4gICAgICAgIGFsaWFzOiAncmV2ZXJzZScsXG4gICAgICAgIGFjY2VwdExpc3Q6IHRydWUsXG4gICAgICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHZhbCA9IFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbC5yZXZlcnNlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNlbGVjdCBvbmx5IHRoZSBmaXJzdCBlbGVtZW50IG9mIHRoZSBhcnJheS5cbiAgICAgICAgICpcbiAgICAgICAgICogKipFeGFtcGxlKipcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICA8ZGl2PlxuICAgICAgICAgKiAgICAgICAgICBPdXIgaW5pdGlhbCBpbnZlc3RtZW50IHdhcyA8c3BhbiBkYXRhLWYtYmluZD1cIkNhcGl0YWwgfCBmaXJzdFwiPjwvc3Bhbj4uXG4gICAgICAgICAqICAgICAgPC9kaXY+XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgYXJyYXkgbW9kZWwgdmFyaWFibGUuXG4gICAgICAgICAqL1xuICAgICAgICBhbGlhczogJ2ZpcnN0JyxcbiAgICAgICAgYWNjZXB0TGlzdDogdHJ1ZSxcbiAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgdmFsID0gW10uY29uY2F0KHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gdmFsWzBdO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZWxlY3Qgb25seSB0aGUgcHJldmlvdXMgKHNlY29uZCB0byBsYXN0KSBlbGVtZW50IG9mIHRoZSBhcnJheS5cbiAgICAgICAgICpcbiAgICAgICAgICogKipFeGFtcGxlKipcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICA8ZGl2PlxuICAgICAgICAgKiAgICAgICAgICBMYXN0IHllYXIgd2UgaGFkIDxzcGFuIGRhdGEtZi1iaW5kPVwiU2FsZXMgfCBwcmV2aW91c1wiPjwvc3Bhbj4gaW4gc2FsZXMuXG4gICAgICAgICAqICAgICAgPC9kaXY+XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgYXJyYXkgbW9kZWwgdmFyaWFibGUuXG4gICAgICAgICAqL1xuICAgICAgICBhbGlhczogJ3ByZXZpb3VzJyxcbiAgICAgICAgYWNjZXB0TGlzdDogdHJ1ZSxcbiAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgdmFsID0gW10uY29uY2F0KHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gKHZhbC5sZW5ndGggPD0gMSkgPyB2YWxbMF0gOiB2YWxbdmFsLmxlbmd0aCAtIDJdO1xuICAgICAgICB9XG4gICAgfVxuXTtcblxuXy5lYWNoKGxpc3QsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICB2YXIgb2xkZm4gPSBpdGVtLmNvbnZlcnQ7XG4gICB2YXIgbmV3Zm4gPSBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdCh2YWwpKSB7XG4gICAgICAgICAgICByZXR1cm4gXy5tYXBWYWx1ZXModmFsLCBvbGRmbik7XG4gICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBvbGRmbih2YWwpO1xuICAgICAgIH1cbiAgIH07XG4gICBpdGVtLmNvbnZlcnQgPSBuZXdmbjtcbn0pO1xubW9kdWxlLmV4cG9ydHMgPSBsaXN0O1xuIiwiLyoqXG4gKiAjIyBDb252ZXJ0ZXIgTWFuYWdlcjogTWFrZSB5b3VyIG93biBDb252ZXJ0ZXJzXG4gKlxuICogQ29udmVydGVycyBhbGxvdyB5b3UgdG8gY29udmVydCBkYXRhIC0tIGluIHBhcnRpY3VsYXIsIG1vZGVsIHZhcmlhYmxlcyB0aGF0IHlvdSBkaXNwbGF5IGluIHlvdXIgcHJvamVjdCdzIHVzZXIgaW50ZXJmYWNlIC0tIGZyb20gb25lIGZvcm0gdG8gYW5vdGhlci5cbiAqXG4gKiBCYXNpYyBjb252ZXJ0aW5nIGFuZCBmb3JtYXR0aW5nIG9wdGlvbnMgYXJlIGJ1aWx0IGluIHRvIEZsb3cuanMuXG4gKlxuICogWW91IGNhbiBhbHNvIGNyZWF0ZSB5b3VyIG93biBjb252ZXJ0ZXJzLiBFYWNoIGNvbnZlcnRlciBzaG91bGQgYmUgYSBmdW5jdGlvbiB0aGF0IHRha2VzIGluIGEgdmFsdWUgb3IgdmFsdWVzIHRvIGNvbnZlcnQuIFRvIHVzZSB5b3VyIGNvbnZlcnRlciwgYHJlZ2lzdGVyKClgIGl0IGluIHlvdXIgaW5zdGFuY2Ugb2YgRmxvdy5qcy5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vL1RPRE86IE1ha2UgYWxsIHVuZGVyc2NvcmUgZmlsdGVycyBhdmFpbGFibGVcblxudmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uIChhbGlhcywgY29udmVydGVyLCBhY2NlcHRMaXN0KSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIC8vbm9tYWxpemUoJ2ZsaXAnLCBmbilcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGNvbnZlcnRlcikpIHtcbiAgICAgICAgcmV0LnB1c2goe1xuICAgICAgICAgICAgYWxpYXM6IGFsaWFzLFxuICAgICAgICAgICAgY29udmVydDogY29udmVydGVyLFxuICAgICAgICAgICAgYWNjZXB0TGlzdDogYWNjZXB0TGlzdFxuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKCQuaXNQbGFpbk9iamVjdChjb252ZXJ0ZXIpICYmIGNvbnZlcnRlci5jb252ZXJ0KSB7XG4gICAgICAgIGNvbnZlcnRlci5hbGlhcyA9IGFsaWFzO1xuICAgICAgICBjb252ZXJ0ZXIuYWNjZXB0TGlzdCA9IGFjY2VwdExpc3Q7XG4gICAgICAgIHJldC5wdXNoKGNvbnZlcnRlcik7XG4gICAgfSBlbHNlIGlmICgkLmlzUGxhaW5PYmplY3QoYWxpYXMpKSB7XG4gICAgICAgIC8vbm9ybWFsaXplKHthbGlhczogJ2ZsaXAnLCBjb252ZXJ0OiBmdW5jdGlvbn0pXG4gICAgICAgIGlmIChhbGlhcy5jb252ZXJ0KSB7XG4gICAgICAgICAgICByZXQucHVzaChhbGlhcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBub3JtYWxpemUoe2ZsaXA6IGZ1bn0pXG4gICAgICAgICAgICAkLmVhY2goYWxpYXMsIGZ1bmN0aW9uIChrZXksIHZhbCkge1xuICAgICAgICAgICAgICAgIHJldC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgYWxpYXM6IGtleSxcbiAgICAgICAgICAgICAgICAgICAgY29udmVydDogdmFsLFxuICAgICAgICAgICAgICAgICAgICBhY2NlcHRMaXN0OiBhY2NlcHRMaXN0XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufTtcblxudmFyIG1hdGNoQ29udmVydGVyID0gZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIpIHtcbiAgICBpZiAoXy5pc1N0cmluZyhjb252ZXJ0ZXIuYWxpYXMpKSB7XG4gICAgICAgIHJldHVybiBhbGlhcyA9PT0gY29udmVydGVyLmFsaWFzO1xuICAgIH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKGNvbnZlcnRlci5hbGlhcykpIHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRlci5hbGlhcyhhbGlhcyk7XG4gICAgfSBlbHNlIGlmIChfLmlzUmVnZXgoY29udmVydGVyLmFsaWFzKSkge1xuICAgICAgICByZXR1cm4gY29udmVydGVyLmFsaWFzLm1hdGNoKGFsaWFzKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxudmFyIGNvbnZlcnRlck1hbmFnZXIgPSB7XG4gICAgcHJpdmF0ZToge1xuICAgICAgICBtYXRjaENvbnZlcnRlcjogbWF0Y2hDb252ZXJ0ZXJcbiAgICB9LFxuXG4gICAgbGlzdDogW10sXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IGF0dHJpYnV0ZSBjb252ZXJ0ZXIgdG8gdGhpcyBpbnN0YW5jZSBvZiBGbG93LmpzLlxuICAgICAqXG4gICAgICogKipFeGFtcGxlKipcbiAgICAgKlxuICAgICAqICAgICAgRmxvdy5kb20uY29udmVydGVycy5yZWdpc3RlcignbWF4JywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICogICAgICAgICAgcmV0dXJuIF8ubWF4KHZhbHVlKTtcbiAgICAgKiAgICAgIH0sIHRydWUpO1xuICAgICAqXG4gICAgICogICAgICBGbG93LmRvbS5jb252ZXJ0ZXJzLnJlZ2lzdGVyKHtcbiAgICAgKiAgICAgICAgICBhbGlhczogJ3NpZycsXG4gICAgICogICAgICAgICAgcGFyc2U6ICQubm9vcCxcbiAgICAgKiAgICAgICAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgKiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLmZpcnN0TmFtZSArICcgJyArIHZhbHVlLmxhc3ROYW1lICsgJywgJyArIHZhbHVlLmpvYlRpdGxlO1xuICAgICAqICAgICAgfSwgZmFsc2UpO1xuICAgICAqXG4gICAgICogICAgICA8ZGl2PlxuICAgICAqICAgICAgICAgIFRoZSBsYXJnZXN0IHNhbGVzIHlvdSBoYWQgd2FzIDxzcGFuIGRhdGEtZi1iaW5kPVwic2FsZXNCeVllYXIgfCBtYXggfCAkIywjIyNcIj48L3NwYW4+LlxuICAgICAqICAgICAgICAgIFRoZSBjdXJyZW50IHNhbGVzIG1hbmFnZXIgaXMgPHNwYW4gZGF0YS1mLWJpbmQ9XCJzYWxlc01nciB8IHNpZ1wiPjwvc3Bhbj4uXG4gICAgICogICAgICA8L2Rpdj5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge1N0cmluZ3xGdW5jdGlvbnxSZWdleH0gYWxpYXMgRm9ybWF0dGVyIG5hbWUuXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb258T2JqZWN0fSBjb252ZXJ0ZXIgSWYgYSBmdW5jdGlvbiwgYGNvbnZlcnRlcmAgaXMgY2FsbGVkIHdpdGggdGhlIHZhbHVlLiBJZiBhbiBvYmplY3QsIHNob3VsZCBpbmNsdWRlIGZpZWxkcyBmb3IgYGFsaWFzYCAobmFtZSksIGBwYXJzZWAgKGZ1bmN0aW9uKSwgYW5kIGBjb252ZXJ0YCAoZnVuY3Rpb24pLlxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gYWNjZXB0TGlzdCBEZXRlcm1pbmVzIGlmIHRoZSBjb252ZXJ0ZXIgaXMgYSAnbGlzdCcgY29udmVydGVyIG9yIG5vdC4gTGlzdCBjb252ZXJ0ZXJzIHRha2UgaW4gYXJyYXlzIGFzIGlucHV0cywgb3RoZXJzIGV4cGVjdCBzaW5nbGUgdmFsdWVzLlxuICAgICAqL1xuICAgIHJlZ2lzdGVyOiBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlciwgYWNjZXB0TGlzdCkge1xuICAgICAgICB2YXIgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZShhbGlhcywgY29udmVydGVyLCBhY2NlcHRMaXN0KTtcbiAgICAgICAgdGhpcy5saXN0ID0gbm9ybWFsaXplZC5jb25jYXQodGhpcy5saXN0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVwbGFjZSBhbiBhbHJlYWR5IHJlZ2lzdGVyZWQgY29udmVydGVyIHdpdGggYSBuZXcgb25lIG9mIHRoZSBzYW1lIG5hbWUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYWxpYXMgRm9ybWF0dGVyIG5hbWUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R9IGNvbnZlcnRlciBJZiBhIGZ1bmN0aW9uLCBgY29udmVydGVyYCBpcyBjYWxsZWQgd2l0aCB0aGUgdmFsdWUuIElmIGFuIG9iamVjdCwgc2hvdWxkIGluY2x1ZGUgZmllbGRzIGZvciBgYWxpYXNgIChuYW1lKSwgYHBhcnNlYCAoZnVuY3Rpb24pLCBhbmQgYGNvbnZlcnRgIChmdW5jdGlvbikuXG4gICAgICovXG4gICAgcmVwbGFjZTogZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIpIHtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBfLmVhY2godGhpcy5saXN0LCBmdW5jdGlvbiAoY3VycmVudENvbnZlcnRlciwgaSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoQ29udmVydGVyKGFsaWFzLCBjdXJyZW50Q29udmVydGVyKSkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoYWxpYXMsIGNvbnZlcnRlcilbMF0pO1xuICAgIH0sXG5cbiAgICBnZXRDb252ZXJ0ZXI6IGZ1bmN0aW9uIChhbGlhcykge1xuICAgICAgICByZXR1cm4gXy5maW5kKHRoaXMubGlzdCwgZnVuY3Rpb24gKGNvbnZlcnRlcikge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoQ29udmVydGVyKGFsaWFzLCBjb252ZXJ0ZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUGlwZXMgdGhlIHZhbHVlIHNlcXVlbnRpYWxseSB0aHJvdWdoIGEgbGlzdCBvZiBwcm92aWRlZCBjb252ZXJ0ZXJzLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7QW55fSB2YWx1ZSBJbnB1dCBmb3IgdGhlIGNvbnZlcnRlciB0byB0YWcuXG4gICAgICogQHBhcmFtICB7QXJyYXl8T2JqZWN0fSBsaXN0IExpc3Qgb2YgY29udmVydGVycyAobWFwcyB0byBjb252ZXJ0ZXIgYWxpYXMpLlxuICAgICAqXG4gICAgICogQHJldHVybiB7QW55fSBDb252ZXJ0ZWQgdmFsdWUuXG4gICAgICovXG4gICAgY29udmVydDogZnVuY3Rpb24gKHZhbHVlLCBsaXN0KSB7XG4gICAgICAgIGlmICghbGlzdCB8fCAhbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBsaXN0ID0gW10uY29uY2F0KGxpc3QpO1xuICAgICAgICBsaXN0ID0gXy5pbnZva2UobGlzdCwgJ3RyaW0nKTtcblxuICAgICAgICB2YXIgY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG5cbiAgICAgICAgdmFyIGNvbnZlcnRBcnJheSA9IGZ1bmN0aW9uIChjb252ZXJ0ZXIsIHZhbCwgY29udmVydGVyTmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIF8ubWFwKHZhbCwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udmVydGVyLmNvbnZlcnQodiwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGNvbnZlcnRPYmplY3QgPSBmdW5jdGlvbiAoY29udmVydGVyLCB2YWx1ZSwgY29udmVydGVyTmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIF8ubWFwVmFsdWVzKHZhbHVlLCBmdW5jdGlvbiAodmFsLCBrZXkpIHtcbiAgICAgICAgICAgICAgIHJldHVybiBjb252ZXJ0KGNvbnZlcnRlciwgdmFsLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBjb252ZXJ0ID0gZnVuY3Rpb24gKGNvbnZlcnRlciwgdmFsdWUsIGNvbnZlcnRlck5hbWUpIHtcbiAgICAgICAgICAgIHZhciBjb252ZXJ0ZWQ7XG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSAmJiBjb252ZXJ0ZXIuYWNjZXB0TGlzdCAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRBcnJheShjb252ZXJ0ZXIsIHZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gY29udmVydGVyLmNvbnZlcnQodmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNvbnZlcnRlZDtcbiAgICAgICAgfTtcbiAgICAgICAgXy5lYWNoKGxpc3QsIGZ1bmN0aW9uIChjb252ZXJ0ZXJOYW1lKSB7XG4gICAgICAgICAgICB2YXIgY29udmVydGVyID0gbWUuZ2V0Q29udmVydGVyKGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgaWYgKCFjb252ZXJ0ZXIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIGNvbnZlcnRlciBmb3IgJyArIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChjdXJyZW50VmFsdWUpICYmIGNvbnZlcnRlci5hY2NlcHRMaXN0ICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFZhbHVlID0gY29udmVydE9iamVjdChjb252ZXJ0ZXIsIGN1cnJlbnRWYWx1ZSwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9IGNvbnZlcnQoY29udmVydGVyLCBjdXJyZW50VmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ291bnRlci1wYXJ0IHRvIGBjb252ZXJ0KClgLiBUcmFuc2xhdGVzIGNvbnZlcnRlZCB2YWx1ZXMgYmFjayB0byB0aGVpciBvcmlnaW5hbCBmb3JtLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSB2YWx1ZSBWYWx1ZSB0byBwYXJzZS5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd8QXJyYXl9IGxpc3QgIExpc3Qgb2YgcGFyc2VycyB0byBydW4gdGhlIHZhbHVlIHRocm91Z2guIE91dGVybW9zdCBpcyBpbnZva2VkIGZpcnN0LlxuICAgICAqIEByZXR1cm4ge0FueX0gT3JpZ2luYWwgdmFsdWUuXG4gICAgICovXG4gICAgcGFyc2U6IGZ1bmN0aW9uICh2YWx1ZSwgbGlzdCkge1xuICAgICAgICBpZiAoIWxpc3QgfHwgIWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgbGlzdCA9IFtdLmNvbmNhdChsaXN0KS5yZXZlcnNlKCk7XG4gICAgICAgIGxpc3QgPSBfLmludm9rZShsaXN0LCAndHJpbScpO1xuXG4gICAgICAgIHZhciBjdXJyZW50VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgXy5lYWNoKGxpc3QsIGZ1bmN0aW9uIChjb252ZXJ0ZXJOYW1lKSB7XG4gICAgICAgICAgICB2YXIgY29udmVydGVyID0gbWUuZ2V0Q29udmVydGVyKGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgaWYgKGNvbnZlcnRlci5wYXJzZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9IGNvbnZlcnRlci5wYXJzZShjdXJyZW50VmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICB9XG59O1xuXG5cbi8vQm9vdHN0cmFwXG52YXIgZGVmYXVsdGNvbnZlcnRlcnMgPSBbXG4gICAgcmVxdWlyZSgnLi9udW1iZXItY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi9zdHJpbmctY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi9hcnJheS1jb252ZXJ0ZXInKSxcbiAgICByZXF1aXJlKCcuL3VuZGVyc2NvcmUtdXRpbHMtY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi9udW1iZXJmb3JtYXQtY29udmVydGVyJyksXG5dO1xuXG4kLmVhY2goZGVmYXVsdGNvbnZlcnRlcnMucmV2ZXJzZSgpLCBmdW5jdGlvbiAoaW5kZXgsIGNvbnZlcnRlcikge1xuICAgIGlmIChfLmlzQXJyYXkoY29udmVydGVyKSkge1xuICAgICAgICBfLmVhY2goY29udmVydGVyLCBmdW5jdGlvbiAoYykge1xuICAgICAgICAgICBjb252ZXJ0ZXJNYW5hZ2VyLnJlZ2lzdGVyKGMpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb252ZXJ0ZXJNYW5hZ2VyLnJlZ2lzdGVyKGNvbnZlcnRlcik7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gY29udmVydGVyTWFuYWdlcjtcbiIsIi8qKlxuICogIyMgTnVtYmVyIENvbnZlcnRlcnNcbiAqXG4gKiBDb252ZXJ0ZXJzIGFsbG93IHlvdSB0byBjb252ZXJ0IGRhdGEgLS0gaW4gcGFydGljdWxhciwgbW9kZWwgdmFyaWFibGVzIHRoYXQgeW91IGRpc3BsYXkgaW4geW91ciBwcm9qZWN0J3MgdXNlciBpbnRlcmZhY2UgLS0gZnJvbSBvbmUgZm9ybSB0byBhbm90aGVyLlxuICpcbiAqIFRoZXJlIGFyZSB0d28gd2F5cyB0byBzcGVjaWZ5IGNvbnZlcnNpb24gb3IgZm9ybWF0dGluZyBmb3IgdGhlIGRpc3BsYXkgb3V0cHV0IG9mIGEgcGFydGljdWxhciBtb2RlbCB2YXJpYWJsZTpcbiAqXG4gKiAqIEFkZCB0aGUgYXR0cmlidXRlIGBkYXRhLWYtY29udmVydGAgdG8gYW55IGVsZW1lbnQgdGhhdCBhbHNvIGhhcyB0aGUgYGRhdGEtZi1iaW5kYCBvciBgZGF0YS1mLWZvcmVhY2hgLlxuICogKiBVc2UgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyIHdpdGhpbiB0aGUgdmFsdWUgb2YgYW55IGBkYXRhLWYtYCBhdHRyaWJ1dGUgKG5vdCBqdXN0IGBkYXRhLWYtYmluZGAgb3IgYGRhdGEtZi1mb3JlYWNoYCkuXG4gKlxuICovXG5cbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIC8qKlxuICAgICAqIENvbnZlcnQgdGhlIG1vZGVsIHZhcmlhYmxlIHRvIGFuIGludGVnZXIuIE9mdGVuIHVzZWQgZm9yIGNoYWluaW5nIHRvIGFub3RoZXIgY29udmVydGVyLlxuICAgICAqXG4gICAgICogKipFeGFtcGxlKipcbiAgICAgKlxuICAgICAqICAgICAgPGRpdj5cbiAgICAgKiAgICAgICAgICBZb3VyIGNhciBoYXMgZHJpdmVuXG4gICAgICogICAgICAgICAgPHNwYW4gZGF0YS1mLWJpbmQ9XCJPZG9tZXRlciB8IGkgfCBzMC4wXCI+PC9zcGFuPiBtaWxlcy5cbiAgICAgKiAgICAgIDwvZGl2PlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gdmFsdWUgVGhlIG1vZGVsIHZhcmlhYmxlLlxuICAgICAqL1xuICAgIGFsaWFzOiAnaScsXG4gICAgY29udmVydDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KHZhbHVlLCAxMCk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgTnVtYmVyIEZvcm1hdCBDb252ZXJ0ZXJzXG4gKlxuICogQ29udmVydGVycyBhbGxvdyB5b3UgdG8gY29udmVydCBkYXRhIC0tIGluIHBhcnRpY3VsYXIsIG1vZGVsIHZhcmlhYmxlcyB0aGF0IHlvdSBkaXNwbGF5IGluIHlvdXIgcHJvamVjdCdzIHVzZXIgaW50ZXJmYWNlIC0tIGZyb20gb25lIGZvcm0gdG8gYW5vdGhlci5cbiAqXG4gKiBUaGVyZSBhcmUgdHdvIHdheXMgdG8gc3BlY2lmeSBjb252ZXJzaW9uIG9yIGZvcm1hdHRpbmcgZm9yIHRoZSBkaXNwbGF5IG91dHB1dCBvZiBhIHBhcnRpY3VsYXIgbW9kZWwgdmFyaWFibGU6XG4gKlxuICogKiBBZGQgdGhlIGF0dHJpYnV0ZSBgZGF0YS1mLWNvbnZlcnRgIHRvIGFueSBlbGVtZW50IHRoYXQgYWxzbyBoYXMgdGhlIGBkYXRhLWYtYmluZGAgb3IgYGRhdGEtZi1mb3JlYWNoYC5cbiAqICogVXNlIHRoZSBgfGAgKHBpcGUpIGNoYXJhY3RlciB3aXRoaW4gdGhlIHZhbHVlIG9mIGFueSBgZGF0YS1mLWAgYXR0cmlidXRlIChub3QganVzdCBgZGF0YS1mLWJpbmRgIG9yIGBkYXRhLWYtZm9yZWFjaGApLlxuICpcbiAqIEZvciBtb2RlbCB2YXJpYWJsZXMgdGhhdCBhcmUgbnVtYmVycyAob3IgdGhhdCBoYXZlIGJlZW4gW2NvbnZlcnRlZCB0byBudW1iZXJzXSguLi9udW1iZXItY29udmVydGVyLykpLCB0aGVyZSBhcmUgc2V2ZXJhbCBzcGVjaWFsIG51bWJlciBmb3JtYXRzIHlvdSBjYW4gYXBwbHkuXG4gKlxuICogIyMjI0N1cnJlbmN5IE51bWJlciBGb3JtYXRcbiAqXG4gKiBBZnRlciB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIsIHVzZSBgJGAgKGRvbGxhciBzaWduKSwgYDBgLCBhbmQgYC5gIChkZWNpbWFsIHBvaW50KSBpbiB5b3VyIGNvbnZlcnRlciB0byBkZXNjcmliZSBob3cgY3VycmVuY3kgc2hvdWxkIGFwcGVhci4gVGhlIHNwZWNpZmljYXRpb25zIGZvbGxvdyB0aGUgRXhjZWwgY3VycmVuY3kgZm9ybWF0dGluZyBjb252ZW50aW9ucy5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPCEtLSBjb252ZXJ0IHRvIGRvbGxhcnMgKGluY2x1ZGUgY2VudHMpIC0tPlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInByaWNlW2Nhcl1cIiBkYXRhLWYtY29udmVydD1cIiQwLjAwXCIgLz5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJwcmljZVtjYXJdIHwgJDAuMDBcIiAvPlxuICpcbiAqICAgICAgPCEtLSBjb252ZXJ0IHRvIGRvbGxhcnMgKHRydW5jYXRlIGNlbnRzKSAtLT5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJwcmljZVtjYXJdXCIgZGF0YS1mLWNvbnZlcnQ9XCIkMC5cIiAvPlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInByaWNlW2Nhcl0gfCAkMC5cIiAvPlxuICpcbiAqXG4gKiAjIyMjU3BlY2lmaWMgRGlnaXRzIE51bWJlciBGb3JtYXRcbiAqXG4gKiBBZnRlciB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIsIHVzZSBgI2AgKHBvdW5kKSBhbmQgYCxgIChjb21tYSkgaW4geW91ciBjb252ZXJ0ZXIgdG8gZGVzY3JpYmUgaG93IHRoZSBudW1iZXIgc2hvdWxkIGFwcGVhci4gVGhlIHNwZWNpZmljYXRpb25zIGZvbGxvdyB0aGUgRXhjZWwgbnVtYmVyIGZvcm1hdHRpbmcgY29udmVudGlvbnMuXG4gKlxuICogKipFeGFtcGxlKipcbiAqXG4gKiAgICAgIDwhLS0gY29udmVydCB0byB0aG91c2FuZHMgLS0+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwic2FsZXNbY2FyXVwiIGRhdGEtZi1jb252ZXJ0PVwiIywjIyNcIiAvPlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInNhbGVzW2Nhcl0gfCAjLCMjI1wiIC8+XG4gKlxuICpcbiAqICMjIyNQZXJjZW50YWdlIE51bWJlciBGb3JtYXRcbiAqXG4gKiBBZnRlciB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIsIHVzZSBgJWAgKHBlcmNlbnQpIGFuZCBgMGAgaW4geW91ciBjb252ZXJ0ZXIgdG8gZGlzcGxheSB0aGUgbnVtYmVyIGFzIGEgcGVyY2VudC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPCEtLSBjb252ZXJ0IHRvIHBlcmNlbnRhZ2UgLS0+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwicHJvZml0TWFyZ2luW2Nhcl1cIiBkYXRhLWYtY29udmVydD1cIjAlXCIgLz5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJwcm9maXRNYXJnaW5bY2FyXSB8IDAlXCIgLz5cbiAqXG4gKlxuICogIyMjI1Nob3J0IE51bWJlciBGb3JtYXRcbiAqXG4gKiBBZnRlciB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIsIHVzZSBgc2AgYW5kIGAwYCBpbiB5b3VyIGNvbnZlcnRlciB0byBkZXNjcmliZSBob3cgdGhlIG51bWJlciBzaG91bGQgYXBwZWFyLlxuICpcbiAqIFRoZSBgMGBzIGRlc2NyaWJlIHRoZSBzaWduaWZpY2FudCBkaWdpdHMuXG4gKlxuICogVGhlIGBzYCBkZXNjcmliZXMgdGhlIFwic2hvcnQgZm9ybWF0LFwiIHdoaWNoIHVzZXMgJ0snIGZvciB0aG91c2FuZHMsICdNJyBmb3IgbWlsbGlvbnMsICdCJyBmb3IgYmlsbGlvbnMuIEZvciBleGFtcGxlLCBgMjQ2OGAgY29udmVydGVkIHdpdGggYHMwLjBgIGRpc3BsYXlzIGFzIGAyLjVLYC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPCEtLSBjb252ZXJ0IHRvIHRob3VzYW5kcyAoc2hvdyAxMiw0NjggYXMgMTIuNUspIC0tPlxuICogICAgICA8c3BhbiB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwicHJpY2VbY2FyXSB8IHMwLjBcIj48L3NwYW4+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGFsaWFzOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAvL1RPRE86IEZhbmN5IHJlZ2V4IHRvIG1hdGNoIG51bWJlciBmb3JtYXRzIGhlcmVcbiAgICAgICAgcmV0dXJuIChuYW1lLmluZGV4T2YoJyMnKSAhPT0gLTEgfHwgbmFtZS5pbmRleE9mKCcwJykgIT09IC0xKTtcbiAgICB9LFxuXG4gICAgcGFyc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFsKz0gJyc7XG4gICAgICAgIHZhciBpc05lZ2F0aXZlID0gdmFsLmNoYXJBdCgwKSA9PT0gJy0nO1xuXG4gICAgICAgIHZhbCAgPSB2YWwucmVwbGFjZSgvLC9nLCAnJyk7XG4gICAgICAgIHZhciBmbG9hdE1hdGNoZXIgPSAvKFstK10/WzAtOV0qXFwuP1swLTldKykoSz9NP0I/JT8pL2k7XG4gICAgICAgIHZhciByZXN1bHRzID0gZmxvYXRNYXRjaGVyLmV4ZWModmFsKTtcbiAgICAgICAgdmFyIG51bWJlciwgc3VmZml4ID0gJyc7XG4gICAgICAgIGlmIChyZXN1bHRzICYmIHJlc3VsdHNbMV0pIHtcbiAgICAgICAgICAgIG51bWJlciA9IHJlc3VsdHNbMV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdHMgJiYgcmVzdWx0c1syXSkge1xuICAgICAgICAgICAgc3VmZml4ID0gcmVzdWx0c1syXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoIChzdWZmaXgpIHtcbiAgICAgICAgICAgIGNhc2UgJyUnOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAvIDEwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2snOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIDEwMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdtJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAxMDAwMDAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYic6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogMTAwMDAwMDAwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBudW1iZXIgPSBwYXJzZUZsb2F0KG51bWJlcik7XG4gICAgICAgIGlmIChpc05lZ2F0aXZlICYmIG51bWJlciA+IDApIHtcbiAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIC0xO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudW1iZXI7XG4gICAgfSxcblxuICAgIGNvbnZlcnQ6IChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIHNjYWxlcyA9IFsnJywgJ0snLCAnTScsICdCJywgJ1QnXTtcblxuICAgICAgICBmdW5jdGlvbiBnZXREaWdpdHModmFsdWUsIGRpZ2l0cykge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSA9PT0gMCA/IDAgOiByb3VuZFRvKHZhbHVlLCBNYXRoLm1heCgwLCBkaWdpdHMgLSBNYXRoLmNlaWwoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjEwKSkpO1xuXG4gICAgICAgICAgICB2YXIgVFhUID0gJyc7XG4gICAgICAgICAgICB2YXIgbnVtYmVyVFhUID0gdmFsdWUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIHZhciBkZWNpbWFsU2V0ID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGlUWFQgPSAwOyBpVFhUIDwgbnVtYmVyVFhULmxlbmd0aDsgaVRYVCsrKSB7XG4gICAgICAgICAgICAgICAgVFhUICs9IG51bWJlclRYVC5jaGFyQXQoaVRYVCk7XG4gICAgICAgICAgICAgICAgaWYgKG51bWJlclRYVC5jaGFyQXQoaVRYVCkgPT09ICcuJykge1xuICAgICAgICAgICAgICAgICAgICBkZWNpbWFsU2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkaWdpdHMtLTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoZGlnaXRzIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFRYVDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZGVjaW1hbFNldCkge1xuICAgICAgICAgICAgICAgIFRYVCArPSAnLic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoZGlnaXRzID4gMCkge1xuICAgICAgICAgICAgICAgIFRYVCArPSAnMCc7XG4gICAgICAgICAgICAgICAgZGlnaXRzLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gVFhUO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkRGVjaW1hbHModmFsdWUsIGRlY2ltYWxzLCBtaW5EZWNpbWFscywgaGFzQ29tbWFzKSB7XG4gICAgICAgICAgICBoYXNDb21tYXMgPSAoaGFzQ29tbWFzID09PSBmYWxzZSkgPyBmYWxzZSA6IHRydWU7XG4gICAgICAgICAgICB2YXIgbnVtYmVyVFhUID0gdmFsdWUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIHZhciBoYXNEZWNpbWFscyA9IChudW1iZXJUWFQuc3BsaXQoJy4nKS5sZW5ndGggPiAxKTtcbiAgICAgICAgICAgIHZhciBpRGVjID0gMDtcblxuICAgICAgICAgICAgaWYgKGhhc0NvbW1hcykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGlDaGFyID0gbnVtYmVyVFhULmxlbmd0aCAtIDE7IGlDaGFyID4gMDsgaUNoYXItLSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzRGVjaW1hbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc0RlY2ltYWxzID0gKG51bWJlclRYVC5jaGFyQXQoaUNoYXIpICE9PSAnLicpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaURlYyA9IChpRGVjICsgMSkgJSAzO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlEZWMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1iZXJUWFQgPSBudW1iZXJUWFQuc3Vic3RyKDAsIGlDaGFyKSArICcsJyArIG51bWJlclRYVC5zdWJzdHIoaUNoYXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGVjaW1hbHMgPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRvQUREO1xuICAgICAgICAgICAgICAgIGlmIChudW1iZXJUWFQuc3BsaXQoJy4nKS5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0b0FERCA9IG1pbkRlY2ltYWxzO1xuICAgICAgICAgICAgICAgICAgICBpZiAodG9BREQgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBudW1iZXJUWFQgKz0gJy4nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdG9BREQgPSBtaW5EZWNpbWFscyAtIG51bWJlclRYVC5zcGxpdCgnLicpWzFdLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB3aGlsZSAodG9BREQgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG51bWJlclRYVCArPSAnMCc7XG4gICAgICAgICAgICAgICAgICAgIHRvQURELS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bWJlclRYVDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJvdW5kVG8odmFsdWUsIGRpZ2l0cykge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGgucm91bmQodmFsdWUgKiBNYXRoLnBvdygxMCwgZGlnaXRzKSkgLyBNYXRoLnBvdygxMCwgZGlnaXRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFN1ZmZpeChmb3JtYXRUWFQpIHtcbiAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5yZXBsYWNlKCcuJywgJycpO1xuICAgICAgICAgICAgdmFyIGZpeGVzVFhUID0gZm9ybWF0VFhULnNwbGl0KG5ldyBSZWdFeHAoJ1swfCx8I10rJywgJ2cnKSk7XG4gICAgICAgICAgICByZXR1cm4gKGZpeGVzVFhULmxlbmd0aCA+IDEpID8gZml4ZXNUWFRbMV0udG9TdHJpbmcoKSA6ICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaXNDdXJyZW5jeShzdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBzID0gJC50cmltKHN0cmluZyk7XG5cbiAgICAgICAgICAgIGlmIChzID09PSAnJCcgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCrCcgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4LCpScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4LCoycgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCoScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCsScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnS8OEPycgfHxcbiAgICAgICAgICAgICAgICBzID09PSAna3InIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OCwqInIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqonIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OG4oCZJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKpJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKrJykge1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGZvcm1hdChudW1iZXIsIGZvcm1hdFRYVCkge1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheShudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyW251bWJlci5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghXy5pc1N0cmluZyhudW1iZXIpICYmICFfLmlzTnVtYmVyKG51bWJlcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVtYmVyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWZvcm1hdFRYVCB8fCBmb3JtYXRUWFQudG9Mb3dlckNhc2UoKSA9PT0gJ2RlZmF1bHQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bWJlci50b1N0cmluZygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoaXNOYU4obnVtYmVyKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnPyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vdmFyIGZvcm1hdFRYVDtcbiAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5yZXBsYWNlKCcmZXVybzsnLCAnw6LigJrCrCcpO1xuXG4gICAgICAgICAgICAvLyBEaXZpZGUgKy8tIE51bWJlciBGb3JtYXRcbiAgICAgICAgICAgIHZhciBmb3JtYXRzID0gZm9ybWF0VFhULnNwbGl0KCc7Jyk7XG4gICAgICAgICAgICBpZiAoZm9ybWF0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvcm1hdChNYXRoLmFicyhudW1iZXIpLCBmb3JtYXRzWygobnVtYmVyID49IDApID8gMCA6IDEpXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNhdmUgU2lnblxuICAgICAgICAgICAgdmFyIHNpZ24gPSAobnVtYmVyID49IDApID8gJycgOiAnLSc7XG4gICAgICAgICAgICBudW1iZXIgPSBNYXRoLmFicyhudW1iZXIpO1xuXG5cbiAgICAgICAgICAgIHZhciBsZWZ0T2ZEZWNpbWFsID0gZm9ybWF0VFhUO1xuICAgICAgICAgICAgdmFyIGQgPSBsZWZ0T2ZEZWNpbWFsLmluZGV4T2YoJy4nKTtcbiAgICAgICAgICAgIGlmIChkID4gLTEpIHtcbiAgICAgICAgICAgICAgICBsZWZ0T2ZEZWNpbWFsID0gbGVmdE9mRGVjaW1hbC5zdWJzdHJpbmcoMCwgZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBub3JtYWxpemVkID0gbGVmdE9mRGVjaW1hbC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gbm9ybWFsaXplZC5sYXN0SW5kZXhPZigncycpO1xuICAgICAgICAgICAgdmFyIGlzU2hvcnRGb3JtYXQgPSBpbmRleCA+IC0xO1xuXG4gICAgICAgICAgICBpZiAoaXNTaG9ydEZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHZhciBuZXh0Q2hhciA9IGxlZnRPZkRlY2ltYWwuY2hhckF0KGluZGV4ICsgMSk7XG4gICAgICAgICAgICAgICAgaWYgKG5leHRDaGFyID09PSAnICcpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNTaG9ydEZvcm1hdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGxlYWRpbmdUZXh0ID0gaXNTaG9ydEZvcm1hdCA/IGZvcm1hdFRYVC5zdWJzdHJpbmcoMCwgaW5kZXgpIDogJyc7XG4gICAgICAgICAgICB2YXIgcmlnaHRPZlByZWZpeCA9IGlzU2hvcnRGb3JtYXQgPyBmb3JtYXRUWFQuc3Vic3RyKGluZGV4ICsgMSkgOiBmb3JtYXRUWFQuc3Vic3RyKGluZGV4KTtcblxuICAgICAgICAgICAgLy9maXJzdCBjaGVjayB0byBtYWtlIHN1cmUgJ3MnIGlzIGFjdHVhbGx5IHNob3J0IGZvcm1hdCBhbmQgbm90IHBhcnQgb2Ygc29tZSBsZWFkaW5nIHRleHRcbiAgICAgICAgICAgIGlmIChpc1Nob3J0Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHNob3J0Rm9ybWF0VGVzdCA9IC9bMC05IypdLztcbiAgICAgICAgICAgICAgICB2YXIgc2hvcnRGb3JtYXRUZXN0UmVzdWx0ID0gcmlnaHRPZlByZWZpeC5tYXRjaChzaG9ydEZvcm1hdFRlc3QpO1xuICAgICAgICAgICAgICAgIGlmICghc2hvcnRGb3JtYXRUZXN0UmVzdWx0IHx8IHNob3J0Rm9ybWF0VGVzdFJlc3VsdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy9ubyBzaG9ydCBmb3JtYXQgY2hhcmFjdGVycyBzbyB0aGlzIG11c3QgYmUgbGVhZGluZyB0ZXh0IGllLiAnd2Vla3MgJ1xuICAgICAgICAgICAgICAgICAgICBpc1Nob3J0Rm9ybWF0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGxlYWRpbmdUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL2lmIChmb3JtYXRUWFQuY2hhckF0KDApID09ICdzJylcbiAgICAgICAgICAgIGlmIChpc1Nob3J0Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbFNjYWxlID0gbnVtYmVyID09PSAwID8gMCA6IE1hdGguZmxvb3IoTWF0aC5sb2coTWF0aC5hYnMobnVtYmVyKSkgLyAoMyAqIE1hdGguTE4xMCkpO1xuICAgICAgICAgICAgICAgIHZhbFNjYWxlID0gKChudW1iZXIgLyBNYXRoLnBvdygxMCwgMyAqIHZhbFNjYWxlKSkgPCAxMDAwKSA/IHZhbFNjYWxlIDogKHZhbFNjYWxlICsgMSk7XG4gICAgICAgICAgICAgICAgdmFsU2NhbGUgPSBNYXRoLm1heCh2YWxTY2FsZSwgMCk7XG4gICAgICAgICAgICAgICAgdmFsU2NhbGUgPSBNYXRoLm1pbih2YWxTY2FsZSwgNCk7XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyIC8gTWF0aC5wb3coMTAsIDMgKiB2YWxTY2FsZSk7XG4gICAgICAgICAgICAgICAgLy9pZiAoIWlzTmFOKE51bWJlcihmb3JtYXRUWFQuc3Vic3RyKDEpICkgKSApXG5cbiAgICAgICAgICAgICAgICBpZiAoIWlzTmFOKE51bWJlcihyaWdodE9mUHJlZml4KSkgJiYgcmlnaHRPZlByZWZpeC5pbmRleE9mKCcuJykgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsaW1pdERpZ2l0cyA9IE51bWJlcihyaWdodE9mUHJlZml4KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG51bWJlciA8IE1hdGgucG93KDEwLCBsaW1pdERpZ2l0cykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0N1cnJlbmN5KGxlYWRpbmdUZXh0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzaWduICsgbGVhZGluZ1RleHQgKyBnZXREaWdpdHMobnVtYmVyLCBOdW1iZXIocmlnaHRPZlByZWZpeCkpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxlYWRpbmdUZXh0ICsgc2lnbiArIGdldERpZ2l0cyhudW1iZXIsIE51bWJlcihyaWdodE9mUHJlZml4KSkgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ3VycmVuY3kobGVhZGluZ1RleHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWFkaW5nVGV4dCArIE1hdGgucm91bmQobnVtYmVyKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsZWFkaW5nVGV4dCArIHNpZ24gKyBNYXRoLnJvdW5kKG51bWJlcikgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy9mb3JtYXRUWFQgPSBmb3JtYXRUWFQuc3Vic3RyKDEpO1xuICAgICAgICAgICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQuc3Vic3RyKGluZGV4ICsgMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBTVUZGSVggPSBnZXRTdWZmaXgoZm9ybWF0VFhUKTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnN1YnN0cigwLCBmb3JtYXRUWFQubGVuZ3RoIC0gU1VGRklYLmxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbFdpdGhvdXRMZWFkaW5nID0gZm9ybWF0KCgoc2lnbiA9PT0gJycpID8gMSA6IC0xKSAqIG51bWJlciwgZm9ybWF0VFhUKSArIHNjYWxlc1t2YWxTY2FsZV0gKyBTVUZGSVg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0N1cnJlbmN5KGxlYWRpbmdUZXh0KSAmJiBzaWduICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsV2l0aG91dExlYWRpbmcgPSB2YWxXaXRob3V0TGVhZGluZy5zdWJzdHIoc2lnbi5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWFkaW5nVGV4dCArIHZhbFdpdGhvdXRMZWFkaW5nO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxlYWRpbmdUZXh0ICsgdmFsV2l0aG91dExlYWRpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3ViRm9ybWF0cyA9IGZvcm1hdFRYVC5zcGxpdCgnLicpO1xuICAgICAgICAgICAgdmFyIGRlY2ltYWxzO1xuICAgICAgICAgICAgdmFyIG1pbkRlY2ltYWxzO1xuICAgICAgICAgICAgaWYgKHN1YkZvcm1hdHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGRlY2ltYWxzID0gc3ViRm9ybWF0c1sxXS5sZW5ndGggLSBzdWJGb3JtYXRzWzFdLnJlcGxhY2UobmV3IFJlZ0V4cCgnWzB8I10rJywgJ2cnKSwgJycpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBtaW5EZWNpbWFscyA9IHN1YkZvcm1hdHNbMV0ubGVuZ3RoIC0gc3ViRm9ybWF0c1sxXS5yZXBsYWNlKG5ldyBSZWdFeHAoJzArJywgJ2cnKSwgJycpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBmb3JtYXRUWFQgPSBzdWJGb3JtYXRzWzBdICsgc3ViRm9ybWF0c1sxXS5yZXBsYWNlKG5ldyBSZWdFeHAoJ1swfCNdKycsICdnJyksICcnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVjaW1hbHMgPSAwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZml4ZXNUWFQgPSBmb3JtYXRUWFQuc3BsaXQobmV3IFJlZ0V4cCgnWzB8LHwjXSsnLCAnZycpKTtcbiAgICAgICAgICAgIHZhciBwcmVmZml4ID0gZml4ZXNUWFRbMF0udG9TdHJpbmcoKTtcbiAgICAgICAgICAgIHZhciBzdWZmaXggPSAoZml4ZXNUWFQubGVuZ3RoID4gMSkgPyBmaXhlc1RYVFsxXS50b1N0cmluZygpIDogJyc7XG5cbiAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqICgoZm9ybWF0VFhULnNwbGl0KCclJykubGVuZ3RoID4gMSkgPyAxMDAgOiAxKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgaWYgKGZvcm1hdFRYVC5pbmRleE9mKCclJykgIT09IC0xKSBudW1iZXIgPSBudW1iZXIgKiAxMDA7XG4gICAgICAgICAgICBudW1iZXIgPSByb3VuZFRvKG51bWJlciwgZGVjaW1hbHMpO1xuXG4gICAgICAgICAgICBzaWduID0gKG51bWJlciA9PT0gMCkgPyAnJyA6IHNpZ247XG5cbiAgICAgICAgICAgIHZhciBoYXNDb21tYXMgPSAoZm9ybWF0VFhULnN1YnN0cihmb3JtYXRUWFQubGVuZ3RoIC0gNCAtIHN1ZmZpeC5sZW5ndGgsIDEpID09PSAnLCcpO1xuICAgICAgICAgICAgdmFyIGZvcm1hdHRlZCA9IHNpZ24gKyBwcmVmZml4ICsgYWRkRGVjaW1hbHMobnVtYmVyLCBkZWNpbWFscywgbWluRGVjaW1hbHMsIGhhc0NvbW1hcykgKyBzdWZmaXg7XG5cbiAgICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhvcmlnaW5hbE51bWJlciwgb3JpZ2luYWxGb3JtYXQsIGZvcm1hdHRlZClcbiAgICAgICAgICAgIHJldHVybiBmb3JtYXR0ZWQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZm9ybWF0O1xuICAgIH0oKSlcbn07XG4iLCIvKipcbiAqICMjIFN0cmluZyBDb252ZXJ0ZXJzXG4gKlxuICogQ29udmVydGVycyBhbGxvdyB5b3UgdG8gY29udmVydCBkYXRhIC0tIGluIHBhcnRpY3VsYXIsIG1vZGVsIHZhcmlhYmxlcyB0aGF0IHlvdSBkaXNwbGF5IGluIHlvdXIgcHJvamVjdCdzIHVzZXIgaW50ZXJmYWNlIC0tIGZyb20gb25lIGZvcm0gdG8gYW5vdGhlci5cbiAqXG4gKiBUaGVyZSBhcmUgdHdvIHdheXMgdG8gc3BlY2lmeSBjb252ZXJzaW9uIG9yIGZvcm1hdHRpbmcgZm9yIHRoZSBkaXNwbGF5IG91dHB1dCBvZiBhIHBhcnRpY3VsYXIgbW9kZWwgdmFyaWFibGU6XG4gKlxuICogKiBBZGQgdGhlIGF0dHJpYnV0ZSBgZGF0YS1mLWNvbnZlcnRgIHRvIGFueSBlbGVtZW50IHRoYXQgYWxzbyBoYXMgdGhlIGBkYXRhLWYtYmluZGAgb3IgYGRhdGEtZi1mb3JlYWNoYC5cbiAqICogVXNlIHRoZSBgfGAgKHBpcGUpIGNoYXJhY3RlciB3aXRoaW4gdGhlIHZhbHVlIG9mIGFueSBgZGF0YS1mLWAgYXR0cmlidXRlIChub3QganVzdCBgZGF0YS1mLWJpbmRgIG9yIGBkYXRhLWYtZm9yZWFjaGApLlxuICpcbiAqIEZvciBtb2RlbCB2YXJpYWJsZXMgdGhhdCBhcmUgc3RyaW5ncyAob3IgdGhhdCBoYXZlIGJlZW4gY29udmVydGVkIHRvIHN0cmluZ3MpLCB0aGVyZSBhcmUgc2V2ZXJhbCBzcGVjaWFsIHN0cmluZyBmb3JtYXRzIHlvdSBjYW4gYXBwbHkuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHRoZSBtb2RlbCB2YXJpYWJsZSB0byBhIHN0cmluZy4gT2Z0ZW4gdXNlZCBmb3IgY2hhaW5pbmcgdG8gYW5vdGhlciBjb252ZXJ0ZXIuXG4gICAgICpcbiAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAqXG4gICAgICogICAgICA8ZGl2PlxuICAgICAqICAgICAgICAgIFRoaXMgeWVhciB5b3UgYXJlIGluIGNoYXJnZSBvZiBzYWxlcyBmb3JcbiAgICAgKiAgICAgICAgICA8c3BhbiBkYXRhLWYtYmluZD1cInNhbGVzTWdyLnJlZ2lvbiB8IHMgfCB1cHBlckNhc2VcIj48L3NwYW4+LlxuICAgICAqICAgICAgPC9kaXY+XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWwgVGhlIG1vZGVsIHZhcmlhYmxlLlxuICAgICAqL1xuICAgIHM6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuIHZhbCArICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHRoZSBtb2RlbCB2YXJpYWJsZSB0byBVUFBFUiBDQVNFLlxuICAgICAqXG4gICAgICogKipFeGFtcGxlKipcbiAgICAgKlxuICAgICAqICAgICAgPGRpdj5cbiAgICAgKiAgICAgICAgICBUaGlzIHllYXIgeW91IGFyZSBpbiBjaGFyZ2Ugb2Ygc2FsZXMgZm9yXG4gICAgICogICAgICAgICAgPHNwYW4gZGF0YS1mLWJpbmQ9XCJzYWxlc01nci5yZWdpb24gfCBzIHwgdXBwZXJDYXNlXCI+PC9zcGFuPi5cbiAgICAgKiAgICAgIDwvZGl2PlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gdmFsIFRoZSBtb2RlbCB2YXJpYWJsZS5cbiAgICAgKi9cbiAgICB1cHBlckNhc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuICh2YWwgKyAnJykudG9VcHBlckNhc2UoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCB0aGUgbW9kZWwgdmFyaWFibGUgdG8gbG93ZXIgY2FzZS5cbiAgICAgKlxuICAgICAqICoqRXhhbXBsZSoqXG4gICAgICpcbiAgICAgKiAgICAgIDxkaXY+XG4gICAgICogICAgICAgICAgRW50ZXIgeW91ciB1c2VyIG5hbWU6XG4gICAgICogICAgICAgICAgPGlucHV0IGRhdGEtZi1iaW5kPVwidXNlck5hbWUgfCBsb3dlckNhc2VcIj48L2lucHV0Pi5cbiAgICAgKiAgICAgIDwvZGl2PlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gdmFsIFRoZSBtb2RlbCB2YXJpYWJsZS5cbiAgICAgKi9cbiAgICBsb3dlckNhc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuICh2YWwgKyAnJykudG9Mb3dlckNhc2UoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCB0aGUgbW9kZWwgdmFyaWFibGUgdG8gVGl0bGUgQ2FzZS5cbiAgICAgKlxuICAgICAqICoqRXhhbXBsZSoqXG4gICAgICpcbiAgICAgKiAgICAgIDxkaXY+XG4gICAgICogICAgICAgICAgQ29uZ3JhdHVsYXRpb25zIG9uIHlvdXIgcHJvbW90aW9uIVxuICAgICAqICAgICAgICAgIFlvdXIgbmV3IHRpdGxlIGlzOiA8c3BhbiBkYXRhLWYtYmluZD1cImN1cnJlbnRSb2xlIHwgdGl0bGVDYXNlXCI+PC9zcGFuPi5cbiAgICAgKiAgICAgIDwvZGl2PlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gdmFsIFRoZSBtb2RlbCB2YXJpYWJsZS5cbiAgICAgKi9cbiAgICB0aXRsZUNhc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFsID0gdmFsICsgJyc7XG4gICAgICAgIHJldHVybiB2YWwucmVwbGFjZSgvXFx3XFxTKi9nLCBmdW5jdGlvbiAodHh0KSB7cmV0dXJuIHR4dC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHR4dC5zdWJzdHIoMSkudG9Mb3dlckNhc2UoKTt9KTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGxpc3QgPSBbXTtcblxudmFyIHN1cHBvcnRlZCA9IFtcbiAgICAndmFsdWVzJywgJ2tleXMnLCAnY29tcGFjdCcsICdkaWZmZXJlbmNlJyxcbiAgICAnZmxhdHRlbicsICdyZXN0JyxcbiAgICAndW5pb24nLFxuICAgICd1bmlxJywgJ3ppcCcsICd3aXRob3V0JyxcbiAgICAneG9yJywgJ3ppcCdcbl07XG5fLmVhY2goc3VwcG9ydGVkLCBmdW5jdGlvbiAoZm4pIHtcbiAgICB2YXIgaXRlbSA9IHtcbiAgICAgICAgYWxpYXM6IGZuLFxuICAgICAgICBhY2NlcHRMaXN0OiB0cnVlLFxuICAgICAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KHZhbCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXy5tYXBWYWx1ZXModmFsLCBfW2ZuXSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBfW2ZuXSh2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBsaXN0LnB1c2goaXRlbSk7XG59KTtcbm1vZHVsZS5leHBvcnRzID0gbGlzdDtcbiIsIi8qKlxuICogIyMgQXR0cmlidXRlIE1hbmFnZXJcbiAqXG4gKiBGbG93LmpzIHByb3ZpZGVzIGEgc2V0IG9mIGN1c3RvbSBET00gYXR0cmlidXRlcyB0aGF0IHNlcnZlIGFzIGEgZGF0YSBiaW5kaW5nIGJldHdlZW4gdmFyaWFibGVzIGFuZCBvcGVyYXRpb25zIGluIHlvdXIgcHJvamVjdCdzIG1vZGVsIGFuZCBIVE1MIGVsZW1lbnRzIGluIHlvdXIgcHJvamVjdCdzIHVzZXIgaW50ZXJmYWNlLiBVbmRlciB0aGUgaG9vZCwgRmxvdy5qcyBpcyBkb2luZyBhdXRvbWF0aWMgY29udmVyc2lvbiBvZiB0aGVzZSBjdXN0b20gYXR0cmlidXRlcywgbGlrZSBgZGF0YS1mLWJpbmRgLCBpbnRvIEhUTUwgc3BlY2lmaWMgdG8gdGhlIGF0dHJpYnV0ZSdzIGFzc2lnbmVkIHZhbHVlLCBsaWtlIHRoZSBjdXJyZW50IHZhbHVlIG9mIGBteU1vZGVsVmFyYC5cbiAqXG4gKiBJZiB5b3UgYXJlIGxvb2tpbmcgZm9yIGV4YW1wbGVzIG9mIHVzaW5nIHBhcnRpY3VsYXIgYXR0cmlidXRlcywgc2VlIHRoZSBbc3BlY2lmaWMgYXR0cmlidXRlcyBzdWJwYWdlc10oLi4vLi4vLi4vLi4vYXR0cmlidXRlcy1vdmVydmlldy8pLlxuICpcbiAqIElmIHlvdSB3b3VsZCBsaWtlIHRvIGV4dGVuZCBGbG93LmpzIHdpdGggeW91ciBvd24gY3VzdG9tIGF0dHJpYnV0ZXMsIHlvdSBjYW4gYWRkIHRoZW0gdG8gRmxvdy5qcyB1c2luZyB0aGUgQXR0cmlidXRlIE1hbmFnZXIuXG4gKlxuICogVGhlIEF0dHJpYnV0ZSBNYW5hZ2VyIGlzIHNwZWNpZmljIHRvIGFkZGluZyBjdXN0b20gYXR0cmlidXRlcyBhbmQgZGVzY3JpYmluZyB0aGVpciBpbXBsZW1lbnRhdGlvbiAoaGFuZGxlcnMpLiAoVGhlIFtEb20gTWFuYWdlcl0oLi4vLi4vKSBjb250YWlucyB0aGUgZ2VuZXJhbCBpbXBsZW1lbnRhdGlvbi4pXG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGRlZmF1bHRIYW5kbGVycyA9IFtcbiAgICByZXF1aXJlKCcuL25vLW9wLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2V2ZW50cy9pbml0LWV2ZW50LWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2V2ZW50cy9kZWZhdWx0LWV2ZW50LWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2ZvcmVhY2gvZGVmYXVsdC1mb3JlYWNoLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2JpbmRzL2NoZWNrYm94LXJhZGlvLWJpbmQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vYmluZHMvaW5wdXQtYmluZC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9jbGFzcy1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9wb3NpdGl2ZS1ib29sZWFuLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL25lZ2F0aXZlLWJvb2xlYW4tYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vYmluZHMvZGVmYXVsdC1iaW5kLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2RlZmF1bHQtYXR0cicpXG5dO1xuXG52YXIgaGFuZGxlcnNMaXN0ID0gW107XG5cbnZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAoYXR0cmlidXRlTWF0Y2hlciwgbm9kZU1hdGNoZXIsIGhhbmRsZXIpIHtcbiAgICBpZiAoIW5vZGVNYXRjaGVyKSB7XG4gICAgICAgIG5vZGVNYXRjaGVyID0gJyonO1xuICAgIH1cbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgICAgIGhhbmRsZXIgPSB7XG4gICAgICAgICAgICBoYW5kbGU6IGhhbmRsZXJcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuICQuZXh0ZW5kKGhhbmRsZXIsIHsgdGVzdDogYXR0cmlidXRlTWF0Y2hlciwgdGFyZ2V0OiBub2RlTWF0Y2hlciB9KTtcbn07XG5cbiQuZWFjaChkZWZhdWx0SGFuZGxlcnMsIGZ1bmN0aW9uIChpbmRleCwgaGFuZGxlcikge1xuICAgIGhhbmRsZXJzTGlzdC5wdXNoKG5vcm1hbGl6ZShoYW5kbGVyLnRlc3QsIGhhbmRsZXIudGFyZ2V0LCBoYW5kbGVyKSk7XG59KTtcblxuXG52YXIgbWF0Y2hBdHRyID0gZnVuY3Rpb24gKG1hdGNoRXhwciwgYXR0ciwgJGVsKSB7XG4gICAgdmFyIGF0dHJNYXRjaDtcblxuICAgIGlmIChfLmlzU3RyaW5nKG1hdGNoRXhwcikpIHtcbiAgICAgICAgYXR0ck1hdGNoID0gKG1hdGNoRXhwciA9PT0gJyonIHx8IChtYXRjaEV4cHIudG9Mb3dlckNhc2UoKSA9PT0gYXR0ci50b0xvd2VyQ2FzZSgpKSk7XG4gICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24obWF0Y2hFeHByKSkge1xuICAgICAgICAvL1RPRE86IHJlbW92ZSBlbGVtZW50IHNlbGVjdG9ycyBmcm9tIGF0dHJpYnV0ZXNcbiAgICAgICAgYXR0ck1hdGNoID0gbWF0Y2hFeHByKGF0dHIsICRlbCk7XG4gICAgfSBlbHNlIGlmIChfLmlzUmVnRXhwKG1hdGNoRXhwcikpIHtcbiAgICAgICAgYXR0ck1hdGNoID0gYXR0ci5tYXRjaChtYXRjaEV4cHIpO1xuICAgIH1cbiAgICByZXR1cm4gYXR0ck1hdGNoO1xufTtcblxudmFyIG1hdGNoTm9kZSA9IGZ1bmN0aW9uICh0YXJnZXQsIG5vZGVGaWx0ZXIpIHtcbiAgICByZXR1cm4gKF8uaXNTdHJpbmcobm9kZUZpbHRlcikpID8gKG5vZGVGaWx0ZXIgPT09IHRhcmdldCkgOiBub2RlRmlsdGVyLmlzKHRhcmdldCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsaXN0OiBoYW5kbGVyc0xpc3QsXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IGF0dHJpYnV0ZSBoYW5kbGVyLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7U3RyaW5nfEZ1bmN0aW9ufFJlZ2V4fSBhdHRyaWJ1dGVNYXRjaGVyIERlc2NyaXB0aW9uIG9mIHdoaWNoIGF0dHJpYnV0ZXMgdG8gbWF0Y2guXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBub2RlTWF0Y2hlciBXaGljaCBub2RlcyB0byBhZGQgYXR0cmlidXRlcyB0by4gVXNlIFtqcXVlcnkgU2VsZWN0b3Igc3ludGF4XShodHRwczovL2FwaS5qcXVlcnkuY29tL2NhdGVnb3J5L3NlbGVjdG9ycy8pLlxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufE9iamVjdH0gaGFuZGxlciBJZiBgaGFuZGxlcmAgaXMgYSBmdW5jdGlvbiwgdGhlIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIGAkZWxlbWVudGAgYXMgY29udGV4dCwgYW5kIGF0dHJpYnV0ZSB2YWx1ZSArIG5hbWUuIElmIGBoYW5kbGVyYCBpcyBhbiBvYmplY3QsIGl0IHNob3VsZCBpbmNsdWRlIHR3byBmdW5jdGlvbnMsIGFuZCBoYXZlIHRoZSBmb3JtOiBgeyBpbml0OiBmbiwgIGhhbmRsZTogZm4gfWAuIFRoZSBgaW5pdGAgZnVuY3Rpb24gaXMgY2FsbGVkIHdoZW4gdGhlIHBhZ2UgbG9hZHM7IHVzZSB0aGlzIHRvIGRlZmluZSBldmVudCBoYW5kbGVycy4gVGhlIGBoYW5kbGVgIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIGAkZWxlbWVudGAgYXMgY29udGV4dCwgYW5kIGF0dHJpYnV0ZSB2YWx1ZSArIG5hbWUuXG4gICAgICovXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChhdHRyaWJ1dGVNYXRjaGVyLCBub2RlTWF0Y2hlciwgaGFuZGxlcikge1xuICAgICAgICBoYW5kbGVyc0xpc3QudW5zaGlmdChub3JtYWxpemUuYXBwbHkobnVsbCwgYXJndW1lbnRzKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZpbmQgYW4gYXR0cmlidXRlIG1hdGNoZXIgbWF0Y2hpbmcgc29tZSBjcml0ZXJpYS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gYXR0ckZpbHRlciBBdHRyaWJ1dGUgdG8gbWF0Y2guXG4gICAgICogQHBhcmFtICB7U3RyaW5nfCRlbH0gbm9kZUZpbHRlciBOb2RlIHRvIG1hdGNoLlxuICAgICAqXG4gICAgICogQHJldHVybiB7QXJyYXl8TnVsbH0gQW4gYXJyYXkgb2YgbWF0Y2hpbmcgYXR0cmlidXRlIGhhbmRsZXJzLCBvciBudWxsIGlmIG5vIG1hdGNoZXMgZm91bmQuXG4gICAgICovXG4gICAgZmlsdGVyOiBmdW5jdGlvbiAoYXR0ckZpbHRlciwgbm9kZUZpbHRlcikge1xuICAgICAgICB2YXIgZmlsdGVyZWQgPSBfLnNlbGVjdChoYW5kbGVyc0xpc3QsIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hBdHRyKGhhbmRsZXIudGVzdCwgYXR0ckZpbHRlcik7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAobm9kZUZpbHRlcikge1xuICAgICAgICAgICAgZmlsdGVyZWQgPSBfLnNlbGVjdChmaWx0ZXJlZCwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hOb2RlKGhhbmRsZXIudGFyZ2V0LCBub2RlRmlsdGVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmaWx0ZXJlZDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVwbGFjZSBhbiBleGlzdGluZyBhdHRyaWJ1dGUgaGFuZGxlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gYXR0ckZpbHRlciBBdHRyaWJ1dGUgdG8gbWF0Y2guXG4gICAgICogQHBhcmFtICB7U3RyaW5nIHwgJGVsfSBub2RlRmlsdGVyIE5vZGUgdG8gbWF0Y2guXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb258T2JqZWN0fSBoYW5kbGVyIFRoZSB1cGRhdGVkIGF0dHJpYnV0ZSBoYW5kbGVyLiBJZiBgaGFuZGxlcmAgaXMgYSBmdW5jdGlvbiwgdGhlIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIGAkZWxlbWVudGAgYXMgY29udGV4dCwgYW5kIGF0dHJpYnV0ZSB2YWx1ZSArIG5hbWUuIElmIGBoYW5kbGVyYCBpcyBhbiBvYmplY3QsIGl0IHNob3VsZCBpbmNsdWRlIHR3byBmdW5jdGlvbnMsIGFuZCBoYXZlIHRoZSBmb3JtOiBgeyBpbml0OiBmbiwgIGhhbmRsZTogZm4gfWAuIFRoZSBgaW5pdGAgZnVuY3Rpb24gaXMgY2FsbGVkIHdoZW4gdGhlIHBhZ2UgbG9hZHM7IHVzZSB0aGlzIHRvIGRlZmluZSBldmVudCBoYW5kbGVycy4gVGhlIGBoYW5kbGVgIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIGAkZWxlbWVudGAgYXMgY29udGV4dCwgYW5kIGF0dHJpYnV0ZSB2YWx1ZSArIG5hbWUuXG4gICAgICovXG4gICAgcmVwbGFjZTogZnVuY3Rpb24gKGF0dHJGaWx0ZXIsIG5vZGVGaWx0ZXIsIGhhbmRsZXIpIHtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBfLmVhY2goaGFuZGxlcnNMaXN0LCBmdW5jdGlvbiAoY3VycmVudEhhbmRsZXIsIGkpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaEF0dHIoY3VycmVudEhhbmRsZXIudGVzdCwgYXR0ckZpbHRlcikgJiYgbWF0Y2hOb2RlKGN1cnJlbnRIYW5kbGVyLnRhcmdldCwgbm9kZUZpbHRlcikpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaGFuZGxlcnNMaXN0LnNwbGljZShpbmRleCwgMSwgbm9ybWFsaXplKGF0dHJGaWx0ZXIsIG5vZGVGaWx0ZXIsIGhhbmRsZXIpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIFJldHJpZXZlIHRoZSBhcHByb3ByaWF0ZSBoYW5kbGVyIGZvciBhIHBhcnRpY3VsYXIgYXR0cmlidXRlLiBUaGVyZSBtYXkgYmUgbXVsdGlwbGUgbWF0Y2hpbmcgaGFuZGxlcnMsIGJ1dCB0aGUgZmlyc3QgKG1vc3QgZXhhY3QpIG1hdGNoIGlzIGFsd2F5cyB1c2VkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHByb3BlcnR5IFRoZSBhdHRyaWJ1dGUuXG4gICAgICogQHBhcmFtIHskZWx9ICRlbCBUaGUgRE9NIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IFRoZSBhdHRyaWJ1dGUgaGFuZGxlci5cbiAgICAgKi9cbiAgICBnZXRIYW5kbGVyOiBmdW5jdGlvbiAocHJvcGVydHksICRlbCkge1xuICAgICAgICB2YXIgZmlsdGVyZWQgPSB0aGlzLmZpbHRlcihwcm9wZXJ0eSwgJGVsKTtcbiAgICAgICAgLy9UaGVyZSBjb3VsZCBiZSBtdWx0aXBsZSBtYXRjaGVzLCBidXQgdGhlIHRvcCBmaXJzdCBoYXMgdGhlIG1vc3QgcHJpb3JpdHlcbiAgICAgICAgcmV0dXJuIGZpbHRlcmVkWzBdO1xuICAgIH1cbn07XG5cbiIsIi8qKlxuICogIyMgQ2hlY2tib3hlcyBhbmQgUmFkaW8gQnV0dG9uc1xuICpcbiAqIEluIHRoZSBbZGVmYXVsdCBjYXNlXSguLi9kZWZhdWx0LWJpbmQtYXR0ci8pLCB0aGUgYGRhdGEtZi1iaW5kYCBhdHRyaWJ1dGUgY3JlYXRlcyBhIGJpLWRpcmVjdGlvbmFsIGJpbmRpbmcgYmV0d2VlbiB0aGUgRE9NIGVsZW1lbnQgYW5kIHRoZSBtb2RlbCB2YXJpYWJsZS4gVGhpcyBiaW5kaW5nIGlzICoqYmktZGlyZWN0aW9uYWwqKiwgbWVhbmluZyB0aGF0IGFzIHRoZSBtb2RlbCBjaGFuZ2VzLCB0aGUgaW50ZXJmYWNlIGlzIGF1dG9tYXRpY2FsbHkgdXBkYXRlZDsgYW5kIHdoZW4gZW5kIHVzZXJzIGNoYW5nZSB2YWx1ZXMgaW4gdGhlIGludGVyZmFjZSwgdGhlIG1vZGVsIGlzIGF1dG9tYXRpY2FsbHkgdXBkYXRlZC5cbiAqXG4gKiBGbG93LmpzIHByb3ZpZGVzIHNwZWNpYWwgaGFuZGxpbmcgZm9yIERPTSBlbGVtZW50cyB3aXRoIGB0eXBlPVwiY2hlY2tib3hcImAgYW5kIGB0eXBlPVwicmFkaW9cImAuXG4gKlxuICogSW4gcGFydGljdWxhciwgaWYgeW91IGFkZCB0aGUgYGRhdGEtZi1iaW5kYCBhdHRyaWJ1dGUgdG8gYW4gYGlucHV0YCB3aXRoIGB0eXBlPVwiY2hlY2tib3hcImAgYW5kIGB0eXBlPVwicmFkaW9cImAsIHRoZSBjaGVja2JveCBvciByYWRpbyBidXR0b24gaXMgYXV0b21hdGljYWxseSBzZWxlY3RlZCBpZiB0aGUgYHZhbHVlYCBtYXRjaGVzIHRoZSB2YWx1ZSBvZiB0aGUgbW9kZWwgdmFyaWFibGUgcmVmZXJlbmNlZCwgb3IgaWYgdGhlIG1vZGVsIHZhcmlhYmxlIGlzIGB0cnVlYC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPCEtLSByYWRpbyBidXR0b24sIHNlbGVjdGVkIGlmIHNhbXBsZUludCBpcyA4IC0tPlxuICogICAgICA8aW5wdXQgdHlwZT1cInJhZGlvXCIgZGF0YS1mLWJpbmQ9XCJzYW1wbGVJbnRcIiB2YWx1ZT1cIjhcIiAvPlxuICpcbiAqICAgICAgPCEtLSBjaGVja2JveCwgY2hlY2tlZCBpZiBzYW1wbGVCb29sIGlzIHRydWUgLS0+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBkYXRhLWYtYmluZD1cInNhbXBsZUJvb2xcIiAvPlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnOmNoZWNrYm94LDpyYWRpbycsXG5cbiAgICB0ZXN0OiAnYmluZCcsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2V0dGFibGVWYWx1ZSA9IHRoaXMuYXR0cigndmFsdWUnKTsgLy9pbml0aWFsIHZhbHVlXG4gICAgICAgIC8qanNsaW50IGVxZXE6IHRydWUqL1xuICAgICAgICB2YXIgaXNDaGVja2VkID0gKHNldHRhYmxlVmFsdWUgIT09IHVuZGVmaW5lZCkgPyAoc2V0dGFibGVWYWx1ZSA9PSB2YWx1ZSkgOiAhIXZhbHVlO1xuICAgICAgICB0aGlzLnByb3AoJ2NoZWNrZWQnLCBpc0NoZWNrZWQpO1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIERlZmF1bHQgQmktZGlyZWN0aW9uYWwgQmluZGluZzogZGF0YS1mLWJpbmRcbiAqXG4gKiBUaGUgbW9zdCBjb21tb25seSB1c2VkIGF0dHJpYnV0ZSBwcm92aWRlZCBieSBGbG93LmpzIGlzIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZS5cbiAqXG4gKiAjIyMjZGF0YS1mLWJpbmQgd2l0aCBhIHNpbmdsZSB2YWx1ZVxuICpcbiAqIFlvdSBjYW4gYmluZCB2YXJpYWJsZXMgZnJvbSB0aGUgbW9kZWwgaW4geW91ciBpbnRlcmZhY2UgYnkgc2V0dGluZyB0aGUgYGRhdGEtZi1iaW5kYCBhdHRyaWJ1dGUuIFRoaXMgYXR0cmlidXRlIGJpbmRpbmcgaXMgYmktZGlyZWN0aW9uYWwsIG1lYW5pbmcgdGhhdCBhcyB0aGUgbW9kZWwgY2hhbmdlcywgdGhlIGludGVyZmFjZSBpcyBhdXRvbWF0aWNhbGx5IHVwZGF0ZWQ7IGFuZCB3aGVuIHVzZXJzIGNoYW5nZSB2YWx1ZXMgaW4gdGhlIGludGVyZmFjZSwgdGhlIG1vZGVsIGlzIGF1dG9tYXRpY2FsbHkgdXBkYXRlZC4gU3BlY2lmaWNhbGx5OlxuICpcbiAqICogVGhlIGJpbmRpbmcgZnJvbSB0aGUgbW9kZWwgdG8gdGhlIGludGVyZmFjZSBlbnN1cmVzIHRoYXQgdGhlIGN1cnJlbnQgdmFsdWUgb2YgdGhlIHZhcmlhYmxlIGlzIGRpc3BsYXllZCBpbiB0aGUgSFRNTCBlbGVtZW50LiBUaGlzIGluY2x1ZGVzIGF1dG9tYXRpYyB1cGRhdGVzIHRvIHRoZSBkaXNwbGF5ZWQgdmFsdWUgaWYgc29tZXRoaW5nIGVsc2UgY2hhbmdlcyBpbiB0aGUgbW9kZWwuXG4gKlxuICogKiBUaGUgYmluZGluZyBmcm9tIHRoZSBpbnRlcmZhY2UgdG8gdGhlIG1vZGVsIGVuc3VyZXMgdGhhdCBpZiB0aGUgSFRNTCBlbGVtZW50IGlzIGVkaXRhYmxlLCBjaGFuZ2VzIGFyZSBzZW50IHRvIHRoZSBtb2RlbC5cbiAqXG4gKiBPbmNlIHlvdSBzZXQgYGRhdGEtZi1iaW5kYCwgRmxvdy5qcyBmaWd1cmVzIG91dCB0aGUgYXBwcm9wcmlhdGUgYWN0aW9uIHRvIHRha2UgYmFzZWQgb24gdGhlIGVsZW1lbnQgdHlwZSBhbmQgdGhlIGRhdGEgcmVzcG9uc2UgZnJvbSB5b3VyIG1vZGVsLlxuICpcbiAqICoqVG8gZGlzcGxheSBhbmQgYXV0b21hdGljYWxseSB1cGRhdGUgYSB2YXJpYWJsZSBpbiB0aGUgaW50ZXJmYWNlOioqXG4gKlxuICogMS4gQWRkIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZSB0byBhbnkgSFRNTCBlbGVtZW50IHRoYXQgbm9ybWFsbHkgdGFrZXMgYSB2YWx1ZS5cbiAqIDIuIFNldCB0aGUgdmFsdWUgb2YgdGhlIGBkYXRhLWYtYmluZGAgYXR0cmlidXRlIHRvIHRoZSBuYW1lIG9mIHRoZSB2YXJpYWJsZS5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPHNwYW4gZGF0YS1mLWJpbmQ9XCJzYWxlc01hbmFnZXIubmFtZVwiIC8+XG4gKlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInNhbXBsZVN0cmluZ1wiIC8+XG4gKlxuICogKipOb3RlczoqKlxuICpcbiAqICogVXNlIHNxdWFyZSBicmFja2V0cywgYFtdYCwgdG8gcmVmZXJlbmNlIGFycmF5ZWQgdmFyaWFibGVzOiBgc2FsZXNbV2VzdF1gLlxuICogKiBVc2UgYW5nbGUgYnJhY2tldHMsIGA8PmAsIHRvIHJlZmVyZW5jZSBvdGhlciB2YXJpYWJsZXMgaW4geW91ciBhcnJheSBpbmRleDogYHNhbGVzWzxjdXJyZW50UmVnaW9uPl1gLlxuICogKiBSZW1lbWJlciB0aGF0IGlmIHlvdXIgbW9kZWwgaXMgaW4gVmVuc2ltLCB0aGUgdGltZSBzdGVwIGNhbiBiZSB0aGUgZmlyc3QgYXJyYXkgaW5kZXggb3IgdGhlIGxhc3QgYXJyYXkgaW5kZXgsIGRlcGVuZGluZyBvbiB5b3VyIFttb2RlbC5jZmddKC4uLy4uLy4uLy4uLy4uLy4uL21vZGVsX2NvZGUvdmVuc2ltLyNjcmVhdGluZy1jZmcpIGZpbGUuXG4gKiAqIEJ5IGRlZmF1bHQsIGFsbCBIVE1MIGVsZW1lbnRzIHVwZGF0ZSBmb3IgYW55IGNoYW5nZSBmb3IgZWFjaCB2YXJpYWJsZS4gSG93ZXZlciwgeW91IGNhbiBwcmV2ZW50IHRoZSB1c2VyIGludGVyZmFjZSBmcm9tIHVwZGF0aW5nICZtZGFzaDsgZWl0aGVyIGZvciBhbGwgdmFyaWFibGVzIG9yIGZvciBwYXJ0aWN1bGFyIHZhcmlhYmxlcyAmbWRhc2g7IGJ5IHNldHRpbmcgdGhlIGBzaWxlbnRgIHByb3BlcnR5IHdoZW4geW91IGluaXRpYWxpemUgRmxvdy5qcy4gU2VlIG1vcmUgb24gW2FkZGl0aW9uYWwgb3B0aW9ucyBmb3IgdGhlIEZsb3cuaW5pdGlhbGl6ZSgpIG1ldGhvZF0oLi4vLi4vLi4vLi4vLi4vI2N1c3RvbS1pbml0aWFsaXplKS5cbiAqXG4gKiAjIyMjZGF0YS1mLWJpbmQgd2l0aCBtdWx0aXBsZSB2YWx1ZXMgYW5kIHRlbXBsYXRlc1xuICpcbiAqIElmIHlvdSBoYXZlIG11bHRpcGxlIHZhcmlhYmxlcywgeW91IGNhbiB1c2UgdGhlIHNob3J0Y3V0IG9mIGxpc3RpbmcgbXVsdGlwbGUgdmFyaWFibGVzIGluIGFuIGVuY2xvc2luZyBIVE1MIGVsZW1lbnQgYW5kIHRoZW4gcmVmZXJlbmNpbmcgZWFjaCB2YXJpYWJsZSB1c2luZyB0ZW1wbGF0ZXMuIChUZW1wbGF0ZXMgYXJlIGF2YWlsYWJsZSBhcyBwYXJ0IG9mIEZsb3cuanMncyBsb2Rhc2ggZGVwZW5kZW5jeS4gU2VlIG1vcmUgYmFja2dyb3VuZCBvbiBbd29ya2luZyB3aXRoIHRlbXBsYXRlc10oLi4vLi4vLi4vLi4vLi4vI3RlbXBsYXRlcykuKVxuICpcbiAqICoqVG8gZGlzcGxheSBhbmQgYXV0b21hdGljYWxseSB1cGRhdGUgbXVsdGlwbGUgdmFyaWFibGVzIGluIHRoZSBpbnRlcmZhY2U6KipcbiAqXG4gKiAxLiBBZGQgdGhlIGBkYXRhLWYtYmluZGAgYXR0cmlidXRlIHRvIGFueSBIVE1MIGVsZW1lbnQgZnJvbSB3aGljaCB5b3Ugd2FudCB0byByZWZlcmVuY2UgbW9kZWwgdmFyaWFibGVzLCBzdWNoIGFzIGEgYGRpdmAgb3IgYHRhYmxlYC5cbiAqIDIuIFNldCB0aGUgdmFsdWUgb2YgdGhlIGBkYXRhLWYtYmluZGAgYXR0cmlidXRlIGluIHlvdXIgdG9wLWxldmVsIEhUTUwgZWxlbWVudCB0byBhIGNvbW1hLXNlcGFyYXRlZCBsaXN0IG9mIHRoZSB2YXJpYWJsZXMuIChUaGUgdmFyaWFibGVzIG1heSBvciBtYXkgbm90IGJlIGNhc2Utc2Vuc2l0aXZlLCBkZXBlbmRpbmcgb24geW91ciBtb2RlbGluZyBsYW5ndWFnZS4pXG4gKlxuICogMy4gSW5zaWRlIHRoZSBIVE1MIGVsZW1lbnQsIHVzZSB0ZW1wbGF0ZXMgKGA8JT0gJT5gKSB0byByZWZlcmVuY2UgdGhlIHNwZWNpZmljIHZhcmlhYmxlIG5hbWVzLiBUaGVzZSB2YXJpYWJsZSBuYW1lcyBhcmUgY2FzZS1zZW5zaXRpdmU6IHRoZXkgc2hvdWxkIG1hdGNoIHRoZSBjYXNlIHlvdSB1c2VkIGluIHRoZSBgZGF0YS1mLWJpbmRgIGluIHN0ZXAgMi5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPCEtLSBtYWtlIHRoZXNlIHRocmVlIG1vZGVsIHZhcmlhYmxlcyBhdmFpbGFibGUgdGhyb3VnaG91dCBkaXYgLS0+XG4gKlxuICogICAgICA8ZGl2IGRhdGEtZi1iaW5kPVwiQ3VycmVudFllYXIsIFJldmVudWUsIFByb2ZpdFwiPlxuICogICAgICAgICAgSW4gPCU9IEN1cnJlbnRZZWFyICU+LFxuICogICAgICAgICAgb3VyIGNvbXBhbnkgZWFybmVkIDwlPSBSZXZlbnVlICU+LFxuICogICAgICAgICAgcmVzdWx0aW5nIGluIDwlPSBQcm9maXQgJT4gcHJvZml0LlxuICogICAgICA8L2Rpdj5cbiAqXG4gKiBUaGlzIGV4YW1wbGUgaXMgc2hvcnRoYW5kIGZvciByZXBlYXRlZGx5IHVzaW5nIGRhdGEtZi1iaW5kLiBGb3IgaW5zdGFuY2UsIHRoaXMgY29kZSBhbHNvIGdlbmVyYXRlcyB0aGUgc2FtZSBvdXRwdXQ6XG4gKlxuICogICAgICA8ZGl2PlxuICogICAgICAgICAgSW4gPHNwYW4gZGF0YS1mLWJpbmQ9XCJDdXJyZW50WWVhclwiPjwvc3Bhbj4sXG4gKiAgICAgICAgICBvdXIgY29tcGFueSBlYXJuZWQgPHNwYW4gZGF0YS1mLWJpbmQ9XCJSZXZlbnVlXCI+PC9zcGFuPixcbiAqICAgICAgICAgIHJlc3VsdGluZyBpbiA8c3BhbiBkYXRhLWYtYmluZD1cIlByb2ZpdFwiPiBwcm9maXQ8L3NwYW4+LlxuICogICAgICA8L2Rpdj5cbiAqXG4gKiAqKk5vdGVzOioqXG4gKlxuICogKiBBZGRpbmcgYGRhdGEtZi1iaW5kYCB0byB0aGUgZW5jbG9zaW5nIEhUTUwgZWxlbWVudCByYXRoZXIgdGhhbiByZXBlYXRlZGx5IHVzaW5nIGl0IHdpdGhpbiB0aGUgZWxlbWVudCBpcyBhIGNvZGUgc3R5bGUgcHJlZmVyZW5jZS4gSW4gbWFueSBjYXNlcywgYWRkaW5nIGBkYXRhLWYtYmluZGAgYXQgdGhlIHRvcCBsZXZlbCwgYXMgaW4gdGhlIGZpcnN0IGV4YW1wbGUsIGNhbiBtYWtlIHlvdXIgY29kZSBlYXNpZXIgdG8gcmVhZCBhbmQgbWFpbnRhaW4uXG4gKiAqIEhvd2V2ZXIsIHlvdSBtaWdodCBjaG9vc2UgdG8gcmVwZWF0ZWRseSB1c2UgYGRhdGEtZi1iaW5kYCBpbiBzb21lIGNhc2VzLCBmb3IgZXhhbXBsZSBpZiB5b3Ugd2FudCBkaWZmZXJlbnQgW2Zvcm1hdHRpbmddKC4uLy4uLy4uLy4uLy4uL2NvbnZlcnRlci1vdmVydmlldy8pIGZvciBkaWZmZXJlbnQgdmFyaWFibGVzOlxuICpcbiAqICAgICAgPGRpdj5cbiAqICAgICAgICAgIEluIDxzcGFuIGRhdGEtZi1iaW5kPVwiQ3VycmVudFllYXIgfCAjXCI+PC9zcGFuPixcbiAqICAgICAgICAgIG91ciBjb21wYW55IGVhcm5lZCA8c3BhbiBkYXRhLWYtYmluZD1cIlJldmVudWUgfCAkIywjIyNcIj48L3NwYW4+XG4gKiAgICAgIDwvZGl2PlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAnYmluZCcsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgdGVtcGxhdGVkO1xuICAgICAgICB2YXIgdmFsdWVUb1RlbXBsYXRlID0gJC5leHRlbmQoe30sIHZhbHVlKTtcbiAgICAgICAgaWYgKCEkLmlzUGxhaW5PYmplY3QodmFsdWUpKSB7XG4gICAgICAgICAgICB2YXIgdmFyaWFibGVOYW1lID0gdGhpcy5kYXRhKCdmLWJpbmQnKTsvL0hhY2sgYmVjYXVzZSBpIGRvbid0IGhhdmUgYWNjZXNzIHRvIHZhcmlhYmxlIG5hbWUgaGVyZSBvdGhlcndpc2VcbiAgICAgICAgICAgIHZhbHVlVG9UZW1wbGF0ZSA9IHsgdmFsdWU6IHZhbHVlIH07XG4gICAgICAgICAgICB2YWx1ZVRvVGVtcGxhdGVbdmFyaWFibGVOYW1lXSA9IHZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWVUb1RlbXBsYXRlLnZhbHVlID0gdmFsdWU7IC8vSWYgdGhlIGtleSBoYXMgJ3dlaXJkJyBjaGFyYWN0ZXJzIGxpa2UgJzw+JyBoYXJkIHRvIGdldCBhdCB3aXRoIGEgdGVtcGxhdGUgb3RoZXJ3aXNlXG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJpbmRUZW1wbGF0ZSA9IHRoaXMuZGF0YSgnYmluZC10ZW1wbGF0ZScpO1xuICAgICAgICBpZiAoYmluZFRlbXBsYXRlKSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZWQgPSBfLnRlbXBsYXRlKGJpbmRUZW1wbGF0ZSwgdmFsdWVUb1RlbXBsYXRlKTtcbiAgICAgICAgICAgIHRoaXMuaHRtbCh0ZW1wbGF0ZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG9sZEhUTUwgPSB0aGlzLmh0bWwoKTtcbiAgICAgICAgICAgIHZhciBjbGVhbmVkSFRNTCA9IG9sZEhUTUwucmVwbGFjZSgvJmx0Oy9nLCAnPCcpLnJlcGxhY2UoLyZndDsvZywgJz4nKTtcbiAgICAgICAgICAgIHRlbXBsYXRlZCA9IF8udGVtcGxhdGUoY2xlYW5lZEhUTUwsIHZhbHVlVG9UZW1wbGF0ZSk7XG4gICAgICAgICAgICBpZiAoY2xlYW5lZEhUTUwgPT09IHRlbXBsYXRlZCkgeyAvL3RlbXBsYXRpbmcgZGlkIG5vdGhpbmdcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YWx1ZSA9ICgkLmlzUGxhaW5PYmplY3QodmFsdWUpKSA/IEpTT04uc3RyaW5naWZ5KHZhbHVlKSA6IHZhbHVlICsgJyc7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sKHZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhKCdiaW5kLXRlbXBsYXRlJywgY2xlYW5lZEhUTUwpO1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbCh0ZW1wbGF0ZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgSW5wdXRzIGFuZCBTZWxlY3RzXG4gKlxuICogSW4gdGhlIFtkZWZhdWx0IGNhc2VdKC4uL2RlZmF1bHQtYmluZC1hdHRyLyksIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZSBjcmVhdGVzIGEgYmktZGlyZWN0aW9uYWwgYmluZGluZyBiZXR3ZWVuIHRoZSBET00gZWxlbWVudCBhbmQgdGhlIG1vZGVsIHZhcmlhYmxlLiBUaGlzIGJpbmRpbmcgaXMgKipiaS1kaXJlY3Rpb25hbCoqLCBtZWFuaW5nIHRoYXQgYXMgdGhlIG1vZGVsIGNoYW5nZXMsIHRoZSBpbnRlcmZhY2UgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkOyBhbmQgd2hlbiBlbmQgdXNlcnMgY2hhbmdlIHZhbHVlcyBpbiB0aGUgaW50ZXJmYWNlLCB0aGUgbW9kZWwgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkLlxuICpcbiAqIEZsb3cuanMgcHJvdmlkZXMgc3BlY2lhbCBoYW5kbGluZyBmb3IgRE9NIGVsZW1lbnRzIGBpbnB1dGAgYW5kIGBzZWxlY3RgLlxuICpcbiAqIEluIHBhcnRpY3VsYXIsIGlmIHlvdSBhZGQgdGhlIGBkYXRhLWYtYmluZGAgYXR0cmlidXRlIHRvIGEgYHNlbGVjdGAgb3IgYGlucHV0YCBlbGVtZW50LCB0aGUgb3B0aW9uIG1hdGNoaW5nIHRoZSB2YWx1ZSBvZiB0aGUgbW9kZWwgdmFyaWFibGUgaXMgYXV0b21hdGljYWxseSBzZWxlY3RlZC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqIFx0XHQ8IS0tIG9wdGlvbiBzZWxlY3RlZCBpZiBzYW1wbGVfaW50IGlzIDgsIDEwLCBvciAxMiAtLT5cbiAqIFx0XHQ8c2VsZWN0IGRhdGEtZi1iaW5kPVwic2FtcGxlX2ludFwiPlxuICogXHRcdFx0PG9wdGlvbiB2YWx1ZT1cIjhcIj4gOCA8L29wdGlvbj5cbiAqIFx0XHRcdDxvcHRpb24gdmFsdWU9XCIxMFwiPiAxMCA8L29wdGlvbj5cbiAqIFx0XHRcdDxvcHRpb24gdmFsdWU9XCIxMlwiPiAxMiA8L29wdGlvbj5cbiAqIFx0XHQ8L3NlbGVjdD5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICB0YXJnZXQ6ICdpbnB1dCwgc2VsZWN0JyxcblxuICAgIHRlc3Q6ICdiaW5kJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudmFsKHZhbHVlKTtcbiAgICB9XG59O1xuIiwiLyoqXG4gKiAjIyBDbGFzcyBBdHRyaWJ1dGU6IGRhdGEtZi1jbGFzc1xuICpcbiAqIFlvdSBjYW4gYmluZCBtb2RlbCB2YXJpYWJsZXMgdG8gbmFtZXMgb2YgQ1NTIGNsYXNzZXMsIHNvIHRoYXQgeW91IGNhbiBlYXNpbHkgY2hhbmdlIHRoZSBzdHlsaW5nIG9mIEhUTUwgZWxlbWVudHMgYmFzZWQgb24gdGhlIHZhbHVlcyBvZiBtb2RlbCB2YXJpYWJsZXMuXG4gKlxuICogKipUbyBiaW5kIG1vZGVsIHZhcmlhYmxlcyB0byBDU1MgY2xhc3NlczoqKlxuICpcbiAqIDEuIEFkZCB0aGUgYGRhdGEtZi1jbGFzc2AgYXR0cmlidXRlIHRvIGFuIEhUTUwgZWxlbWVudC5cbiAqIDIuIFNldCB0aGUgdmFsdWUgdG8gdGhlIG5hbWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlLlxuICogMy4gT3B0aW9uYWxseSwgYWRkIGFuIGFkZGl0aW9uYWwgYGNsYXNzYCBhdHRyaWJ1dGUgdG8gdGhlIEhUTUwgZWxlbWVudC5cbiAqICAgICAgKiBJZiB5b3Ugb25seSB1c2UgdGhlIGBkYXRhLWYtY2xhc3NgIGF0dHJpYnV0ZSwgdGhlIHZhbHVlIG9mIGBkYXRhLWYtY2xhc3NgIGlzIHRoZSBjbGFzcyBuYW1lLlxuICogICAgICAqIElmIHlvdSAqYWxzbyogYWRkIGEgYGNsYXNzYCBhdHRyaWJ1dGUsIHRoZSB2YWx1ZSBvZiBgZGF0YS1mLWNsYXNzYCBpcyAqYXBwZW5kZWQqIHRvIHRoZSBjbGFzcyBuYW1lLlxuICogNC4gQWRkIGNsYXNzZXMgdG8geW91ciBDU1MgY29kZSB3aG9zZSBuYW1lcyBpbmNsdWRlIHBvc3NpYmxlIHZhbHVlcyBvZiB0aGF0IG1vZGVsIHZhcmlhYmxlLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8c3R5bGUgdHlwZT1cInRleHQvY3NzXCI+XG4gKiAgICAgICAgICAuTm9ydGggeyBjb2xvcjogZ3JleSB9XG4gKiAgICAgICAgICAuU291dGggeyBjb2xvcjogcHVycGxlIH1cbiAqICAgICAgICAgIC5FYXN0IHsgY29sb3I6IGJsdWUgfVxuICogICAgICAgICAgLldlc3QgeyBjb2xvcjogb3JhbmdlIH1cbiAqICAgICAgICAgIC5zYWxlcy5nb29kIHsgY29sb3I6IGdyZWVuIH1cbiAqICAgICAgICAgIC5zYWxlcy5iYWQgeyBjb2xvcjogcmVkIH1cbiAqICAgICAgICAgIC5zYWxlcy52YWx1ZS0xMDAgeyBjb2xvcjogeWVsbG93IH1cbiAqICAgICAgIDwvc3R5bGU+XG4gKlxuICogICAgICAgPGRpdiBkYXRhLWYtY2xhc3M9XCJzYWxlc01nci5yZWdpb25cIj5cbiAqICAgICAgICAgICBDb250ZW50IGNvbG9yZWQgYnkgcmVnaW9uXG4gKiAgICAgICA8L2Rpdj5cbiAqXG4gKiAgICAgICA8ZGl2IGRhdGEtZi1jbGFzcz1cInNhbGVzTWdyLnBlcmZvcm1hbmNlXCIgY2xhc3M9XCJzYWxlc1wiPlxuICogICAgICAgICAgIENvbnRlbnQgZ3JlZW4gaWYgc2FsZXNNZ3IucGVyZm9ybWFuY2UgaXMgZ29vZCwgcmVkIGlmIGJhZFxuICogICAgICAgPC9kaXY+XG4gKlxuICogICAgICAgPGRpdiBkYXRhLWYtY2xhc3M9XCJzYWxlc01nci5udW1SZWdpb25zXCIgY2xhc3M9XCJzYWxlc1wiPlxuICogICAgICAgICAgIENvbnRlbnQgeWVsbG93IGlmIHNhbGVzTWdyLm51bVJlZ2lvbnMgaXMgMTAwXG4gKiAgICAgICA8L2Rpdj5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRlc3Q6ICdjbGFzcycsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFkZGVkQ2xhc3NlcyA9IHRoaXMuZGF0YSgnYWRkZWQtY2xhc3NlcycpO1xuICAgICAgICBpZiAoIWFkZGVkQ2xhc3Nlcykge1xuICAgICAgICAgICAgYWRkZWRDbGFzc2VzID0ge307XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFkZGVkQ2xhc3Nlc1twcm9wXSkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVDbGFzcyhhZGRlZENsYXNzZXNbcHJvcF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8uaXNOdW1iZXIodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9ICd2YWx1ZS0nICsgdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgYWRkZWRDbGFzc2VzW3Byb3BdID0gdmFsdWU7XG4gICAgICAgIC8vRml4bWU6IHByb3AgaXMgYWx3YXlzIFwiY2xhc3NcIlxuICAgICAgICB0aGlzLmFkZENsYXNzKHZhbHVlKTtcbiAgICAgICAgdGhpcy5kYXRhKCdhZGRlZC1jbGFzc2VzJywgYWRkZWRDbGFzc2VzKTtcbiAgICB9XG59O1xuIiwiLyoqXG4gKiAjIyBEZWZhdWx0IEF0dHJpYnV0ZSBIYW5kbGluZzogUmVhZC1vbmx5IEJpbmRpbmdcbiAqXG4gKiBGbG93LmpzIHVzZXMgdGhlIEhUTUw1IGNvbnZlbnRpb24gb2YgcHJlcGVuZGluZyBkYXRhLSB0byBhbnkgY3VzdG9tIEhUTUwgYXR0cmlidXRlLiBGbG93LmpzIGFsc28gYWRkcyBgZmAgZm9yIGVhc3kgaWRlbnRpZmljYXRpb24gb2YgRmxvdy5qcy4gRm9yIGV4YW1wbGUsIEZsb3cuanMgcHJvdmlkZXMgc2V2ZXJhbCBjdXN0b20gYXR0cmlidXRlcyBhbmQgYXR0cmlidXRlIGhhbmRsZXJzIC0tIGluY2x1ZGluZyBbZGF0YS1mLWJpbmRdKC4uL2JpbmRzL2RlZmF1bHQtYmluZC1hdHRyKSwgW2RhdGEtZi1mb3JlYWNoXSguLi9mb3JlYWNoL2RlZmF1bHQtZm9yZWFjaC1hdHRyLyksIFtkYXRhLWYtb24taW5pdF0oLi4vZXZlbnRzL2luaXQtZXZlbnQtYXR0ci8pLCBldGMuIFlvdSBjYW4gYWxzbyBbYWRkIHlvdXIgb3duIGF0dHJpYnV0ZSBoYW5kbGVyc10oLi4vYXR0cmlidXRlLW1hbmFnZXIvKS5cbiAqXG4gKiBUaGUgZGVmYXVsdCBiZWhhdmlvciBmb3IgaGFuZGxpbmcgYSBrbm93biBhdHRyaWJ1dGUgaXMgdG8gdXNlIHRoZSB2YWx1ZSBvZiB0aGUgbW9kZWwgdmFyaWFibGUgYXMgdGhlIHZhbHVlIG9mIHRoZSBhdHRyaWJ1dGUuIChUaGVyZSBhcmUgZXhjZXB0aW9ucyBmb3Igc29tZSBbYm9vbGVhbiBhdHRyaWJ1dGVzXSguLi9ib29sZWFuLWF0dHIvKS4pXG4gKlxuICogVGhpcyBtZWFucyB5b3UgY2FuIGJpbmQgdmFyaWFibGVzIGZyb20gdGhlIG1vZGVsIGluIHlvdXIgaW50ZXJmYWNlIGJ5IGFkZGluZyB0aGUgYGRhdGEtZi1gIHByZWZpeCB0byBhbnkgc3RhbmRhcmQgRE9NIGF0dHJpYnV0ZS4gVGhpcyBhdHRyaWJ1dGUgYmluZGluZyBpcyAqKnJlYWQtb25seSoqLCBzbyBhcyB0aGUgbW9kZWwgY2hhbmdlcywgdGhlIGludGVyZmFjZSBpcyBhdXRvbWF0aWNhbGx5IHVwZGF0ZWQ7IGJ1dCB3aGVuIHVzZXJzIGNoYW5nZSB2YWx1ZXMgaW4gdGhlIGludGVyZmFjZSwgbm8gYWN0aW9uIG9jY3Vycy5cbiAqXG4gKiAqKlRvIGRpc3BsYXkgYSBET00gZWxlbWVudCBiYXNlZCBvbiBhIHZhcmlhYmxlIGZyb20gdGhlIG1vZGVsOioqXG4gKlxuICogMS4gQWRkIHRoZSBwcmVmaXggYGRhdGEtZi1gIHRvIGFueSBhdHRyaWJ1dGUgaW4gYW55IEhUTUwgZWxlbWVudCB0aGF0IG5vcm1hbGx5IHRha2VzIGEgdmFsdWUuXG4gKiAyLiBTZXQgdGhlIHZhbHVlIG9mIHRoZSBhdHRyaWJ1dGUgdG8gdGhlIG5hbWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogXHRcdDwhLS0gaW5wdXQgZWxlbWVudCBkaXNwbGF5cyB2YWx1ZSBvZiBzYW1wbGVfaW50LCBob3dldmVyLFxuICogXHRcdFx0bm8gY2FsbCB0byB0aGUgbW9kZWwgaXMgbWFkZSBpZiB1c2VyIGNoYW5nZXMgc2FtcGxlX2ludFxuICpcbiAqXHRcdFx0aWYgc2FtcGxlX2ludCBpcyA4LCB0aGlzIGlzIHRoZSBlcXVpdmFsZW50IG9mIDxpbnB1dCB2YWx1ZT1cIjhcIj48L2lucHV0PiAtLT5cbiAqXG4gKlx0XHQ8aW5wdXQgZGF0YS1mLXZhbHVlPVwic2FtcGxlX2ludFwiPjwvaW5wdXQ+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0ZXN0OiAnKicsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCB2YWx1ZSk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyNDYWxsIE9wZXJhdGlvbiBpbiBSZXNwb25zZSB0byBVc2VyIEFjdGlvblxuICpcbiAqIE1hbnkgbW9kZWxzIGNhbGwgcGFydGljdWxhciBvcGVyYXRpb25zIGluIHJlc3BvbnNlIHRvIGVuZCB1c2VyIGFjdGlvbnMsIHN1Y2ggYXMgY2xpY2tpbmcgYSBidXR0b24gb3Igc3VibWl0dGluZyBhIGZvcm0uXG4gKlxuICogIyMjI2RhdGEtZi1vbi1ldmVudFxuICpcbiAqIEZvciBhbnkgSFRNTCBhdHRyaWJ1dGUgdXNpbmcgYG9uYCAtLSB0eXBpY2FsbHkgb24gY2xpY2sgb3Igb24gc3VibWl0IC0tIHlvdSBjYW4gYWRkIHRoZSBhdHRyaWJ1dGUgYGRhdGEtZi1vbi1YWFhgLCBhbmQgc2V0IHRoZSB2YWx1ZSB0byB0aGUgbmFtZSBvZiB0aGUgb3BlcmF0aW9uLiBUbyBjYWxsIG11bHRpcGxlIG9wZXJhdGlvbnMsIHVzZSB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIgdG8gY2hhaW4gb3BlcmF0aW9ucy4gT3BlcmF0aW9ucyBhcmUgY2FsbGVkIHNlcmlhbGx5LCBpbiB0aGUgb3JkZXIgbGlzdGVkLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8YnV0dG9uIGRhdGEtZi1vbi1jbGljaz1cInJlc2V0XCI+UmVzZXQ8L2J1dHRvbj5cbiAqXG4gKiAgICAgIDxidXR0b24gZGF0YS1mLW9uLWNsaWNrPVwic3RlcCgxKVwiPkFkdmFuY2UgT25lIFN0ZXA8L2J1dHRvbj5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogZnVuY3Rpb24gKGF0dHIsICRub2RlKSB7XG4gICAgICAgIHJldHVybiAoYXR0ci5pbmRleE9mKCdvbi0nKSA9PT0gMCk7XG4gICAgfSxcblxuICAgIHN0b3BMaXN0ZW5pbmc6IGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICAgIGF0dHIgPSBhdHRyLnJlcGxhY2UoJ29uLScsICcnKTtcbiAgICAgICAgdGhpcy5vZmYoYXR0cik7XG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChhdHRyLCB2YWx1ZSkge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi0nLCAnJyk7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIHRoaXMub2ZmKGF0dHIpLm9uKGF0dHIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBsaXN0T2ZPcGVyYXRpb25zID0gXy5pbnZva2UodmFsdWUuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgIGxpc3RPZk9wZXJhdGlvbnMgPSBsaXN0T2ZPcGVyYXRpb25zLm1hcChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm5OYW1lID0gdmFsdWUuc3BsaXQoJygnKVswXTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gdmFsdWUuc3Vic3RyaW5nKHZhbHVlLmluZGV4T2YoJygnKSArIDEsIHZhbHVlLmluZGV4T2YoJyknKSk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSAoJC50cmltKHBhcmFtcykgIT09ICcnKSA/IHBhcmFtcy5zcGxpdCgnLCcpIDogW107XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogZm5OYW1lLCBwYXJhbXM6IGFyZ3MgfTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtZS50cmlnZ2VyKCdmLnVpLm9wZXJhdGUnLCB7IG9wZXJhdGlvbnM6IGxpc3RPZk9wZXJhdGlvbnMsIHNlcmlhbDogdHJ1ZSB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy9Eb24ndCBib3RoZXIgYmluZGluZyBvbiB0aGlzIGF0dHIuIE5PVEU6IERvIHJlYWRvbmx5LCB0cnVlIGluc3RlYWQ/O1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjQ2FsbCBPcGVyYXRpb24gd2hlbiBFbGVtZW50IEFkZGVkIHRvIERPTVxuICpcbiAqIE1hbnkgbW9kZWxzIGNhbGwgYW4gaW5pdGlhbGl6YXRpb24gb3BlcmF0aW9uIHdoZW4gdGhlIFtydW5dKC4uLy4uLy4uLy4uLy4uLy4uL2dsb3NzYXJ5LyNydW4pIGlzIGZpcnN0IGNyZWF0ZWQuIFRoaXMgaXMgcGFydGljdWxhcmx5IGNvbW1vbiB3aXRoIFtWZW5zaW1dKC4uLy4uLy4uLy4uLy4uLy4uL21vZGVsX2NvZGUvdmVuc2ltLykgbW9kZWxzLCB3aGljaCBuZWVkIHRvIGluaXRpYWxpemUgdmFyaWFibGVzICgnc3RhcnRHYW1lJykgYmVmb3JlIHN0ZXBwaW5nLiBZb3UgY2FuIHVzZSB0aGUgYGRhdGEtZi1vbi1pbml0YCBhdHRyaWJ1dGUgdG8gY2FsbCBhbiBvcGVyYXRpb24gZnJvbSB0aGUgbW9kZWwgd2hlbiBhIHBhcnRpY3VsYXIgZWxlbWVudCBpcyBhZGRlZCB0byB0aGUgRE9NLlxuICpcbiAqICMjIyNkYXRhLWYtb24taW5pdFxuICpcbiAqIEFkZCB0aGUgYXR0cmlidXRlIGBkYXRhLWYtb24taW5pdGAsIGFuZCBzZXQgdGhlIHZhbHVlIHRvIHRoZSBuYW1lIG9mIHRoZSBvcGVyYXRpb24uIFRvIGNhbGwgbXVsdGlwbGUgb3BlcmF0aW9ucywgdXNlIHRoZSBgfGAgKHBpcGUpIGNoYXJhY3RlciB0byBjaGFpbiBvcGVyYXRpb25zLiBPcGVyYXRpb25zIGFyZSBjYWxsZWQgc2VyaWFsbHksIGluIHRoZSBvcmRlciBsaXN0ZWQuIFR5cGljYWxseSB5b3UgYWRkIHRoaXMgYXR0cmlidXRlIHRvIHRoZSBgPGJvZHk+YCBlbGVtZW50LlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8Ym9keSBkYXRhLWYtb24taW5pdD1cInN0YXJ0R2FtZVwiPlxuICpcbiAqICAgICAgPGJvZHkgZGF0YS1mLW9uLWluaXQ9XCJzdGFydEdhbWUgfCBzdGVwKDMpXCI+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IGZ1bmN0aW9uIChhdHRyLCAkbm9kZSkge1xuICAgICAgICByZXR1cm4gKGF0dHIuaW5kZXhPZignb24taW5pdCcpID09PSAwKTtcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24gKGF0dHIsIHZhbHVlKSB7XG4gICAgICAgIGF0dHIgPSBhdHRyLnJlcGxhY2UoJ29uLWluaXQnLCAnJyk7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGxpc3RPZk9wZXJhdGlvbnMgPSBfLmludm9rZSh2YWx1ZS5zcGxpdCgnfCcpLCAndHJpbScpO1xuICAgICAgICAgICAgbGlzdE9mT3BlcmF0aW9ucyA9IGxpc3RPZk9wZXJhdGlvbnMubWFwKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHZhciBmbk5hbWUgPSB2YWx1ZS5zcGxpdCgnKCcpWzBdO1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB2YWx1ZS5zdWJzdHJpbmcodmFsdWUuaW5kZXhPZignKCcpICsgMSwgdmFsdWUuaW5kZXhPZignKScpKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9ICgkLnRyaW0ocGFyYW1zKSAhPT0gJycpID8gcGFyYW1zLnNwbGl0KCcsJykgOiBbXTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBmbk5hbWUsIHBhcmFtczogYXJncyB9O1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIG1lLnRyaWdnZXIoJ2YudWkub3BlcmF0ZScsIHsgb3BlcmF0aW9uczogbGlzdE9mT3BlcmF0aW9ucywgc2VyaWFsOiB0cnVlIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvL0Rvbid0IGJvdGhlciBiaW5kaW5nIG9uIHRoaXMgYXR0ci4gTk9URTogRG8gcmVhZG9ubHksIHRydWUgaW5zdGVhZD87XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgRGlzcGxheSBBcnJheSBhbmQgT2JqZWN0IFZhcmlhYmxlczogZGF0YS1mLWZvcmVhY2hcbiAqXG4gKiBJZiB5b3VyIG1vZGVsIHZhcmlhYmxlIGlzIGFuIGFycmF5LCB5b3UgY2FuIHJlZmVyZW5jZSBzcGVjaWZpYyBlbGVtZW50cyBvZiB0aGUgYXJyYXkgdXNpbmcgYGRhdGEtZi1iaW5kYDogYGRhdGEtZi1iaW5kPVwic2FsZXNbM11cImAgb3IgYGRhdGEtZi1iaW5kPVwic2FsZXNbPGN1cnJlbnRSZWdpb24+XVwiYCwgYXMgZGVzY3JpYmVkIHVuZGVyIFtkYXRhLWYtYmluZF0oLi4vLi4vYmluZHMvZGVmYXVsdC1iaW5kLWF0dHIvKS5cbiAqXG4gKiBIb3dldmVyLCB0aGF0J3Mgbm90IHRoZSBvbmx5IG9wdGlvbi4gSWYgeW91IHdhbnQgdG8gYXV0b21hdGljYWxseSBsb29wIG92ZXIgYWxsIGVsZW1lbnRzIG9mIHRoZSBhcnJheSwgb3IgYWxsIHRoZSBmaWVsZHMgb2YgYW4gb2JqZWN0LCB5b3UgY2FuIHVzZSB0aGUgYGRhdGEtZi1mb3JlYWNoYCBhdHRyaWJ1dGUgdG8gbmFtZSB0aGUgdmFyaWFibGUsIHRoZW4gdXNlIHRlbXBsYXRlcyB0byBhY2Nlc3MgaXRzIGluZGV4IGFuZCB2YWx1ZSBmb3IgZGlzcGxheS4gKFRlbXBsYXRlcyBhcmUgYXZhaWxhYmxlIGFzIHBhcnQgb2YgRmxvdy5qcydzIGxvZGFzaCBkZXBlbmRlbmN5LiBTZWUgbW9yZSBiYWNrZ3JvdW5kIG9uIFt3b3JraW5nIHdpdGggdGVtcGxhdGVzXSguLi8uLi8uLi8uLi8uLi8jdGVtcGxhdGVzKS4pXG4gKlxuICogKipUbyBkaXNwbGF5IGEgRE9NIGVsZW1lbnQgYmFzZWQgb24gYW4gYXJyYXkgdmFyaWFibGUgZnJvbSB0aGUgbW9kZWw6KipcbiAqXG4gKiAxLiBBZGQgdGhlIGBkYXRhLWYtZm9yZWFjaGAgYXR0cmlidXRlIHRvIGFueSBIVE1MIGVsZW1lbnQgdGhhdCBoYXMgcmVwZWF0ZWQgc3ViLWVsZW1lbnRzLiBUaGUgdHdvIG1vc3QgY29tbW9uIGV4YW1wbGVzIGFyZSBsaXN0cyBhbmQgdGFibGVzLlxuICogMi4gU2V0IHRoZSB2YWx1ZSBvZiB0aGUgYGRhdGEtZi1mb3JlYWNoYCBhdHRyaWJ1dGUgaW4geW91ciB0b3AtbGV2ZWwgSFRNTCBlbGVtZW50IHRvIHRoZSBuYW1lIG9mIHRoZSBhcnJheSB2YXJpYWJsZS5cbiAqIDMuIEFkZCB0aGUgSFRNTCBpbiB3aGljaCB0aGUgdmFsdWUgb2YgeW91ciBhcnJheSB2YXJpYWJsZSBzaG91bGQgYXBwZWFyLlxuICogNC4gT3B0aW9uYWxseSwgaW5zaWRlIHRoZSBpbm5lciBIVE1MIGVsZW1lbnQsIHVzZSB0ZW1wbGF0ZXMgKGA8JT0gJT5gKSB0byByZWZlcmVuY2UgdGhlIGBpbmRleGAgKGZvciBhcnJheXMpIG9yIGBrZXlgIChmb3Igb2JqZWN0cykgYW5kIGB2YWx1ZWAgdG8gZGlzcGxheS4gVGhlIGBpbmRleGAsIGBrZXlgLCBhbmQgYHZhbHVlYCBhcmUgc3BlY2lhbCB2YXJpYWJsZXMgdGhhdCBGbG93LmpzIHBvcHVsYXRlcyBmb3IgeW91LlxuICpcbiAqXG4gKiAqKkV4YW1wbGVzOioqXG4gKlxuICogQnkgZGVmYXVsdCAmbWRhc2g7IHRoYXQgaXMsIGlmIHlvdSBkbyBub3QgaW5jbHVkZSB0ZW1wbGF0ZXMgaW4geW91ciBIVE1MICZtZGFzaDsgdGhlIGB2YWx1ZWAgb2YgdGhlIGFycmF5IGVsZW1lbnQgb3Igb2JqZWN0IGZpZWxkIGFwcGVhcnM6XG4gKlxuICogICAgICA8IS0tIHRoZSBtb2RlbCB2YXJpYWJsZSBUaW1lIGlzIGFuIGFycmF5IG9mIHllYXJzXG4gKiAgICAgICAgICBjcmVhdGUgYSBsaXN0IHRoYXQgc2hvd3Mgd2hpY2ggeWVhciAtLT5cbiAqXG4gKiAgICAgIDx1bCBkYXRhLWYtZm9yZWFjaD1cIlRpbWVcIj5cbiAqICAgICAgICAgIDxsaT48L2xpPlxuICogICAgICA8L3VsPlxuICpcbiAqIEluIHRoZSB0aGlyZCBzdGVwIG9mIHRoZSBtb2RlbCwgdGhpcyBleGFtcGxlIGdlbmVyYXRlczpcbiAqXG4gKiAgICAgICogMjAxNVxuICogICAgICAqIDIwMTZcbiAqICAgICAgKiAyMDE3XG4gKlxuICogT3B0aW9uYWxseSwgeW91IGNhbiB1c2UgdGVtcGxhdGVzIChgPCU9ICU+YCkgdG8gcmVmZXJlbmNlIHRoZSBgaW5kZXhgIGFuZCBgdmFsdWVgIG9mIHRoZSBhcnJheSBlbGVtZW50IHRvIGRpc3BsYXkuXG4gKlxuICpcbiAqICAgICAgPCEtLSB0aGUgbW9kZWwgdmFyaWFibGUgVGltZSBpcyBhbiBhcnJheSBvZiB5ZWFyc1xuICogICAgICAgICAgY3JlYXRlIGEgbGlzdCB0aGF0IHNob3dzIHdoaWNoIHllYXIgLS0+XG4gKlxuICogICAgICA8dWwgZGF0YS1mLWZvcmVhY2g9XCJUaW1lXCI+XG4gKiAgICAgICAgICA8bGk+IFllYXIgPCU9IGluZGV4ICU+OiA8JT0gdmFsdWUgJT4gPC9saT5cbiAqICAgICAgPC91bD5cbiAqXG4gKiBJbiB0aGUgdGhpcmQgc3RlcCBvZiB0aGUgbW9kZWwsIHRoaXMgZXhhbXBsZSBnZW5lcmF0ZXM6XG4gKlxuICogICAgICAqIFllYXIgMTogMjAxNVxuICogICAgICAqIFllYXIgMjogMjAxNlxuICogICAgICAqIFllYXIgMzogMjAxN1xuICpcbiAqIEFzIHdpdGggb3RoZXIgYGRhdGEtZi1gIGF0dHJpYnV0ZXMsIHlvdSBjYW4gc3BlY2lmeSBbY29udmVydGVyc10oLi4vLi4vLi4vLi4vLi4vY29udmVydGVyLW92ZXJ2aWV3KSB0byBjb252ZXJ0IGRhdGEgZnJvbSBvbmUgZm9ybSB0byBhbm90aGVyOlxuICpcbiAqICAgICAgPHVsIGRhdGEtZi1mb3JlYWNoPVwiU2FsZXMgfCAkeCx4eHhcIj5cbiAqICAgICAgICAgIDxsaT4gWWVhciA8JT0gaW5kZXggJT46IFNhbGVzIG9mIDwlPSB2YWx1ZSAlPiA8L2xpPlxuICogICAgICA8L3VsPlxuICpcbiAqXG4gKiAqKk5vdGVzOioqXG4gKlxuICogKiBZb3UgY2FuIHVzZSB0aGUgYGRhdGEtZi1mb3JlYWNoYCBhdHRyaWJ1dGUgd2l0aCBib3RoIGFycmF5cyBhbmQgb2JqZWN0cy4gSWYgdGhlIG1vZGVsIHZhcmlhYmxlIGlzIGFuIG9iamVjdCwgcmVmZXJlbmNlIHRoZSBga2V5YCBpbnN0ZWFkIG9mIHRoZSBgaW5kZXhgIGluIHlvdXIgdGVtcGxhdGVzLlxuICogKiBUaGUgYGtleWAsIGBpbmRleGAsIGFuZCBgdmFsdWVgIGFyZSBzcGVjaWFsIHZhcmlhYmxlcyB0aGF0IEZsb3cuanMgcG9wdWxhdGVzIGZvciB5b3UuXG4gKiAqIFRoZSB0ZW1wbGF0ZSBzeW50YXggaXMgdG8gZW5jbG9zZSBlYWNoIGtleXdvcmQgKGBpbmRleGAsIGBrZXlgLCBgdmFyaWFibGVgKSBpbiBgPCU9YCBhbmQgYCU+YC4gVGVtcGxhdGVzIGFyZSBhdmFpbGFibGUgYXMgcGFydCBvZiBGbG93LmpzJ3MgbG9kYXNoIGRlcGVuZGVuY3kuIFNlZSBtb3JlIGJhY2tncm91bmQgb24gW3dvcmtpbmcgd2l0aCB0ZW1wbGF0ZXNdKC4uLy4uLy4uLy4uLy4uLyN0ZW1wbGF0ZXMpLlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG52YXIgcGFyc2VVdGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uL3V0aWxzL3BhcnNlLXV0aWxzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRlc3Q6ICdmb3JlYWNoJyxcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgdmFsdWUgPSAoJC5pc1BsYWluT2JqZWN0KHZhbHVlKSA/IHZhbHVlIDogW10uY29uY2F0KHZhbHVlKSk7XG4gICAgICAgIHZhciBsb29wVGVtcGxhdGUgPSB0aGlzLmRhdGEoJ2ZvcmVhY2gtdGVtcGxhdGUnKTtcbiAgICAgICAgaWYgKCFsb29wVGVtcGxhdGUpIHtcbiAgICAgICAgICAgIGxvb3BUZW1wbGF0ZSA9IHRoaXMuaHRtbCgpO1xuICAgICAgICAgICAgdGhpcy5kYXRhKCdmb3JlYWNoLXRlbXBsYXRlJywgbG9vcFRlbXBsYXRlKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgJG1lID0gdGhpcy5lbXB0eSgpO1xuICAgICAgICBfLmVhY2godmFsdWUsIGZ1bmN0aW9uIChkYXRhdmFsLCBkYXRha2V5KSB7XG4gICAgICAgICAgICBpZiAoIWRhdGF2YWwpIHtcbiAgICAgICAgICAgICAgICBkYXRhdmFsID0gZGF0YXZhbCArICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGNsb29wID0gbG9vcFRlbXBsYXRlLnJlcGxhY2UoLyZsdDsvZywgJzwnKS5yZXBsYWNlKC8mZ3Q7L2csICc+Jyk7XG4gICAgICAgICAgICB2YXIgdGVtcGxhdGVkTG9vcCA9IF8udGVtcGxhdGUoY2xvb3AsIHsgdmFsdWU6IGRhdGF2YWwsIGtleTogZGF0YWtleSwgaW5kZXg6IGRhdGFrZXkgfSk7XG4gICAgICAgICAgICB2YXIgaXNUZW1wbGF0ZWQgPSB0ZW1wbGF0ZWRMb29wICE9PSBjbG9vcDtcbiAgICAgICAgICAgIHZhciBub2RlcyA9ICQodGVtcGxhdGVkTG9vcCk7XG5cbiAgICAgICAgICAgIG5vZGVzLmVhY2goZnVuY3Rpb24gKGksIG5ld05vZGUpIHtcbiAgICAgICAgICAgICAgICBuZXdOb2RlID0gJChuZXdOb2RlKTtcbiAgICAgICAgICAgICAgICBfLmVhY2gobmV3Tm9kZS5kYXRhKCksIGZ1bmN0aW9uICh2YWwsIGtleSkge1xuICAgICAgICAgICAgICAgICAgICBuZXdOb2RlLmRhdGEoa2V5LCBwYXJzZVV0aWxzLnRvSW1wbGljaXRUeXBlKHZhbCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmICghaXNUZW1wbGF0ZWQgJiYgIW5ld05vZGUuaHRtbCgpLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgICAgICBuZXdOb2RlLmh0bWwoZGF0YXZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkbWUuYXBwZW5kKG5vZGVzKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgQmluZGluZyBmb3IgZGF0YS1mLVtib29sZWFuXVxuICpcbiAqIEZsb3cuanMgcHJvdmlkZXMgc3BlY2lhbCBoYW5kbGluZyBmb3IgSFRNTCBhdHRyaWJ1dGVzIHRoYXQgdGFrZSBCb29sZWFuIHZhbHVlcy5cbiAqXG4gKiBJbiBwYXJ0aWN1bGFyLCBmb3IgbW9zdCBIVE1MIGF0dHJpYnV0ZXMgdGhhdCBleHBlY3QgQm9vbGVhbiB2YWx1ZXMsIHRoZSBhdHRyaWJ1dGUgaXMgZGlyZWN0bHkgc2V0IHRvIHRoZSB2YWx1ZSBvZiB0aGUgbW9kZWwgdmFyaWFibGUuIFRoaXMgaXMgdHJ1ZSBmb3IgYGNoZWNrZWRgLCBgc2VsZWN0ZWRgLCBgYXN5bmNgLCBgYXV0b2ZvY3VzYCwgYGF1dG9wbGF5YCwgYGNvbnRyb2xzYCwgYGRlZmVyYCwgYGlzbWFwYCwgYGxvb3BgLCBgbXVsdGlwbGVgLCBgb3BlbmAsIGByZXF1aXJlZGAsIGFuZCBgc2NvcGVkYC5cbiAqXG4gKiBIb3dldmVyLCB0aGVyZSBhcmUgYSBmZXcgbm90YWJsZSBleGNlcHRpb25zLiBGb3IgdGhlIEhUTUwgYXR0cmlidXRlcyBgZGlzYWJsZWRgLCBgaGlkZGVuYCwgYW5kIGByZWFkb25seWAsIHRoZSBhdHRyaWJ1dGUgaXMgc2V0IHRvIHRoZSAqb3Bwb3NpdGUqIG9mIHRoZSB2YWx1ZSBvZiB0aGUgbW9kZWwgdmFyaWFibGUuIFRoaXMgbWFrZXMgdGhlIHJlc3VsdGluZyBIVE1MIGVhc2llciB0byByZWFkLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8IS0tIHRoaXMgY2hlY2tib3ggaXMgQ0hFQ0tFRCB3aGVuIHNhbXBsZUJvb2wgaXMgVFJVRSxcbiAqICAgICAgICAgICBhbmQgVU5DSEVDS0VEIHdoZW4gc2FtcGxlQm9vbCBpcyBGQUxTRSAtLT5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGRhdGEtZi1jaGVja2VkPVwic2FtcGxlQm9vbFwiIC8+XG4gKlxuICogICAgICA8IS0tIHRoaXMgYnV0dG9uIGlzIEVOQUJMRUQgd2hlbiBzYW1wbGVCb29sIGlzIFRSVUUsXG4gKiAgICAgICAgICAgYW5kIERJU0FCTEVEIHdoZW4gc2FtcGxlQm9vbCBpcyBGQUxTRSAtLT5cbiAqICAgICAgPGJ1dHRvbiBkYXRhLWYtZGlzYWJsZWQ9XCJzYW1wbGVCb29sXCI+Q2xpY2sgTWU8L2J1dHRvbj5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogL14oPzpkaXNhYmxlZHxoaWRkZW58cmVhZG9ubHkpJC9pLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcm9wKHByb3AsICF2YWx1ZSk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgTm8tb3AgQXR0cmlidXRlc1xuICpcbiAqIEZsb3cuanMgcHJvdmlkZXMgc3BlY2lhbCBoYW5kbGluZyBmb3IgYm90aCBgZGF0YS1mLW1vZGVsYCAoZGVzY3JpYmVkIFtoZXJlXSguLi8uLi8uLi8uLi8jdXNpbmdfaW5fcHJvamVjdCkpIGFuZCBgZGF0YS1mLWNvbnZlcnRgIChkZXNjcmliZWQgW2hlcmVdKC4uLy4uLy4uLy4uL2NvbnZlcnRlci1vdmVydmlldy8pKS4gRm9yIHRoZXNlIGF0dHJpYnV0ZXMsIHRoZSBkZWZhdWx0IGJlaGF2aW9yIGlzIHRvIGRvIG5vdGhpbmcsIHNvIHRoYXQgdGhpcyBhZGRpdGlvbmFsIHNwZWNpYWwgaGFuZGxpbmcgY2FuIHRha2UgcHJlY2VuZGVuY2UuXG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLy8gQXR0cmlidXRlcyB3aGljaCBhcmUganVzdCBwYXJhbWV0ZXJzIHRvIG90aGVycyBhbmQgY2FuIGp1c3QgYmUgaWdub3JlZFxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IC9eKD86bW9kZWx8Y29udmVydCkkL2ksXG5cbiAgICBoYW5kbGU6ICQubm9vcCxcblxuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIEJpbmRpbmcgZm9yIGRhdGEtZi1bYm9vbGVhbl1cbiAqXG4gKiBGbG93LmpzIHByb3ZpZGVzIHNwZWNpYWwgaGFuZGxpbmcgZm9yIEhUTUwgYXR0cmlidXRlcyB0aGF0IHRha2UgQm9vbGVhbiB2YWx1ZXMuXG4gKlxuICogSW4gcGFydGljdWxhciwgZm9yIG1vc3QgSFRNTCBhdHRyaWJ1dGVzIHRoYXQgZXhwZWN0IEJvb2xlYW4gdmFsdWVzLCB0aGUgYXR0cmlidXRlIGlzIGRpcmVjdGx5IHNldCB0byB0aGUgdmFsdWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlLiBUaGlzIGlzIHRydWUgZm9yIGBjaGVja2VkYCwgYHNlbGVjdGVkYCwgYGFzeW5jYCwgYGF1dG9mb2N1c2AsIGBhdXRvcGxheWAsIGBjb250cm9sc2AsIGBkZWZlcmAsIGBpc21hcGAsIGBsb29wYCwgYG11bHRpcGxlYCwgYG9wZW5gLCBgcmVxdWlyZWRgLCBhbmQgYHNjb3BlZGAuXG4gKlxuICogSG93ZXZlciwgdGhlcmUgYXJlIGEgZmV3IG5vdGFibGUgZXhjZXB0aW9ucy4gRm9yIHRoZSBIVE1MIGF0dHJpYnV0ZXMgYGRpc2FibGVkYCwgYGhpZGRlbmAsIGFuZCBgcmVhZG9ubHlgLCB0aGUgYXR0cmlidXRlIGlzIHNldCB0byB0aGUgKm9wcG9zaXRlKiBvZiB0aGUgdmFsdWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlLiBUaGlzIG1ha2VzIHRoZSByZXN1bHRpbmcgSFRNTCBlYXNpZXIgdG8gcmVhZC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPCEtLSB0aGlzIGNoZWNrYm94IGlzIENIRUNLRUQgd2hlbiBzYW1wbGVCb29sIGlzIFRSVUUsXG4gKiAgICAgICAgICAgYW5kIFVOQ0hFQ0tFRCB3aGVuIHNhbXBsZUJvb2wgaXMgRkFMU0UgLS0+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBkYXRhLWYtY2hlY2tlZD1cInNhbXBsZUJvb2xcIiAvPlxuICpcbiAqICAgICAgPCEtLSB0aGlzIGJ1dHRvbiBpcyBFTkFCTEVEIHdoZW4gc2FtcGxlQm9vbCBpcyBUUlVFLFxuICogICAgICAgICAgIGFuZCBESVNBQkxFRCB3aGVuIHNhbXBsZUJvb2wgaXMgRkFMU0UgLS0+XG4gKiAgICAgIDxidXR0b24gZGF0YS1mLWRpc2FibGVkPVwic2FtcGxlQm9vbFwiPkNsaWNrIE1lPC9idXR0b24+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/OmNoZWNrZWR8c2VsZWN0ZWR8YXN5bmN8YXV0b2ZvY3VzfGF1dG9wbGF5fGNvbnRyb2xzfGRlZmVyfGlzbWFwfGxvb3B8bXVsdGlwbGV8b3BlbnxyZXF1aXJlZHxzY29wZWQpJC9pLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgLypqc2xpbnQgZXFlcTogdHJ1ZSovXG4gICAgICAgIHZhciB2YWwgPSAodGhpcy5hdHRyKCd2YWx1ZScpKSA/ICh2YWx1ZSA9PSB0aGlzLnByb3AoJ3ZhbHVlJykpIDogISF2YWx1ZTtcbiAgICAgICAgdGhpcy5wcm9wKHByb3AsIHZhbCk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgRE9NIE1hbmFnZXJcbiAqXG4gKiBUaGUgRmxvdy5qcyBET00gTWFuYWdlciBwcm92aWRlcyB0d28td2F5IGRhdGEgYmluZGluZ3MgZnJvbSB5b3VyIHByb2plY3QncyB1c2VyIGludGVyZmFjZSB0byB0aGUgY2hhbm5lbC4gVGhlIERPTSBNYW5hZ2VyIGlzIHRoZSAnZ2x1ZScgdGhyb3VnaCB3aGljaCBIVE1MIERPTSBlbGVtZW50cyAtLSBpbmNsdWRpbmcgdGhlIGF0dHJpYnV0ZXMgYW5kIGF0dHJpYnV0ZSBoYW5kbGVycyBwcm92aWRlZCBieSBGbG93LmpzIGZvciBbdmFyaWFibGVzXSguLi8uLi9hdHRyaWJ1dGVzLW92ZXJ2aWV3LyksIFtvcGVyYXRpb25zXSguLi8uLi9vcGVyYXRpb25zLW92ZXJ2aWV3LykgYW5kIFtjb252ZXJzaW9uXSguLi8uLi9jb252ZXJ0ZXItb3ZlcnZpZXcvKSwgYW5kIHRob3NlIFt5b3UgY3JlYXRlXSguL2F0dHJpYnV0ZXMvYXR0cmlidXRlLW1hbmFnZXIvKSAtLSBhcmUgYm91bmQgdG8gdGhlIHZhcmlhYmxlIGFuZCBvcGVyYXRpb25zIFtjaGFubmVsc10oLi4vLi4vY2hhbm5lbC1vdmVydmlldy8pIHRvIGxpbmsgdGhlbSB3aXRoIHlvdXIgcHJvamVjdCdzIG1vZGVsLiBTZWUgdGhlIFtFcGljZW50ZXIgYXJjaGl0ZWN0dXJlIGRldGFpbHNdKC4uLy4uLy4uL2NyZWF0aW5nX3lvdXJfaW50ZXJmYWNlL2FyY2hfZGV0YWlscy8pIGZvciBhIHZpc3VhbCBkZXNjcmlwdGlvbiBvZiBob3cgdGhlIERPTSBNYW5hZ2VyIHJlbGF0ZXMgdG8gdGhlIFtyZXN0IG9mIHRoZSBFcGljZW50ZXIgc3RhY2tdKC4uLy4uLy4uL2NyZWF0aW5nX3lvdXJfaW50ZXJmYWNlLykuXG4gKlxuICogVGhlIERPTSBNYW5hZ2VyIGlzIGFuIGludGVncmFsIHBhcnQgb2YgdGhlIEZsb3cuanMgYXJjaGl0ZWN0dXJlIGJ1dCwgaW4ga2VlcGluZyB3aXRoIG91ciBnZW5lcmFsIHBoaWxvc29waHkgb2YgZXh0ZW5zaWJpbGl0eSBhbmQgY29uZmlndXJhYmlsaXR5LCBpdCBpcyBhbHNvIHJlcGxhY2VhYmxlLiBGb3IgaW5zdGFuY2UsIGlmIHlvdSB3YW50IHRvIG1hbmFnZSB5b3VyIERPTSBzdGF0ZSB3aXRoIFtCYWNrYm9uZSBWaWV3c10oaHR0cDovL2JhY2tib25lanMub3JnKSBvciBbQW5ndWxhci5qc10oaHR0cHM6Ly9hbmd1bGFyanMub3JnKSwgd2hpbGUgc3RpbGwgdXNpbmcgdGhlIGNoYW5uZWxzIHRvIGhhbmRsZSB0aGUgY29tbXVuaWNhdGlvbiB3aXRoIHlvdXIgbW9kZWwsIHRoaXMgaXMgdGhlIHBpZWNlIHlvdSdkIHJlcGxhY2UuIFtDb250YWN0IHVzXShodHRwOi8vZm9yaW8uY29tL2Fib3V0L2NvbnRhY3QvKSBpZiB5b3UgYXJlIGludGVyZXN0ZWQgaW4gZXh0ZW5kaW5nIEZsb3cuanMgaW4gdGhpcyB3YXkgLS0gd2UnbGwgYmUgaGFwcHkgdG8gdGFsayBhYm91dCBpdCBpbiBtb3JlIGRldGFpbC5cbiAqXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbiAgICB2YXIgbm9kZU1hbmFnZXIgPSByZXF1aXJlKCcuL25vZGVzL25vZGUtbWFuYWdlcicpO1xuICAgIHZhciBhdHRyTWFuYWdlciA9IHJlcXVpcmUoJy4vYXR0cmlidXRlcy9hdHRyaWJ1dGUtbWFuYWdlcicpO1xuICAgIHZhciBjb252ZXJ0ZXJNYW5hZ2VyID0gcmVxdWlyZSgnLi4vY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlcicpO1xuXG4gICAgdmFyIHBhcnNlVXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy9wYXJzZS11dGlscycpO1xuICAgIHZhciBkb21VdGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzL2RvbScpO1xuXG4gICAgdmFyIGF1dG9VcGRhdGVQbHVnaW4gPSByZXF1aXJlKCcuL3BsdWdpbnMvYXV0by11cGRhdGUtYmluZGluZ3MnKTtcblxuICAgIC8vSnF1ZXJ5IHNlbGVjdG9yIHRvIHJldHVybiBldmVyeXRoaW5nIHdoaWNoIGhhcyBhIGYtIHByb3BlcnR5IHNldFxuICAgICQuZXhwclsnOiddW2NvbmZpZy5wcmVmaXhdID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICB2YXIgJHRoaXMgPSAkKG9iaik7XG4gICAgICAgIHZhciBkYXRhcHJvcHMgPSBfLmtleXMoJHRoaXMuZGF0YSgpKTtcblxuICAgICAgICB2YXIgbWF0Y2ggPSBfLmZpbmQoZGF0YXByb3BzLCBmdW5jdGlvbiAoYXR0cikge1xuICAgICAgICAgICAgcmV0dXJuIChhdHRyLmluZGV4T2YoY29uZmlnLnByZWZpeCkgPT09IDApO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gISEobWF0Y2gpO1xuICAgIH07XG5cbiAgICAkLmV4cHJbJzonXS53ZWJjb21wb25lbnQgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmoubm9kZU5hbWUuaW5kZXhPZignLScpICE9PSAtMTtcbiAgICB9O1xuXG4gICAgdmFyIGdldE1hdGNoaW5nRWxlbWVudHMgPSBmdW5jdGlvbiAocm9vdCkge1xuICAgICAgICB2YXIgJHJvb3QgPSAkKHJvb3QpO1xuICAgICAgICB2YXIgbWF0Y2hlZEVsZW1lbnRzID0gJHJvb3QuZmluZCgnOicgKyBjb25maWcucHJlZml4KTtcbiAgICAgICAgaWYgKCRyb290LmlzKCc6JyArIGNvbmZpZy5wcmVmaXgpKSB7XG4gICAgICAgICAgICBtYXRjaGVkRWxlbWVudHMgPSBtYXRjaGVkRWxlbWVudHMuYWRkKCRyb290KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWF0Y2hlZEVsZW1lbnRzO1xuICAgIH07XG5cbiAgICB2YXIgZ2V0RWxlbWVudE9yRXJyb3IgPSBmdW5jdGlvbiAoZWxlbWVudCwgY29udGV4dCkge1xuICAgICAgICBpZiAoZWxlbWVudCBpbnN0YW5jZW9mICQpIHtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50LmdldCgwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWVsZW1lbnQgfHwgIWVsZW1lbnQubm9kZU5hbWUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoY29udGV4dCwgJ0V4cGVjdGVkIHRvIGdldCBET00gRWxlbWVudCwgZ290ICcsIGVsZW1lbnQpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGNvbnRleHQgKyAnOiBFeHBlY3RlZCB0byBnZXQgRE9NIEVsZW1lbnQsIGdvdCcgKyAodHlwZW9mIGVsZW1lbnQpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9O1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcblxuICAgICAgICBub2Rlczogbm9kZU1hbmFnZXIsXG4gICAgICAgIGF0dHJpYnV0ZXM6IGF0dHJNYW5hZ2VyLFxuICAgICAgICBjb252ZXJ0ZXJzOiBjb252ZXJ0ZXJNYW5hZ2VyLFxuICAgICAgICAvL3V0aWxzIGZvciB0ZXN0aW5nXG4gICAgICAgIHByaXZhdGU6IHtcbiAgICAgICAgICAgIG1hdGNoZWRFbGVtZW50czogW11cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogVW5iaW5kIHRoZSBlbGVtZW50OiB1bnN1YnNjcmliZSBmcm9tIGFsbCB1cGRhdGVzIG9uIHRoZSByZWxldmFudCBjaGFubmVscy5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtEb21FbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRvIHJlbW92ZSBmcm9tIHRoZSBkYXRhIGJpbmRpbmcuXG4gICAgICAgICAqIEBwYXJhbSB7Q2hhbm5lbEluc3RhbmNlfSBjaGFubmVsIChPcHRpb25hbCkgVGhlIGNoYW5uZWwgZnJvbSB3aGljaCB0byB1bnN1YnNjcmliZS4gRGVmYXVsdHMgdG8gdGhlIFt2YXJpYWJsZXMgY2hhbm5lbF0oLi4vY2hhbm5lbHMvdmFyaWFibGVzLWNoYW5uZWwvKS5cbiAgICAgICAgICovXG4gICAgICAgIHVuYmluZEVsZW1lbnQ6IGZ1bmN0aW9uIChlbGVtZW50LCBjaGFubmVsKSB7XG4gICAgICAgICAgICBpZiAoIWNoYW5uZWwpIHtcbiAgICAgICAgICAgICAgICBjaGFubmVsID0gdGhpcy5vcHRpb25zLmNoYW5uZWwudmFyaWFibGVzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxlbWVudCA9IGdldEVsZW1lbnRPckVycm9yKGVsZW1lbnQpO1xuICAgICAgICAgICAgdmFyICRlbCA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoISRlbC5pcygnOicgKyBjb25maWcucHJlZml4KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucHJpdmF0ZS5tYXRjaGVkRWxlbWVudHMgPSBfLndpdGhvdXQodGhpcy5wcml2YXRlLm1hdGNoZWRFbGVtZW50cywgZWxlbWVudCk7XG5cbiAgICAgICAgICAgIC8vRklYTUU6IGhhdmUgdG8gcmVhZGQgZXZlbnRzIHRvIGJlIGFibGUgdG8gcmVtb3ZlIHRoZW0uIFVnbHlcbiAgICAgICAgICAgIHZhciBIYW5kbGVyID0gbm9kZU1hbmFnZXIuZ2V0SGFuZGxlcigkZWwpO1xuICAgICAgICAgICAgdmFyIGggPSBuZXcgSGFuZGxlci5oYW5kbGUoe1xuICAgICAgICAgICAgICAgIGVsOiBlbGVtZW50XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChoLnJlbW92ZUV2ZW50cykge1xuICAgICAgICAgICAgICAgIGgucmVtb3ZlRXZlbnRzKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICQoZWxlbWVudC5hdHRyaWJ1dGVzKS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgbm9kZU1hcCkge1xuICAgICAgICAgICAgICAgIHZhciBhdHRyID0gbm9kZU1hcC5ub2RlTmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgd2FudGVkUHJlZml4ID0gJ2RhdGEtZi0nO1xuICAgICAgICAgICAgICAgIGlmIChhdHRyLmluZGV4T2Yod2FudGVkUHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKHdhbnRlZFByZWZpeCwgJycpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGVyID0gYXR0ck1hbmFnZXIuZ2V0SGFuZGxlcihhdHRyLCAkZWwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFuZGxlci5zdG9wTGlzdGVuaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyLnN0b3BMaXN0ZW5pbmcuY2FsbCgkZWwsIGF0dHIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBzdWJzaWQgPSAkZWwuZGF0YSgnZi1zdWJzY3JpcHRpb24taWQnKSB8fCBbXTtcbiAgICAgICAgICAgIF8uZWFjaChzdWJzaWQsIGZ1bmN0aW9uIChzdWJzKSB7XG4gICAgICAgICAgICAgICAgY2hhbm5lbC51bnN1YnNjcmliZShzdWJzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBCaW5kIHRoZSBlbGVtZW50OiBzdWJzY3JpYmUgZnJvbSB1cGRhdGVzIG9uIHRoZSByZWxldmFudCBjaGFubmVscy5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtEb21FbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRvIGFkZCB0byB0aGUgZGF0YSBiaW5kaW5nLlxuICAgICAgICAgKiBAcGFyYW0ge0NoYW5uZWxJbnN0YW5jZX0gY2hhbm5lbCAoT3B0aW9uYWwpIFRoZSBjaGFubmVsIHRvIHN1YnNjcmliZSB0by4gRGVmYXVsdHMgdG8gdGhlIFt2YXJpYWJsZXMgY2hhbm5lbF0oLi4vY2hhbm5lbHMvdmFyaWFibGVzLWNoYW5uZWwvKS5cbiAgICAgICAgICovXG4gICAgICAgIGJpbmRFbGVtZW50OiBmdW5jdGlvbiAoZWxlbWVudCwgY2hhbm5lbCkge1xuICAgICAgICAgICAgaWYgKCFjaGFubmVsKSB7XG4gICAgICAgICAgICAgICAgY2hhbm5lbCA9IHRoaXMub3B0aW9ucy5jaGFubmVsLnZhcmlhYmxlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsZW1lbnQgPSBnZXRFbGVtZW50T3JFcnJvcihlbGVtZW50KTtcbiAgICAgICAgICAgIHZhciAkZWwgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKCEkZWwuaXMoJzonICsgY29uZmlnLnByZWZpeCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIV8uY29udGFpbnModGhpcy5wcml2YXRlLm1hdGNoZWRFbGVtZW50cywgZWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzLnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vU2VuZCB0byBub2RlIG1hbmFnZXIgdG8gaGFuZGxlIHVpIGNoYW5nZXNcbiAgICAgICAgICAgIHZhciBIYW5kbGVyID0gbm9kZU1hbmFnZXIuZ2V0SGFuZGxlcigkZWwpO1xuICAgICAgICAgICAgbmV3IEhhbmRsZXIuaGFuZGxlKHtcbiAgICAgICAgICAgICAgICBlbDogZWxlbWVudFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBzdWJzY3JpYmUgPSBmdW5jdGlvbiAoY2hhbm5lbCwgdmFyc1RvQmluZCwgJGVsLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF2YXJzVG9CaW5kIHx8ICF2YXJzVG9CaW5kLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBzdWJzaWQgPSBjaGFubmVsLnN1YnNjcmliZSh2YXJzVG9CaW5kLCAkZWwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIHZhciBuZXdzdWJzID0gKCRlbC5kYXRhKCdmLXN1YnNjcmlwdGlvbi1pZCcpIHx8IFtdKS5jb25jYXQoc3Vic2lkKTtcbiAgICAgICAgICAgICAgICAkZWwuZGF0YSgnZi1zdWJzY3JpcHRpb24taWQnLCBuZXdzdWJzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBhdHRyQmluZGluZ3MgPSBbXTtcbiAgICAgICAgICAgIHZhciBub25CYXRjaGFibGVWYXJpYWJsZXMgPSBbXTtcbiAgICAgICAgICAgIC8vTk9URTogbG9vcGluZyB0aHJvdWdoIGF0dHJpYnV0ZXMgaW5zdGVhZCBvZiAuZGF0YSBiZWNhdXNlIC5kYXRhIGF1dG9tYXRpY2FsbHkgY2FtZWxjYXNlcyBwcm9wZXJ0aWVzIGFuZCBtYWtlIGl0IGhhcmQgdG8gcmV0cnZpZXZlXG4gICAgICAgICAgICAkKGVsZW1lbnQuYXR0cmlidXRlcykuZWFjaChmdW5jdGlvbiAoaW5kZXgsIG5vZGVNYXApIHtcbiAgICAgICAgICAgICAgICB2YXIgYXR0ciA9IG5vZGVNYXAubm9kZU5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGF0dHJWYWwgPSBub2RlTWFwLnZhbHVlO1xuXG4gICAgICAgICAgICAgICAgdmFyIHdhbnRlZFByZWZpeCA9ICdkYXRhLWYtJztcbiAgICAgICAgICAgICAgICBpZiAoYXR0ci5pbmRleE9mKHdhbnRlZFByZWZpeCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSh3YW50ZWRQcmVmaXgsICcnKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlciA9IGF0dHJNYW5hZ2VyLmdldEhhbmRsZXIoYXR0ciwgJGVsKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlzQmluZGFibGVBdHRyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhbmRsZXIgJiYgaGFuZGxlci5pbml0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc0JpbmRhYmxlQXR0ciA9IGhhbmRsZXIuaW5pdC5jYWxsKCRlbCwgYXR0ciwgYXR0clZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNCaW5kYWJsZUF0dHIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vQ29udmVydCBwaXBlcyB0byBjb252ZXJ0ZXIgYXR0cnNcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB3aXRoQ29udiA9IF8uaW52b2tlKGF0dHJWYWwuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3aXRoQ29udi5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0clZhbCA9IHdpdGhDb252LnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGVsLmRhdGEoJ2YtY29udmVydC0nICsgYXR0ciwgd2l0aENvbnYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYmluZGluZyA9IHsgYXR0cjogYXR0ciB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbW1hUmVnZXggPSAvLCg/IVteXFxbXSpcXF0pLztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRyVmFsLmluZGV4T2YoJzwlJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9Bc3N1bWUgaXQncyB0ZW1wbGF0ZWQgZm9yIGxhdGVyIHVzZVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGF0dHJWYWwuc3BsaXQoY29tbWFSZWdleCkubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YXJzVG9CaW5kID0gXy5pbnZva2UoYXR0clZhbC5zcGxpdChjb21tYVJlZ2V4KSwgJ3RyaW0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJzY3JpYmUoY2hhbm5lbCwgdmFyc1RvQmluZCwgJGVsLCB7IGJhdGNoOiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJpbmRpbmcudG9waWNzID0gdmFyc1RvQmluZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmluZGluZy50b3BpY3MgPSBbYXR0clZhbF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9uQmF0Y2hhYmxlVmFyaWFibGVzLnB1c2goYXR0clZhbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRyQmluZGluZ3MucHVzaChiaW5kaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJGVsLmRhdGEoJ2F0dHItYmluZGluZ3MnLCBhdHRyQmluZGluZ3MpO1xuICAgICAgICAgICAgaWYgKG5vbkJhdGNoYWJsZVZhcmlhYmxlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnc3Vic2NyaWJlJywgbm9uQmF0Y2hhYmxlVmFyaWFibGVzLCAkZWwuZ2V0KDApKVxuICAgICAgICAgICAgICAgIHN1YnNjcmliZShjaGFubmVsLCBub25CYXRjaGFibGVWYXJpYWJsZXMsICRlbCwgeyBiYXRjaDogZmFsc2UgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEJpbmQgYWxsIHByb3ZpZGVkIGVsZW1lbnRzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gIHtBcnJheXxqUXVlcnlTZWxlY3Rvcn0gZWxlbWVudHNUb0JpbmQgKE9wdGlvbmFsKSBJZiBub3QgcHJvdmlkZWQsIGJpbmRzIGFsbCBtYXRjaGluZyBlbGVtZW50cyB3aXRoaW4gZGVmYXVsdCByb290IHByb3ZpZGVkIGF0IGluaXRpYWxpemF0aW9uLlxuICAgICAgICAgKi9cbiAgICAgICAgYmluZEFsbDogZnVuY3Rpb24gKGVsZW1lbnRzVG9CaW5kKSB7XG4gICAgICAgICAgICBpZiAoIWVsZW1lbnRzVG9CaW5kKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudHNUb0JpbmQgPSBnZXRNYXRjaGluZ0VsZW1lbnRzKHRoaXMub3B0aW9ucy5yb290KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIV8uaXNBcnJheShlbGVtZW50c1RvQmluZCkpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50c1RvQmluZCA9IGdldE1hdGNoaW5nRWxlbWVudHMoZWxlbWVudHNUb0JpbmQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgLy9wYXJzZSB0aHJvdWdoIGRvbSBhbmQgZmluZCBldmVyeXRoaW5nIHdpdGggbWF0Y2hpbmcgYXR0cmlidXRlc1xuICAgICAgICAgICAgJC5lYWNoKGVsZW1lbnRzVG9CaW5kLCBmdW5jdGlvbiAoaW5kZXgsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBtZS5iaW5kRWxlbWVudC5jYWxsKG1lLCBlbGVtZW50LCBtZS5vcHRpb25zLmNoYW5uZWwudmFyaWFibGVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogVW5iaW5kIHByb3ZpZGVkIGVsZW1lbnRzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gIHtBcnJheX0gZWxlbWVudHNUb1VuYmluZCAoT3B0aW9uYWwpIElmIG5vdCBwcm92aWRlZCwgdW5iaW5kcyBldmVyeXRoaW5nLlxuICAgICAgICAgKi9cbiAgICAgICAgdW5iaW5kQWxsOiBmdW5jdGlvbiAoZWxlbWVudHNUb1VuYmluZCkge1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIGlmICghZWxlbWVudHNUb1VuYmluZCkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzVG9VbmJpbmQgPSB0aGlzLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJC5lYWNoKGVsZW1lbnRzVG9VbmJpbmQsIGZ1bmN0aW9uIChpbmRleCwgZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIG1lLnVuYmluZEVsZW1lbnQuY2FsbChtZSwgZWxlbWVudCwgbWUub3B0aW9ucy5jaGFubmVsLnZhcmlhYmxlcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogSW5pdGlhbGl6ZSB0aGUgRE9NIE1hbmFnZXIgdG8gd29yayB3aXRoIGEgcGFydGljdWxhciBIVE1MIGVsZW1lbnQgYW5kIGFsbCBlbGVtZW50cyB3aXRoaW4gdGhhdCByb290LiBEYXRhIGJpbmRpbmdzIGJldHdlZW4gaW5kaXZpZHVhbCBIVE1MIGVsZW1lbnRzIGFuZCB0aGUgbW9kZWwgdmFyaWFibGVzIHNwZWNpZmllZCBpbiB0aGUgYXR0cmlidXRlcyB3aWxsIGhhcHBlbiB2aWEgdGhlIGNoYW5uZWwuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIChPcHRpb25hbCkgT3ZlcnJpZGVzIGZvciB0aGUgZGVmYXVsdCBvcHRpb25zLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0aW9ucy5yb290IFRoZSByb290IEhUTUwgZWxlbWVudCBiZWluZyBtYW5hZ2VkIGJ5IHRoaXMgaW5zdGFuY2Ugb2YgdGhlIERPTSBNYW5hZ2VyLiBEZWZhdWx0cyB0byBgYm9keWAuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zLmNoYW5uZWwgVGhlIGNoYW5uZWwgdG8gY29tbXVuaWNhdGUgd2l0aC4gRGVmYXVsdHMgdG8gdGhlIENoYW5uZWwgTWFuYWdlciBmcm9tIFtFcGljZW50ZXIuanNdKC4uLy4uLy4uL2FwaV9hZGFwdGVycy8pLlxuICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuYXV0b0JpbmQgSWYgYHRydWVgIChkZWZhdWx0KSwgYW55IHZhcmlhYmxlcyBhZGRlZCB0byB0aGUgRE9NIGFmdGVyIGBGbG93LmluaXRpYWxpemUoKWAgaGFzIGJlZW4gY2FsbGVkIHdpbGwgYmUgYXV0b21hdGljYWxseSBwYXJzZWQsIGFuZCBzdWJzY3JpcHRpb25zIGFkZGVkIHRvIGNoYW5uZWxzLiBOb3RlLCB0aGlzIGRvZXMgbm90IHdvcmsgaW4gSUUgdmVyc2lvbnMgPCAxMS5cbiAgICAgICAgICovXG4gICAgICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUm9vdCBvZiB0aGUgZWxlbWVudCBmb3IgZmxvdy5qcyB0byBtYW5hZ2UgZnJvbS5cbiAgICAgICAgICAgICAgICAgKiBAdHlwZSB7U3RyaW5nfSBqUXVlcnkgc2VsZWN0b3JcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICByb290OiAnYm9keScsXG4gICAgICAgICAgICAgICAgY2hhbm5lbDogbnVsbCxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEFueSB2YXJpYWJsZXMgYWRkZWQgdG8gdGhlIERPTSBhZnRlciBgRmxvdy5pbml0aWFsaXplKClgIGhhcyBiZWVuIGNhbGxlZCB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgcGFyc2VkLCBhbmQgc3Vic2NyaXB0aW9ucyBhZGRlZCB0byBjaGFubmVscy4gTm90ZSwgdGhpcyBkb2VzIG5vdCB3b3JrIGluIElFIHZlcnNpb25zIDwgMTEuXG4gICAgICAgICAgICAgICAgICogQHR5cGUge0Jvb2xlYW59XG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgYXV0b0JpbmQ6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAkLmV4dGVuZChkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgICAgIHZhciBjaGFubmVsID0gZGVmYXVsdHMuY2hhbm5lbDtcblxuICAgICAgICAgICAgdGhpcy5vcHRpb25zID0gZGVmYXVsdHM7XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgJHJvb3QgPSAkKGRlZmF1bHRzLnJvb3QpO1xuICAgICAgICAgICAgJChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbWUuYmluZEFsbCgpO1xuICAgICAgICAgICAgICAgICRyb290LnRyaWdnZXIoJ2YuZG9tcmVhZHknKTtcblxuICAgICAgICAgICAgICAgIC8vQXR0YWNoIGxpc3RlbmVyc1xuICAgICAgICAgICAgICAgIC8vIExpc3RlbiBmb3IgY2hhbmdlcyB0byB1aSBhbmQgcHVibGlzaCB0byBhcGlcbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoY29uZmlnLmV2ZW50cy50cmlnZ2VyKS5vbihjb25maWcuZXZlbnRzLnRyaWdnZXIsIGZ1bmN0aW9uIChldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnNlZERhdGEgPSB7fTsgLy9pZiBub3QgYWxsIHN1YnNlcXVlbnQgbGlzdGVuZXJzIHdpbGwgZ2V0IHRoZSBtb2RpZmllZCBkYXRhXG5cbiAgICAgICAgICAgICAgICAgICAgdmFyICRlbCA9ICQoZXZ0LnRhcmdldCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhdHRyQ29udmVydGVycyA9ICBkb21VdGlscy5nZXRDb252ZXJ0ZXJzTGlzdCgkZWwsICdiaW5kJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGRhdGEsIGZ1bmN0aW9uICh2YWwsIGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5ID0ga2V5LnNwbGl0KCd8JylbMF0udHJpbSgpOyAvL2luIGNhc2UgdGhlIHBpcGUgZm9ybWF0dGluZyBzeW50YXggd2FzIHVzZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IGNvbnZlcnRlck1hbmFnZXIucGFyc2UodmFsLCBhdHRyQ29udmVydGVycyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZWREYXRhW2tleV0gPSBwYXJzZVV0aWxzLnRvSW1wbGljaXRUeXBlKHZhbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICRlbC50cmlnZ2VyKCdmLmNvbnZlcnQnLCB7IGJpbmQ6IHZhbCB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgY2hhbm5lbC52YXJpYWJsZXMucHVibGlzaChwYXJzZWREYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIExpc3RlbiBmb3IgY2hhbmdlcyBmcm9tIGFwaSBhbmQgdXBkYXRlIHVpXG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKGNvbmZpZy5ldmVudHMucmVhY3QpLm9uKGNvbmZpZy5ldmVudHMucmVhY3QsIGZ1bmN0aW9uIChldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZXZ0LnRhcmdldCwgZGF0YSwgXCJyb290IG9uXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgJGVsID0gJChldnQudGFyZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gJGVsLmRhdGEoJ2F0dHItYmluZGluZ3MnKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdG9jb252ZXJ0ID0ge307XG4gICAgICAgICAgICAgICAgICAgICQuZWFjaChkYXRhLCBmdW5jdGlvbiAodmFyaWFibGVOYW1lLCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGJpbmRpbmdzLCBmdW5jdGlvbiAoYmluZGluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfLmNvbnRhaW5zKGJpbmRpbmcudG9waWNzLCB2YXJpYWJsZU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChiaW5kaW5nLnRvcGljcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2NvbnZlcnRbYmluZGluZy5hdHRyXSA9IF8ucGljayhkYXRhLCBiaW5kaW5nLnRvcGljcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2NvbnZlcnRbYmluZGluZy5hdHRyXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAkZWwudHJpZ2dlcignZi5jb252ZXJ0JywgdG9jb252ZXJ0KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIGRhdGEgPSB7cHJvcHRvdXBkYXRlOiB2YWx1ZX0gfHwganVzdCBhIHZhbHVlIChhc3N1bWVzICdiaW5kJyBpZiBzbylcbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoJ2YuY29udmVydCcpLm9uKCdmLmNvbnZlcnQnLCBmdW5jdGlvbiAoZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkZWwgPSAkKGV2dC50YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29udmVydCA9IGZ1bmN0aW9uICh2YWwsIHByb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3AgPSBwcm9wLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXR0ckNvbnZlcnRlcnMgPSAgZG9tVXRpbHMuZ2V0Q29udmVydGVyc0xpc3QoJGVsLCBwcm9wKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGVyID0gYXR0ck1hbmFnZXIuZ2V0SGFuZGxlcihwcm9wLCAkZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnZlcnRlZFZhbHVlID0gY29udmVydGVyTWFuYWdlci5jb252ZXJ0KHZhbCwgYXR0ckNvbnZlcnRlcnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlci5oYW5kbGUuY2FsbCgkZWwsIGNvbnZlcnRlZFZhbHVlLCBwcm9wKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLmVhY2goZGF0YSwgY29udmVydCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb252ZXJ0KGRhdGEsICdiaW5kJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICRyb290Lm9mZignZi51aS5vcGVyYXRlJykub24oJ2YudWkub3BlcmF0ZScsIGZ1bmN0aW9uIChldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YSA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkYXRhKTsgLy9pZiBub3QgYWxsIHN1YnNlcXVlbnQgbGlzdGVuZXJzIHdpbGwgZ2V0IHRoZSBtb2RpZmllZCBkYXRhXG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaChkYXRhLm9wZXJhdGlvbnMsIGZ1bmN0aW9uIChvcG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgb3BuLnBhcmFtcyA9IF8ubWFwKG9wbi5wYXJhbXMsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVV0aWxzLnRvSW1wbGljaXRUeXBlKCQudHJpbSh2YWwpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjaGFubmVsLm9wZXJhdGlvbnMucHVibGlzaChkYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmIChtZS5vcHRpb25zLmF1dG9CaW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIGF1dG9VcGRhdGVQbHVnaW4oJHJvb3QuZ2V0KDApLCBtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuICQuZXh0ZW5kKHRoaXMsIHB1YmxpY0FQSSk7XG59KCkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZXh0ZW5kID0gZnVuY3Rpb24gKHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7XG4gICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgdmFyIGNoaWxkO1xuXG4gICAgLy8gVGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciB0aGUgbmV3IHN1YmNsYXNzIGlzIGVpdGhlciBkZWZpbmVkIGJ5IHlvdVxuICAgIC8vICh0aGUgXCJjb25zdHJ1Y3RvclwiIHByb3BlcnR5IGluIHlvdXIgYGV4dGVuZGAgZGVmaW5pdGlvbiksIG9yIGRlZmF1bHRlZFxuICAgIC8vIGJ5IHVzIHRvIHNpbXBseSBjYWxsIHRoZSBwYXJlbnQncyBjb25zdHJ1Y3Rvci5cbiAgICBpZiAocHJvdG9Qcm9wcyAmJiBfLmhhcyhwcm90b1Byb3BzLCAnY29uc3RydWN0b3InKSkge1xuICAgICAgICBjaGlsZCA9IHByb3RvUHJvcHMuY29uc3RydWN0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2hpbGQgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBwYXJlbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTsgfTtcbiAgICB9XG5cbiAgICAvLyBBZGQgc3RhdGljIHByb3BlcnRpZXMgdG8gdGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLCBpZiBzdXBwbGllZC5cbiAgICBfLmV4dGVuZChjaGlsZCwgcGFyZW50LCBzdGF0aWNQcm9wcyk7XG5cbiAgICAvLyBTZXQgdGhlIHByb3RvdHlwZSBjaGFpbiB0byBpbmhlcml0IGZyb20gYHBhcmVudGAsIHdpdGhvdXQgY2FsbGluZ1xuICAgIC8vIGBwYXJlbnRgJ3MgY29uc3RydWN0b3IgZnVuY3Rpb24uXG4gICAgdmFyIFN1cnJvZ2F0ZSA9IGZ1bmN0aW9uICgpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGNoaWxkOyB9O1xuICAgIFN1cnJvZ2F0ZS5wcm90b3R5cGUgPSBwYXJlbnQucHJvdG90eXBlO1xuICAgIGNoaWxkLnByb3RvdHlwZSA9IG5ldyBTdXJyb2dhdGUoKTtcblxuICAgIC8vIEFkZCBwcm90b3R5cGUgcHJvcGVydGllcyAoaW5zdGFuY2UgcHJvcGVydGllcykgdG8gdGhlIHN1YmNsYXNzLFxuICAgIC8vIGlmIHN1cHBsaWVkLlxuICAgIGlmIChwcm90b1Byb3BzKSB7XG4gICAgICAgIF8uZXh0ZW5kKGNoaWxkLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7XG4gICAgfVxuXG4gICAgLy8gU2V0IGEgY29udmVuaWVuY2UgcHJvcGVydHkgaW4gY2FzZSB0aGUgcGFyZW50J3MgcHJvdG90eXBlIGlzIG5lZWRlZFxuICAgIC8vIGxhdGVyLlxuICAgIGNoaWxkLl9fc3VwZXJfXyA9IHBhcmVudC5wcm90b3R5cGU7XG5cbiAgICByZXR1cm4gY2hpbGQ7XG59O1xuXG52YXIgVmlldyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdGhpcy4kZWwgPSAob3B0aW9ucy4kZWwpIHx8ICQob3B0aW9ucy5lbCk7XG4gICAgdGhpcy5lbCA9IG9wdGlvbnMuZWw7XG4gICAgdGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbn07XG5cbl8uZXh0ZW5kKFZpZXcucHJvdG90eXBlLCB7XG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge30sXG59KTtcblxuVmlldy5leHRlbmQgPSBleHRlbmQ7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldztcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi8uLi9jb25maWcnKTtcbnZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vZGVmYXVsdC1ub2RlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBwcm9wZXJ0eUhhbmRsZXJzOiBbXSxcblxuICAgIHVpQ2hhbmdlRXZlbnQ6ICdjaGFuZ2UnLFxuICAgIGdldFVJVmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsLnZhbCgpO1xuICAgIH0sXG5cbiAgICByZW1vdmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy4kZWwub2ZmKHRoaXMudWlDaGFuZ2VFdmVudCk7XG4gICAgfSxcblxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgdmFyIHByb3BOYW1lID0gdGhpcy4kZWwuZGF0YShjb25maWcuYmluZGVyQXR0cik7XG5cbiAgICAgICAgaWYgKHByb3BOYW1lKSB7XG4gICAgICAgICAgICB0aGlzLiRlbC5vZmYodGhpcy51aUNoYW5nZUV2ZW50KS5vbih0aGlzLnVpQ2hhbmdlRXZlbnQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsID0gbWUuZ2V0VUlWYWx1ZSgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgICAgIHBhcmFtc1twcm9wTmFtZV0gPSB2YWw7XG5cbiAgICAgICAgICAgICAgICBtZS4kZWwudHJpZ2dlcihjb25maWcuZXZlbnRzLnRyaWdnZXIsIHBhcmFtcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBCYXNlVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbn0sIHsgc2VsZWN0b3I6ICdpbnB1dCwgc2VsZWN0JyB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9iYXNlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBwcm9wZXJ0eUhhbmRsZXJzOiBbXG5cbiAgICBdLFxuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgIH1cbn0sIHsgc2VsZWN0b3I6ICcqJyB9KTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vZGVmYXVsdC1pbnB1dC1ub2RlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZVZpZXcuZXh0ZW5kKHtcblxuICAgIHByb3BlcnR5SGFuZGxlcnM6IFtcblxuICAgIF0sXG5cbiAgICBnZXRVSVZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciAkZWwgPSB0aGlzLiRlbDtcbiAgICAgICAgLy9UT0RPOiBmaWxlIGEgaXNzdWUgZm9yIHRoZSB2ZW5zaW0gbWFuYWdlciB0byBjb252ZXJ0IHRydWVzIHRvIDFzIGFuZCBzZXQgdGhpcyB0byB0cnVlIGFuZCBmYWxzZVxuXG4gICAgICAgIHZhciBvZmZWYWwgPSAgKCRlbC5kYXRhKCdmLW9mZicpICE9PSB1bmRlZmluZWQpID8gJGVsLmRhdGEoJ2Ytb2ZmJykgOiAwO1xuICAgICAgICAvL2F0dHIgPSBpbml0aWFsIHZhbHVlLCBwcm9wID0gY3VycmVudCB2YWx1ZVxuICAgICAgICB2YXIgb25WYWwgPSAoJGVsLmF0dHIoJ3ZhbHVlJykgIT09IHVuZGVmaW5lZCkgPyAkZWwucHJvcCgndmFsdWUnKTogMTtcblxuICAgICAgICB2YXIgdmFsID0gKCRlbC5pcygnOmNoZWNrZWQnKSkgPyBvblZhbCA6IG9mZlZhbDtcbiAgICAgICAgcmV0dXJuIHZhbDtcbiAgICB9LFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgQmFzZVZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG59LCB7IHNlbGVjdG9yOiAnOmNoZWNrYm94LDpyYWRpbycgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAoc2VsZWN0b3IsIGhhbmRsZXIpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgICAgIGhhbmRsZXIgPSB7XG4gICAgICAgICAgICBoYW5kbGU6IGhhbmRsZXJcbiAgICAgICAgfTtcbiAgICB9XG4gICAgaWYgKCFzZWxlY3Rvcikge1xuICAgICAgICBzZWxlY3RvciA9ICcqJztcbiAgICB9XG4gICAgaGFuZGxlci5zZWxlY3RvciA9IHNlbGVjdG9yO1xuICAgIHJldHVybiBoYW5kbGVyO1xufTtcblxudmFyIG1hdGNoID0gZnVuY3Rpb24gKHRvTWF0Y2gsIG5vZGUpIHtcbiAgICBpZiAoXy5pc1N0cmluZyh0b01hdGNoKSkge1xuICAgICAgICByZXR1cm4gdG9NYXRjaCA9PT0gbm9kZS5zZWxlY3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJCh0b01hdGNoKS5pcyhub2RlLnNlbGVjdG9yKTtcbiAgICB9XG59O1xuXG52YXIgbm9kZU1hbmFnZXIgPSB7XG4gICAgbGlzdDogW10sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgbm9kZSBoYW5kbGVyXG4gICAgICogQHBhcmFtICB7c3RyaW5nfSBzZWxlY3RvciBqUXVlcnktY29tcGF0aWJsZSBzZWxlY3RvciB0byB1c2UgdG8gbWF0Y2ggbm9kZXNcbiAgICAgKiBAcGFyYW0gIHtmdW5jdGlvbn0gaGFuZGxlciAgSGFuZGxlcnMgYXJlIG5ldy1hYmxlIGZ1bmN0aW9ucy4gVGhleSB3aWxsIGJlIGNhbGxlZCB3aXRoICRlbCBhcyBjb250ZXh0Lj8gVE9ETzogVGhpbmsgdGhpcyB0aHJvdWdoXG4gICAgICovXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChzZWxlY3RvciwgaGFuZGxlcikge1xuICAgICAgICB0aGlzLmxpc3QudW5zaGlmdChub3JtYWxpemUoc2VsZWN0b3IsIGhhbmRsZXIpKTtcbiAgICB9LFxuXG4gICAgZ2V0SGFuZGxlcjogZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICAgIHJldHVybiBfLmZpbmQodGhpcy5saXN0LCBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoKHNlbGVjdG9yLCBub2RlKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHJlcGxhY2U6IGZ1bmN0aW9uIChzZWxlY3RvciwgaGFuZGxlcikge1xuICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgIF8uZWFjaCh0aGlzLmxpc3QsIGZ1bmN0aW9uIChjdXJyZW50SGFuZGxlciwgaSkge1xuICAgICAgICAgICAgaWYgKHNlbGVjdG9yID09PSBjdXJyZW50SGFuZGxlci5zZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoc2VsZWN0b3IsIGhhbmRsZXIpKTtcbiAgICB9XG59O1xuXG4vL2Jvb3RzdHJhcHNcbnZhciBkZWZhdWx0SGFuZGxlcnMgPSBbXG4gICAgcmVxdWlyZSgnLi9pbnB1dC1jaGVja2JveC1ub2RlJyksXG4gICAgcmVxdWlyZSgnLi9kZWZhdWx0LWlucHV0LW5vZGUnKSxcbiAgICByZXF1aXJlKCcuL2RlZmF1bHQtbm9kZScpXG5dO1xuXy5lYWNoKGRlZmF1bHRIYW5kbGVycy5yZXZlcnNlKCksIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgbm9kZU1hbmFnZXIucmVnaXN0ZXIoaGFuZGxlci5zZWxlY3RvciwgaGFuZGxlcik7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBub2RlTWFuYWdlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodGFyZ2V0LCBkb21NYW5hZ2VyKSB7XG4gICAgaWYgKCF3aW5kb3cuTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGFuIG9ic2VydmVyIGluc3RhbmNlXG4gICAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKG11dGF0aW9ucykge1xuICAgICAgbXV0YXRpb25zLmZvckVhY2goZnVuY3Rpb24gKG11dGF0aW9uKSB7XG4gICAgICAgIHZhciBhZGRlZCA9ICQobXV0YXRpb24uYWRkZWROb2RlcykuZmluZCgnOmYnKTtcbiAgICAgICAgYWRkZWQgPSBhZGRlZC5hZGQoJChtdXRhdGlvbi5hZGRlZE5vZGVzKS5maWx0ZXIoJzpmJykpO1xuXG4gICAgICAgIHZhciByZW1vdmVkID0gJChtdXRhdGlvbi5yZW1vdmVkTm9kZXMpLmZpbmQoJzpmJyk7XG4gICAgICAgIHJlbW92ZWQgPSByZW1vdmVkLmFkZCgkKG11dGF0aW9uLnJlbW92ZWROb2RlcykuZmlsdGVyKCc6ZicpKTtcblxuICAgICAgICBpZiAoYWRkZWQgJiYgYWRkZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnbXV0YXRpb24gb2JzZXJ2ZXIgYWRkZWQnLCBhZGRlZC5nZXQoKSwgbXV0YXRpb24uYWRkZWROb2Rlcyk7XG4gICAgICAgICAgICBkb21NYW5hZ2VyLmJpbmRBbGwoYWRkZWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZW1vdmVkICYmIHJlbW92ZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnbXV0YXRpb24gb2JzZXJ2ZXIgcmVtb3ZlZCcsIHJlbW92ZWQpO1xuICAgICAgICAgICAgZG9tTWFuYWdlci51bmJpbmRBbGwocmVtb3ZlZCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdmFyIG11dGNvbmZpZyA9IHtcbiAgICAgICAgYXR0cmlidXRlczogZmFsc2UsXG4gICAgICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICAgICAgc3VidHJlZTogdHJ1ZSxcbiAgICAgICAgY2hhcmFjdGVyRGF0YTogZmFsc2VcbiAgICB9O1xuICAgIG9ic2VydmVyLm9ic2VydmUodGFyZ2V0LCBtdXRjb25maWcpO1xuICAgIC8vIExhdGVyLCB5b3UgY2FuIHN0b3Agb2JzZXJ2aW5nXG4gICAgLy8gb2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xufTtcbiIsIi8qKlxuICogIyMgRmxvdy5qcyBJbml0aWFsaXphdGlvblxuICpcbiAqIFRvIHVzZSBGbG93LmpzIGluIHlvdXIgcHJvamVjdCwgc2ltcGx5IGNhbGwgYEZsb3cuaW5pdGlhbGl6ZSgpYCBpbiB5b3VyIHVzZXIgaW50ZXJmYWNlLiBJbiB0aGUgYmFzaWMgY2FzZSwgYEZsb3cuaW5pdGlhbGl6ZSgpYCBjYW4gYmUgY2FsbGVkIHdpdGhvdXQgYW55IGFyZ3VtZW50cy4gV2hpbGUgRmxvdy5qcyBuZWVkcyB0byBrbm93IHRoZSBhY2NvdW50LCBwcm9qZWN0LCBhbmQgbW9kZWwgeW91IGFyZSB1c2luZywgYnkgZGVmYXVsdCB0aGVzZSB2YWx1ZXMgYXJlIGV4dHJhY3RlZCBmcm9tIHRoZSBVUkwgb2YgRXBpY2VudGVyIHByb2plY3QgYW5kIGJ5IHRoZSB1c2Ugb2YgYGRhdGEtZi1tb2RlbGAgaW4geW91ciBgPGJvZHk+YCB0YWcuIFNlZSBtb3JlIG9uIHRoZSBbYmFzaWNzIG9mIHVzaW5nIEZsb3cuanMgaW4geW91ciBwcm9qZWN0Ll0oLi4vLi4vI3VzaW5nX2luX3Byb2plY3QpLlxuICpcbiAqIEhvd2V2ZXIsIHNvbWV0aW1lcyB5b3Ugd2FudCB0byBiZSBleHBsaWNpdCBpbiB5b3VyIGluaXRpYWxpemF0aW9uIGNhbGwsIGFuZCB0aGVyZSBhcmUgYWxzbyBzb21lIGFkZGl0aW9uYWwgcGFyYW1ldGVycyB0aGF0IGxldCB5b3UgY3VzdG9taXplIHlvdXIgdXNlIG9mIEZsb3cuanMuXG4gKlxuICogIyMjI1BhcmFtZXRlcnNcbiAqXG4gKiBUaGUgcGFyYW1ldGVycyBmb3IgaW5pdGlhbGl6aW5nIEZsb3cuanMgaW5jbHVkZTpcbiAqXG4gKiAqIGBjaGFubmVsYCBDb25maWd1cmF0aW9uIGRldGFpbHMgZm9yIHRoZSBjaGFubmVsIEZsb3cuanMgdXNlcyBpbiBjb25uZWN0aW5nIHdpdGggdW5kZXJseWluZyBBUElzLlxuICogKiBgY2hhbm5lbC5zdHJhdGVneWAgVGhlIHJ1biBjcmVhdGlvbiBzdHJhdGVneSBkZXNjcmliZXMgd2hlbiB0byBjcmVhdGUgbmV3IHJ1bnMgd2hlbiBhbiBlbmQgdXNlciB2aXNpdHMgdGhpcyBwYWdlLiBUaGUgZGVmYXVsdCBpcyBgbmV3LWlmLXBlcnNpc3RlZGAsIHdoaWNoIGNyZWF0ZXMgYSBuZXcgcnVuIHdoZW4gdGhlIGVuZCB1c2VyIGlzIGlkbGUgZm9yIGxvbmdlciB0aGFuIHlvdXIgcHJvamVjdCdzICoqTW9kZWwgU2Vzc2lvbiBUaW1lb3V0KiogKGNvbmZpZ3VyZWQgaW4geW91ciBwcm9qZWN0J3MgW1NldHRpbmdzXSguLi8uLi8uLi91cGRhdGluZ195b3VyX3NldHRpbmdzLykpLCBidXQgb3RoZXJ3aXNlIHVzZXMgdGhlIGN1cnJlbnQgcnVuLi4gU2VlIG1vcmUgb24gW1J1biBTdHJhdGVnaWVzXSguLi8uLi8uLi9hcGlfYWRhcHRlcnMvc3RyYXRlZ3kvKS5cbiAqICogYGNoYW5uZWwucnVuYCBDb25maWd1cmF0aW9uIGRldGFpbHMgZm9yIGVhY2ggcnVuIGNyZWF0ZWQuXG4gKiAqIGBjaGFubmVsLnJ1bi5hY2NvdW50YCBUaGUgKipVc2VyIElEKiogb3IgKipUZWFtIElEKiogZm9yIHRoaXMgcHJvamVjdC4gQnkgZGVmYXVsdCwgdGFrZW4gZnJvbSB0aGUgVVJMIHdoZXJlIHRoZSB1c2VyIGludGVyZmFjZSBpcyBob3N0ZWQsIHNvIHlvdSBvbmx5IG5lZWQgdG8gc3VwcGx5IHRoaXMgaXMgeW91IGFyZSBydW5uaW5nIHlvdXIgcHJvamVjdCdzIHVzZXIgaW50ZXJmYWNlIFtvbiB5b3VyIG93biBzZXJ2ZXJdKC4uLy4uLy4uL2hvd190by9zZWxmX2hvc3RpbmcvKS5cbiAqICogYGNoYW5uZWwucnVuLnByb2plY3RgIFRoZSAqKlByb2plY3QgSUQqKiBmb3IgdGhpcyBwcm9qZWN0LlxuICogKiBgY2hhbm5lbC5ydW4ubW9kZWxgIE5hbWUgb2YgdGhlIHByaW1hcnkgbW9kZWwgZmlsZSBmb3IgdGhpcyBwcm9qZWN0LiBCeSBkZWZhdWx0LCB0YWtlbiBmcm9tIGBkYXRhLWYtbW9kZWxgIGluIHlvdXIgSFRNTCBgPGJvZHk+YCB0YWcuXG4gKiAqIGBjaGFubmVsLnJ1bi52YXJpYWJsZXNgIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIHZhcmlhYmxlcyBiZWluZyBsaXN0ZW5lZCB0byBvbiB0aGlzIGNoYW5uZWwuXG4gKiAqIGBjaGFubmVsLnJ1bi52YXJpYWJsZXMuc2lsZW50YCBQcm92aWRlcyBncmFudWxhciBjb250cm9sIG92ZXIgd2hlbiB1c2VyIGludGVyZmFjZSB1cGRhdGVzIGhhcHBlbiBmb3IgY2hhbmdlcyBvbiB0aGlzIGNoYW5uZWwuIFNlZSBiZWxvdyBmb3IgcG9zc2libGUgdmFsdWVzLlxuICogKiBgY2hhbm5lbC5ydW4udmFyaWFibGVzLmF1dG9GZXRjaGAgT3B0aW9ucyBmb3IgZmV0Y2hpbmcgdmFyaWFibGVzIGZyb20gdGhlIEFQSSBhcyB0aGV5J3JlIGJlaW5nIHN1YnNjcmliZWQuIFNlZSBbVmFyaWFibGVzIENoYW5uZWxdKC4uL2NoYW5uZWxzL3ZhcmlhYmxlcy1jaGFubmVsLykgZm9yIGRldGFpbHMuXG4gKiAqIGBjaGFubmVsLnJ1bi5vcGVyYXRpb25zYCBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBvcGVyYXRpb25zIGJlaW5nIGxpc3RlbmVkIHRvIG9uIHRoaXMgY2hhbm5lbC4gQ3VycmVudGx5IHRoZXJlIGlzIG9ubHkgb25lIGNvbmZpZ3VyYXRpb24gb3B0aW9uOiBgc2lsZW50YC5cbiAqICogYGNoYW5uZWwucnVuLm9wZXJhdGlvbnMuc2lsZW50YCBQcm92aWRlcyBncmFudWxhciBjb250cm9sIG92ZXIgd2hlbiB1c2VyIGludGVyZmFjZSB1cGRhdGVzIGhhcHBlbiBmb3IgY2hhbmdlcyBvbiB0aGlzIGNoYW5uZWwuIFNlZSBiZWxvdyBmb3IgcG9zc2libGUgdmFsdWVzLlxuICogKiBgY2hhbm5lbC5ydW4uc2VydmVyYCBPYmplY3Qgd2l0aCBhZGRpdGlvbmFsIHNlcnZlciBjb25maWd1cmF0aW9uLCBkZWZhdWx0cyB0byBgaG9zdDogJ2FwaS5mb3Jpby5jb20nYC5cbiAqICogYGNoYW5uZWwucnVuLnRyYW5zcG9ydGAgQW4gb2JqZWN0IHdoaWNoIHRha2VzIGFsbCBvZiB0aGUganF1ZXJ5LmFqYXggb3B0aW9ucyBhdCA8YSBocmVmPVwiaHR0cDovL2FwaS5qcXVlcnkuY29tL2pRdWVyeS5hamF4L1wiPmh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS9qUXVlcnkuYWpheC88L2E+LlxuICogKiBgZG9tYCBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBET00gd2hlcmUgdGhpcyBpbnN0YW5jZSBvZiBGbG93LmpzIGlzIGNyZWF0ZWQuXG4gKiAqIGBkb20ucm9vdGAgVGhlIHJvb3QgSFRNTCBlbGVtZW50IGJlaW5nIG1hbmFnZWQgYnkgdGhlIEZsb3cuanMgRE9NIE1hbmFnZXIuIERlZmF1bHRzIHRvIGBib2R5YC5cbiAqICogYGRvbS5hdXRvQmluZGAgSWYgYHRydWVgIChkZWZhdWx0KSwgYXV0b21hdGljYWxseSBwYXJzZSB2YXJpYWJsZXMgYWRkZWQgdG8gdGhlIERPTSBhZnRlciB0aGlzIGBGbG93LmluaXRpYWxpemUoKWAgY2FsbC4gTm90ZSwgdGhpcyBkb2VzIG5vdCB3b3JrIGluIElFIHZlcnNpb25zIDwgMTEuXG4gKlxuICogVGhlIGBzaWxlbnRgIGNvbmZpZ3VyYXRpb24gb3B0aW9uIGZvciB0aGUgYHJ1bi52YXJpYWJsZXNgIGFuZCBgcnVuLm9wZXJhdGlvbnNgIGlzIGEgZmxhZyBmb3IgcHJvdmlkaW5nIG1vcmUgZ3JhbnVsYXIgY29udHJvbCBvdmVyIHdoZW4gdXNlciBpbnRlcmZhY2UgdXBkYXRlcyBoYXBwZW4gZm9yIGNoYW5nZXMgb24gdGhpcyBjaGFubmVsLiBWYWx1ZXMgY2FuIGJlOlxuICpcbiAqICogYGZhbHNlYDogQWx3YXlzIHVwZGF0ZSB0aGUgVUkgZm9yIGFueSBjaGFuZ2VzICh2YXJpYWJsZXMgdXBkYXRlZCwgb3BlcmF0aW9ucyBjYWxsZWQpIG9uIHRoaXMgY2hhbm5lbC4gVGhpcyBpcyB0aGUgZGVmYXVsdCBiZWhhdmlvci5cbiAqICogYHRydWVgOiBOZXZlciB1cGRhdGUgdGhlIFVJIGZvciBhbnkgb24gY2hhbmdlcyAodmFyaWFibGVzIHVwZGF0ZWQsIG9wZXJhdGlvbnMgY2FsbGVkKSBvbiB0aGlzIGNoYW5uZWwuXG4gKiAqIEFycmF5IG9mIHZhcmlhYmxlcyBvciBvcGVyYXRpb25zIGZvciB3aGljaCB0aGUgVUkgKnNob3VsZCBub3QqIGJlIHVwZGF0ZWQuIEZvciBleGFtcGxlLCBgdmFyaWFibGVzOiB7IHNpbGVudDogWyAncHJpY2UnLCAnc2FsZXMnIF0gfWAgbWVhbnMgdGhpcyBjaGFubmVsIGlzIHNpbGVudCAobm8gdXBkYXRlcyBmb3IgdGhlIFVJKSB3aGVuIHRoZSB2YXJpYWJsZXMgJ3ByaWNlJyBvciAnc2FsZXMnIGNoYW5nZSwgYW5kIHRoZSBVSSBpcyBhbHdheXMgdXBkYXRlZCBmb3IgYW55IGNoYW5nZXMgdG8gb3RoZXIgdmFyaWFibGVzLiBUaGlzIGlzIHVzZWZ1bCBpZiB5b3Uga25vdyB0aGF0IGNoYW5naW5nICdwcmljZScgb3IgJ3NhbGVzJyBkb2VzIG5vdCBpbXBhY3QgYW55dGhpbmcgZWxzZSBpbiB0aGUgVUkgZGlyZWN0bHksIGZvciBpbnN0YW5jZS5cbiAqICogYGV4Y2VwdGA6IFdpdGggYXJyYXkgb2YgdmFyaWFibGVzIG9yIG9wZXJhdGlvbnMgZm9yIHdoaWNoIHRoZSBVSSAqc2hvdWxkKiBiZSB1cGRhdGVkLiBGb3IgZXhhbXBsZSwgYHZhcmlhYmxlcyB7IHNpbGVudDogeyBleGNlcHQ6IFsgJ3ByaWNlJywgJ3NhbGVzJyBdIH0gfWAgaXMgdGhlIGNvbnZlcnNlIG9mIHRoZSBhYm92ZS4gVGhlIFVJIGlzIGFsd2F5cyB1cGRhdGVkIHdoZW4gYW55dGhpbmcgb24gdGhpcyBjaGFubmVsIGNoYW5nZXMgKmV4Y2VwdCogd2hlbiB0aGUgdmFyaWFibGVzICdwcmljZScgb3IgJ3NhbGVzJyBhcmUgdXBkYXRlZC5cbiAqXG4gKiBBbHRob3VnaCBGbG93LmpzIHByb3ZpZGVzIGEgYmktZGlyZWN0aW9uYWwgYmluZGluZyBiZXR3ZWVuIHRoZSBtb2RlbCBhbmQgdGhlIHVzZXIgaW50ZXJmYWNlLCB0aGUgYHNpbGVudGAgY29uZmlndXJhdGlvbiBvcHRpb24gYXBwbGllcyBvbmx5IGZvciB0aGUgYmluZGluZyBmcm9tIHRoZSBtb2RlbCB0byB0aGUgdXNlciBpbnRlcmZhY2U7IHVwZGF0ZXMgaW4gdGhlIHVzZXIgaW50ZXJmYWNlIChpbmNsdWRpbmcgY2FsbHMgdG8gb3BlcmF0aW9ucykgYXJlIHN0aWxsIHNlbnQgdG8gdGhlIG1vZGVsLlxuICpcbiAqIFRoZSBgRmxvdy5pbml0aWFsaXplKClgIGNhbGwgaXMgYmFzZWQgb24gdGhlIEVwaWNlbnRlci5qcyBbUnVuIFNlcnZpY2VdKC4uLy4uLy4uL2FwaV9hZGFwdGVycy9nZW5lcmF0ZWQvcnVuLWFwaS1zZXJ2aWNlLykgZnJvbSB0aGUgW0FQSSBBZGFwdGVyc10oLi4vLi4vLi4vYXBpX2FkYXB0ZXJzLykuIFNlZSB0aG9zZSBwYWdlcyBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiBvbiBwYXJhbWV0ZXJzLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgICBGbG93LmluaXRpYWxpemUoe1xuICogICAgICAgICAgY2hhbm5lbDoge1xuICogICAgICAgICAgICAgIHN0cmF0ZWd5OiAnbmV3LWlmLXBlcnNpc3RlZCcsXG4gKiAgICAgICAgICAgICAgcnVuOiB7XG4gKiAgICAgICAgICAgICAgICAgIG1vZGVsOiAnc3VwcGx5LWNoYWluLWdhbWUucHknLFxuICogICAgICAgICAgICAgICAgICBhY2NvdW50OiAnYWNtZS1zaW11bGF0aW9ucycsXG4gKiAgICAgICAgICAgICAgICAgIHByb2plY3Q6ICdzdXBwbHktY2hhaW4tZ2FtZScsXG4gKiAgICAgICAgICAgICAgICAgIHNlcnZlcjogeyBob3N0OiAnYXBpLmZvcmlvLmNvbScgfSxcbiAqICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOiB7IHNpbGVudDogWydwcmljZScsICdzYWxlcyddIH0sXG4gKiAgICAgICAgICAgICAgICAgIG9wZXJhdGlvbnM6IHsgc2lsZW50OiBmYWxzZSB9LFxuICogICAgICAgICAgICAgICAgICB0cmFuc3BvcnQ6IHtcbiAqICAgICAgICAgICAgICAgICAgICAgIGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCkgeyAkKCdib2R5JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTsgfSxcbiAqICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbigpIHsgJCgnYm9keScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7IH1cbiAqICAgICAgICAgICAgICAgICAgfVxuICogICAgICAgICAgICAgIH1cbiAqICAgICAgICAgIH1cbiAqICAgICAgfSk7XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZG9tTWFuYWdlciA9IHJlcXVpcmUoJy4vZG9tL2RvbS1tYW5hZ2VyJyk7XG52YXIgQ2hhbm5lbCA9IHJlcXVpcmUoJy4vY2hhbm5lbHMvcnVuLWNoYW5uZWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZG9tOiBkb21NYW5hZ2VyLFxuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICB2YXIgbW9kZWwgPSAkKCdib2R5JykuZGF0YSgnZi1tb2RlbCcpO1xuXG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIGNoYW5uZWw6IHtcbiAgICAgICAgICAgICAgICBydW46IHtcbiAgICAgICAgICAgICAgICAgICAgYWNjb3VudDogJycsXG4gICAgICAgICAgICAgICAgICAgIHByb2plY3Q6ICcnLFxuICAgICAgICAgICAgICAgICAgICBtb2RlbDogbW9kZWwsXG5cbiAgICAgICAgICAgICAgICAgICAgb3BlcmF0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9GZXRjaDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRvbToge1xuICAgICAgICAgICAgICAgIHJvb3Q6ICdib2R5JyxcbiAgICAgICAgICAgICAgICBhdXRvQmluZDogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBvcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBjb25maWcpO1xuICAgICAgICB2YXIgJHJvb3QgPSAkKG9wdGlvbnMuZG9tLnJvb3QpO1xuICAgICAgICB2YXIgaW5pdEZuID0gJHJvb3QuZGF0YSgnZi1vbi1pbml0Jyk7XG4gICAgICAgIHZhciBvcG5TaWxlbnQgPSBvcHRpb25zLmNoYW5uZWwucnVuLm9wZXJhdGlvbnMuc2lsZW50O1xuICAgICAgICB2YXIgaXNJbml0T3BlcmF0aW9uU2lsZW50ID0gaW5pdEZuICYmIChvcG5TaWxlbnQgPT09IHRydWUgfHwgKF8uaXNBcnJheShvcG5TaWxlbnQpICYmIF8uY29udGFpbnMob3BuU2lsZW50LCBpbml0Rm4pKSk7XG4gICAgICAgIHZhciBwcmVGZXRjaFZhcmlhYmxlcyA9ICFpbml0Rm4gfHwgaXNJbml0T3BlcmF0aW9uU2lsZW50O1xuXG4gICAgICAgIGlmIChwcmVGZXRjaFZhcmlhYmxlcykge1xuICAgICAgICAgICAgb3B0aW9ucy5jaGFubmVsLnJ1bi52YXJpYWJsZXMuYXV0b0ZldGNoLnN0YXJ0ID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcgJiYgY29uZmlnLmNoYW5uZWwgJiYgKGNvbmZpZy5jaGFubmVsIGluc3RhbmNlb2YgQ2hhbm5lbCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2hhbm5lbCA9IGNvbmZpZy5jaGFubmVsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jaGFubmVsID0gbmV3IENoYW5uZWwob3B0aW9ucy5jaGFubmVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvbU1hbmFnZXIuaW5pdGlhbGl6ZSgkLmV4dGVuZCh0cnVlLCB7XG4gICAgICAgICAgICBjaGFubmVsOiB0aGlzLmNoYW5uZWxcbiAgICAgICAgfSwgb3B0aW9ucy5kb20pKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIG1hdGNoOiBmdW5jdGlvbiAobWF0Y2hFeHByLCBtYXRjaFZhbHVlLCBjb250ZXh0KSB7XG4gICAgICAgIGlmIChfLmlzU3RyaW5nKG1hdGNoRXhwcikpIHtcbiAgICAgICAgICAgIHJldHVybiAobWF0Y2hFeHByID09PSAnKicgfHwgKG1hdGNoRXhwci50b0xvd2VyQ2FzZSgpID09PSBtYXRjaFZhbHVlLnRvTG93ZXJDYXNlKCkpKTtcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24obWF0Y2hFeHByKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoRXhwcihtYXRjaFZhbHVlLCBjb250ZXh0KTtcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzUmVnRXhwKG1hdGNoRXhwcikpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaFZhbHVlLm1hdGNoKG1hdGNoRXhwcik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZ2V0Q29udmVydGVyc0xpc3Q6IGZ1bmN0aW9uICgkZWwsIHByb3BlcnR5KSB7XG4gICAgICAgIHZhciBhdHRyQ29udmVydGVycyA9ICRlbC5kYXRhKCdmLWNvbnZlcnQtJyArIHByb3BlcnR5KTtcblxuICAgICAgICBpZiAoIWF0dHJDb252ZXJ0ZXJzICYmIChwcm9wZXJ0eSA9PT0gJ2JpbmQnIHx8IHByb3BlcnR5ID09PSAnZm9yZWFjaCcpKSB7XG4gICAgICAgICAgICAvL09ubHkgYmluZCBpbmhlcml0cyBmcm9tIHBhcmVudHNcbiAgICAgICAgICAgIGF0dHJDb252ZXJ0ZXJzID0gJGVsLmRhdGEoJ2YtY29udmVydCcpO1xuICAgICAgICAgICAgaWYgKCFhdHRyQ29udmVydGVycykge1xuICAgICAgICAgICAgICAgIHZhciAkcGFyZW50RWwgPSAkZWwuY2xvc2VzdCgnW2RhdGEtZi1jb252ZXJ0XScpO1xuICAgICAgICAgICAgICAgIGlmICgkcGFyZW50RWwpIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSAkcGFyZW50RWwuZGF0YSgnZi1jb252ZXJ0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYXR0ckNvbnZlcnRlcnMpIHtcbiAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9IF8uaW52b2tlKGF0dHJDb252ZXJ0ZXJzLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXR0ckNvbnZlcnRlcnM7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0b0ltcGxpY2l0VHlwZTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIHJicmFjZSA9IC9eKD86XFx7LipcXH18XFxbLipcXF0pJC87XG4gICAgICAgIHZhciBjb252ZXJ0ZWQgPSBkYXRhO1xuICAgICAgICBpZiAodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBkYXRhID0gZGF0YS50cmltKCk7XG5cbiAgICAgICAgICAgIGlmIChkYXRhID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEgPT09ICdudWxsJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gJyc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnZlcnRlZC5jaGFyQXQoMCkgPT09ICdcXCcnIHx8IGNvbnZlcnRlZC5jaGFyQXQoMCkgPT09ICdcIicpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBkYXRhLnN1YnN0cmluZygxLCBkYXRhLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkLmlzTnVtZXJpYyhkYXRhKSkge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9ICtkYXRhO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyYnJhY2UudGVzdChkYXRhKSkge1xuICAgICAgICAgICAgICAgIC8vVE9ETzogVGhpcyBvbmx5IHdvcmtzIHdpdGggZG91YmxlIHF1b3RlcywgaS5lLiwgWzEsXCIyXCJdIHdvcmtzIGJ1dCBub3QgWzEsJzInXVxuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9ICQucGFyc2VKU09OKGRhdGEpIDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29udmVydGVkO1xuICAgIH1cbn07XG4iXX0=
