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

},{"../config":5,"../converters/converter-manager":7,"../utils/dom":33,"../utils/parse-utils":34,"./attributes/attribute-manager":12,"./nodes/node-manager":29,"./plugins/auto-update-bindings":30}],26:[function(require,module,exports){
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

var BaseView = require('../../utils/base-view');

module.exports = BaseView.extend({
    propertyHandlers: [

    ],

    initialize: function () {
    }
}, { selector: '*' });

},{"../../utils/base-view":32}],28:[function(require,module,exports){
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
var BaseView = require('./utils/base-view');

module.exports = {
    dom: domManager,
    utils: {
        BaseView: BaseView
    },
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

},{"./channels/run-channel":3,"./dom/dom-manager":25,"./utils/base-view":32}],32:[function(require,module,exports){
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

},{}],33:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYXBwLmpzIiwic3JjL2NoYW5uZWxzL29wZXJhdGlvbnMtY2hhbm5lbC5qcyIsInNyYy9jaGFubmVscy9ydW4tY2hhbm5lbC5qcyIsInNyYy9jaGFubmVscy92YXJpYWJsZXMtY2hhbm5lbC5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvY29udmVydGVycy9hcnJheS1jb252ZXJ0ZXIuanMiLCJzcmMvY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlci5qcyIsInNyYy9jb252ZXJ0ZXJzL251bWJlci1jb252ZXJ0ZXIuanMiLCJzcmMvY29udmVydGVycy9udW1iZXJmb3JtYXQtY29udmVydGVyLmpzIiwic3JjL2NvbnZlcnRlcnMvc3RyaW5nLWNvbnZlcnRlci5qcyIsInNyYy9jb252ZXJ0ZXJzL3VuZGVyc2NvcmUtdXRpbHMtY29udmVydGVyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2F0dHJpYnV0ZS1tYW5hZ2VyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2NoZWNrYm94LXJhZGlvLWJpbmQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9kZWZhdWx0LWJpbmQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9pbnB1dC1iaW5kLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvY2xhc3MtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9kZWZhdWx0LWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvZXZlbnRzL2RlZmF1bHQtZXZlbnQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9ldmVudHMvaW5pdC1ldmVudC1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2ZvcmVhY2gvZGVmYXVsdC1mb3JlYWNoLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvbmVnYXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL25vLW9wLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvcG9zaXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL3JlcGVhdC1hdHRyLmpzIiwic3JjL2RvbS9kb20tbWFuYWdlci5qcyIsInNyYy9kb20vbm9kZXMvZGVmYXVsdC1pbnB1dC1ub2RlLmpzIiwic3JjL2RvbS9ub2Rlcy9kZWZhdWx0LW5vZGUuanMiLCJzcmMvZG9tL25vZGVzL2lucHV0LWNoZWNrYm94LW5vZGUuanMiLCJzcmMvZG9tL25vZGVzL25vZGUtbWFuYWdlci5qcyIsInNyYy9kb20vcGx1Z2lucy9hdXRvLXVwZGF0ZS1iaW5kaW5ncy5qcyIsInNyYy9mbG93LmpzIiwic3JjL3V0aWxzL2Jhc2Utdmlldy5qcyIsInNyYy91dGlscy9kb20uanMiLCJzcmMvdXRpbHMvcGFyc2UtdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbmRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ3aW5kb3cuRmxvdyA9IHJlcXVpcmUoJy4vZmxvdy5qcycpO1xud2luZG93LkZsb3cudmVyc2lvbiA9ICc8JT0gdmVyc2lvbiAlPic7IC8vcG9wdWxhdGVkIGJ5IGdydW50XG4iLCIvKipcbiAqICMjIE9wZXJhdGlvbnMgQ2hhbm5lbFxuICpcbiAqIENoYW5uZWxzIGFyZSB3YXlzIGZvciBGbG93LmpzIHRvIHRhbGsgdG8gZXh0ZXJuYWwgQVBJcyAtLSBwcmltYXJpbHkgdGhlIFt1bmRlcmx5aW5nIEVwaWNlbnRlciBBUElzXSguLi8uLi8uLi8uLi9jcmVhdGluZ195b3VyX2ludGVyZmFjZS8pLlxuICpcbiAqIFRoZSBwcmltYXJ5IHVzZSBjYXNlcyBmb3IgdGhlIE9wZXJhdGlvbnMgQ2hhbm5lbCBhcmU6XG4gKlxuICogKiBgcHVibGlzaGA6IENhbGwgYW4gb3BlcmF0aW9uLlxuICogKiBgc3Vic2NyaWJlYDogUmVjZWl2ZSBub3RpZmljYXRpb25zIHdoZW4gYW4gb3BlcmF0aW9uIGlzIGNhbGxlZC5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgdXNlIGBwdWJsaXNoKClgIHRvIGNhbGwgYW4gb3BlcmF0aW9uIChtZXRob2QpIGZyb20geW91ciBtb2RlbDpcbiAqXG4gKiAgICAgIEZsb3cuY2hhbm5lbC5vcGVyYXRpb25zLnB1Ymxpc2goJ215TWV0aG9kJywgbXlNZXRob2RQYXJhbSk7XG4gKlxuICogRm9yIHJlZmVyZW5jZSwgYW4gZXF1aXZhbGVudCBjYWxsIHVzaW5nIEZsb3cuanMgY3VzdG9tIEhUTUwgYXR0cmlidXRlcyBpczpcbiAqXG4gKiAgICAgIDxidXR0b24gZGF0YS1mLW9uLWNsaWNrPVwibXlNZXRob2QobXlNZXRob2RQYXJhbSlcIj5DbGljayBtZTwvYnV0dG9uPlxuICpcbiAqIFlvdSBjYW4gYWxzbyB1c2UgYHN1YnNjcmliZSgpYCBhbmQgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBsaXN0ZW4gYW5kIHJlYWN0IHdoZW4gdGhlIG9wZXJhdGlvbiBoYXMgYmVlbiBjYWxsZWQ6XG4gKlxuICogICAgICBGbG93LmNoYW5uZWwub3BlcmF0aW9ucy5zdWJzY3JpYmUoJ215TWV0aG9kJyxcbiAqICAgICAgICAgIGZ1bmN0aW9uKCkgeyBjb25zb2xlLmxvZygnY2FsbGVkIScpOyB9ICk7XG4gKlxuICogVXNlIGBzdWJzY3JpYmUoKilgIHRvIGxpc3RlbiBmb3Igbm90aWZpY2F0aW9ucyBvbiBhbGwgb3BlcmF0aW9ucy5cbiAqXG4gKiBUbyB1c2UgdGhlIE9wZXJhdGlvbnMgQ2hhbm5lbCwgc2ltcGx5IFtpbml0aWFsaXplIEZsb3cuanMgaW4geW91ciBwcm9qZWN0XSguLi8uLi8uLi8jY3VzdG9tLWluaXRpYWxpemUpLlxuICpcbiovXG5cblxuJ3VzZSBzdHJpY3QnO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRGV0ZXJtaW5lIHdoZW4gdG8gdXBkYXRlIHN0YXRlLiBEZWZhdWx0cyB0byBgZmFsc2VgOiBhbHdheXMgdHJpZ2dlciB1cGRhdGVzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBQb3NzaWJsZSBvcHRpb25zIGFyZTpcbiAgICAgICAgICpcbiAgICAgICAgICogKiBgdHJ1ZWA6IE5ldmVyIHRyaWdnZXIgYW55IHVwZGF0ZXMuIFVzZSB0aGlzIGlmIHlvdSBrbm93IHlvdXIgbW9kZWwgc3RhdGUgd29uJ3QgY2hhbmdlIGJhc2VkIG9uIG9wZXJhdGlvbnMuXG4gICAgICAgICAqICogYGZhbHNlYDogQWx3YXlzIHRyaWdnZXIgdXBkYXRlcy5cbiAgICAgICAgICogKiBgW2FycmF5IG9mIG9wZXJhdGlvbiBuYW1lc11gOiBPcGVyYXRpb25zIGluIHRoaXMgYXJyYXkgKndpbGwgbm90KiB0cmlnZ2VyIHVwZGF0ZXM7IGV2ZXJ5dGhpbmcgZWxzZSB3aWxsLlxuICAgICAgICAgKiAqIGB7IGV4Y2VwdDogW2FycmF5IG9mIG9wZXJhdGlvbiBuYW1lc10gfWA6IE9wZXJhdGlvbnMgaW4gdGhpcyBhcnJheSAqd2lsbCogdHJpZ2dlciB1cGRhdGVzOyBub3RoaW5nIGVsc2Ugd2lsbC5cbiAgICAgICAgICpcbiAgICAgICAgICogVG8gc2V0LCBwYXNzIHRoaXMgaW50byB0aGUgYEZsb3cuaW5pdGlhbGl6ZSgpYCBjYWxsIGluIHRoZSBgY2hhbm5lbC5ydW4ub3BlcmF0aW9uc2AgZmllbGQ6XG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5pbml0aWFsaXplKHtcbiAgICAgICAgICogICAgICAgICAgY2hhbm5lbDoge1xuICAgICAgICAgKiAgICAgICAgICAgICAgcnVuOiB7XG4gICAgICAgICAqICAgICAgICAgICAgICAgICAgbW9kZWw6ICdteU1vZGVsLnB5JyxcbiAgICAgICAgICogICAgICAgICAgICAgICAgICBhY2NvdW50OiAnYWNtZS1zaW11bGF0aW9ucycsXG4gICAgICAgICAqICAgICAgICAgICAgICAgICAgcHJvamVjdDogJ3N1cHBseS1jaGFpbi1nYW1lJyxcbiAgICAgICAgICogICAgICAgICAgICAgICAgICBvcGVyYXRpb25zOiB7IHNpbGVudDogdHJ1ZSB9XG4gICAgICAgICAqICAgICAgICAgICAgICB9XG4gICAgICAgICAqICAgICAgICAgIH1cbiAgICAgICAgICogICAgICB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogVG8gb3ZlcnJpZGUgZm9yIGEgc3BlY2lmaWMgY2FsbCB0byB0aGUgT3BlcmF0aW9ucyBDaGFubmVsLCBwYXNzIHRoaXMgYXMgdGhlIGZpbmFsIGBvcHRpb25zYCBwYXJhbWV0ZXI6XG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgIEZsb3cuY2hhbm5lbC5vcGVyYXRpb25zLnB1Ymxpc2goJ215TWV0aG9kJywgbXlNZXRob2RQYXJhbSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtTdHJpbmd8QXJyYXl8T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgc2lsZW50OiBmYWxzZSxcblxuICAgICAgICBpbnRlcnBvbGF0ZToge31cbiAgICB9O1xuXG4gICAgdmFyIGNoYW5uZWxPcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICB0aGlzLm9wdGlvbnMgPSBjaGFubmVsT3B0aW9ucztcblxuICAgIHZhciBydW4gPSBjaGFubmVsT3B0aW9ucy5ydW47XG5cbiAgICB2YXIgcHVibGljQVBJID0ge1xuICAgICAgICAvL2ZvciB0ZXN0aW5nXG4gICAgICAgIHByaXZhdGU6IHtcbiAgICAgICAgICAgIG9wdGlvbnM6IGNoYW5uZWxPcHRpb25zXG4gICAgICAgIH0sXG5cbiAgICAgICAgbGlzdGVuZXJNYXA6IHt9LFxuXG4gICAgICAgIGdldFN1YnNjcmliZXJzOiBmdW5jdGlvbiAodG9waWMpIHtcbiAgICAgICAgICAgIHZhciB0b3BpY1N1YnNjcmliZXJzID0gdGhpcy5saXN0ZW5lck1hcFt0b3BpY10gfHwgW107XG4gICAgICAgICAgICB2YXIgZ2xvYmFsU3Vic2NyaWJlcnMgPSB0aGlzLmxpc3RlbmVyTWFwWycqJ10gfHwgW107XG4gICAgICAgICAgICByZXR1cm4gdG9waWNTdWJzY3JpYmVycy5jb25jYXQoZ2xvYmFsU3Vic2NyaWJlcnMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vQ2hlY2sgZm9yIHVwZGF0ZXNcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZvcmNlIGEgY2hlY2sgZm9yIHVwZGF0ZXMgb24gdGhlIGNoYW5uZWwsIGFuZCBub3RpZnkgYWxsIGxpc3RlbmVycy5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9ICBleGVjdXRlZE9wbnMgT3BlcmF0aW9ucyB3aGljaCBqdXN0IGhhcHBlbmVkLlxuICAgICAgICAgKiBAcGFyYW0ge0FueX0gcmVzcG9uc2UgIFJlc3BvbnNlIGZyb20gdGhlIG9wZXJhdGlvbi5cbiAgICAgICAgICogQHBhcmFtIHtCb29sZWFufSBmb3JjZSAgSWdub3JlIGFsbCBgc2lsZW50YCBvcHRpb25zIGFuZCBmb3JjZSByZWZyZXNoLlxuICAgICAgICAgKi9cbiAgICAgICAgcmVmcmVzaDogZnVuY3Rpb24gKGV4ZWN1dGVkT3BucywgcmVzcG9uc2UsIGZvcmNlKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnT3BlcmF0aW9ucyByZWZyZXNoJywgZXhlY3V0ZWRPcG5zKTtcbiAgICAgICAgICAgIHZhciBzaWxlbnQgPSBjaGFubmVsT3B0aW9ucy5zaWxlbnQ7XG5cbiAgICAgICAgICAgIHZhciB0b05vdGlmeSA9IGV4ZWN1dGVkT3BucztcbiAgICAgICAgICAgIGlmIChmb3JjZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzaWxlbnQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICB0b05vdGlmeSA9IFtdO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzQXJyYXkoc2lsZW50KSAmJiBleGVjdXRlZE9wbnMpIHtcbiAgICAgICAgICAgICAgICB0b05vdGlmeSA9IF8uZGlmZmVyZW5jZShleGVjdXRlZE9wbnMsIHNpbGVudCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCQuaXNQbGFpbk9iamVjdChzaWxlbnQpICYmIGV4ZWN1dGVkT3Bucykge1xuICAgICAgICAgICAgICAgIHRvTm90aWZ5ID0gXy5pbnRlcnNlY3Rpb24oc2lsZW50LmV4Y2VwdCwgZXhlY3V0ZWRPcG5zKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgXy5lYWNoKHRvTm90aWZ5LCBmdW5jdGlvbiAob3BuKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ub3RpZnkob3BuLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWxlcnQgZWFjaCBzdWJzY3JpYmVyIGFib3V0IHRoZSBvcGVyYXRpb24gYW5kIGl0cyBwYXJhbWV0ZXJzLiBUaGlzIGNhbiBiZSB1c2VkIHRvIHByb3ZpZGUgYW4gdXBkYXRlIHdpdGhvdXQgYSByb3VuZCB0cmlwIHRvIHRoZSBzZXJ2ZXIuIEhvd2V2ZXIsIGl0IGlzIHJhcmVseSB1c2VkOiB5b3UgYWxtb3N0IGFsd2F5cyB3YW50IHRvIGBzdWJzY3JpYmUoKWAgaW5zdGVhZCBzbyB0aGF0IHRoZSBvcGVyYXRpb24gaXMgYWN0dWFsbHkgY2FsbGVkIGluIHRoZSBtb2RlbC5cbiAgICAgICAgICpcbiAgICAgICAgICogKipFeGFtcGxlKipcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICBGbG93LmNoYW5uZWwub3BlcmF0aW9ucy5ub3RpZnkoJ215TWV0aG9kJywgbXlNZXRob2RSZXNwb25zZSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcGVyYXRpb24gTmFtZSBvZiBvcGVyYXRpb24uXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcnxBcnJheXxPYmplY3R9IHZhbHVlIFBhcmFtZXRlciB2YWx1ZXMgZm9yIHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgICAgKi9cbiAgICAgICAgbm90aWZ5OiBmdW5jdGlvbiAob3BlcmF0aW9uLCB2YWx1ZSkge1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2V0U3Vic2NyaWJlcnMob3BlcmF0aW9uKTtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHBhcmFtc1tvcGVyYXRpb25dID0gdmFsdWU7XG5cbiAgICAgICAgICAgIF8uZWFjaChsaXN0ZW5lcnMsIGZ1bmN0aW9uIChsaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSBsaXN0ZW5lci50YXJnZXQ7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5jYWxsKG51bGwsIHBhcmFtcywgdmFsdWUsIG9wZXJhdGlvbik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0YXJnZXQudHJpZ2dlcikge1xuICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lci50YXJnZXQudHJpZ2dlcihjb25maWcuZXZlbnRzLnJlYWN0LCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBsaXN0ZW5lciBmb3JtYXQgZm9yICcgKyBvcGVyYXRpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGludGVycG9sYXRlOiBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICB2YXIgaXAgPSB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGU7XG4gICAgICAgICAgICB2YXIgbWF0Y2ggPSBmdW5jdGlvbiAocCkge1xuICAgICAgICAgICAgICAgIHZhciBtYXBwZWQgPSBwO1xuICAgICAgICAgICAgICAgIGlmIChpcFtwXSkge1xuICAgICAgICAgICAgICAgICAgICBtYXBwZWQgPSBfLmlzRnVuY3Rpb24oaXBbcF0pID8gaXBbcF0ocCkgOiBpcFtwXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hcHBlZDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gKCQuaXNBcnJheShwYXJhbXMpKSA/IF8ubWFwKHBhcmFtcywgbWF0Y2gpIDogbWF0Y2gocGFyYW1zKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2FsbCB0aGUgb3BlcmF0aW9uIHdpdGggcGFyYW1ldGVycywgYW5kIGFsZXJ0IHN1YnNjcmliZXJzLlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC5vcGVyYXRpb25zLnB1Ymxpc2goJ215TWV0aG9kJywgbXlNZXRob2RQYXJhbSk7XG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMucHVibGlzaCh7XG4gICAgICAgICAqICAgICAgICAgIG9wZXJhdGlvbnM6IFt7IG5hbWU6ICdteU1ldGhvZCcsIHBhcmFtczogW215TWV0aG9kUGFyYW1dIH1dXG4gICAgICAgICAqICAgICAgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSAge1N0cmluZ3xPYmplY3R9IG9wZXJhdGlvbiBGb3Igb25lIG9wZXJhdGlvbiwgcGFzcyB0aGUgbmFtZSBvZiBvcGVyYXRpb24gKHN0cmluZykuIEZvciBtdWx0aXBsZSBvcGVyYXRpb25zLCBwYXNzIGFuIG9iamVjdCB3aXRoIGZpZWxkIGBvcGVyYXRpb25zYCBhbmQgdmFsdWUgYXJyYXkgb2Ygb2JqZWN0cywgZWFjaCB3aXRoIGBuYW1lYCBhbmQgYHBhcmFtc2A6IGB7b3BlcmF0aW9uczogW3sgbmFtZTogb3BuLCBwYXJhbXM6W10gfV0gfWAuXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcnxBcnJheXxPYmplY3R9IHBhcmFtcyAoT3B0aW9uYWwpICBQYXJhbWV0ZXJzIHRvIHNlbmQgdG8gb3BlcmF0aW9uLiBVc2UgZm9yIG9uZSBvcGVyYXRpb247IGZvciBtdWx0aXBsZSBvcGVyYXRpb25zLCBwYXJhbWV0ZXJzIGFyZSBhbHJlYWR5IGluY2x1ZGVkIGluIHRoZSBvYmplY3QgZm9ybWF0LlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAoT3B0aW9uYWwpIE92ZXJyaWRlcyBmb3IgdGhlIGRlZmF1bHQgY2hhbm5lbCBvcHRpb25zLlxuICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuc2lsZW50IERldGVybWluZSB3aGVuIHRvIHVwZGF0ZSBzdGF0ZS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybiB7JHByb21pc2V9IFByb21pc2UgdG8gY29tcGxldGUgdGhlIGNhbGwuXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaXNoOiBmdW5jdGlvbiAob3BlcmF0aW9uLCBwYXJhbXMsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KG9wZXJhdGlvbikgJiYgb3BlcmF0aW9uLm9wZXJhdGlvbnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm4gPSAob3BlcmF0aW9uLnNlcmlhbCkgPyBydW4uc2VyaWFsIDogcnVuLnBhcmFsbGVsO1xuICAgICAgICAgICAgICAgIF8uZWFjaChvcGVyYXRpb24ub3BlcmF0aW9ucywgZnVuY3Rpb24gKG9wbikge1xuICAgICAgICAgICAgICAgICAgICBvcG4ucGFyYW1zID0gdGhpcy5pbnRlcnBvbGF0ZShvcG4ucGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4uY2FsbChydW4sIG9wZXJhdGlvbi5vcGVyYXRpb25zKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwYXJhbXMgfHwgIXBhcmFtcy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWUucmVmcmVzaC5jYWxsKG1lLCBfLnBsdWNrKG9wZXJhdGlvbi5vcGVyYXRpb25zLCAnbmFtZScpLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBvcHRzID0gKCQuaXNQbGFpbk9iamVjdChvcGVyYXRpb24pKSA/IHBhcmFtcyA6IG9wdGlvbnM7XG4gICAgICAgICAgICAgICAgaWYgKCEkLmlzUGxhaW5PYmplY3Qob3BlcmF0aW9uKSAmJiBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zID0gdGhpcy5pbnRlcnBvbGF0ZShwYXJhbXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcnVuLmRvLmNhbGwocnVuLCBvcGVyYXRpb24sIHBhcmFtcylcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW9wdHMgfHwgIW9wdHMuc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWUucmVmcmVzaC5jYWxsKG1lLCBbb3BlcmF0aW9uXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnb3BlcmF0aW9ucyBwdWJsaXNoJywgb3BlcmF0aW9uLCBwYXJhbXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdWJzY3JpYmUgdG8gY2hhbmdlcyBvbiBhIGNoYW5uZWw6IEFzayBmb3Igbm90aWZpY2F0aW9uIHdoZW4gb3BlcmF0aW9ucyBhcmUgY2FsbGVkLlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC5vcGVyYXRpb25zLnN1YnNjcmliZSgnbXlNZXRob2QnLFxuICAgICAgICAgKiAgICAgICAgICBmdW5jdGlvbigpIHsgY29uc29sZS5sb2coJ2NhbGxlZCEnKTsgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBvcGVyYXRpb25zIFRoZSBuYW1lcyBvZiB0aGUgb3BlcmF0aW9ucy4gVXNlIGAqYCB0byBsaXN0ZW4gZm9yIG5vdGlmaWNhdGlvbnMgb24gYWxsIG9wZXJhdGlvbnMuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fEZ1bmN0aW9ufSBzdWJzY3JpYmVyIFRoZSBvYmplY3Qgb3IgZnVuY3Rpb24gYmVpbmcgbm90aWZpZWQuIE9mdGVuIHRoaXMgaXMgYSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBBbiBpZGVudGlmeWluZyB0b2tlbiBmb3IgdGhpcyBzdWJzY3JpcHRpb24uIFJlcXVpcmVkIGFzIGEgcGFyYW1ldGVyIHdoZW4gdW5zdWJzY3JpYmluZy5cbiAgICAgICAgKi9cbiAgICAgICAgc3Vic2NyaWJlOiBmdW5jdGlvbiAob3BlcmF0aW9ucywgc3Vic2NyaWJlcikge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ29wZXJhdGlvbnMgc3Vic2NyaWJlJywgb3BlcmF0aW9ucywgc3Vic2NyaWJlcik7XG4gICAgICAgICAgICBvcGVyYXRpb25zID0gW10uY29uY2F0KG9wZXJhdGlvbnMpO1xuICAgICAgICAgICAgLy91c2UganF1ZXJ5IHRvIG1ha2UgZXZlbnQgc2lua1xuICAgICAgICAgICAgaWYgKCFzdWJzY3JpYmVyLm9uICYmICFfLmlzRnVuY3Rpb24oc3Vic2NyaWJlcikpIHtcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmVyID0gJChzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGlkICA9IF8udW5pcXVlSWQoJ2VwaWNoYW5uZWwub3BlcmF0aW9uJyk7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBzdWJzY3JpYmVyXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuXG4gICAgICAgICAgICAkLmVhY2gob3BlcmF0aW9ucywgZnVuY3Rpb24gKGluZGV4LCBvcG4pIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1lLmxpc3RlbmVyTWFwW29wbl0pIHtcbiAgICAgICAgICAgICAgICAgICAgbWUubGlzdGVuZXJNYXBbb3BuXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtZS5saXN0ZW5lck1hcFtvcG5dID0gbWUubGlzdGVuZXJNYXBbb3BuXS5jb25jYXQoZGF0YSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdG9wIHJlY2VpdmluZyBub3RpZmljYXRpb24gd2hlbiBhbiBvcGVyYXRpb24gaXMgY2FsbGVkLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gb3BlcmF0aW9uIFRoZSBuYW1lcyBvZiB0aGUgb3BlcmF0aW9ucy5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHRva2VuIFRoZSBpZGVudGlmeWluZyB0b2tlbiBmb3IgdGhpcyBzdWJzY3JpcHRpb24uIChDcmVhdGVkIGFuZCByZXR1cm5lZCBieSB0aGUgYHN1YnNjcmliZSgpYCBjYWxsLilcbiAgICAgICAgKi9cbiAgICAgICAgdW5zdWJzY3JpYmU6IGZ1bmN0aW9uIChvcGVyYXRpb24sIHRva2VuKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlbmVyTWFwW29wZXJhdGlvbl0gPSBfLnJlamVjdCh0aGlzLmxpc3RlbmVyTWFwW29wZXJhdGlvbl0sIGZ1bmN0aW9uIChzdWJzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1YnMuaWQgPT09IHRva2VuO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN0b3AgcmVjZWl2aW5nIG5vdGlmaWNhdGlvbnMgZm9yIGFsbCBvcGVyYXRpb25zLiBObyBwYXJhbWV0ZXJzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJuIHtOb25lfVxuICAgICAgICAqL1xuICAgICAgICB1bnN1YnNjcmliZUFsbDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5lck1hcCA9IHt9O1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gJC5leHRlbmQodGhpcywgcHVibGljQVBJKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBWYXJzQ2hhbm5lbCA9IHJlcXVpcmUoJy4vdmFyaWFibGVzLWNoYW5uZWwnKTtcbnZhciBPcGVyYXRpb25zQ2hhbm5lbCA9IHJlcXVpcmUoJy4vb3BlcmF0aW9ucy1jaGFubmVsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgIHJ1bjoge1xuICAgICAgICAgICAgdmFyaWFibGVzOiB7XG5cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvcGVyYXRpb25zOiB7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIGNvbmZpZyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICB2YXIgcm0gPSBuZXcgRi5tYW5hZ2VyLlJ1bk1hbmFnZXIoY29uZmlnKTtcbiAgICB2YXIgcnMgPSBybS5ydW47XG5cbiAgICB2YXIgJGNyZWF0aW9uUHJvbWlzZSA9IHJtLmdldFJ1bigpO1xuICAgIHJzLmN1cnJlbnRQcm9taXNlID0gJGNyZWF0aW9uUHJvbWlzZTtcblxuICAgIC8vICRjcmVhdGlvblByb21pc2VcbiAgICAvLyAgICAgLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgIC8vICAgICAgICAgY29uc29sZS5sb2coJ2RvbmUnKTtcbiAgICAvLyAgICAgfSlcbiAgICAvLyAgICAgLmZhaWwoZnVuY3Rpb24gKCkge1xuICAgIC8vICAgICAgICAgY29uc29sZS5sb2coJ2ZhaWx0Jyk7XG4gICAgLy8gICAgIH0pO1xuXG4gICAgdmFyIGNyZWF0ZUFuZFRoZW4gPSBmdW5jdGlvbiAoZm4sIGNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuIF8ud3JhcChmbiwgZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICAgICAgICAgIHZhciBwYXNzZWRJblBhcmFtcyA9IF8udG9BcnJheShhcmd1bWVudHMpLnNsaWNlKDEpO1xuICAgICAgICAgICAgcmV0dXJuIHJzLmN1cnJlbnRQcm9taXNlLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJzLmN1cnJlbnRQcm9taXNlID0gZnVuYy5hcHBseShjb250ZXh0LCBwYXNzZWRJblBhcmFtcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJzLmN1cnJlbnRQcm9taXNlO1xuICAgICAgICAgICAgfSkuZmFpbChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdUaGlzIGZhaWxlZCwgYnV0IHdlXFwncmUgbW92aW5nIGFoZWFkIHdpdGggdGhlIG5leHQgb25lIGFueXdheScsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgcnMuY3VycmVudFByb21pc2UgPSBmdW5jLmFwcGx5KGNvbnRleHQsIHBhc3NlZEluUGFyYW1zKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcnMuY3VycmVudFByb21pc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vTWFrZSBzdXJlIG5vdGhpbmcgaGFwcGVucyBiZWZvcmUgdGhlIHJ1biBpcyBjcmVhdGVkXG4gICAgdmFyIG5vbldyYXBwZWQgPSBbJ3ZhcmlhYmxlcycsICdjcmVhdGUnLCAnbG9hZCcsICdnZXRDdXJyZW50Q29uZmlnJ107XG4gICAgXy5lYWNoKHJzLCBmdW5jdGlvbiAodmFsdWUsIG5hbWUpIHtcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkgJiYgIV8uY29udGFpbnMobm9uV3JhcHBlZCwgbmFtZSkpIHtcbiAgICAgICAgICAgIHJzW25hbWVdID0gY3JlYXRlQW5kVGhlbih2YWx1ZSwgcnMpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgb3JpZ2luYWxWYXJpYWJsZXNGbiA9IHJzLnZhcmlhYmxlcztcbiAgICBycy52YXJpYWJsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB2cyA9IG9yaWdpbmFsVmFyaWFibGVzRm4uYXBwbHkocnMsIGFyZ3VtZW50cyk7XG4gICAgICAgIF8uZWFjaCh2cywgZnVuY3Rpb24gKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHZzW25hbWVdID0gY3JlYXRlQW5kVGhlbih2YWx1ZSwgdnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHZzO1xuICAgIH07XG5cbiAgICB0aGlzLnJ1biA9IHJzO1xuICAgIHZhciB2YXJPcHRpb25zID0gY29uZmlnLnJ1bi52YXJpYWJsZXM7XG4gICAgdGhpcy52YXJpYWJsZXMgPSBuZXcgVmFyc0NoYW5uZWwoJC5leHRlbmQodHJ1ZSwge30sIHZhck9wdGlvbnMsIHsgcnVuOiBycyB9KSk7XG4gICAgdGhpcy5vcGVyYXRpb25zID0gbmV3IE9wZXJhdGlvbnNDaGFubmVsKCQuZXh0ZW5kKHRydWUsIHt9LCBjb25maWcucnVuLm9wZXJhdGlvbnMsIHsgcnVuOiBycyB9KSk7XG5cbiAgICB2YXIgbWUgPSB0aGlzO1xuICAgIHZhciBkZWJvdW5jZWRSZWZyZXNoID0gXy5kZWJvdW5jZShmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBtZS52YXJpYWJsZXMucmVmcmVzaC5jYWxsKG1lLnZhcmlhYmxlcywgbnVsbCwgdHJ1ZSk7XG4gICAgICAgIGlmIChtZS52YXJpYWJsZXMub3B0aW9ucy5hdXRvRmV0Y2guZW5hYmxlKSB7XG4gICAgICAgICAgICBtZS52YXJpYWJsZXMuc3RhcnRBdXRvRmV0Y2goKTtcbiAgICAgICAgfVxuICAgIH0sIDIwMCwgeyBsZWFkaW5nOiB0cnVlIH0pO1xuXG4gICAgdGhpcy5vcGVyYXRpb25zLnN1YnNjcmliZSgnKicsIGRlYm91bmNlZFJlZnJlc2gpO1xufTtcbiIsIi8qKlxuICogIyMgVmFyaWFibGVzIENoYW5uZWxcbiAqXG4gKiBDaGFubmVscyBhcmUgd2F5cyBmb3IgRmxvdy5qcyB0byB0YWxrIHRvIGV4dGVybmFsIEFQSXMgLS0gcHJpbWFyaWx5IHRoZSBbdW5kZXJseWluZyBFcGljZW50ZXIgQVBJc10oLi4vLi4vLi4vLi4vY3JlYXRpbmdfeW91cl9pbnRlcmZhY2UvKS5cbiAqXG4gKiBUaGUgcHJpbWFyeSB1c2UgY2FzZXMgZm9yIHRoZSBWYXJpYWJsZXMgQ2hhbm5lbCBhcmU6XG4gKlxuICogKiBgcHVibGlzaGA6IFVwZGF0ZSBhIG1vZGVsIHZhcmlhYmxlLlxuICogKiBgc3Vic2NyaWJlYDogUmVjZWl2ZSBub3RpZmljYXRpb25zIHdoZW4gYSBtb2RlbCB2YXJpYWJsZSBpcyB1cGRhdGVkLlxuICpcbiAqIEZvciBleGFtcGxlLCB1c2UgYHB1Ymxpc2goKWAgdG8gdXBkYXRlIGEgbW9kZWwgdmFyaWFibGU6XG4gKlxuICogICAgICBGbG93LmNoYW5uZWwub3BlcmF0aW9ucy5wdWJsaXNoKCdteVZhcmlhYmxlJywgbmV3VmFsdWUpO1xuICpcbiAqIEZvciByZWZlcmVuY2UsIGFuIGVxdWl2YWxlbnQgY2FsbCB1c2luZyBGbG93LmpzIGN1c3RvbSBIVE1MIGF0dHJpYnV0ZXMgaXM6XG4gKlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cIm15VmFyaWFibGVcIiB2YWx1ZT1cIm5ld1ZhbHVlXCI+PC9pbnB1dD5cbiAqXG4gKiB3aGVyZSB0aGUgbmV3IHZhbHVlIGlzIGlucHV0IGJ5IHRoZSB1c2VyLlxuICpcbiAqIFlvdSBjYW4gYWxzbyB1c2UgYHN1YnNjcmliZSgpYCBhbmQgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBsaXN0ZW4gYW5kIHJlYWN0IHdoZW4gdGhlIG1vZGVsIHZhcmlhYmxlIGhhcyBiZWVuIHVwZGF0ZWQ6XG4gKlxuICogICAgICBGbG93LmNoYW5uZWwub3BlcmF0aW9ucy5zdWJzY3JpYmUoJ215VmFyaWFibGUnLFxuICogICAgICAgICAgZnVuY3Rpb24oKSB7IGNvbnNvbGUubG9nKCdjYWxsZWQhJyk7IH0gKTtcbiAqXG4gKiBUbyB1c2UgdGhlIFZhcmlhYmxlcyBDaGFubmVsLCBzaW1wbHkgW2luaXRpYWxpemUgRmxvdy5qcyBpbiB5b3VyIHByb2plY3RdKC4uLy4uLy4uLyNjdXN0b20taW5pdGlhbGl6ZSkuXG4gKlxuKi9cblxuJ3VzZSBzdHJpY3QnO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRGV0ZXJtaW5lIHdoZW4gdG8gdXBkYXRlIHN0YXRlLiBEZWZhdWx0cyB0byBgZmFsc2VgOiBhbHdheXMgdHJpZ2dlciB1cGRhdGVzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBQb3NzaWJsZSBvcHRpb25zIGFyZTpcbiAgICAgICAgICpcbiAgICAgICAgICogKiBgdHJ1ZWA6IE5ldmVyIHRyaWdnZXIgYW55IHVwZGF0ZXMuIFVzZSB0aGlzIGlmIHlvdSBrbm93IHlvdXIgbW9kZWwgc3RhdGUgd29uJ3QgY2hhbmdlIGJhc2VkIG9uIG90aGVyIHZhcmlhYmxlcy5cbiAgICAgICAgICogKiBgZmFsc2VgOiBBbHdheXMgdHJpZ2dlciB1cGRhdGVzLlxuICAgICAgICAgKiAqIGBbYXJyYXkgb2YgdmFyaWFibGUgbmFtZXNdYDogVmFyaWFibGVzIGluIHRoaXMgYXJyYXkgKndpbGwgbm90KiB0cmlnZ2VyIHVwZGF0ZXM7IGV2ZXJ5dGhpbmcgZWxzZSB3aWxsLlxuICAgICAgICAgKiAqIGB7IGV4Y2VwdDogW2FycmF5IG9mIHZhcmlhYmxlIG5hbWVzXSB9YDogVmFyaWFibGVzIGluIHRoaXMgYXJyYXkgKndpbGwqIHRyaWdnZXIgdXBkYXRlczsgbm90aGluZyBlbHNlIHdpbGwuXG4gICAgICAgICAqXG4gICAgICAgICAqIFRvIHNldCwgcGFzcyB0aGlzIGludG8gdGhlIGBGbG93LmluaXRpYWxpemUoKWAgY2FsbCBpbiB0aGUgYGNoYW5uZWwucnVuLnZhcmlhYmxlc2AgZmllbGQ6XG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5pbml0aWFsaXplKHtcbiAgICAgICAgICogICAgICAgICAgY2hhbm5lbDoge1xuICAgICAgICAgKiAgICAgICAgICAgICAgcnVuOiB7XG4gICAgICAgICAqICAgICAgICAgICAgICAgICAgbW9kZWw6ICdteU1vZGVsLnB5JyxcbiAgICAgICAgICogICAgICAgICAgICAgICAgICBhY2NvdW50OiAnYWNtZS1zaW11bGF0aW9ucycsXG4gICAgICAgICAqICAgICAgICAgICAgICAgICAgcHJvamVjdDogJ3N1cHBseS1jaGFpbi1nYW1lJyxcbiAgICAgICAgICogICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6IHsgc2lsZW50OiB0cnVlIH1cbiAgICAgICAgICogICAgICAgICAgICAgIH1cbiAgICAgICAgICogICAgICAgICAgfVxuICAgICAgICAgKiAgICAgIH0pO1xuICAgICAgICAgKlxuICAgICAgICAgKiBUbyBvdmVycmlkZSBmb3IgYSBzcGVjaWZpYyBjYWxsIHRvIHRoZSBWYXJpYWJsZXMgQ2hhbm5lbCwgcGFzcyB0aGlzIGFzIHRoZSBmaW5hbCBgb3B0aW9uc2AgcGFyYW1ldGVyOlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgICBGbG93LmNoYW5uZWwudmFyaWFibGVzLnB1Ymxpc2goJ215VmFyaWFibGUnLCBuZXdWYWx1ZSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtTdHJpbmd8QXJyYXl8T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgc2lsZW50OiBmYWxzZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWxsb3dzIHlvdSB0byBhdXRvbWF0aWNhbGx5IGZldGNoIHZhcmlhYmxlcyBmcm9tIHRoZSBBUEkgYXMgdGhleSdyZSBiZWluZyBzdWJzY3JpYmVkLiBJZiB0aGlzIGlzIHNldCB0byBgZW5hYmxlOiBmYWxzZWAgeW91J2xsIG5lZWQgdG8gZXhwbGljaXRseSBjYWxsIGByZWZyZXNoKClgIHRvIGdldCBkYXRhIGFuZCBub3RpZnkgeW91ciBsaXN0ZW5lcnMuXG4gICAgICAgICAqXG4gICAgICAgICAqIFRoZSBwcm9wZXJ0aWVzIG9mIHRoaXMgb2JqZWN0IGluY2x1ZGU6XG4gICAgICAgICAqXG4gICAgICAgICAqICogYGF1dG9GZXRjaC5lbmFibGVgICpCb29sZWFuKiBFbmFibGUgYXV0by1mZXRjaCBiZWhhdmlvci4gSWYgc2V0IHRvIGBmYWxzZWAgZHVyaW5nIGluc3RhbnRpYXRpb24gdGhlcmUncyBubyB3YXkgdG8gZW5hYmxlIHRoaXMgYWdhaW4uIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgICAgICAgICogKiBgYXV0b0ZldGNoLnN0YXJ0YCAqQm9vbGVhbiogSWYgYXV0by1mZXRjaCBpcyBlbmFibGVkLCBjb250cm9sIHdoZW4gdG8gc3RhcnQgZmV0Y2hpbmcuIFR5cGljYWxseSB5b3UnZCB3YW50IHRvIHN0YXJ0IHJpZ2h0IGF3YXksIGJ1dCBpZiB5b3Ugd2FudCB0byB3YWl0IHRpbGwgc29tZXRoaW5nIGVsc2UgaGFwcGVucyAobGlrZSBhbiBvcGVyYXRpb24gb3IgdXNlciBhY3Rpb24pIHNldCB0byBgZmFsc2VgIGFuZCBjb250cm9sIHVzaW5nIHRoZSBgc3RhcnRBdXRvRmV0Y2goKWAgZnVuY3Rpb24uIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgICAgICAgICogKiBgYXV0b0ZldGNoLmRlYm91bmNlYCAqTnVtYmVyKiBNaWxsaXNlY29uZHMgdG8gd2FpdCBiZXR3ZWVuIGNhbGxzIHRvIGBzdWJzY3JpYmUoKWAgYmVmb3JlIGNhbGxpbmcgYGZldGNoKClgLiBTZWUgW2h0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbl0oaHR0cDovL2RydXBhbG1vdGlvbi5jb20vYXJ0aWNsZS9kZWJvdW5jZS1hbmQtdGhyb3R0bGUtdmlzdWFsLWV4cGxhbmF0aW9uKSBmb3IgYW4gZXhwbGFuYXRpb24gb2YgaG93IGRlYm91bmNpbmcgd29ya3MuIERlZmF1bHRzIHRvIGAyMDBgLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgYXV0b0ZldGNoOiB7XG5cbiAgICAgICAgICAgICAvLyBFbmFibGUgYXV0by1mZXRjaCBiZWhhdmlvci4gSWYgc2V0IHRvIGBmYWxzZWAgZHVyaW5nIGluc3RhbnRpYXRpb24gdGhlcmUncyBubyB3YXkgdG8gZW5hYmxlIHRoaXMgYWdhaW5cbiAgICAgICAgICAgICAvLyBAdHlwZSB7Qm9vbGVhbn1cbiAgICAgICAgICAgIGVuYWJsZTogdHJ1ZSxcblxuICAgICAgICAgICAgIC8vIElmIGF1dG8tZmV0Y2ggaXMgZW5hYmxlZCwgY29udHJvbCB3aGVuIHRvIHN0YXJ0IGZldGNoaW5nLiBUeXBpY2FsbHkgeW91J2Qgd2FudCB0byBzdGFydCByaWdodCBhd2F5LCBidXQgaWYgeW91IHdhbnQgdG8gd2FpdCB0aWxsIHNvbWV0aGluZyBlbHNlIGhhcHBlbnMgKGxpa2UgYW4gb3BlcmF0aW9uIG9yIHVzZXIgYWN0aW9uKSBzZXQgdG8gYGZhbHNlYCBhbmQgY29udHJvbCB1c2luZyB0aGUgYHN0YXJ0QXV0b0ZldGNoKClgIGZ1bmN0aW9uLlxuICAgICAgICAgICAgIC8vIEB0eXBlIHtCb29sZWFufVxuICAgICAgICAgICAgc3RhcnQ6IHRydWUsXG5cbiAgICAgICAgICAgICAvLyBDb250cm9sIHRpbWUgdG8gd2FpdCBiZXR3ZWVuIGNhbGxzIHRvIGBzdWJzY3JpYmUoKWAgYmVmb3JlIGNhbGxpbmcgYGZldGNoKClgLiBTZWUgW2h0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbl0oaHR0cDovL2RydXBhbG1vdGlvbi5jb20vYXJ0aWNsZS9kZWJvdW5jZS1hbmQtdGhyb3R0bGUtdmlzdWFsLWV4cGxhbmF0aW9uKSBmb3IgYW4gZXhwbGFuYXRpb24gb2YgaG93IGRlYm91bmNpbmcgd29ya3MuXG4gICAgICAgICAgICAgLy8gQHR5cGUge051bWJlcn0gTWlsbGlzZWNvbmRzIHRvIHdhaXRcbiAgICAgICAgICAgIGRlYm91bmNlOiAyMDBcbiAgICAgICAgfSxcblxuICAgICAgICBpbnRlcnBvbGF0ZToge31cbiAgICB9O1xuXG4gICAgdmFyIGNoYW5uZWxPcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICB0aGlzLm9wdGlvbnMgPSBjaGFubmVsT3B0aW9ucztcblxuICAgIHZhciB2cyA9IGNoYW5uZWxPcHRpb25zLnJ1bi52YXJpYWJsZXMoKTtcblxuICAgIHZhciBjdXJyZW50RGF0YSA9IHt9O1xuXG4gICAgLy9UT0RPOiBhY3R1YWxseSBjb21wYXJlIG9iamVjdHMgYW5kIHNvIG9uXG4gICAgdmFyIGlzRXF1YWwgPSBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIHZhciBnZXRJbm5lclZhcmlhYmxlcyA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgICAgICAgdmFyIGlubmVyID0gc3RyLm1hdGNoKC88KC4qPyk+L2cpO1xuICAgICAgICBpbm5lciA9IF8ubWFwKGlubmVyLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsLnN1YnN0cmluZygxLCB2YWwubGVuZ3RoIC0gMSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaW5uZXI7XG4gICAgfTtcblxuICAgIC8vUmVwbGFjZXMgc3R1YmJlZCBvdXQga2V5bmFtZXMgaW4gdmFyaWFibGVzdG9pbnRlcnBvbGF0ZSB3aXRoIHRoZWlyIGNvcnJlc3BvbmRpbmcgdmFsdWVzXG4gICAgdmFyIGludGVycG9sYXRlID0gZnVuY3Rpb24gKHZhcmlhYmxlc1RvSW50ZXJwb2xhdGUsIHZhbHVlcykge1xuICAgICAgICAvL3twcmljZVsxXTogcHJpY2VbPHRpbWU+XX1cbiAgICAgICAgdmFyIGludGVycG9sYXRpb25NYXAgPSB7fTtcbiAgICAgICAgLy97cHJpY2VbMV06IDF9XG4gICAgICAgIHZhciBpbnRlcnBvbGF0ZWQgPSB7fTtcblxuICAgICAgICBfLmVhY2godmFyaWFibGVzVG9JbnRlcnBvbGF0ZSwgZnVuY3Rpb24gKG91dGVyVmFyaWFibGUpIHtcbiAgICAgICAgICAgIHZhciBpbm5lciA9IGdldElubmVyVmFyaWFibGVzKG91dGVyVmFyaWFibGUpO1xuICAgICAgICAgICAgdmFyIG9yaWdpbmFsT3V0ZXIgPSBvdXRlclZhcmlhYmxlO1xuICAgICAgICAgICAgaWYgKGlubmVyICYmIGlubmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICQuZWFjaChpbm5lciwgZnVuY3Rpb24gKGluZGV4LCBpbm5lclZhcmlhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0aGlzdmFsID0gdmFsdWVzW2lubmVyVmFyaWFibGVdO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpc3ZhbCAhPT0gbnVsbCAmJiB0aGlzdmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfLmlzQXJyYXkodGhpc3ZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL0ZvciBhcnJheWVkIHRoaW5ncyBnZXQgdGhlIGxhc3Qgb25lIGZvciBpbnRlcnBvbGF0aW9uIHB1cnBvc2VzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpc3ZhbCA9IHRoaXN2YWxbdGhpc3ZhbC5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vVE9ETzogUmVnZXggdG8gbWF0Y2ggc3BhY2VzIGFuZCBzbyBvblxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ZXJWYXJpYWJsZSA9IG91dGVyVmFyaWFibGUucmVwbGFjZSgnPCcgKyBpbm5lclZhcmlhYmxlICsgJz4nLCB0aGlzdmFsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGludGVycG9sYXRpb25NYXBbb3V0ZXJWYXJpYWJsZV0gPSAoaW50ZXJwb2xhdGlvbk1hcFtvdXRlclZhcmlhYmxlXSkgPyBbb3JpZ2luYWxPdXRlcl0uY29uY2F0KGludGVycG9sYXRpb25NYXBbb3V0ZXJWYXJpYWJsZV0pIDogb3JpZ2luYWxPdXRlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGludGVycG9sYXRlZFtvcmlnaW5hbE91dGVyXSA9IG91dGVyVmFyaWFibGU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBvcCA9IHtcbiAgICAgICAgICAgIGludGVycG9sYXRlZDogaW50ZXJwb2xhdGVkLFxuICAgICAgICAgICAgaW50ZXJwb2xhdGlvbk1hcDogaW50ZXJwb2xhdGlvbk1hcFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gb3A7XG4gICAgfTtcblxuICAgIHZhciBwdWJsaWNBUEkgPSB7XG4gICAgICAgIC8vZm9yIHRlc3RpbmdcbiAgICAgICAgcHJpdmF0ZToge1xuICAgICAgICAgICAgZ2V0SW5uZXJWYXJpYWJsZXM6IGdldElubmVyVmFyaWFibGVzLFxuICAgICAgICAgICAgaW50ZXJwb2xhdGU6IGludGVycG9sYXRlLFxuICAgICAgICAgICAgY3VycmVudERhdGE6IGN1cnJlbnREYXRhLFxuICAgICAgICAgICAgb3B0aW9uczogY2hhbm5lbE9wdGlvbnNcbiAgICAgICAgfSxcblxuICAgICAgICBzdWJzY3JpcHRpb25zOiBbXSxcblxuICAgICAgICB1bmZldGNoZWQ6IFtdLFxuXG4gICAgICAgIGdldFN1YnNjcmliZXJzOiBmdW5jdGlvbiAodG9waWMpIHtcbiAgICAgICAgICAgIGlmICh0b3BpYykge1xuICAgICAgICAgICAgICAgIHJldHVybiBfLmZpbHRlcih0aGlzLnN1YnNjcmlwdGlvbnMsIGZ1bmN0aW9uIChzdWJzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfLmNvbnRhaW5zKHN1YnMudG9waWNzLCB0b3BpYyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN1YnNjcmlwdGlvbnM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGdldEFsbFRvcGljczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIF8odGhpcy5zdWJzY3JpcHRpb25zKS5wbHVjaygndG9waWNzJykuZmxhdHRlbigpLnVuaXEoKS52YWx1ZSgpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRUb3BpY0RlcGVuZGVuY2llczogZnVuY3Rpb24gKGxpc3QpIHtcbiAgICAgICAgICAgIGlmICghbGlzdCkge1xuICAgICAgICAgICAgICAgIGxpc3QgPSB0aGlzLmdldEFsbFRvcGljcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGlubmVyTGlzdCA9IFtdO1xuICAgICAgICAgICAgXy5lYWNoKGxpc3QsIGZ1bmN0aW9uICh2bmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBpbm5lciA9IGdldElubmVyVmFyaWFibGVzKHZuYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAoaW5uZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlubmVyTGlzdCA9IF8udW5pcShpbm5lckxpc3QuY29uY2F0KGlubmVyKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gaW5uZXJMaXN0O1xuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZUFuZENoZWNrRm9yUmVmcmVzaDogZnVuY3Rpb24gKHRvcGljcywgb3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKHRvcGljcykge1xuICAgICAgICAgICAgICAgIHRoaXMudW5mZXRjaGVkID0gXy51bmlxKHRoaXMudW5mZXRjaGVkLmNvbmNhdCh0b3BpY3MpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghY2hhbm5lbE9wdGlvbnMuYXV0b0ZldGNoLmVuYWJsZSB8fCAhY2hhbm5lbE9wdGlvbnMuYXV0b0ZldGNoLnN0YXJ0IHx8ICF0aGlzLnVuZmV0Y2hlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXRoaXMuZGVib3VuY2VkRmV0Y2gpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGVib3VuY2VPcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4V2FpdDogY2hhbm5lbE9wdGlvbnMuYXV0b0ZldGNoLmRlYm91bmNlICogNCxcbiAgICAgICAgICAgICAgICAgICAgbGVhZGluZzogZmFsc2VcbiAgICAgICAgICAgICAgICB9LCBvcHRpb25zKTtcblxuICAgICAgICAgICAgICAgIHRoaXMuZGVib3VuY2VkRmV0Y2ggPSBfLmRlYm91bmNlKGZ1bmN0aW9uICh0b3BpY3MpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mZXRjaCh0aGlzLnVuZmV0Y2hlZCkudGhlbihmdW5jdGlvbiAoY2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJC5leHRlbmQoY3VycmVudERhdGEsIGNoYW5nZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51bmZldGNoZWQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubm90aWZ5KGNoYW5nZWQpO1xuICAgICAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAgIH0sIGNoYW5uZWxPcHRpb25zLmF1dG9GZXRjaC5kZWJvdW5jZSwgZGVib3VuY2VPcHRpb25zKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5kZWJvdW5jZWRGZXRjaCh0b3BpY3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHBvcHVsYXRlSW5uZXJWYXJpYWJsZXM6IGZ1bmN0aW9uICh2YXJzKSB7XG4gICAgICAgICAgICB2YXIgdW5tYXBwZWRWYXJpYWJsZXMgPSBbXTtcbiAgICAgICAgICAgIHZhciB2YWx1ZUxpc3QgPSB7fTtcbiAgICAgICAgICAgIF8uZWFjaCh2YXJzLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGVbdl0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsID0gXy5pc0Z1bmN0aW9uKHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0ZVt2XSkgPyB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGVbdl0odikgOiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGVbdl07XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlTGlzdFt2XSA9IHZhbDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB1bm1hcHBlZFZhcmlhYmxlcy5wdXNoKHYpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICAgICAgaWYgKHVubWFwcGVkVmFyaWFibGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2cy5xdWVyeSh1bm1hcHBlZFZhcmlhYmxlcykudGhlbihmdW5jdGlvbiAodmFyaWFibGVWYWx1ZUxpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICQuZXh0ZW5kKHZhbHVlTGlzdCwgdmFyaWFibGVWYWx1ZUxpc3QpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJC5EZWZlcnJlZCgpLnJlc29sdmUodmFsdWVMaXN0KS5wcm9taXNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZmV0Y2g6IGZ1bmN0aW9uICh2YXJpYWJsZXNMaXN0KSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnZmV0Y2ggY2FsbGVkJywgdmFyaWFibGVzTGlzdCk7XG4gICAgICAgICAgICB2YXJpYWJsZXNMaXN0ID0gW10uY29uY2F0KHZhcmlhYmxlc0xpc3QpO1xuICAgICAgICAgICAgaWYgKCF2YXJpYWJsZXNMaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkLkRlZmVycmVkKCkucmVzb2x2ZSgpLnByb21pc2Uoe30pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGlubmVyVmFyaWFibGVzID0gdGhpcy5nZXRUb3BpY0RlcGVuZGVuY2llcyh2YXJpYWJsZXNMaXN0KTtcbiAgICAgICAgICAgIHZhciBnZXRWYXJpYWJsZXMgPSBmdW5jdGlvbiAodmFycywgaW50ZXJwb2xhdGlvbk1hcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2cy5xdWVyeSh2YXJzKS50aGVuKGZ1bmN0aW9uICh2YXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ0dvdCB2YXJpYWJsZXMnLCB2YXJpYWJsZXMpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2hhbmdlU2V0ID0ge307XG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaCh2YXJpYWJsZXMsIGZ1bmN0aW9uICh2YWx1ZSwgdm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbGRWYWx1ZSA9IGN1cnJlbnREYXRhW3ZuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNFcXVhbCh2YWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlU2V0W3ZuYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnRlcnBvbGF0aW9uTWFwICYmIGludGVycG9sYXRpb25NYXBbdm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXAgPSBbXS5jb25jYXQoaW50ZXJwb2xhdGlvbk1hcFt2bmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmVhY2gobWFwLCBmdW5jdGlvbiAoaW50ZXJwb2xhdGVkTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlU2V0W2ludGVycG9sYXRlZE5hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjaGFuZ2VTZXQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKGlubmVyVmFyaWFibGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBvcHVsYXRlSW5uZXJWYXJpYWJsZXMoaW5uZXJWYXJpYWJsZXMpLnRoZW4oZnVuY3Rpb24gKGlubmVyVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2lubmVyJywgaW5uZXJWYXJpYWJsZXMpO1xuICAgICAgICAgICAgICAgICAgICAkLmV4dGVuZChjdXJyZW50RGF0YSwgaW5uZXJWYXJpYWJsZXMpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgaXAgPSAgaW50ZXJwb2xhdGUodmFyaWFibGVzTGlzdCwgaW5uZXJWYXJpYWJsZXMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VmFyaWFibGVzKF8udmFsdWVzKGlwLmludGVycG9sYXRlZCksIGlwLmludGVycG9sYXRpb25NYXApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VmFyaWFibGVzKHZhcmlhYmxlc0xpc3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHN0YXJ0QXV0b0ZldGNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjaGFubmVsT3B0aW9ucy5hdXRvRmV0Y2guc3RhcnQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVBbmRDaGVja0ZvclJlZnJlc2goKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzdG9wQXV0b0ZldGNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjaGFubmVsT3B0aW9ucy5hdXRvRmV0Y2guc3RhcnQgPSBmYWxzZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRm9yY2UgYSBjaGVjayBmb3IgdXBkYXRlcyBvbiB0aGUgY2hhbm5lbCwgYW5kIG5vdGlmeSBhbGwgbGlzdGVuZXJzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gY2hhbmdlTGlzdCBLZXktdmFsdWUgcGFpcnMgb2YgY2hhbmdlZCB2YXJpYWJsZXMuXG4gICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gZm9yY2UgIElnbm9yZSBhbGwgYHNpbGVudGAgb3B0aW9ucyBhbmQgZm9yY2UgcmVmcmVzaC5cbiAgICAgICAgICovXG4gICAgICAgIHJlZnJlc2g6IGZ1bmN0aW9uIChjaGFuZ2VMaXN0LCBmb3JjZSkge1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIHZhciBzaWxlbnQgPSBjaGFubmVsT3B0aW9ucy5zaWxlbnQ7XG4gICAgICAgICAgICB2YXIgY2hhbmdlZFZhcmlhYmxlcyA9IF8uaXNBcnJheShjaGFuZ2VMaXN0KSA/ICBjaGFuZ2VMaXN0IDogXy5rZXlzKGNoYW5nZUxpc3QpO1xuXG4gICAgICAgICAgICB2YXIgc2hvdWxkU2lsZW5jZSA9IHNpbGVudCA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkoc2lsZW50KSAmJiBjaGFuZ2VkVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgc2hvdWxkU2lsZW5jZSA9IF8uaW50ZXJzZWN0aW9uKHNpbGVudCwgY2hhbmdlZFZhcmlhYmxlcykubGVuZ3RoID49IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KHNpbGVudCkgJiYgY2hhbmdlZFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIHNob3VsZFNpbGVuY2UgPSBfLmludGVyc2VjdGlvbihzaWxlbnQuZXhjZXB0LCBjaGFuZ2VkVmFyaWFibGVzKS5sZW5ndGggIT09IGNoYW5nZWRWYXJpYWJsZXMubGVuZ3RoO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc2hvdWxkU2lsZW5jZSAmJiBmb3JjZSAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkLkRlZmVycmVkKCkucmVzb2x2ZSgpLnByb21pc2UoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHZhcmlhYmxlcyA9IHRoaXMuZ2V0QWxsVG9waWNzKCk7XG4gICAgICAgICAgICBtZS51bmZldGNoZWQgPSBbXTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2godmFyaWFibGVzKS50aGVuKGZ1bmN0aW9uIChjaGFuZ2VTZXQpIHtcbiAgICAgICAgICAgICAgICAkLmV4dGVuZChjdXJyZW50RGF0YSwgY2hhbmdlU2V0KTtcbiAgICAgICAgICAgICAgICBtZS5ub3RpZnkoY2hhbmdlU2V0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbGVydCBlYWNoIHN1YnNjcmliZXIgYWJvdXQgdGhlIHZhcmlhYmxlIGFuZCBpdHMgbmV3IHZhbHVlLlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC5vcGVyYXRpb25zLm5vdGlmeSgnbXlWYXJpYWJsZScsIG5ld1ZhbHVlKTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IHRvcGljcyBOYW1lcyBvZiB2YXJpYWJsZXMuXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcnxBcnJheXxPYmplY3R9IHZhbHVlIE5ldyB2YWx1ZXMgZm9yIHRoZSB2YXJpYWJsZXMuXG4gICAgICAgICovXG4gICAgICAgIG5vdGlmeTogZnVuY3Rpb24gKHRvcGljcywgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBjYWxsVGFyZ2V0ID0gZnVuY3Rpb24gKHRhcmdldCwgcGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5jYWxsKG51bGwsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnRyaWdnZXIoY29uZmlnLmV2ZW50cy5yZWFjdCwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoISQuaXNQbGFpbk9iamVjdCh0b3BpY3MpKSB7XG4gICAgICAgICAgICAgICAgdG9waWNzID0gXy5vYmplY3QoW3RvcGljc10sIFt2YWx1ZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXy5lYWNoKHRoaXMuc3Vic2NyaXB0aW9ucywgZnVuY3Rpb24gKHN1YnNjcmlwdGlvbikge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSBzdWJzY3JpcHRpb24udGFyZ2V0O1xuICAgICAgICAgICAgICAgIGlmIChzdWJzY3JpcHRpb24uYmF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1hdGNoaW5nVG9waWNzID0gXy5waWNrKHRvcGljcywgc3Vic2NyaXB0aW9uLnRvcGljcyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfLnNpemUobWF0Y2hpbmdUb3BpY3MpID09PSBfLnNpemUoc3Vic2NyaXB0aW9uLnRvcGljcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxUYXJnZXQodGFyZ2V0LCBtYXRjaGluZ1RvcGljcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBfLmVhY2goc3Vic2NyaXB0aW9uLnRvcGljcywgZnVuY3Rpb24gKHRvcGljKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWF0Y2hpbmdUb3BpY3MgPSBfLnBpY2sodG9waWNzLCB0b3BpYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoXy5zaXplKG1hdGNoaW5nVG9waWNzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxUYXJnZXQodGFyZ2V0LCBtYXRjaGluZ1RvcGljcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBVcGRhdGUgdGhlIHZhcmlhYmxlcyB3aXRoIG5ldyB2YWx1ZXMsIGFuZCBhbGVydCBzdWJzY3JpYmVycy5cbiAgICAgICAgICpcbiAgICAgICAgICogKipFeGFtcGxlKipcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICBGbG93LmNoYW5uZWwudmFyaWFibGVzLnB1Ymxpc2goJ215VmFyaWFibGUnLCBuZXdWYWx1ZSk7XG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLnZhcmlhYmxlcy5wdWJsaXNoKHsgbXlWYXIxOiBuZXdWYWwxLCBteVZhcjI6IG5ld1ZhbDIgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSAge1N0cmluZ3xPYmplY3R9IHZhcmlhYmxlIFN0cmluZyB3aXRoIG5hbWUgb2YgdmFyaWFibGUuIEFsdGVybmF0aXZlbHksIG9iamVjdCBpbiBmb3JtIGB7IHZhcmlhYmxlTmFtZTogdmFsdWUgfWAuXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcnxBcnJheXxPYmplY3R9IHZhbHVlIChPcHRpb25hbCkgIFZhbHVlIG9mIHRoZSB2YXJpYWJsZSwgaWYgcHJldmlvdXMgYXJndW1lbnQgd2FzIGEgc3RyaW5nLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAoT3B0aW9uYWwpIE92ZXJyaWRlcyBmb3IgdGhlIGRlZmF1bHQgY2hhbm5lbCBvcHRpb25zLiBTdXBwb3J0ZWQgb3B0aW9uczogYHsgc2lsZW50OiBCb29sZWFuIH1gIGFuZCBgeyBiYXRjaDogQm9vbGVhbiB9YC5cbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybiB7JHByb21pc2V9IFByb21pc2UgdG8gY29tcGxldGUgdGhlIHVwZGF0ZS5cbiAgICAgICAgICovXG4gICAgICAgIHB1Ymxpc2g6IGZ1bmN0aW9uICh2YXJpYWJsZSwgdmFsdWUsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdwdWJsaXNoJywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHZhciBhdHRycztcbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QodmFyaWFibGUpKSB7XG4gICAgICAgICAgICAgICAgYXR0cnMgPSB2YXJpYWJsZTtcbiAgICAgICAgICAgICAgICBvcHRpb25zID0gdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIChhdHRycyA9IHt9KVt2YXJpYWJsZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpdCA9IGludGVycG9sYXRlKF8ua2V5cyhhdHRycyksIGN1cnJlbnREYXRhKTtcblxuICAgICAgICAgICAgdmFyIHRvU2F2ZSA9IHt9O1xuICAgICAgICAgICAgXy5lYWNoKGF0dHJzLCBmdW5jdGlvbiAodmFsLCBhdHRyKSB7XG4gICAgICAgICAgICAgICB2YXIga2V5ID0gKGl0LmludGVycG9sYXRlZFthdHRyXSkgPyBpdC5pbnRlcnBvbGF0ZWRbYXR0cl0gOiBhdHRyO1xuICAgICAgICAgICAgICAgdG9TYXZlW2tleV0gPSB2YWw7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICByZXR1cm4gdnMuc2F2ZS5jYWxsKHZzLCB0b1NhdmUpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW9wdGlvbnMgfHwgIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUsIGF0dHJzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdWJzY3JpYmUgdG8gY2hhbmdlcyBvbiBhIGNoYW5uZWw6IEFzayBmb3Igbm90aWZpY2F0aW9uIHdoZW4gdmFyaWFibGVzIGFyZSB1cGRhdGVkLlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC52YXJpYWJsZXMuc3Vic2NyaWJlKCdteVZhcmlhYmxlJyxcbiAgICAgICAgICogICAgICAgICAgZnVuY3Rpb24oKSB7IGNvbnNvbGUubG9nKCdjYWxsZWQhJyk7IH0pO1xuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC52YXJpYWJsZXMuc3Vic2NyaWJlKFsncHJpY2UnLCAnY29zdCddLFxuICAgICAgICAgKiAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICogICAgICAgICAgICAgIC8vIHRoaXMgZnVuY3Rpb24gY2FsbGVkIG9ubHkgb25jZSwgd2l0aCB7IHByaWNlOiBYLCBjb3N0OiBZIH1cbiAgICAgICAgICogICAgICAgICAgfSxcbiAgICAgICAgICogICAgICAgICAgeyBiYXRjaDogdHJ1ZSB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICBGbG93LmNoYW5uZWwudmFyaWFibGVzLnN1YnNjcmliZShbJ3ByaWNlJywgJ2Nvc3QnXSxcbiAgICAgICAgICogICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAqICAgICAgICAgICAgICAvLyB0aGlzIGZ1bmN0aW9uIGNhbGxlZCB0d2ljZSwgb25jZSB3aXRoIHsgcHJpY2U6IFggfVxuICAgICAgICAgKiAgICAgICAgICAgICAgLy8gYW5kIGFnYWluIHdpdGggeyBjb3N0OiBZIH1cbiAgICAgICAgICogICAgICAgICAgfSxcbiAgICAgICAgICogICAgICAgICAgeyBiYXRjaDogZmFsc2UgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSB0b3BpY3MgVGhlIG5hbWVzIG9mIHRoZSB2YXJpYWJsZXMuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fEZ1bmN0aW9ufSBzdWJzY3JpYmVyIFRoZSBvYmplY3Qgb3IgZnVuY3Rpb24gYmVpbmcgbm90aWZpZWQuIE9mdGVuIHRoaXMgaXMgYSBjYWxsYmFjayBmdW5jdGlvbi4gSWYgdGhpcyBpcyBub3QgYSBmdW5jdGlvbiwgYSBgdHJpZ2dlcmAgbWV0aG9kIGlzIGNhbGxlZCBpZiBhdmFpbGFibGU7IGlmIG5vdCwgZXZlbnQgaXMgdHJpZ2dlcmVkIG9uICQob2JqZWN0KS5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgKE9wdGlvbmFsKSBPdmVycmlkZXMgZm9yIHRoZSBkZWZhdWx0IGNoYW5uZWwgb3B0aW9ucy5cbiAgICAgICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnNpbGVudCBEZXRlcm1pbmUgd2hlbiB0byB1cGRhdGUgc3RhdGUuXG4gICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5iYXRjaCBJZiB5b3UgYXJlIHN1YnNjcmliaW5nIHRvIG11bHRpcGxlIHZhcmlhYmxlcywgYnkgZGVmYXVsdCB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gaXMgY2FsbGVkIG9uY2UgZm9yIGVhY2ggaXRlbSB0byB3aGljaCB5b3Ugc3Vic2NyaWJlOiBgYmF0Y2g6IGZhbHNlYC4gV2hlbiBgYmF0Y2hgIGlzIHNldCB0byBgdHJ1ZWAsIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBpcyBvbmx5IGNhbGxlZCBvbmNlLCBubyBtYXR0ZXIgaG93IG1hbnkgaXRlbXMgeW91IGFyZSBzdWJzY3JpYmluZyB0by5cbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBBbiBpZGVudGlmeWluZyB0b2tlbiBmb3IgdGhpcyBzdWJzY3JpcHRpb24uIFJlcXVpcmVkIGFzIGEgcGFyYW1ldGVyIHdoZW4gdW5zdWJzY3JpYmluZy5cbiAgICAgICAgKi9cbiAgICAgICAgc3Vic2NyaWJlOiBmdW5jdGlvbiAodG9waWNzLCBzdWJzY3JpYmVyLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnc3Vic2NyaWJpbmcnLCB0b3BpY3MsIHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgICAgIGJhdGNoOiBmYWxzZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdG9waWNzID0gW10uY29uY2F0KHRvcGljcyk7XG4gICAgICAgICAgICAvL3VzZSBqcXVlcnkgdG8gbWFrZSBldmVudCBzaW5rXG4gICAgICAgICAgICBpZiAoIXN1YnNjcmliZXIub24gJiYgIV8uaXNGdW5jdGlvbihzdWJzY3JpYmVyKSkge1xuICAgICAgICAgICAgICAgIHN1YnNjcmliZXIgPSAkKHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaWQgID0gXy51bmlxdWVJZCgnZXBpY2hhbm5lbC52YXJpYWJsZScpO1xuICAgICAgICAgICAgdmFyIGRhdGEgPSAkLmV4dGVuZCh7XG4gICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgIHRvcGljczogdG9waWNzLFxuICAgICAgICAgICAgICAgIHRhcmdldDogc3Vic2NyaWJlclxuICAgICAgICAgICAgfSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gICAgICAgICAgICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaChkYXRhKTtcblxuICAgICAgICAgICAgdGhpcy51cGRhdGVBbmRDaGVja0ZvclJlZnJlc2godG9waWNzKTtcbiAgICAgICAgICAgIHJldHVybiBpZDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3RvcCByZWNlaXZpbmcgbm90aWZpY2F0aW9ucyBmb3IgYWxsIHN1YnNjcmlwdGlvbnMgcmVmZXJlbmNlZCBieSB0aGlzIHRva2VuLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gdG9rZW4gVGhlIGlkZW50aWZ5aW5nIHRva2VuIGZvciB0aGlzIHN1YnNjcmlwdGlvbi4gKENyZWF0ZWQgYW5kIHJldHVybmVkIGJ5IHRoZSBgc3Vic2NyaWJlKClgIGNhbGwuKVxuICAgICAgICAqL1xuICAgICAgICB1bnN1YnNjcmliZTogZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgICAgICAgICB0aGlzLnN1YnNjcmlwdGlvbnMgPSBfLnJlamVjdCh0aGlzLnN1YnNjcmlwdGlvbnMsIGZ1bmN0aW9uIChzdWJzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1YnMuaWQgPT09IHRva2VuO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN0b3AgcmVjZWl2aW5nIG5vdGlmaWNhdGlvbnMgZm9yIGFsbCBzdWJzY3JpcHRpb25zLiBObyBwYXJhbWV0ZXJzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJuIHtOb25lfVxuICAgICAgICAqL1xuICAgICAgICB1bnN1YnNjcmliZUFsbDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5zdWJzY3JpcHRpb25zID0gW107XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJC5leHRlbmQodGhpcywgcHVibGljQVBJKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwcmVmaXg6ICdmJyxcbiAgICBkZWZhdWx0QXR0cjogJ2JpbmQnLFxuXG4gICAgYmluZGVyQXR0cjogJ2YtYmluZCcsXG5cbiAgICBldmVudHM6IHtcbiAgICAgICAgdHJpZ2dlcjogJ3VwZGF0ZS5mLnVpJyxcbiAgICAgICAgcmVhY3Q6ICd1cGRhdGUuZi5tb2RlbCdcbiAgICB9XG59O1xuIiwiLyoqXG4gKiAjIyBBcnJheSBDb252ZXJ0ZXJzXG4gKlxuICogQ29udmVydGVycyBhbGxvdyB5b3UgdG8gY29udmVydCBkYXRhIC0tIGluIHBhcnRpY3VsYXIsIG1vZGVsIHZhcmlhYmxlcyB0aGF0IHlvdSBkaXNwbGF5IGluIHlvdXIgcHJvamVjdCdzIHVzZXIgaW50ZXJmYWNlIC0tIGZyb20gb25lIGZvcm0gdG8gYW5vdGhlci5cbiAqXG4gKiBUaGVyZSBhcmUgdHdvIHdheXMgdG8gc3BlY2lmeSBjb252ZXJzaW9uIG9yIGZvcm1hdHRpbmcgZm9yIHRoZSBkaXNwbGF5IG91dHB1dCBvZiBhIHBhcnRpY3VsYXIgbW9kZWwgdmFyaWFibGU6XG4gKlxuICogKiBBZGQgdGhlIGF0dHJpYnV0ZSBgZGF0YS1mLWNvbnZlcnRgIHRvIGFueSBlbGVtZW50IHRoYXQgYWxzbyBoYXMgdGhlIGBkYXRhLWYtYmluZGAgb3IgYGRhdGEtZi1mb3JlYWNoYC5cbiAqICogVXNlIHRoZSBgfGAgKHBpcGUpIGNoYXJhY3RlciB3aXRoaW4gdGhlIHZhbHVlIG9mIGFueSBgZGF0YS1mLWAgYXR0cmlidXRlIChub3QganVzdCBgZGF0YS1mLWJpbmRgIG9yIGBkYXRhLWYtZm9yZWFjaGApLlxuICpcbiAqIEluIGdlbmVyYWwsIGlmIHRoZSBtb2RlbCB2YXJpYWJsZSBpcyBhbiBhcnJheSwgdGhlIGNvbnZlcnRlciBpcyBhcHBsaWVkIHRvIGVhY2ggZWxlbWVudCBvZiB0aGUgYXJyYXkuIFRoZXJlIGFyZSBhIGZldyBidWlsdCBpbiBhcnJheSBjb252ZXJ0ZXJzIHdoaWNoLCByYXRoZXIgdGhhbiBjb252ZXJ0aW5nIGFsbCBlbGVtZW50cyBvZiBhbiBhcnJheSwgc2VsZWN0IHBhcnRpY3VsYXIgZWxlbWVudHMgZnJvbSB3aXRoaW4gdGhlIGFycmF5IG9yIG90aGVyd2lzZSB0cmVhdCBhcnJheSB2YXJpYWJsZXMgc3BlY2lhbGx5LlxuICpcbiAqL1xuXG5cbid1c2Ugc3RyaWN0JztcbnZhciBsaXN0ID0gW1xuICAgIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnZlcnQgdGhlIGlucHV0IGludG8gYW4gYXJyYXkuIENvbmNhdGVuYXRlcyBhbGwgZWxlbWVudHMgb2YgdGhlIGlucHV0LlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWwgVGhlIGFycmF5IG1vZGVsIHZhcmlhYmxlLlxuICAgICAgICAgKi9cbiAgICAgICAgYWxpYXM6ICdsaXN0JyxcbiAgICAgICAgYWNjZXB0TGlzdDogdHJ1ZSxcbiAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgcmV0dXJuIFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZWxlY3Qgb25seSB0aGUgbGFzdCBlbGVtZW50IG9mIHRoZSBhcnJheS5cbiAgICAgICAgICpcbiAgICAgICAgICogKipFeGFtcGxlKipcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICA8ZGl2PlxuICAgICAgICAgKiAgICAgICAgICBJbiB0aGUgY3VycmVudCB5ZWFyLCB3ZSBoYXZlIDxzcGFuIGRhdGEtZi1iaW5kPVwiU2FsZXMgfCBsYXN0XCI+PC9zcGFuPiBpbiBzYWxlcy5cbiAgICAgICAgICogICAgICA8L2Rpdj5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtBcnJheX0gdmFsIFRoZSBhcnJheSBtb2RlbCB2YXJpYWJsZS5cbiAgICAgICAgICovXG4gICAgICAgIGFsaWFzOiAnbGFzdCcsXG4gICAgICAgIGFjY2VwdExpc3Q6IHRydWUsXG4gICAgICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHZhbCA9IFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbFt2YWwubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogUmV2ZXJzZSB0aGUgYXJyYXkuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgPHA+U2hvdyB0aGUgaGlzdG9yeSBvZiBvdXIgc2FsZXMsIHN0YXJ0aW5nIHdpdGggdGhlIGxhc3QgKG1vc3QgcmVjZW50KTo8L3A+XG4gICAgICAgICAqICAgICAgPHVsIGRhdGEtZi1mb3JlYWNoPVwiU2FsZXMgfCByZXZlcnNlXCI+XG4gICAgICAgICAqICAgICAgICAgIDxsaT48L2xpPlxuICAgICAgICAgKiAgICAgIDwvdWw+XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgYXJyYXkgbW9kZWwgdmFyaWFibGUuXG4gICAgICAgICAqL1xuICAgIHtcbiAgICAgICAgYWxpYXM6ICdyZXZlcnNlJyxcbiAgICAgICAgYWNjZXB0TGlzdDogdHJ1ZSxcbiAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgdmFsID0gW10uY29uY2F0KHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gdmFsLnJldmVyc2UoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICAvKipcbiAgICAgICAgICogU2VsZWN0IG9ubHkgdGhlIGZpcnN0IGVsZW1lbnQgb2YgdGhlIGFycmF5LlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIDxkaXY+XG4gICAgICAgICAqICAgICAgICAgIE91ciBpbml0aWFsIGludmVzdG1lbnQgd2FzIDxzcGFuIGRhdGEtZi1iaW5kPVwiQ2FwaXRhbCB8IGZpcnN0XCI+PC9zcGFuPi5cbiAgICAgICAgICogICAgICA8L2Rpdj5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtBcnJheX0gdmFsIFRoZSBhcnJheSBtb2RlbCB2YXJpYWJsZS5cbiAgICAgICAgICovXG4gICAgICAgIGFsaWFzOiAnZmlyc3QnLFxuICAgICAgICBhY2NlcHRMaXN0OiB0cnVlLFxuICAgICAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICB2YWwgPSBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgICAgIHJldHVybiB2YWxbMF07XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNlbGVjdCBvbmx5IHRoZSBwcmV2aW91cyAoc2Vjb25kIHRvIGxhc3QpIGVsZW1lbnQgb2YgdGhlIGFycmF5LlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIDxkaXY+XG4gICAgICAgICAqICAgICAgICAgIExhc3QgeWVhciB3ZSBoYWQgPHNwYW4gZGF0YS1mLWJpbmQ9XCJTYWxlcyB8IHByZXZpb3VzXCI+PC9zcGFuPiBpbiBzYWxlcy5cbiAgICAgICAgICogICAgICA8L2Rpdj5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtBcnJheX0gdmFsIFRoZSBhcnJheSBtb2RlbCB2YXJpYWJsZS5cbiAgICAgICAgICovXG4gICAgICAgIGFsaWFzOiAncHJldmlvdXMnLFxuICAgICAgICBhY2NlcHRMaXN0OiB0cnVlLFxuICAgICAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICB2YWwgPSBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgICAgIHJldHVybiAodmFsLmxlbmd0aCA8PSAxKSA/IHZhbFswXSA6IHZhbFt2YWwubGVuZ3RoIC0gMl07XG4gICAgICAgIH1cbiAgICB9XG5dO1xuXG5fLmVhY2gobGlzdCwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgIHZhciBvbGRmbiA9IGl0ZW0uY29udmVydDtcbiAgIHZhciBuZXdmbiA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KHZhbCkpIHtcbiAgICAgICAgICAgIHJldHVybiBfLm1hcFZhbHVlcyh2YWwsIG9sZGZuKTtcbiAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG9sZGZuKHZhbCk7XG4gICAgICAgfVxuICAgfTtcbiAgIGl0ZW0uY29udmVydCA9IG5ld2ZuO1xufSk7XG5tb2R1bGUuZXhwb3J0cyA9IGxpc3Q7XG4iLCIvKipcbiAqICMjIENvbnZlcnRlciBNYW5hZ2VyOiBNYWtlIHlvdXIgb3duIENvbnZlcnRlcnNcbiAqXG4gKiBDb252ZXJ0ZXJzIGFsbG93IHlvdSB0byBjb252ZXJ0IGRhdGEgLS0gaW4gcGFydGljdWxhciwgbW9kZWwgdmFyaWFibGVzIHRoYXQgeW91IGRpc3BsYXkgaW4geW91ciBwcm9qZWN0J3MgdXNlciBpbnRlcmZhY2UgLS0gZnJvbSBvbmUgZm9ybSB0byBhbm90aGVyLlxuICpcbiAqIEJhc2ljIGNvbnZlcnRpbmcgYW5kIGZvcm1hdHRpbmcgb3B0aW9ucyBhcmUgYnVpbHQgaW4gdG8gRmxvdy5qcy5cbiAqXG4gKiBZb3UgY2FuIGFsc28gY3JlYXRlIHlvdXIgb3duIGNvbnZlcnRlcnMuIEVhY2ggY29udmVydGVyIHNob3VsZCBiZSBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgaW4gYSB2YWx1ZSBvciB2YWx1ZXMgdG8gY29udmVydC4gVG8gdXNlIHlvdXIgY29udmVydGVyLCBgcmVnaXN0ZXIoKWAgaXQgaW4geW91ciBpbnN0YW5jZSBvZiBGbG93LmpzLlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8vVE9ETzogTWFrZSBhbGwgdW5kZXJzY29yZSBmaWx0ZXJzIGF2YWlsYWJsZVxuXG52YXIgbm9ybWFsaXplID0gZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIsIGFjY2VwdExpc3QpIHtcbiAgICB2YXIgcmV0ID0gW107XG4gICAgLy9ub21hbGl6ZSgnZmxpcCcsIGZuKVxuICAgIGlmIChfLmlzRnVuY3Rpb24oY29udmVydGVyKSkge1xuICAgICAgICByZXQucHVzaCh7XG4gICAgICAgICAgICBhbGlhczogYWxpYXMsXG4gICAgICAgICAgICBjb252ZXJ0OiBjb252ZXJ0ZXIsXG4gICAgICAgICAgICBhY2NlcHRMaXN0OiBhY2NlcHRMaXN0XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoJC5pc1BsYWluT2JqZWN0KGNvbnZlcnRlcikgJiYgY29udmVydGVyLmNvbnZlcnQpIHtcbiAgICAgICAgY29udmVydGVyLmFsaWFzID0gYWxpYXM7XG4gICAgICAgIGNvbnZlcnRlci5hY2NlcHRMaXN0ID0gYWNjZXB0TGlzdDtcbiAgICAgICAgcmV0LnB1c2goY29udmVydGVyKTtcbiAgICB9IGVsc2UgaWYgKCQuaXNQbGFpbk9iamVjdChhbGlhcykpIHtcbiAgICAgICAgLy9ub3JtYWxpemUoe2FsaWFzOiAnZmxpcCcsIGNvbnZlcnQ6IGZ1bmN0aW9ufSlcbiAgICAgICAgaWYgKGFsaWFzLmNvbnZlcnQpIHtcbiAgICAgICAgICAgIHJldC5wdXNoKGFsaWFzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG5vcm1hbGl6ZSh7ZmxpcDogZnVufSlcbiAgICAgICAgICAgICQuZWFjaChhbGlhcywgZnVuY3Rpb24gKGtleSwgdmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBhbGlhczoga2V5LFxuICAgICAgICAgICAgICAgICAgICBjb252ZXJ0OiB2YWwsXG4gICAgICAgICAgICAgICAgICAgIGFjY2VwdExpc3Q6IGFjY2VwdExpc3RcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG52YXIgbWF0Y2hDb252ZXJ0ZXIgPSBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlcikge1xuICAgIGlmIChfLmlzU3RyaW5nKGNvbnZlcnRlci5hbGlhcykpIHtcbiAgICAgICAgcmV0dXJuIGFsaWFzID09PSBjb252ZXJ0ZXIuYWxpYXM7XG4gICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24oY29udmVydGVyLmFsaWFzKSkge1xuICAgICAgICByZXR1cm4gY29udmVydGVyLmFsaWFzKGFsaWFzKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNSZWdleChjb252ZXJ0ZXIuYWxpYXMpKSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0ZXIuYWxpYXMubWF0Y2goYWxpYXMpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG52YXIgY29udmVydGVyTWFuYWdlciA9IHtcbiAgICBwcml2YXRlOiB7XG4gICAgICAgIG1hdGNoQ29udmVydGVyOiBtYXRjaENvbnZlcnRlclxuICAgIH0sXG5cbiAgICBsaXN0OiBbXSxcbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgYXR0cmlidXRlIGNvbnZlcnRlciB0byB0aGlzIGluc3RhbmNlIG9mIEZsb3cuanMuXG4gICAgICpcbiAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAqXG4gICAgICogICAgICBGbG93LmRvbS5jb252ZXJ0ZXJzLnJlZ2lzdGVyKCdtYXgnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgKiAgICAgICAgICByZXR1cm4gXy5tYXgodmFsdWUpO1xuICAgICAqICAgICAgfSwgdHJ1ZSk7XG4gICAgICpcbiAgICAgKiAgICAgIEZsb3cuZG9tLmNvbnZlcnRlcnMucmVnaXN0ZXIoe1xuICAgICAqICAgICAgICAgIGFsaWFzOiAnc2lnJyxcbiAgICAgKiAgICAgICAgICBwYXJzZTogJC5ub29wLFxuICAgICAqICAgICAgICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAqICAgICAgICAgICAgICByZXR1cm4gdmFsdWUuZmlyc3ROYW1lICsgJyAnICsgdmFsdWUubGFzdE5hbWUgKyAnLCAnICsgdmFsdWUuam9iVGl0bGU7XG4gICAgICogICAgICB9LCBmYWxzZSk7XG4gICAgICpcbiAgICAgKiAgICAgIDxkaXY+XG4gICAgICogICAgICAgICAgVGhlIGxhcmdlc3Qgc2FsZXMgeW91IGhhZCB3YXMgPHNwYW4gZGF0YS1mLWJpbmQ9XCJzYWxlc0J5WWVhciB8IG1heCB8ICQjLCMjI1wiPjwvc3Bhbj4uXG4gICAgICogICAgICAgICAgVGhlIGN1cnJlbnQgc2FsZXMgbWFuYWdlciBpcyA8c3BhbiBkYXRhLWYtYmluZD1cInNhbGVzTWdyIHwgc2lnXCI+PC9zcGFuPi5cbiAgICAgKiAgICAgIDwvZGl2PlxuICAgICAqXG4gICAgICogQHBhcmFtICB7U3RyaW5nfEZ1bmN0aW9ufFJlZ2V4fSBhbGlhcyBGb3JtYXR0ZXIgbmFtZS5cbiAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbnxPYmplY3R9IGNvbnZlcnRlciBJZiBhIGZ1bmN0aW9uLCBgY29udmVydGVyYCBpcyBjYWxsZWQgd2l0aCB0aGUgdmFsdWUuIElmIGFuIG9iamVjdCwgc2hvdWxkIGluY2x1ZGUgZmllbGRzIGZvciBgYWxpYXNgIChuYW1lKSwgYHBhcnNlYCAoZnVuY3Rpb24pLCBhbmQgYGNvbnZlcnRgIChmdW5jdGlvbikuXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBhY2NlcHRMaXN0IERldGVybWluZXMgaWYgdGhlIGNvbnZlcnRlciBpcyBhICdsaXN0JyBjb252ZXJ0ZXIgb3Igbm90LiBMaXN0IGNvbnZlcnRlcnMgdGFrZSBpbiBhcnJheXMgYXMgaW5wdXRzLCBvdGhlcnMgZXhwZWN0IHNpbmdsZSB2YWx1ZXMuXG4gICAgICovXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChhbGlhcywgY29udmVydGVyLCBhY2NlcHRMaXN0KSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkID0gbm9ybWFsaXplKGFsaWFzLCBjb252ZXJ0ZXIsIGFjY2VwdExpc3QpO1xuICAgICAgICB0aGlzLmxpc3QgPSBub3JtYWxpemVkLmNvbmNhdCh0aGlzLmxpc3QpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXBsYWNlIGFuIGFscmVhZHkgcmVnaXN0ZXJlZCBjb252ZXJ0ZXIgd2l0aCBhIG5ldyBvbmUgb2YgdGhlIHNhbWUgbmFtZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBhbGlhcyBGb3JtYXR0ZXIgbmFtZS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdH0gY29udmVydGVyIElmIGEgZnVuY3Rpb24sIGBjb252ZXJ0ZXJgIGlzIGNhbGxlZCB3aXRoIHRoZSB2YWx1ZS4gSWYgYW4gb2JqZWN0LCBzaG91bGQgaW5jbHVkZSBmaWVsZHMgZm9yIGBhbGlhc2AgKG5hbWUpLCBgcGFyc2VgIChmdW5jdGlvbiksIGFuZCBgY29udmVydGAgKGZ1bmN0aW9uKS5cbiAgICAgKi9cbiAgICByZXBsYWNlOiBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlcikge1xuICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgIF8uZWFjaCh0aGlzLmxpc3QsIGZ1bmN0aW9uIChjdXJyZW50Q29udmVydGVyLCBpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2hDb252ZXJ0ZXIoYWxpYXMsIGN1cnJlbnRDb252ZXJ0ZXIpKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGlzdC5zcGxpY2UoaW5kZXgsIDEsIG5vcm1hbGl6ZShhbGlhcywgY29udmVydGVyKVswXSk7XG4gICAgfSxcblxuICAgIGdldENvbnZlcnRlcjogZnVuY3Rpb24gKGFsaWFzKSB7XG4gICAgICAgIHJldHVybiBfLmZpbmQodGhpcy5saXN0LCBmdW5jdGlvbiAoY29udmVydGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hDb252ZXJ0ZXIoYWxpYXMsIGNvbnZlcnRlcik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQaXBlcyB0aGUgdmFsdWUgc2VxdWVudGlhbGx5IHRocm91Z2ggYSBsaXN0IG9mIHByb3ZpZGVkIGNvbnZlcnRlcnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtBbnl9IHZhbHVlIElucHV0IGZvciB0aGUgY29udmVydGVyIHRvIHRhZy5cbiAgICAgKiBAcGFyYW0gIHtBcnJheXxPYmplY3R9IGxpc3QgTGlzdCBvZiBjb252ZXJ0ZXJzIChtYXBzIHRvIGNvbnZlcnRlciBhbGlhcykuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtBbnl9IENvbnZlcnRlZCB2YWx1ZS5cbiAgICAgKi9cbiAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsdWUsIGxpc3QpIHtcbiAgICAgICAgaWYgKCFsaXN0IHx8ICFsaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGxpc3QgPSBbXS5jb25jYXQobGlzdCk7XG4gICAgICAgIGxpc3QgPSBfLmludm9rZShsaXN0LCAndHJpbScpO1xuXG4gICAgICAgIHZhciBjdXJyZW50VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcblxuICAgICAgICB2YXIgY29udmVydEFycmF5ID0gZnVuY3Rpb24gKGNvbnZlcnRlciwgdmFsLCBjb252ZXJ0ZXJOYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gXy5tYXAodmFsLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb252ZXJ0ZXIuY29udmVydCh2LCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgY29udmVydE9iamVjdCA9IGZ1bmN0aW9uIChjb252ZXJ0ZXIsIHZhbHVlLCBjb252ZXJ0ZXJOYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gXy5tYXBWYWx1ZXModmFsdWUsIGZ1bmN0aW9uICh2YWwsIGtleSkge1xuICAgICAgICAgICAgICAgcmV0dXJuIGNvbnZlcnQoY29udmVydGVyLCB2YWwsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGNvbnZlcnQgPSBmdW5jdGlvbiAoY29udmVydGVyLCB2YWx1ZSwgY29udmVydGVyTmFtZSkge1xuICAgICAgICAgICAgdmFyIGNvbnZlcnRlZDtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpICYmIGNvbnZlcnRlci5hY2NlcHRMaXN0ICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gY29udmVydEFycmF5KGNvbnZlcnRlciwgdmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0ZXIuY29udmVydCh2YWx1ZSwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY29udmVydGVkO1xuICAgICAgICB9O1xuICAgICAgICBfLmVhY2gobGlzdCwgZnVuY3Rpb24gKGNvbnZlcnRlck5hbWUpIHtcbiAgICAgICAgICAgIHZhciBjb252ZXJ0ZXIgPSBtZS5nZXRDb252ZXJ0ZXIoY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICBpZiAoIWNvbnZlcnRlcikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgY29udmVydGVyIGZvciAnICsgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KGN1cnJlbnRWYWx1ZSkgJiYgY29udmVydGVyLmFjY2VwdExpc3QgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUgPSBjb252ZXJ0T2JqZWN0KGNvbnZlcnRlciwgY3VycmVudFZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFZhbHVlID0gY29udmVydChjb252ZXJ0ZXIsIGN1cnJlbnRWYWx1ZSwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY3VycmVudFZhbHVlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb3VudGVyLXBhcnQgdG8gYGNvbnZlcnQoKWAuIFRyYW5zbGF0ZXMgY29udmVydGVkIHZhbHVlcyBiYWNrIHRvIHRoZWlyIG9yaWdpbmFsIGZvcm0uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHZhbHVlIFZhbHVlIHRvIHBhcnNlLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ3xBcnJheX0gbGlzdCAgTGlzdCBvZiBwYXJzZXJzIHRvIHJ1biB0aGUgdmFsdWUgdGhyb3VnaC4gT3V0ZXJtb3N0IGlzIGludm9rZWQgZmlyc3QuXG4gICAgICogQHJldHVybiB7QW55fSBPcmlnaW5hbCB2YWx1ZS5cbiAgICAgKi9cbiAgICBwYXJzZTogZnVuY3Rpb24gKHZhbHVlLCBsaXN0KSB7XG4gICAgICAgIGlmICghbGlzdCB8fCAhbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBsaXN0ID0gW10uY29uY2F0KGxpc3QpLnJldmVyc2UoKTtcbiAgICAgICAgbGlzdCA9IF8uaW52b2tlKGxpc3QsICd0cmltJyk7XG5cbiAgICAgICAgdmFyIGN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICBfLmVhY2gobGlzdCwgZnVuY3Rpb24gKGNvbnZlcnRlck5hbWUpIHtcbiAgICAgICAgICAgIHZhciBjb252ZXJ0ZXIgPSBtZS5nZXRDb252ZXJ0ZXIoY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICBpZiAoY29udmVydGVyLnBhcnNlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFZhbHVlID0gY29udmVydGVyLnBhcnNlKGN1cnJlbnRWYWx1ZSwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY3VycmVudFZhbHVlO1xuICAgIH1cbn07XG5cblxuLy9Cb290c3RyYXBcbnZhciBkZWZhdWx0Y29udmVydGVycyA9IFtcbiAgICByZXF1aXJlKCcuL251bWJlci1jb252ZXJ0ZXInKSxcbiAgICByZXF1aXJlKCcuL3N0cmluZy1jb252ZXJ0ZXInKSxcbiAgICByZXF1aXJlKCcuL2FycmF5LWNvbnZlcnRlcicpLFxuICAgIHJlcXVpcmUoJy4vdW5kZXJzY29yZS11dGlscy1jb252ZXJ0ZXInKSxcbiAgICByZXF1aXJlKCcuL251bWJlcmZvcm1hdC1jb252ZXJ0ZXInKSxcbl07XG5cbiQuZWFjaChkZWZhdWx0Y29udmVydGVycy5yZXZlcnNlKCksIGZ1bmN0aW9uIChpbmRleCwgY29udmVydGVyKSB7XG4gICAgaWYgKF8uaXNBcnJheShjb252ZXJ0ZXIpKSB7XG4gICAgICAgIF8uZWFjaChjb252ZXJ0ZXIsIGZ1bmN0aW9uIChjKSB7XG4gICAgICAgICAgIGNvbnZlcnRlck1hbmFnZXIucmVnaXN0ZXIoYyk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnZlcnRlck1hbmFnZXIucmVnaXN0ZXIoY29udmVydGVyKTtcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBjb252ZXJ0ZXJNYW5hZ2VyO1xuIiwiLyoqXG4gKiAjIyBOdW1iZXIgQ29udmVydGVyc1xuICpcbiAqIENvbnZlcnRlcnMgYWxsb3cgeW91IHRvIGNvbnZlcnQgZGF0YSAtLSBpbiBwYXJ0aWN1bGFyLCBtb2RlbCB2YXJpYWJsZXMgdGhhdCB5b3UgZGlzcGxheSBpbiB5b3VyIHByb2plY3QncyB1c2VyIGludGVyZmFjZSAtLSBmcm9tIG9uZSBmb3JtIHRvIGFub3RoZXIuXG4gKlxuICogVGhlcmUgYXJlIHR3byB3YXlzIHRvIHNwZWNpZnkgY29udmVyc2lvbiBvciBmb3JtYXR0aW5nIGZvciB0aGUgZGlzcGxheSBvdXRwdXQgb2YgYSBwYXJ0aWN1bGFyIG1vZGVsIHZhcmlhYmxlOlxuICpcbiAqICogQWRkIHRoZSBhdHRyaWJ1dGUgYGRhdGEtZi1jb252ZXJ0YCB0byBhbnkgZWxlbWVudCB0aGF0IGFsc28gaGFzIHRoZSBgZGF0YS1mLWJpbmRgIG9yIGBkYXRhLWYtZm9yZWFjaGAuXG4gKiAqIFVzZSB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIgd2l0aGluIHRoZSB2YWx1ZSBvZiBhbnkgYGRhdGEtZi1gIGF0dHJpYnV0ZSAobm90IGp1c3QgYGRhdGEtZi1iaW5kYCBvciBgZGF0YS1mLWZvcmVhY2hgKS5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgLyoqXG4gICAgICogQ29udmVydCB0aGUgbW9kZWwgdmFyaWFibGUgdG8gYW4gaW50ZWdlci4gT2Z0ZW4gdXNlZCBmb3IgY2hhaW5pbmcgdG8gYW5vdGhlciBjb252ZXJ0ZXIuXG4gICAgICpcbiAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAqXG4gICAgICogICAgICA8ZGl2PlxuICAgICAqICAgICAgICAgIFlvdXIgY2FyIGhhcyBkcml2ZW5cbiAgICAgKiAgICAgICAgICA8c3BhbiBkYXRhLWYtYmluZD1cIk9kb21ldGVyIHwgaSB8IHMwLjBcIj48L3NwYW4+IG1pbGVzLlxuICAgICAqICAgICAgPC9kaXY+XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWx1ZSBUaGUgbW9kZWwgdmFyaWFibGUuXG4gICAgICovXG4gICAgYWxpYXM6ICdpJyxcbiAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQodmFsdWUsIDEwKTtcbiAgICB9XG59O1xuIiwiLyoqXG4gKiAjIyBOdW1iZXIgRm9ybWF0IENvbnZlcnRlcnNcbiAqXG4gKiBDb252ZXJ0ZXJzIGFsbG93IHlvdSB0byBjb252ZXJ0IGRhdGEgLS0gaW4gcGFydGljdWxhciwgbW9kZWwgdmFyaWFibGVzIHRoYXQgeW91IGRpc3BsYXkgaW4geW91ciBwcm9qZWN0J3MgdXNlciBpbnRlcmZhY2UgLS0gZnJvbSBvbmUgZm9ybSB0byBhbm90aGVyLlxuICpcbiAqIFRoZXJlIGFyZSB0d28gd2F5cyB0byBzcGVjaWZ5IGNvbnZlcnNpb24gb3IgZm9ybWF0dGluZyBmb3IgdGhlIGRpc3BsYXkgb3V0cHV0IG9mIGEgcGFydGljdWxhciBtb2RlbCB2YXJpYWJsZTpcbiAqXG4gKiAqIEFkZCB0aGUgYXR0cmlidXRlIGBkYXRhLWYtY29udmVydGAgdG8gYW55IGVsZW1lbnQgdGhhdCBhbHNvIGhhcyB0aGUgYGRhdGEtZi1iaW5kYCBvciBgZGF0YS1mLWZvcmVhY2hgLlxuICogKiBVc2UgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyIHdpdGhpbiB0aGUgdmFsdWUgb2YgYW55IGBkYXRhLWYtYCBhdHRyaWJ1dGUgKG5vdCBqdXN0IGBkYXRhLWYtYmluZGAgb3IgYGRhdGEtZi1mb3JlYWNoYCkuXG4gKlxuICogRm9yIG1vZGVsIHZhcmlhYmxlcyB0aGF0IGFyZSBudW1iZXJzIChvciB0aGF0IGhhdmUgYmVlbiBbY29udmVydGVkIHRvIG51bWJlcnNdKC4uL251bWJlci1jb252ZXJ0ZXIvKSksIHRoZXJlIGFyZSBzZXZlcmFsIHNwZWNpYWwgbnVtYmVyIGZvcm1hdHMgeW91IGNhbiBhcHBseS5cbiAqXG4gKiAjIyMjQ3VycmVuY3kgTnVtYmVyIEZvcm1hdFxuICpcbiAqIEFmdGVyIHRoZSBgfGAgKHBpcGUpIGNoYXJhY3RlciwgdXNlIGAkYCAoZG9sbGFyIHNpZ24pLCBgMGAsIGFuZCBgLmAgKGRlY2ltYWwgcG9pbnQpIGluIHlvdXIgY29udmVydGVyIHRvIGRlc2NyaWJlIGhvdyBjdXJyZW5jeSBzaG91bGQgYXBwZWFyLiBUaGUgc3BlY2lmaWNhdGlvbnMgZm9sbG93IHRoZSBFeGNlbCBjdXJyZW5jeSBmb3JtYXR0aW5nIGNvbnZlbnRpb25zLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8IS0tIGNvbnZlcnQgdG8gZG9sbGFycyAoaW5jbHVkZSBjZW50cykgLS0+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwicHJpY2VbY2FyXVwiIGRhdGEtZi1jb252ZXJ0PVwiJDAuMDBcIiAvPlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInByaWNlW2Nhcl0gfCAkMC4wMFwiIC8+XG4gKlxuICogICAgICA8IS0tIGNvbnZlcnQgdG8gZG9sbGFycyAodHJ1bmNhdGUgY2VudHMpIC0tPlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInByaWNlW2Nhcl1cIiBkYXRhLWYtY29udmVydD1cIiQwLlwiIC8+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwicHJpY2VbY2FyXSB8ICQwLlwiIC8+XG4gKlxuICpcbiAqICMjIyNTcGVjaWZpYyBEaWdpdHMgTnVtYmVyIEZvcm1hdFxuICpcbiAqIEFmdGVyIHRoZSBgfGAgKHBpcGUpIGNoYXJhY3RlciwgdXNlIGAjYCAocG91bmQpIGFuZCBgLGAgKGNvbW1hKSBpbiB5b3VyIGNvbnZlcnRlciB0byBkZXNjcmliZSBob3cgdGhlIG51bWJlciBzaG91bGQgYXBwZWFyLiBUaGUgc3BlY2lmaWNhdGlvbnMgZm9sbG93IHRoZSBFeGNlbCBudW1iZXIgZm9ybWF0dGluZyBjb252ZW50aW9ucy5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPCEtLSBjb252ZXJ0IHRvIHRob3VzYW5kcyAtLT5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJzYWxlc1tjYXJdXCIgZGF0YS1mLWNvbnZlcnQ9XCIjLCMjI1wiIC8+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwic2FsZXNbY2FyXSB8ICMsIyMjXCIgLz5cbiAqXG4gKlxuICogIyMjI1BlcmNlbnRhZ2UgTnVtYmVyIEZvcm1hdFxuICpcbiAqIEFmdGVyIHRoZSBgfGAgKHBpcGUpIGNoYXJhY3RlciwgdXNlIGAlYCAocGVyY2VudCkgYW5kIGAwYCBpbiB5b3VyIGNvbnZlcnRlciB0byBkaXNwbGF5IHRoZSBudW1iZXIgYXMgYSBwZXJjZW50LlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8IS0tIGNvbnZlcnQgdG8gcGVyY2VudGFnZSAtLT5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJwcm9maXRNYXJnaW5bY2FyXVwiIGRhdGEtZi1jb252ZXJ0PVwiMCVcIiAvPlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInByb2ZpdE1hcmdpbltjYXJdIHwgMCVcIiAvPlxuICpcbiAqXG4gKiAjIyMjU2hvcnQgTnVtYmVyIEZvcm1hdFxuICpcbiAqIEFmdGVyIHRoZSBgfGAgKHBpcGUpIGNoYXJhY3RlciwgdXNlIGBzYCBhbmQgYDBgIGluIHlvdXIgY29udmVydGVyIHRvIGRlc2NyaWJlIGhvdyB0aGUgbnVtYmVyIHNob3VsZCBhcHBlYXIuXG4gKlxuICogVGhlIGAwYHMgZGVzY3JpYmUgdGhlIHNpZ25pZmljYW50IGRpZ2l0cy5cbiAqXG4gKiBUaGUgYHNgIGRlc2NyaWJlcyB0aGUgXCJzaG9ydCBmb3JtYXQsXCIgd2hpY2ggdXNlcyAnSycgZm9yIHRob3VzYW5kcywgJ00nIGZvciBtaWxsaW9ucywgJ0InIGZvciBiaWxsaW9ucy4gRm9yIGV4YW1wbGUsIGAyNDY4YCBjb252ZXJ0ZWQgd2l0aCBgczAuMGAgZGlzcGxheXMgYXMgYDIuNUtgLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8IS0tIGNvbnZlcnQgdG8gdGhvdXNhbmRzIChzaG93IDEyLDQ2OCBhcyAxMi41SykgLS0+XG4gKiAgICAgIDxzcGFuIHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJwcmljZVtjYXJdIHwgczAuMFwiPjwvc3Bhbj5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgYWxpYXM6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIC8vVE9ETzogRmFuY3kgcmVnZXggdG8gbWF0Y2ggbnVtYmVyIGZvcm1hdHMgaGVyZVxuICAgICAgICByZXR1cm4gKG5hbWUuaW5kZXhPZignIycpICE9PSAtMSB8fCBuYW1lLmluZGV4T2YoJzAnKSAhPT0gLTEpO1xuICAgIH0sXG5cbiAgICBwYXJzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICB2YWwrPSAnJztcbiAgICAgICAgdmFyIGlzTmVnYXRpdmUgPSB2YWwuY2hhckF0KDApID09PSAnLSc7XG5cbiAgICAgICAgdmFsICA9IHZhbC5yZXBsYWNlKC8sL2csICcnKTtcbiAgICAgICAgdmFyIGZsb2F0TWF0Y2hlciA9IC8oWy0rXT9bMC05XSpcXC4/WzAtOV0rKShLP00/Qj8lPykvaTtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBmbG9hdE1hdGNoZXIuZXhlYyh2YWwpO1xuICAgICAgICB2YXIgbnVtYmVyLCBzdWZmaXggPSAnJztcbiAgICAgICAgaWYgKHJlc3VsdHMgJiYgcmVzdWx0c1sxXSkge1xuICAgICAgICAgICAgbnVtYmVyID0gcmVzdWx0c1sxXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0cyAmJiByZXN1bHRzWzJdKSB7XG4gICAgICAgICAgICBzdWZmaXggPSByZXN1bHRzWzJdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBzd2l0Y2ggKHN1ZmZpeCkge1xuICAgICAgICAgICAgY2FzZSAnJSc6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyIC8gMTAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnayc6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogMTAwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ20nOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIDEwMDAwMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdiJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAxMDAwMDAwMDAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIG51bWJlciA9IHBhcnNlRmxvYXQobnVtYmVyKTtcbiAgICAgICAgaWYgKGlzTmVnYXRpdmUgJiYgbnVtYmVyID4gMCkge1xuICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogLTE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bWJlcjtcbiAgICB9LFxuXG4gICAgY29udmVydDogKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgc2NhbGVzID0gWycnLCAnSycsICdNJywgJ0InLCAnVCddO1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldERpZ2l0cyh2YWx1ZSwgZGlnaXRzKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlID09PSAwID8gMCA6IHJvdW5kVG8odmFsdWUsIE1hdGgubWF4KDAsIGRpZ2l0cyAtIE1hdGguY2VpbChNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMTApKSk7XG5cbiAgICAgICAgICAgIHZhciBUWFQgPSAnJztcbiAgICAgICAgICAgIHZhciBudW1iZXJUWFQgPSB2YWx1ZS50b1N0cmluZygpO1xuICAgICAgICAgICAgdmFyIGRlY2ltYWxTZXQgPSBmYWxzZTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaVRYVCA9IDA7IGlUWFQgPCBudW1iZXJUWFQubGVuZ3RoOyBpVFhUKyspIHtcbiAgICAgICAgICAgICAgICBUWFQgKz0gbnVtYmVyVFhULmNoYXJBdChpVFhUKTtcbiAgICAgICAgICAgICAgICBpZiAobnVtYmVyVFhULmNoYXJBdChpVFhUKSA9PT0gJy4nKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlY2ltYWxTZXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRpZ2l0cy0tO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChkaWdpdHMgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVFhUO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFkZWNpbWFsU2V0KSB7XG4gICAgICAgICAgICAgICAgVFhUICs9ICcuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlIChkaWdpdHMgPiAwKSB7XG4gICAgICAgICAgICAgICAgVFhUICs9ICcwJztcbiAgICAgICAgICAgICAgICBkaWdpdHMtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBUWFQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhZGREZWNpbWFscyh2YWx1ZSwgZGVjaW1hbHMsIG1pbkRlY2ltYWxzLCBoYXNDb21tYXMpIHtcbiAgICAgICAgICAgIGhhc0NvbW1hcyA9IChoYXNDb21tYXMgPT09IGZhbHNlKSA/IGZhbHNlIDogdHJ1ZTtcbiAgICAgICAgICAgIHZhciBudW1iZXJUWFQgPSB2YWx1ZS50b1N0cmluZygpO1xuICAgICAgICAgICAgdmFyIGhhc0RlY2ltYWxzID0gKG51bWJlclRYVC5zcGxpdCgnLicpLmxlbmd0aCA+IDEpO1xuICAgICAgICAgICAgdmFyIGlEZWMgPSAwO1xuXG4gICAgICAgICAgICBpZiAoaGFzQ29tbWFzKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaUNoYXIgPSBudW1iZXJUWFQubGVuZ3RoIC0gMTsgaUNoYXIgPiAwOyBpQ2hhci0tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNEZWNpbWFscykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFzRGVjaW1hbHMgPSAobnVtYmVyVFhULmNoYXJBdChpQ2hhcikgIT09ICcuJyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpRGVjID0gKGlEZWMgKyAxKSAlIDM7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaURlYyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlclRYVCA9IG51bWJlclRYVC5zdWJzdHIoMCwgaUNoYXIpICsgJywnICsgbnVtYmVyVFhULnN1YnN0cihpQ2hhcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkZWNpbWFscyA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgdG9BREQ7XG4gICAgICAgICAgICAgICAgaWYgKG51bWJlclRYVC5zcGxpdCgnLicpLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvQUREID0gbWluRGVjaW1hbHM7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b0FERCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlclRYVCArPSAnLic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0b0FERCA9IG1pbkRlY2ltYWxzIC0gbnVtYmVyVFhULnNwbGl0KCcuJylbMV0ubGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHdoaWxlICh0b0FERCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyVFhUICs9ICcwJztcbiAgICAgICAgICAgICAgICAgICAgdG9BREQtLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVtYmVyVFhUO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcm91bmRUbyh2YWx1ZSwgZGlnaXRzKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5yb3VuZCh2YWx1ZSAqIE1hdGgucG93KDEwLCBkaWdpdHMpKSAvIE1hdGgucG93KDEwLCBkaWdpdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0U3VmZml4KGZvcm1hdFRYVCkge1xuICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnJlcGxhY2UoJy4nLCAnJyk7XG4gICAgICAgICAgICB2YXIgZml4ZXNUWFQgPSBmb3JtYXRUWFQuc3BsaXQobmV3IFJlZ0V4cCgnWzB8LHwjXSsnLCAnZycpKTtcbiAgICAgICAgICAgIHJldHVybiAoZml4ZXNUWFQubGVuZ3RoID4gMSkgPyBmaXhlc1RYVFsxXS50b1N0cmluZygpIDogJyc7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBpc0N1cnJlbmN5KHN0cmluZykge1xuICAgICAgICAgICAgdmFyIHMgPSAkLnRyaW0oc3RyaW5nKTtcblxuICAgICAgICAgICAgaWYgKHMgPT09ICckJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKsJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDgsKlJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDgsKjJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKhJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKxJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICdLw4Q/JyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICdrcicgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4LCoicgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCqicgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4bigJknIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqknIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqsnKSB7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZm9ybWF0KG51bWJlciwgZm9ybWF0VFhUKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KG51bWJlcikpIHtcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXJbbnVtYmVyLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFfLmlzU3RyaW5nKG51bWJlcikgJiYgIV8uaXNOdW1iZXIobnVtYmVyKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudW1iZXI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZm9ybWF0VFhUIHx8IGZvcm1hdFRYVC50b0xvd2VyQ2FzZSgpID09PSAnZGVmYXVsdCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVtYmVyLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpc05hTihudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICc/JztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy92YXIgZm9ybWF0VFhUO1xuICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnJlcGxhY2UoJyZldXJvOycsICfDouKAmsKsJyk7XG5cbiAgICAgICAgICAgIC8vIERpdmlkZSArLy0gTnVtYmVyIEZvcm1hdFxuICAgICAgICAgICAgdmFyIGZvcm1hdHMgPSBmb3JtYXRUWFQuc3BsaXQoJzsnKTtcbiAgICAgICAgICAgIGlmIChmb3JtYXRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0KE1hdGguYWJzKG51bWJlciksIGZvcm1hdHNbKChudW1iZXIgPj0gMCkgPyAwIDogMSldKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2F2ZSBTaWduXG4gICAgICAgICAgICB2YXIgc2lnbiA9IChudW1iZXIgPj0gMCkgPyAnJyA6ICctJztcbiAgICAgICAgICAgIG51bWJlciA9IE1hdGguYWJzKG51bWJlcik7XG5cblxuICAgICAgICAgICAgdmFyIGxlZnRPZkRlY2ltYWwgPSBmb3JtYXRUWFQ7XG4gICAgICAgICAgICB2YXIgZCA9IGxlZnRPZkRlY2ltYWwuaW5kZXhPZignLicpO1xuICAgICAgICAgICAgaWYgKGQgPiAtMSkge1xuICAgICAgICAgICAgICAgIGxlZnRPZkRlY2ltYWwgPSBsZWZ0T2ZEZWNpbWFsLnN1YnN0cmluZygwLCBkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG5vcm1hbGl6ZWQgPSBsZWZ0T2ZEZWNpbWFsLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBub3JtYWxpemVkLmxhc3RJbmRleE9mKCdzJyk7XG4gICAgICAgICAgICB2YXIgaXNTaG9ydEZvcm1hdCA9IGluZGV4ID4gLTE7XG5cbiAgICAgICAgICAgIGlmIChpc1Nob3J0Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIG5leHRDaGFyID0gbGVmdE9mRGVjaW1hbC5jaGFyQXQoaW5kZXggKyAxKTtcbiAgICAgICAgICAgICAgICBpZiAobmV4dENoYXIgPT09ICcgJykge1xuICAgICAgICAgICAgICAgICAgICBpc1Nob3J0Rm9ybWF0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbGVhZGluZ1RleHQgPSBpc1Nob3J0Rm9ybWF0ID8gZm9ybWF0VFhULnN1YnN0cmluZygwLCBpbmRleCkgOiAnJztcbiAgICAgICAgICAgIHZhciByaWdodE9mUHJlZml4ID0gaXNTaG9ydEZvcm1hdCA/IGZvcm1hdFRYVC5zdWJzdHIoaW5kZXggKyAxKSA6IGZvcm1hdFRYVC5zdWJzdHIoaW5kZXgpO1xuXG4gICAgICAgICAgICAvL2ZpcnN0IGNoZWNrIHRvIG1ha2Ugc3VyZSAncycgaXMgYWN0dWFsbHkgc2hvcnQgZm9ybWF0IGFuZCBub3QgcGFydCBvZiBzb21lIGxlYWRpbmcgdGV4dFxuICAgICAgICAgICAgaWYgKGlzU2hvcnRGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2hvcnRGb3JtYXRUZXN0ID0gL1swLTkjKl0vO1xuICAgICAgICAgICAgICAgIHZhciBzaG9ydEZvcm1hdFRlc3RSZXN1bHQgPSByaWdodE9mUHJlZml4Lm1hdGNoKHNob3J0Rm9ybWF0VGVzdCk7XG4gICAgICAgICAgICAgICAgaWYgKCFzaG9ydEZvcm1hdFRlc3RSZXN1bHQgfHwgc2hvcnRGb3JtYXRUZXN0UmVzdWx0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvL25vIHNob3J0IGZvcm1hdCBjaGFyYWN0ZXJzIHNvIHRoaXMgbXVzdCBiZSBsZWFkaW5nIHRleHQgaWUuICd3ZWVrcyAnXG4gICAgICAgICAgICAgICAgICAgIGlzU2hvcnRGb3JtYXQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgbGVhZGluZ1RleHQgPSAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vaWYgKGZvcm1hdFRYVC5jaGFyQXQoMCkgPT0gJ3MnKVxuICAgICAgICAgICAgaWYgKGlzU2hvcnRGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsU2NhbGUgPSBudW1iZXIgPT09IDAgPyAwIDogTWF0aC5mbG9vcihNYXRoLmxvZyhNYXRoLmFicyhudW1iZXIpKSAvICgzICogTWF0aC5MTjEwKSk7XG4gICAgICAgICAgICAgICAgdmFsU2NhbGUgPSAoKG51bWJlciAvIE1hdGgucG93KDEwLCAzICogdmFsU2NhbGUpKSA8IDEwMDApID8gdmFsU2NhbGUgOiAodmFsU2NhbGUgKyAxKTtcbiAgICAgICAgICAgICAgICB2YWxTY2FsZSA9IE1hdGgubWF4KHZhbFNjYWxlLCAwKTtcbiAgICAgICAgICAgICAgICB2YWxTY2FsZSA9IE1hdGgubWluKHZhbFNjYWxlLCA0KTtcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgLyBNYXRoLnBvdygxMCwgMyAqIHZhbFNjYWxlKTtcbiAgICAgICAgICAgICAgICAvL2lmICghaXNOYU4oTnVtYmVyKGZvcm1hdFRYVC5zdWJzdHIoMSkgKSApIClcblxuICAgICAgICAgICAgICAgIGlmICghaXNOYU4oTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpKSAmJiByaWdodE9mUHJlZml4LmluZGV4T2YoJy4nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxpbWl0RGlnaXRzID0gTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobnVtYmVyIDwgTWF0aC5wb3coMTAsIGxpbWl0RGlnaXRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ3VycmVuY3kobGVhZGluZ1RleHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWFkaW5nVGV4dCArIGdldERpZ2l0cyhudW1iZXIsIE51bWJlcihyaWdodE9mUHJlZml4KSkgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ1RleHQgKyBzaWduICsgZ2V0RGlnaXRzKG51bWJlciwgTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDdXJyZW5jeShsZWFkaW5nVGV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiArIGxlYWRpbmdUZXh0ICsgTWF0aC5yb3VuZChudW1iZXIpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxlYWRpbmdUZXh0ICsgc2lnbiArIE1hdGgucm91bmQobnVtYmVyKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL2Zvcm1hdFRYVCA9IGZvcm1hdFRYVC5zdWJzdHIoMSk7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5zdWJzdHIoaW5kZXggKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIFNVRkZJWCA9IGdldFN1ZmZpeChmb3JtYXRUWFQpO1xuICAgICAgICAgICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQuc3Vic3RyKDAsIGZvcm1hdFRYVC5sZW5ndGggLSBTVUZGSVgubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsV2l0aG91dExlYWRpbmcgPSBmb3JtYXQoKChzaWduID09PSAnJykgPyAxIDogLTEpICogbnVtYmVyLCBmb3JtYXRUWFQpICsgc2NhbGVzW3ZhbFNjYWxlXSArIFNVRkZJWDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ3VycmVuY3kobGVhZGluZ1RleHQpICYmIHNpZ24gIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxXaXRob3V0TGVhZGluZyA9IHZhbFdpdGhvdXRMZWFkaW5nLnN1YnN0cihzaWduLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiArIGxlYWRpbmdUZXh0ICsgdmFsV2l0aG91dExlYWRpbmc7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ1RleHQgKyB2YWxXaXRob3V0TGVhZGluZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzdWJGb3JtYXRzID0gZm9ybWF0VFhULnNwbGl0KCcuJyk7XG4gICAgICAgICAgICB2YXIgZGVjaW1hbHM7XG4gICAgICAgICAgICB2YXIgbWluRGVjaW1hbHM7XG4gICAgICAgICAgICBpZiAoc3ViRm9ybWF0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgZGVjaW1hbHMgPSBzdWJGb3JtYXRzWzFdLmxlbmd0aCAtIHN1YkZvcm1hdHNbMV0ucmVwbGFjZShuZXcgUmVnRXhwKCdbMHwjXSsnLCAnZycpLCAnJykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIG1pbkRlY2ltYWxzID0gc3ViRm9ybWF0c1sxXS5sZW5ndGggLSBzdWJGb3JtYXRzWzFdLnJlcGxhY2UobmV3IFJlZ0V4cCgnMCsnLCAnZycpLCAnJykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGZvcm1hdFRYVCA9IHN1YkZvcm1hdHNbMF0gKyBzdWJGb3JtYXRzWzFdLnJlcGxhY2UobmV3IFJlZ0V4cCgnWzB8I10rJywgJ2cnKSwgJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWNpbWFscyA9IDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBmaXhlc1RYVCA9IGZvcm1hdFRYVC5zcGxpdChuZXcgUmVnRXhwKCdbMHwsfCNdKycsICdnJykpO1xuICAgICAgICAgICAgdmFyIHByZWZmaXggPSBmaXhlc1RYVFswXS50b1N0cmluZygpO1xuICAgICAgICAgICAgdmFyIHN1ZmZpeCA9IChmaXhlc1RYVC5sZW5ndGggPiAxKSA/IGZpeGVzVFhUWzFdLnRvU3RyaW5nKCkgOiAnJztcblxuICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogKChmb3JtYXRUWFQuc3BsaXQoJyUnKS5sZW5ndGggPiAxKSA/IDEwMCA6IDEpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICBpZiAoZm9ybWF0VFhULmluZGV4T2YoJyUnKSAhPT0gLTEpIG51bWJlciA9IG51bWJlciAqIDEwMDtcbiAgICAgICAgICAgIG51bWJlciA9IHJvdW5kVG8obnVtYmVyLCBkZWNpbWFscyk7XG5cbiAgICAgICAgICAgIHNpZ24gPSAobnVtYmVyID09PSAwKSA/ICcnIDogc2lnbjtcblxuICAgICAgICAgICAgdmFyIGhhc0NvbW1hcyA9IChmb3JtYXRUWFQuc3Vic3RyKGZvcm1hdFRYVC5sZW5ndGggLSA0IC0gc3VmZml4Lmxlbmd0aCwgMSkgPT09ICcsJyk7XG4gICAgICAgICAgICB2YXIgZm9ybWF0dGVkID0gc2lnbiArIHByZWZmaXggKyBhZGREZWNpbWFscyhudW1iZXIsIGRlY2ltYWxzLCBtaW5EZWNpbWFscywgaGFzQ29tbWFzKSArIHN1ZmZpeDtcblxuICAgICAgICAgICAgLy8gIGNvbnNvbGUubG9nKG9yaWdpbmFsTnVtYmVyLCBvcmlnaW5hbEZvcm1hdCwgZm9ybWF0dGVkKVxuICAgICAgICAgICAgcmV0dXJuIGZvcm1hdHRlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXQ7XG4gICAgfSgpKVxufTtcbiIsIi8qKlxuICogIyMgU3RyaW5nIENvbnZlcnRlcnNcbiAqXG4gKiBDb252ZXJ0ZXJzIGFsbG93IHlvdSB0byBjb252ZXJ0IGRhdGEgLS0gaW4gcGFydGljdWxhciwgbW9kZWwgdmFyaWFibGVzIHRoYXQgeW91IGRpc3BsYXkgaW4geW91ciBwcm9qZWN0J3MgdXNlciBpbnRlcmZhY2UgLS0gZnJvbSBvbmUgZm9ybSB0byBhbm90aGVyLlxuICpcbiAqIFRoZXJlIGFyZSB0d28gd2F5cyB0byBzcGVjaWZ5IGNvbnZlcnNpb24gb3IgZm9ybWF0dGluZyBmb3IgdGhlIGRpc3BsYXkgb3V0cHV0IG9mIGEgcGFydGljdWxhciBtb2RlbCB2YXJpYWJsZTpcbiAqXG4gKiAqIEFkZCB0aGUgYXR0cmlidXRlIGBkYXRhLWYtY29udmVydGAgdG8gYW55IGVsZW1lbnQgdGhhdCBhbHNvIGhhcyB0aGUgYGRhdGEtZi1iaW5kYCBvciBgZGF0YS1mLWZvcmVhY2hgLlxuICogKiBVc2UgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyIHdpdGhpbiB0aGUgdmFsdWUgb2YgYW55IGBkYXRhLWYtYCBhdHRyaWJ1dGUgKG5vdCBqdXN0IGBkYXRhLWYtYmluZGAgb3IgYGRhdGEtZi1mb3JlYWNoYCkuXG4gKlxuICogRm9yIG1vZGVsIHZhcmlhYmxlcyB0aGF0IGFyZSBzdHJpbmdzIChvciB0aGF0IGhhdmUgYmVlbiBjb252ZXJ0ZWQgdG8gc3RyaW5ncyksIHRoZXJlIGFyZSBzZXZlcmFsIHNwZWNpYWwgc3RyaW5nIGZvcm1hdHMgeW91IGNhbiBhcHBseS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgdGhlIG1vZGVsIHZhcmlhYmxlIHRvIGEgc3RyaW5nLiBPZnRlbiB1c2VkIGZvciBjaGFpbmluZyB0byBhbm90aGVyIGNvbnZlcnRlci5cbiAgICAgKlxuICAgICAqICoqRXhhbXBsZSoqXG4gICAgICpcbiAgICAgKiAgICAgIDxkaXY+XG4gICAgICogICAgICAgICAgVGhpcyB5ZWFyIHlvdSBhcmUgaW4gY2hhcmdlIG9mIHNhbGVzIGZvclxuICAgICAqICAgICAgICAgIDxzcGFuIGRhdGEtZi1iaW5kPVwic2FsZXNNZ3IucmVnaW9uIHwgcyB8IHVwcGVyQ2FzZVwiPjwvc3Bhbj4uXG4gICAgICogICAgICA8L2Rpdj5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgbW9kZWwgdmFyaWFibGUuXG4gICAgICovXG4gICAgczogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gdmFsICsgJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgdGhlIG1vZGVsIHZhcmlhYmxlIHRvIFVQUEVSIENBU0UuXG4gICAgICpcbiAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAqXG4gICAgICogICAgICA8ZGl2PlxuICAgICAqICAgICAgICAgIFRoaXMgeWVhciB5b3UgYXJlIGluIGNoYXJnZSBvZiBzYWxlcyBmb3JcbiAgICAgKiAgICAgICAgICA8c3BhbiBkYXRhLWYtYmluZD1cInNhbGVzTWdyLnJlZ2lvbiB8IHMgfCB1cHBlckNhc2VcIj48L3NwYW4+LlxuICAgICAqICAgICAgPC9kaXY+XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWwgVGhlIG1vZGVsIHZhcmlhYmxlLlxuICAgICAqL1xuICAgIHVwcGVyQ2FzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gKHZhbCArICcnKS50b1VwcGVyQ2FzZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHRoZSBtb2RlbCB2YXJpYWJsZSB0byBsb3dlciBjYXNlLlxuICAgICAqXG4gICAgICogKipFeGFtcGxlKipcbiAgICAgKlxuICAgICAqICAgICAgPGRpdj5cbiAgICAgKiAgICAgICAgICBFbnRlciB5b3VyIHVzZXIgbmFtZTpcbiAgICAgKiAgICAgICAgICA8aW5wdXQgZGF0YS1mLWJpbmQ9XCJ1c2VyTmFtZSB8IGxvd2VyQ2FzZVwiPjwvaW5wdXQ+LlxuICAgICAqICAgICAgPC9kaXY+XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWwgVGhlIG1vZGVsIHZhcmlhYmxlLlxuICAgICAqL1xuICAgIGxvd2VyQ2FzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gKHZhbCArICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHRoZSBtb2RlbCB2YXJpYWJsZSB0byBUaXRsZSBDYXNlLlxuICAgICAqXG4gICAgICogKipFeGFtcGxlKipcbiAgICAgKlxuICAgICAqICAgICAgPGRpdj5cbiAgICAgKiAgICAgICAgICBDb25ncmF0dWxhdGlvbnMgb24geW91ciBwcm9tb3Rpb24hXG4gICAgICogICAgICAgICAgWW91ciBuZXcgdGl0bGUgaXM6IDxzcGFuIGRhdGEtZi1iaW5kPVwiY3VycmVudFJvbGUgfCB0aXRsZUNhc2VcIj48L3NwYW4+LlxuICAgICAqICAgICAgPC9kaXY+XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWwgVGhlIG1vZGVsIHZhcmlhYmxlLlxuICAgICAqL1xuICAgIHRpdGxlQ2FzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICB2YWwgPSB2YWwgKyAnJztcbiAgICAgICAgcmV0dXJuIHZhbC5yZXBsYWNlKC9cXHdcXFMqL2csIGZ1bmN0aW9uICh0eHQpIHtyZXR1cm4gdHh0LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdHh0LnN1YnN0cigxKS50b0xvd2VyQ2FzZSgpO30pO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG52YXIgbGlzdCA9IFtdO1xuXG52YXIgc3VwcG9ydGVkID0gW1xuICAgICd2YWx1ZXMnLCAna2V5cycsICdjb21wYWN0JywgJ2RpZmZlcmVuY2UnLFxuICAgICdmbGF0dGVuJywgJ3Jlc3QnLFxuICAgICd1bmlvbicsXG4gICAgJ3VuaXEnLCAnemlwJywgJ3dpdGhvdXQnLFxuICAgICd4b3InLCAnemlwJ1xuXTtcbl8uZWFjaChzdXBwb3J0ZWQsIGZ1bmN0aW9uIChmbikge1xuICAgIHZhciBpdGVtID0ge1xuICAgICAgICBhbGlhczogZm4sXG4gICAgICAgIGFjY2VwdExpc3Q6IHRydWUsXG4gICAgICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QodmFsKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBfLm1hcFZhbHVlcyh2YWwsIF9bZm5dKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9bZm5dKHZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGxpc3QucHVzaChpdGVtKTtcbn0pO1xubW9kdWxlLmV4cG9ydHMgPSBsaXN0O1xuIiwiLyoqXG4gKiAjIyBBdHRyaWJ1dGUgTWFuYWdlclxuICpcbiAqIEZsb3cuanMgcHJvdmlkZXMgYSBzZXQgb2YgY3VzdG9tIERPTSBhdHRyaWJ1dGVzIHRoYXQgc2VydmUgYXMgYSBkYXRhIGJpbmRpbmcgYmV0d2VlbiB2YXJpYWJsZXMgYW5kIG9wZXJhdGlvbnMgaW4geW91ciBwcm9qZWN0J3MgbW9kZWwgYW5kIEhUTUwgZWxlbWVudHMgaW4geW91ciBwcm9qZWN0J3MgdXNlciBpbnRlcmZhY2UuIFVuZGVyIHRoZSBob29kLCBGbG93LmpzIGlzIGRvaW5nIGF1dG9tYXRpYyBjb252ZXJzaW9uIG9mIHRoZXNlIGN1c3RvbSBhdHRyaWJ1dGVzLCBsaWtlIGBkYXRhLWYtYmluZGAsIGludG8gSFRNTCBzcGVjaWZpYyB0byB0aGUgYXR0cmlidXRlJ3MgYXNzaWduZWQgdmFsdWUsIGxpa2UgdGhlIGN1cnJlbnQgdmFsdWUgb2YgYG15TW9kZWxWYXJgLlxuICpcbiAqIElmIHlvdSBhcmUgbG9va2luZyBmb3IgZXhhbXBsZXMgb2YgdXNpbmcgcGFydGljdWxhciBhdHRyaWJ1dGVzLCBzZWUgdGhlIFtzcGVjaWZpYyBhdHRyaWJ1dGVzIHN1YnBhZ2VzXSguLi8uLi8uLi8uLi9hdHRyaWJ1dGVzLW92ZXJ2aWV3LykuXG4gKlxuICogSWYgeW91IHdvdWxkIGxpa2UgdG8gZXh0ZW5kIEZsb3cuanMgd2l0aCB5b3VyIG93biBjdXN0b20gYXR0cmlidXRlcywgeW91IGNhbiBhZGQgdGhlbSB0byBGbG93LmpzIHVzaW5nIHRoZSBBdHRyaWJ1dGUgTWFuYWdlci5cbiAqXG4gKiBUaGUgQXR0cmlidXRlIE1hbmFnZXIgaXMgc3BlY2lmaWMgdG8gYWRkaW5nIGN1c3RvbSBhdHRyaWJ1dGVzIGFuZCBkZXNjcmliaW5nIHRoZWlyIGltcGxlbWVudGF0aW9uIChoYW5kbGVycykuIChUaGUgW0RvbSBNYW5hZ2VyXSguLi8uLi8pIGNvbnRhaW5zIHRoZSBnZW5lcmFsIGltcGxlbWVudGF0aW9uLilcbiAqXG4gKlxuICogKipFeGFtcGxlcyoqXG4gKlxuICogQnVpbHQtaW4gYXR0cmlidXRlIGhhbmRsZXJzIGxpa2UgYGRhdGEtZi12YWx1ZWAgYW5kIGBkYXRhLWYtZm9yZWFjaGAgYXV0b21hdGljYWxseSBiaW5kIHZhcmlhYmxlcyBpbiB5b3VyIHByb2plY3QncyBtb2RlbCB0byBwYXJ0aWN1bGFyIEhUTUwgZWxlbWVudHMuIEhvd2V2ZXIsIHlvdXIgVUkgbWF5IHNvbWV0aW1lcyByZXF1aXJlIGRpc3BsYXlpbmcgb25seSBwYXJ0IG9mIHRoZSB2YXJpYWJsZSAoZS5nLiBpZiBpdCdzIGFuIG9iamVjdCksIG9yIFwiZG9pbmcgc29tZXRoaW5nXCIgd2l0aCB0aGUgdmFsdWUgb2YgdGhlIHZhcmlhYmxlLCByYXRoZXIgdGhhbiBzaW1wbHkgZGlzcGxheWluZyBpdC5cbiAqXG4gKiBPbmUgZXhhbXBsZSBvZiB3aGVuIGN1c3RvbSBhdHRyaWJ1dGUgaGFuZGxlcnMgYXJlIHVzZWZ1bCBpcyB3aGVuIHlvdXIgbW9kZWwgdmFyaWFibGUgaXMgYSBjb21wbGV4IG9iamVjdCBhbmQgeW91IHdhbnQgdG8gZGlzcGxheSB0aGUgZmllbGRzIGluIGEgcGFydGljdWxhciB3YXksIG9yIHlvdSBvbmx5IHdhbnQgdG8gZGlzcGxheSBzb21lIG9mIHRoZSBmaWVsZHMuIFdoaWxlIHRoZSBjb21iaW5hdGlvbiBvZiB0aGUgW2BkYXRhLWYtZm9yZWFjaGAgYXR0cmlidXRlXSguLi9mb3JlYWNoL2RlZmF1bHQtZm9yZWFjaC1hdHRyLykgYW5kIFt0ZW1wbGF0aW5nXSguLi8uLi8uLi8uLi8jdGVtcGxhdGVzKSBjYW4gaGVscCB3aXRoIHRoaXMsIHNvbWV0aW1lcyBpdCdzIGVhc2llciB0byB3cml0ZSB5b3VyIG93biBhdHRyaWJ1dGUgaGFuZGxlci4gKFRoaXMgaXMgZXNwZWNpYWxseSB0cnVlIGlmIHlvdSB3aWxsIGJlIHJldXNpbmcgdGhlIGF0dHJpYnV0ZSBoYW5kbGVyIC0tIHlvdSB3b24ndCBoYXZlIHRvIGNvcHkgeW91ciB0ZW1wbGF0aW5nIGNvZGUgb3ZlciBhbmQgb3Zlci4pXG4gKlxuICogICAgICBGbG93LmRvbS5hdHRyaWJ1dGVzLnJlZ2lzdGVyKCdzaG93U2NoZWQnLCAnKicsIGZ1bmN0aW9uIChzY2hlZCkge1xuICogICAgICAgICAgICAvLyBkaXNwbGF5IGFsbCB0aGUgc2NoZWR1bGUgbWlsZXN0b25lc1xuICogICAgICAgICAgICAvLyBzY2hlZCBpcyBhbiBvYmplY3QsIGVhY2ggZWxlbWVudCBpcyBhbiBhcnJheVxuICogICAgICAgICAgICAvLyBvZiBbJ0Zvcm1hbCBNaWxlc3RvbmUgTmFtZScsIG1pbGVzdG9uZU1vbnRoLCBjb21wbGV0aW9uUGVyY2VudGFnZV1cbiAqXG4gKiAgICAgICAgICAgIHZhciBzY2hlZFN0ciA9ICc8dWw+JztcbiAqICAgICAgICAgICAgdmFyIHNvcnRlZFNjaGVkID0gXy5zb3J0Qnkoc2NoZWQsIGZ1bmN0aW9uKGVsKSB7IHJldHVybiBlbFsxXTsgfSk7XG4gKlxuICogICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNvcnRlZFNjaGVkLmxlbmd0aDsgaSsrKSB7XG4gKiAgICAgICAgICAgICAgICAgIHNjaGVkU3RyICs9ICc8bGk+PHN0cm9uZz4nICsgc29ydGVkU2NoZWRbaV1bMF1cbiAqICAgICAgICAgICAgICAgICAgICAgICAgKyAnPC9zdHJvbmc+IGN1cnJlbnRseSBzY2hlZHVsZWQgZm9yIDxzdHJvbmc+TW9udGggJ1xuICogICAgICAgICAgICAgICAgICAgICAgICArIHNvcnRlZFNjaGVkW2ldWzFdICsgJzwvc3Ryb25nPjwvbGk+JztcbiAqICAgICAgICAgICAgfVxuICogICAgICAgICAgICBzY2hlZFN0ciArPSAnPC91bD4nO1xuICpcbiAqICAgICAgICAgICAgdGhpcy5odG1sKHNjaGVkU3RyKTtcbiAqICAgICAgfSk7XG4gKlxuICogVGhlbiwgeW91IGNhbiB1c2UgdGhlIGF0dHJpYnV0ZSBoYW5kbGVyIGluIHlvdXIgSFRNTCBqdXN0IGxpa2Ugb3RoZXIgRmxvdy5qcyBhdHRyaWJ1dGVzOlxuICpcbiAqICAgICAgPGRpdiBkYXRhLWYtc2hvd1NjaGVkPVwic2NoZWR1bGVcIj48L2Rpdj5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVmYXVsdEhhbmRsZXJzID0gW1xuICAgIHJlcXVpcmUoJy4vbm8tb3AtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZXZlbnRzL2luaXQtZXZlbnQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZXZlbnRzL2RlZmF1bHQtZXZlbnQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZm9yZWFjaC9kZWZhdWx0LWZvcmVhY2gtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vYmluZHMvY2hlY2tib3gtcmFkaW8tYmluZC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9iaW5kcy9pbnB1dC1iaW5kLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2NsYXNzLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL3JlcGVhdC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9wb3NpdGl2ZS1ib29sZWFuLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL25lZ2F0aXZlLWJvb2xlYW4tYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vYmluZHMvZGVmYXVsdC1iaW5kLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2RlZmF1bHQtYXR0cicpXG5dO1xuXG52YXIgaGFuZGxlcnNMaXN0ID0gW107XG5cbnZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAoYXR0cmlidXRlTWF0Y2hlciwgbm9kZU1hdGNoZXIsIGhhbmRsZXIpIHtcbiAgICBpZiAoIW5vZGVNYXRjaGVyKSB7XG4gICAgICAgIG5vZGVNYXRjaGVyID0gJyonO1xuICAgIH1cbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgICAgIGhhbmRsZXIgPSB7XG4gICAgICAgICAgICBoYW5kbGU6IGhhbmRsZXJcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuICQuZXh0ZW5kKGhhbmRsZXIsIHsgdGVzdDogYXR0cmlidXRlTWF0Y2hlciwgdGFyZ2V0OiBub2RlTWF0Y2hlciB9KTtcbn07XG5cbiQuZWFjaChkZWZhdWx0SGFuZGxlcnMsIGZ1bmN0aW9uIChpbmRleCwgaGFuZGxlcikge1xuICAgIGhhbmRsZXJzTGlzdC5wdXNoKG5vcm1hbGl6ZShoYW5kbGVyLnRlc3QsIGhhbmRsZXIudGFyZ2V0LCBoYW5kbGVyKSk7XG59KTtcblxuXG52YXIgbWF0Y2hBdHRyID0gZnVuY3Rpb24gKG1hdGNoRXhwciwgYXR0ciwgJGVsKSB7XG4gICAgdmFyIGF0dHJNYXRjaDtcblxuICAgIGlmIChfLmlzU3RyaW5nKG1hdGNoRXhwcikpIHtcbiAgICAgICAgYXR0ck1hdGNoID0gKG1hdGNoRXhwciA9PT0gJyonIHx8IChtYXRjaEV4cHIudG9Mb3dlckNhc2UoKSA9PT0gYXR0ci50b0xvd2VyQ2FzZSgpKSk7XG4gICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24obWF0Y2hFeHByKSkge1xuICAgICAgICAvL1RPRE86IHJlbW92ZSBlbGVtZW50IHNlbGVjdG9ycyBmcm9tIGF0dHJpYnV0ZXNcbiAgICAgICAgYXR0ck1hdGNoID0gbWF0Y2hFeHByKGF0dHIsICRlbCk7XG4gICAgfSBlbHNlIGlmIChfLmlzUmVnRXhwKG1hdGNoRXhwcikpIHtcbiAgICAgICAgYXR0ck1hdGNoID0gYXR0ci5tYXRjaChtYXRjaEV4cHIpO1xuICAgIH1cbiAgICByZXR1cm4gYXR0ck1hdGNoO1xufTtcblxudmFyIG1hdGNoTm9kZSA9IGZ1bmN0aW9uICh0YXJnZXQsIG5vZGVGaWx0ZXIpIHtcbiAgICByZXR1cm4gKF8uaXNTdHJpbmcobm9kZUZpbHRlcikpID8gKG5vZGVGaWx0ZXIgPT09IHRhcmdldCkgOiBub2RlRmlsdGVyLmlzKHRhcmdldCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsaXN0OiBoYW5kbGVyc0xpc3QsXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IGF0dHJpYnV0ZSBoYW5kbGVyLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7U3RyaW5nfEZ1bmN0aW9ufFJlZ2V4fSBhdHRyaWJ1dGVNYXRjaGVyIERlc2NyaXB0aW9uIG9mIHdoaWNoIGF0dHJpYnV0ZXMgdG8gbWF0Y2guXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBub2RlTWF0Y2hlciBXaGljaCBub2RlcyB0byBhZGQgYXR0cmlidXRlcyB0by4gVXNlIFtqcXVlcnkgU2VsZWN0b3Igc3ludGF4XShodHRwczovL2FwaS5qcXVlcnkuY29tL2NhdGVnb3J5L3NlbGVjdG9ycy8pLlxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufE9iamVjdH0gaGFuZGxlciBJZiBgaGFuZGxlcmAgaXMgYSBmdW5jdGlvbiwgdGhlIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIGAkZWxlbWVudGAgYXMgY29udGV4dCwgYW5kIGF0dHJpYnV0ZSB2YWx1ZSArIG5hbWUuIElmIGBoYW5kbGVyYCBpcyBhbiBvYmplY3QsIGl0IHNob3VsZCBpbmNsdWRlIHR3byBmdW5jdGlvbnMsIGFuZCBoYXZlIHRoZSBmb3JtOiBgeyBpbml0OiBmbiwgIGhhbmRsZTogZm4gfWAuIFRoZSBgaW5pdGAgZnVuY3Rpb24gaXMgY2FsbGVkIHdoZW4gdGhlIHBhZ2UgbG9hZHM7IHVzZSB0aGlzIHRvIGRlZmluZSBldmVudCBoYW5kbGVycy4gVGhlIGBoYW5kbGVgIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIGAkZWxlbWVudGAgYXMgY29udGV4dCwgYW5kIGF0dHJpYnV0ZSB2YWx1ZSArIG5hbWUuXG4gICAgICovXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChhdHRyaWJ1dGVNYXRjaGVyLCBub2RlTWF0Y2hlciwgaGFuZGxlcikge1xuICAgICAgICBoYW5kbGVyc0xpc3QudW5zaGlmdChub3JtYWxpemUuYXBwbHkobnVsbCwgYXJndW1lbnRzKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZpbmQgYW4gYXR0cmlidXRlIG1hdGNoZXIgbWF0Y2hpbmcgc29tZSBjcml0ZXJpYS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gYXR0ckZpbHRlciBBdHRyaWJ1dGUgdG8gbWF0Y2guXG4gICAgICogQHBhcmFtICB7U3RyaW5nfCRlbH0gbm9kZUZpbHRlciBOb2RlIHRvIG1hdGNoLlxuICAgICAqXG4gICAgICogQHJldHVybiB7QXJyYXl8TnVsbH0gQW4gYXJyYXkgb2YgbWF0Y2hpbmcgYXR0cmlidXRlIGhhbmRsZXJzLCBvciBudWxsIGlmIG5vIG1hdGNoZXMgZm91bmQuXG4gICAgICovXG4gICAgZmlsdGVyOiBmdW5jdGlvbiAoYXR0ckZpbHRlciwgbm9kZUZpbHRlcikge1xuICAgICAgICB2YXIgZmlsdGVyZWQgPSBfLnNlbGVjdChoYW5kbGVyc0xpc3QsIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hBdHRyKGhhbmRsZXIudGVzdCwgYXR0ckZpbHRlcik7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAobm9kZUZpbHRlcikge1xuICAgICAgICAgICAgZmlsdGVyZWQgPSBfLnNlbGVjdChmaWx0ZXJlZCwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hOb2RlKGhhbmRsZXIudGFyZ2V0LCBub2RlRmlsdGVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmaWx0ZXJlZDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVwbGFjZSBhbiBleGlzdGluZyBhdHRyaWJ1dGUgaGFuZGxlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gYXR0ckZpbHRlciBBdHRyaWJ1dGUgdG8gbWF0Y2guXG4gICAgICogQHBhcmFtICB7U3RyaW5nIHwgJGVsfSBub2RlRmlsdGVyIE5vZGUgdG8gbWF0Y2guXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb258T2JqZWN0fSBoYW5kbGVyIFRoZSB1cGRhdGVkIGF0dHJpYnV0ZSBoYW5kbGVyLiBJZiBgaGFuZGxlcmAgaXMgYSBmdW5jdGlvbiwgdGhlIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIGAkZWxlbWVudGAgYXMgY29udGV4dCwgYW5kIGF0dHJpYnV0ZSB2YWx1ZSArIG5hbWUuIElmIGBoYW5kbGVyYCBpcyBhbiBvYmplY3QsIGl0IHNob3VsZCBpbmNsdWRlIHR3byBmdW5jdGlvbnMsIGFuZCBoYXZlIHRoZSBmb3JtOiBgeyBpbml0OiBmbiwgIGhhbmRsZTogZm4gfWAuIFRoZSBgaW5pdGAgZnVuY3Rpb24gaXMgY2FsbGVkIHdoZW4gdGhlIHBhZ2UgbG9hZHM7IHVzZSB0aGlzIHRvIGRlZmluZSBldmVudCBoYW5kbGVycy4gVGhlIGBoYW5kbGVgIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIGAkZWxlbWVudGAgYXMgY29udGV4dCwgYW5kIGF0dHJpYnV0ZSB2YWx1ZSArIG5hbWUuXG4gICAgICovXG4gICAgcmVwbGFjZTogZnVuY3Rpb24gKGF0dHJGaWx0ZXIsIG5vZGVGaWx0ZXIsIGhhbmRsZXIpIHtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBfLmVhY2goaGFuZGxlcnNMaXN0LCBmdW5jdGlvbiAoY3VycmVudEhhbmRsZXIsIGkpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaEF0dHIoY3VycmVudEhhbmRsZXIudGVzdCwgYXR0ckZpbHRlcikgJiYgbWF0Y2hOb2RlKGN1cnJlbnRIYW5kbGVyLnRhcmdldCwgbm9kZUZpbHRlcikpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaGFuZGxlcnNMaXN0LnNwbGljZShpbmRleCwgMSwgbm9ybWFsaXplKGF0dHJGaWx0ZXIsIG5vZGVGaWx0ZXIsIGhhbmRsZXIpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIFJldHJpZXZlIHRoZSBhcHByb3ByaWF0ZSBoYW5kbGVyIGZvciBhIHBhcnRpY3VsYXIgYXR0cmlidXRlLiBUaGVyZSBtYXkgYmUgbXVsdGlwbGUgbWF0Y2hpbmcgaGFuZGxlcnMsIGJ1dCB0aGUgZmlyc3QgKG1vc3QgZXhhY3QpIG1hdGNoIGlzIGFsd2F5cyB1c2VkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHByb3BlcnR5IFRoZSBhdHRyaWJ1dGUuXG4gICAgICogQHBhcmFtIHskZWx9ICRlbCBUaGUgRE9NIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IFRoZSBhdHRyaWJ1dGUgaGFuZGxlci5cbiAgICAgKi9cbiAgICBnZXRIYW5kbGVyOiBmdW5jdGlvbiAocHJvcGVydHksICRlbCkge1xuICAgICAgICB2YXIgZmlsdGVyZWQgPSB0aGlzLmZpbHRlcihwcm9wZXJ0eSwgJGVsKTtcbiAgICAgICAgLy9UaGVyZSBjb3VsZCBiZSBtdWx0aXBsZSBtYXRjaGVzLCBidXQgdGhlIHRvcCBmaXJzdCBoYXMgdGhlIG1vc3QgcHJpb3JpdHlcbiAgICAgICAgcmV0dXJuIGZpbHRlcmVkWzBdO1xuICAgIH1cbn07XG5cbiIsIi8qKlxuICogIyMgQ2hlY2tib3hlcyBhbmQgUmFkaW8gQnV0dG9uc1xuICpcbiAqIEluIHRoZSBbZGVmYXVsdCBjYXNlXSguLi9kZWZhdWx0LWJpbmQtYXR0ci8pLCB0aGUgYGRhdGEtZi1iaW5kYCBhdHRyaWJ1dGUgY3JlYXRlcyBhIGJpLWRpcmVjdGlvbmFsIGJpbmRpbmcgYmV0d2VlbiB0aGUgRE9NIGVsZW1lbnQgYW5kIHRoZSBtb2RlbCB2YXJpYWJsZS4gVGhpcyBiaW5kaW5nIGlzICoqYmktZGlyZWN0aW9uYWwqKiwgbWVhbmluZyB0aGF0IGFzIHRoZSBtb2RlbCBjaGFuZ2VzLCB0aGUgaW50ZXJmYWNlIGlzIGF1dG9tYXRpY2FsbHkgdXBkYXRlZDsgYW5kIHdoZW4gZW5kIHVzZXJzIGNoYW5nZSB2YWx1ZXMgaW4gdGhlIGludGVyZmFjZSwgdGhlIG1vZGVsIGlzIGF1dG9tYXRpY2FsbHkgdXBkYXRlZC5cbiAqXG4gKiBGbG93LmpzIHByb3ZpZGVzIHNwZWNpYWwgaGFuZGxpbmcgZm9yIERPTSBlbGVtZW50cyB3aXRoIGB0eXBlPVwiY2hlY2tib3hcImAgYW5kIGB0eXBlPVwicmFkaW9cImAuXG4gKlxuICogSW4gcGFydGljdWxhciwgaWYgeW91IGFkZCB0aGUgYGRhdGEtZi1iaW5kYCBhdHRyaWJ1dGUgdG8gYW4gYGlucHV0YCB3aXRoIGB0eXBlPVwiY2hlY2tib3hcImAgYW5kIGB0eXBlPVwicmFkaW9cImAsIHRoZSBjaGVja2JveCBvciByYWRpbyBidXR0b24gaXMgYXV0b21hdGljYWxseSBzZWxlY3RlZCBpZiB0aGUgYHZhbHVlYCBtYXRjaGVzIHRoZSB2YWx1ZSBvZiB0aGUgbW9kZWwgdmFyaWFibGUgcmVmZXJlbmNlZCwgb3IgaWYgdGhlIG1vZGVsIHZhcmlhYmxlIGlzIGB0cnVlYC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPCEtLSByYWRpbyBidXR0b24sIHNlbGVjdGVkIGlmIHNhbXBsZUludCBpcyA4IC0tPlxuICogICAgICA8aW5wdXQgdHlwZT1cInJhZGlvXCIgZGF0YS1mLWJpbmQ9XCJzYW1wbGVJbnRcIiB2YWx1ZT1cIjhcIiAvPlxuICpcbiAqICAgICAgPCEtLSBjaGVja2JveCwgY2hlY2tlZCBpZiBzYW1wbGVCb29sIGlzIHRydWUgLS0+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBkYXRhLWYtYmluZD1cInNhbXBsZUJvb2xcIiAvPlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnOmNoZWNrYm94LDpyYWRpbycsXG5cbiAgICB0ZXN0OiAnYmluZCcsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2V0dGFibGVWYWx1ZSA9IHRoaXMuYXR0cigndmFsdWUnKTsgLy9pbml0aWFsIHZhbHVlXG4gICAgICAgIC8qanNsaW50IGVxZXE6IHRydWUqL1xuICAgICAgICB2YXIgaXNDaGVja2VkID0gKHNldHRhYmxlVmFsdWUgIT09IHVuZGVmaW5lZCkgPyAoc2V0dGFibGVWYWx1ZSA9PSB2YWx1ZSkgOiAhIXZhbHVlO1xuICAgICAgICB0aGlzLnByb3AoJ2NoZWNrZWQnLCBpc0NoZWNrZWQpO1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIERlZmF1bHQgQmktZGlyZWN0aW9uYWwgQmluZGluZzogZGF0YS1mLWJpbmRcbiAqXG4gKiBUaGUgbW9zdCBjb21tb25seSB1c2VkIGF0dHJpYnV0ZSBwcm92aWRlZCBieSBGbG93LmpzIGlzIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZS5cbiAqXG4gKiAjIyMjZGF0YS1mLWJpbmQgd2l0aCBhIHNpbmdsZSB2YWx1ZVxuICpcbiAqIFlvdSBjYW4gYmluZCB2YXJpYWJsZXMgZnJvbSB0aGUgbW9kZWwgaW4geW91ciBpbnRlcmZhY2UgYnkgc2V0dGluZyB0aGUgYGRhdGEtZi1iaW5kYCBhdHRyaWJ1dGUuIFRoaXMgYXR0cmlidXRlIGJpbmRpbmcgaXMgYmktZGlyZWN0aW9uYWwsIG1lYW5pbmcgdGhhdCBhcyB0aGUgbW9kZWwgY2hhbmdlcywgdGhlIGludGVyZmFjZSBpcyBhdXRvbWF0aWNhbGx5IHVwZGF0ZWQ7IGFuZCB3aGVuIHVzZXJzIGNoYW5nZSB2YWx1ZXMgaW4gdGhlIGludGVyZmFjZSwgdGhlIG1vZGVsIGlzIGF1dG9tYXRpY2FsbHkgdXBkYXRlZC4gU3BlY2lmaWNhbGx5OlxuICpcbiAqICogVGhlIGJpbmRpbmcgZnJvbSB0aGUgbW9kZWwgdG8gdGhlIGludGVyZmFjZSBlbnN1cmVzIHRoYXQgdGhlIGN1cnJlbnQgdmFsdWUgb2YgdGhlIHZhcmlhYmxlIGlzIGRpc3BsYXllZCBpbiB0aGUgSFRNTCBlbGVtZW50LiBUaGlzIGluY2x1ZGVzIGF1dG9tYXRpYyB1cGRhdGVzIHRvIHRoZSBkaXNwbGF5ZWQgdmFsdWUgaWYgc29tZXRoaW5nIGVsc2UgY2hhbmdlcyBpbiB0aGUgbW9kZWwuXG4gKlxuICogKiBUaGUgYmluZGluZyBmcm9tIHRoZSBpbnRlcmZhY2UgdG8gdGhlIG1vZGVsIGVuc3VyZXMgdGhhdCBpZiB0aGUgSFRNTCBlbGVtZW50IGlzIGVkaXRhYmxlLCBjaGFuZ2VzIGFyZSBzZW50IHRvIHRoZSBtb2RlbC5cbiAqXG4gKiBPbmNlIHlvdSBzZXQgYGRhdGEtZi1iaW5kYCwgRmxvdy5qcyBmaWd1cmVzIG91dCB0aGUgYXBwcm9wcmlhdGUgYWN0aW9uIHRvIHRha2UgYmFzZWQgb24gdGhlIGVsZW1lbnQgdHlwZSBhbmQgdGhlIGRhdGEgcmVzcG9uc2UgZnJvbSB5b3VyIG1vZGVsLlxuICpcbiAqICoqVG8gZGlzcGxheSBhbmQgYXV0b21hdGljYWxseSB1cGRhdGUgYSB2YXJpYWJsZSBpbiB0aGUgaW50ZXJmYWNlOioqXG4gKlxuICogMS4gQWRkIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZSB0byBhbnkgSFRNTCBlbGVtZW50IHRoYXQgbm9ybWFsbHkgdGFrZXMgYSB2YWx1ZS5cbiAqIDIuIFNldCB0aGUgdmFsdWUgb2YgdGhlIGBkYXRhLWYtYmluZGAgYXR0cmlidXRlIHRvIHRoZSBuYW1lIG9mIHRoZSB2YXJpYWJsZS5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPHNwYW4gZGF0YS1mLWJpbmQ9XCJzYWxlc01hbmFnZXIubmFtZVwiIC8+XG4gKlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInNhbXBsZVN0cmluZ1wiIC8+XG4gKlxuICogKipOb3RlczoqKlxuICpcbiAqICogVXNlIHNxdWFyZSBicmFja2V0cywgYFtdYCwgdG8gcmVmZXJlbmNlIGFycmF5ZWQgdmFyaWFibGVzOiBgc2FsZXNbV2VzdF1gLlxuICogKiBVc2UgYW5nbGUgYnJhY2tldHMsIGA8PmAsIHRvIHJlZmVyZW5jZSBvdGhlciB2YXJpYWJsZXMgaW4geW91ciBhcnJheSBpbmRleDogYHNhbGVzWzxjdXJyZW50UmVnaW9uPl1gLlxuICogKiBSZW1lbWJlciB0aGF0IGlmIHlvdXIgbW9kZWwgaXMgaW4gVmVuc2ltLCB0aGUgdGltZSBzdGVwIGNhbiBiZSB0aGUgZmlyc3QgYXJyYXkgaW5kZXggb3IgdGhlIGxhc3QgYXJyYXkgaW5kZXgsIGRlcGVuZGluZyBvbiB5b3VyIFttb2RlbC5jZmddKC4uLy4uLy4uLy4uLy4uLy4uL21vZGVsX2NvZGUvdmVuc2ltLyNjcmVhdGluZy1jZmcpIGZpbGUuXG4gKiAqIEJ5IGRlZmF1bHQsIGFsbCBIVE1MIGVsZW1lbnRzIHVwZGF0ZSBmb3IgYW55IGNoYW5nZSBmb3IgZWFjaCB2YXJpYWJsZS4gSG93ZXZlciwgeW91IGNhbiBwcmV2ZW50IHRoZSB1c2VyIGludGVyZmFjZSBmcm9tIHVwZGF0aW5nICZtZGFzaDsgZWl0aGVyIGZvciBhbGwgdmFyaWFibGVzIG9yIGZvciBwYXJ0aWN1bGFyIHZhcmlhYmxlcyAmbWRhc2g7IGJ5IHNldHRpbmcgdGhlIGBzaWxlbnRgIHByb3BlcnR5IHdoZW4geW91IGluaXRpYWxpemUgRmxvdy5qcy4gU2VlIG1vcmUgb24gW2FkZGl0aW9uYWwgb3B0aW9ucyBmb3IgdGhlIEZsb3cuaW5pdGlhbGl6ZSgpIG1ldGhvZF0oLi4vLi4vLi4vLi4vLi4vI2N1c3RvbS1pbml0aWFsaXplKS5cbiAqXG4gKiAjIyMjZGF0YS1mLWJpbmQgd2l0aCBtdWx0aXBsZSB2YWx1ZXMgYW5kIHRlbXBsYXRlc1xuICpcbiAqIElmIHlvdSBoYXZlIG11bHRpcGxlIHZhcmlhYmxlcywgeW91IGNhbiB1c2UgdGhlIHNob3J0Y3V0IG9mIGxpc3RpbmcgbXVsdGlwbGUgdmFyaWFibGVzIGluIGFuIGVuY2xvc2luZyBIVE1MIGVsZW1lbnQgYW5kIHRoZW4gcmVmZXJlbmNpbmcgZWFjaCB2YXJpYWJsZSB1c2luZyB0ZW1wbGF0ZXMuIChUZW1wbGF0ZXMgYXJlIGF2YWlsYWJsZSBhcyBwYXJ0IG9mIEZsb3cuanMncyBsb2Rhc2ggZGVwZW5kZW5jeS4gU2VlIG1vcmUgYmFja2dyb3VuZCBvbiBbd29ya2luZyB3aXRoIHRlbXBsYXRlc10oLi4vLi4vLi4vLi4vLi4vI3RlbXBsYXRlcykuKVxuICpcbiAqICoqVG8gZGlzcGxheSBhbmQgYXV0b21hdGljYWxseSB1cGRhdGUgbXVsdGlwbGUgdmFyaWFibGVzIGluIHRoZSBpbnRlcmZhY2U6KipcbiAqXG4gKiAxLiBBZGQgdGhlIGBkYXRhLWYtYmluZGAgYXR0cmlidXRlIHRvIGFueSBIVE1MIGVsZW1lbnQgZnJvbSB3aGljaCB5b3Ugd2FudCB0byByZWZlcmVuY2UgbW9kZWwgdmFyaWFibGVzLCBzdWNoIGFzIGEgYGRpdmAgb3IgYHRhYmxlYC5cbiAqIDIuIFNldCB0aGUgdmFsdWUgb2YgdGhlIGBkYXRhLWYtYmluZGAgYXR0cmlidXRlIGluIHlvdXIgdG9wLWxldmVsIEhUTUwgZWxlbWVudCB0byBhIGNvbW1hLXNlcGFyYXRlZCBsaXN0IG9mIHRoZSB2YXJpYWJsZXMuIChUaGUgdmFyaWFibGVzIG1heSBvciBtYXkgbm90IGJlIGNhc2Utc2Vuc2l0aXZlLCBkZXBlbmRpbmcgb24geW91ciBtb2RlbGluZyBsYW5ndWFnZS4pXG4gKlxuICogMy4gSW5zaWRlIHRoZSBIVE1MIGVsZW1lbnQsIHVzZSB0ZW1wbGF0ZXMgKGA8JT0gJT5gKSB0byByZWZlcmVuY2UgdGhlIHNwZWNpZmljIHZhcmlhYmxlIG5hbWVzLiBUaGVzZSB2YXJpYWJsZSBuYW1lcyBhcmUgY2FzZS1zZW5zaXRpdmU6IHRoZXkgc2hvdWxkIG1hdGNoIHRoZSBjYXNlIHlvdSB1c2VkIGluIHRoZSBgZGF0YS1mLWJpbmRgIGluIHN0ZXAgMi5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPCEtLSBtYWtlIHRoZXNlIHRocmVlIG1vZGVsIHZhcmlhYmxlcyBhdmFpbGFibGUgdGhyb3VnaG91dCBkaXYgLS0+XG4gKlxuICogICAgICA8ZGl2IGRhdGEtZi1iaW5kPVwiQ3VycmVudFllYXIsIFJldmVudWUsIFByb2ZpdFwiPlxuICogICAgICAgICAgSW4gPCU9IEN1cnJlbnRZZWFyICU+LFxuICogICAgICAgICAgb3VyIGNvbXBhbnkgZWFybmVkIDwlPSBSZXZlbnVlICU+LFxuICogICAgICAgICAgcmVzdWx0aW5nIGluIDwlPSBQcm9maXQgJT4gcHJvZml0LlxuICogICAgICA8L2Rpdj5cbiAqXG4gKiBUaGlzIGV4YW1wbGUgaXMgc2hvcnRoYW5kIGZvciByZXBlYXRlZGx5IHVzaW5nIGRhdGEtZi1iaW5kLiBGb3IgaW5zdGFuY2UsIHRoaXMgY29kZSBhbHNvIGdlbmVyYXRlcyB0aGUgc2FtZSBvdXRwdXQ6XG4gKlxuICogICAgICA8ZGl2PlxuICogICAgICAgICAgSW4gPHNwYW4gZGF0YS1mLWJpbmQ9XCJDdXJyZW50WWVhclwiPjwvc3Bhbj4sXG4gKiAgICAgICAgICBvdXIgY29tcGFueSBlYXJuZWQgPHNwYW4gZGF0YS1mLWJpbmQ9XCJSZXZlbnVlXCI+PC9zcGFuPixcbiAqICAgICAgICAgIHJlc3VsdGluZyBpbiA8c3BhbiBkYXRhLWYtYmluZD1cIlByb2ZpdFwiPiBwcm9maXQ8L3NwYW4+LlxuICogICAgICA8L2Rpdj5cbiAqXG4gKiAqKk5vdGVzOioqXG4gKlxuICogKiBBZGRpbmcgYGRhdGEtZi1iaW5kYCB0byB0aGUgZW5jbG9zaW5nIEhUTUwgZWxlbWVudCByYXRoZXIgdGhhbiByZXBlYXRlZGx5IHVzaW5nIGl0IHdpdGhpbiB0aGUgZWxlbWVudCBpcyBhIGNvZGUgc3R5bGUgcHJlZmVyZW5jZS4gSW4gbWFueSBjYXNlcywgYWRkaW5nIGBkYXRhLWYtYmluZGAgYXQgdGhlIHRvcCBsZXZlbCwgYXMgaW4gdGhlIGZpcnN0IGV4YW1wbGUsIGNhbiBtYWtlIHlvdXIgY29kZSBlYXNpZXIgdG8gcmVhZCBhbmQgbWFpbnRhaW4uXG4gKiAqIEhvd2V2ZXIsIHlvdSBtaWdodCBjaG9vc2UgdG8gcmVwZWF0ZWRseSB1c2UgYGRhdGEtZi1iaW5kYCBpbiBzb21lIGNhc2VzLCBmb3IgZXhhbXBsZSBpZiB5b3Ugd2FudCBkaWZmZXJlbnQgW2Zvcm1hdHRpbmddKC4uLy4uLy4uLy4uLy4uL2NvbnZlcnRlci1vdmVydmlldy8pIGZvciBkaWZmZXJlbnQgdmFyaWFibGVzOlxuICpcbiAqICAgICAgICAgIDxkaXY+XG4gKiAgICAgICAgICAgICAgSW4gPHNwYW4gZGF0YS1mLWJpbmQ9XCJDdXJyZW50WWVhciB8ICNcIj48L3NwYW4+LFxuICogICAgICAgICAgICAgIG91ciBjb21wYW55IGVhcm5lZCA8c3BhbiBkYXRhLWYtYmluZD1cIlJldmVudWUgfCAkIywjIyNcIj48L3NwYW4+XG4gKiAgICAgICAgICA8L2Rpdj5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogJ2JpbmQnLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIHRlbXBsYXRlZDtcbiAgICAgICAgdmFyIHZhbHVlVG9UZW1wbGF0ZSA9ICQuZXh0ZW5kKHt9LCB2YWx1ZSk7XG4gICAgICAgIGlmICghJC5pc1BsYWluT2JqZWN0KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFyIHZhcmlhYmxlTmFtZSA9IHRoaXMuZGF0YSgnZi1iaW5kJyk7Ly9IYWNrIGJlY2F1c2UgaSBkb24ndCBoYXZlIGFjY2VzcyB0byB2YXJpYWJsZSBuYW1lIGhlcmUgb3RoZXJ3aXNlXG4gICAgICAgICAgICB2YWx1ZVRvVGVtcGxhdGUgPSB7IHZhbHVlOiB2YWx1ZSB9O1xuICAgICAgICAgICAgdmFsdWVUb1RlbXBsYXRlW3ZhcmlhYmxlTmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlVG9UZW1wbGF0ZS52YWx1ZSA9IHZhbHVlOyAvL0lmIHRoZSBrZXkgaGFzICd3ZWlyZCcgY2hhcmFjdGVycyBsaWtlICc8PicgaGFyZCB0byBnZXQgYXQgd2l0aCBhIHRlbXBsYXRlIG90aGVyd2lzZVxuICAgICAgICB9XG4gICAgICAgIHZhciBiaW5kVGVtcGxhdGUgPSB0aGlzLmRhdGEoJ2JpbmQtdGVtcGxhdGUnKTtcbiAgICAgICAgaWYgKGJpbmRUZW1wbGF0ZSkge1xuICAgICAgICAgICAgdGVtcGxhdGVkID0gXy50ZW1wbGF0ZShiaW5kVGVtcGxhdGUsIHZhbHVlVG9UZW1wbGF0ZSk7XG4gICAgICAgICAgICB0aGlzLmh0bWwodGVtcGxhdGVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBvbGRIVE1MID0gdGhpcy5odG1sKCk7XG4gICAgICAgICAgICB2YXIgY2xlYW5lZEhUTUwgPSBvbGRIVE1MLnJlcGxhY2UoLyZsdDsvZywgJzwnKS5yZXBsYWNlKC8mZ3Q7L2csICc+Jyk7XG4gICAgICAgICAgICB0ZW1wbGF0ZWQgPSBfLnRlbXBsYXRlKGNsZWFuZWRIVE1MLCB2YWx1ZVRvVGVtcGxhdGUpO1xuICAgICAgICAgICAgaWYgKGNsZWFuZWRIVE1MID09PSB0ZW1wbGF0ZWQpIHsgLy90ZW1wbGF0aW5nIGRpZCBub3RoaW5nXG4gICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFsdWUgPSAoJC5pc1BsYWluT2JqZWN0KHZhbHVlKSkgPyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgOiB2YWx1ZSArICcnO1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbCh2YWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YSgnYmluZC10ZW1wbGF0ZScsIGNsZWFuZWRIVE1MKTtcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWwodGVtcGxhdGVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIElucHV0cyBhbmQgU2VsZWN0c1xuICpcbiAqIEluIHRoZSBbZGVmYXVsdCBjYXNlXSguLi9kZWZhdWx0LWJpbmQtYXR0ci8pLCB0aGUgYGRhdGEtZi1iaW5kYCBhdHRyaWJ1dGUgY3JlYXRlcyBhIGJpLWRpcmVjdGlvbmFsIGJpbmRpbmcgYmV0d2VlbiB0aGUgRE9NIGVsZW1lbnQgYW5kIHRoZSBtb2RlbCB2YXJpYWJsZS4gVGhpcyBiaW5kaW5nIGlzICoqYmktZGlyZWN0aW9uYWwqKiwgbWVhbmluZyB0aGF0IGFzIHRoZSBtb2RlbCBjaGFuZ2VzLCB0aGUgaW50ZXJmYWNlIGlzIGF1dG9tYXRpY2FsbHkgdXBkYXRlZDsgYW5kIHdoZW4gZW5kIHVzZXJzIGNoYW5nZSB2YWx1ZXMgaW4gdGhlIGludGVyZmFjZSwgdGhlIG1vZGVsIGlzIGF1dG9tYXRpY2FsbHkgdXBkYXRlZC5cbiAqXG4gKiBGbG93LmpzIHByb3ZpZGVzIHNwZWNpYWwgaGFuZGxpbmcgZm9yIERPTSBlbGVtZW50cyBgaW5wdXRgIGFuZCBgc2VsZWN0YC5cbiAqXG4gKiBJbiBwYXJ0aWN1bGFyLCBpZiB5b3UgYWRkIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZSB0byBhIGBzZWxlY3RgIG9yIGBpbnB1dGAgZWxlbWVudCwgdGhlIG9wdGlvbiBtYXRjaGluZyB0aGUgdmFsdWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlIGlzIGF1dG9tYXRpY2FsbHkgc2VsZWN0ZWQuXG4gKlxuICogKipFeGFtcGxlKipcbiAqXG4gKiBcdFx0PCEtLSBvcHRpb24gc2VsZWN0ZWQgaWYgc2FtcGxlX2ludCBpcyA4LCAxMCwgb3IgMTIgLS0+XG4gKiBcdFx0PHNlbGVjdCBkYXRhLWYtYmluZD1cInNhbXBsZV9pbnRcIj5cbiAqIFx0XHRcdDxvcHRpb24gdmFsdWU9XCI4XCI+IDggPC9vcHRpb24+XG4gKiBcdFx0XHQ8b3B0aW9uIHZhbHVlPVwiMTBcIj4gMTAgPC9vcHRpb24+XG4gKiBcdFx0XHQ8b3B0aW9uIHZhbHVlPVwiMTJcIj4gMTIgPC9vcHRpb24+XG4gKiBcdFx0PC9zZWxlY3Q+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgdGFyZ2V0OiAnaW5wdXQsIHNlbGVjdCcsXG5cbiAgICB0ZXN0OiAnYmluZCcsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnZhbCh2YWx1ZSk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgQ2xhc3MgQXR0cmlidXRlOiBkYXRhLWYtY2xhc3NcbiAqXG4gKiBZb3UgY2FuIGJpbmQgbW9kZWwgdmFyaWFibGVzIHRvIG5hbWVzIG9mIENTUyBjbGFzc2VzLCBzbyB0aGF0IHlvdSBjYW4gZWFzaWx5IGNoYW5nZSB0aGUgc3R5bGluZyBvZiBIVE1MIGVsZW1lbnRzIGJhc2VkIG9uIHRoZSB2YWx1ZXMgb2YgbW9kZWwgdmFyaWFibGVzLlxuICpcbiAqICoqVG8gYmluZCBtb2RlbCB2YXJpYWJsZXMgdG8gQ1NTIGNsYXNzZXM6KipcbiAqXG4gKiAxLiBBZGQgdGhlIGBkYXRhLWYtY2xhc3NgIGF0dHJpYnV0ZSB0byBhbiBIVE1MIGVsZW1lbnQuXG4gKiAyLiBTZXQgdGhlIHZhbHVlIHRvIHRoZSBuYW1lIG9mIHRoZSBtb2RlbCB2YXJpYWJsZS5cbiAqIDMuIE9wdGlvbmFsbHksIGFkZCBhbiBhZGRpdGlvbmFsIGBjbGFzc2AgYXR0cmlidXRlIHRvIHRoZSBIVE1MIGVsZW1lbnQuXG4gKiAgICAgICogSWYgeW91IG9ubHkgdXNlIHRoZSBgZGF0YS1mLWNsYXNzYCBhdHRyaWJ1dGUsIHRoZSB2YWx1ZSBvZiBgZGF0YS1mLWNsYXNzYCBpcyB0aGUgY2xhc3MgbmFtZS5cbiAqICAgICAgKiBJZiB5b3UgKmFsc28qIGFkZCBhIGBjbGFzc2AgYXR0cmlidXRlLCB0aGUgdmFsdWUgb2YgYGRhdGEtZi1jbGFzc2AgaXMgKmFwcGVuZGVkKiB0byB0aGUgY2xhc3MgbmFtZS5cbiAqIDQuIEFkZCBjbGFzc2VzIHRvIHlvdXIgQ1NTIGNvZGUgd2hvc2UgbmFtZXMgaW5jbHVkZSBwb3NzaWJsZSB2YWx1ZXMgb2YgdGhhdCBtb2RlbCB2YXJpYWJsZS5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPHN0eWxlIHR5cGU9XCJ0ZXh0L2Nzc1wiPlxuICogICAgICAgICAgLk5vcnRoIHsgY29sb3I6IGdyZXkgfVxuICogICAgICAgICAgLlNvdXRoIHsgY29sb3I6IHB1cnBsZSB9XG4gKiAgICAgICAgICAuRWFzdCB7IGNvbG9yOiBibHVlIH1cbiAqICAgICAgICAgIC5XZXN0IHsgY29sb3I6IG9yYW5nZSB9XG4gKiAgICAgICAgICAuc2FsZXMuZ29vZCB7IGNvbG9yOiBncmVlbiB9XG4gKiAgICAgICAgICAuc2FsZXMuYmFkIHsgY29sb3I6IHJlZCB9XG4gKiAgICAgICAgICAuc2FsZXMudmFsdWUtMTAwIHsgY29sb3I6IHllbGxvdyB9XG4gKiAgICAgICA8L3N0eWxlPlxuICpcbiAqICAgICAgIDxkaXYgZGF0YS1mLWNsYXNzPVwic2FsZXNNZ3IucmVnaW9uXCI+XG4gKiAgICAgICAgICAgQ29udGVudCBjb2xvcmVkIGJ5IHJlZ2lvblxuICogICAgICAgPC9kaXY+XG4gKlxuICogICAgICAgPGRpdiBkYXRhLWYtY2xhc3M9XCJzYWxlc01nci5wZXJmb3JtYW5jZVwiIGNsYXNzPVwic2FsZXNcIj5cbiAqICAgICAgICAgICBDb250ZW50IGdyZWVuIGlmIHNhbGVzTWdyLnBlcmZvcm1hbmNlIGlzIGdvb2QsIHJlZCBpZiBiYWRcbiAqICAgICAgIDwvZGl2PlxuICpcbiAqICAgICAgIDxkaXYgZGF0YS1mLWNsYXNzPVwic2FsZXNNZ3IubnVtUmVnaW9uc1wiIGNsYXNzPVwic2FsZXNcIj5cbiAqICAgICAgICAgICBDb250ZW50IHllbGxvdyBpZiBzYWxlc01nci5udW1SZWdpb25zIGlzIDEwMFxuICogICAgICAgPC9kaXY+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0ZXN0OiAnY2xhc3MnLFxuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSwgcHJvcCkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhZGRlZENsYXNzZXMgPSB0aGlzLmRhdGEoJ2FkZGVkLWNsYXNzZXMnKTtcbiAgICAgICAgaWYgKCFhZGRlZENsYXNzZXMpIHtcbiAgICAgICAgICAgIGFkZGVkQ2xhc3NlcyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChhZGRlZENsYXNzZXNbcHJvcF0pIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoYWRkZWRDbGFzc2VzW3Byb3BdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLmlzTnVtYmVyKHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSAndmFsdWUtJyArIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGFkZGVkQ2xhc3Nlc1twcm9wXSA9IHZhbHVlO1xuICAgICAgICAvL0ZpeG1lOiBwcm9wIGlzIGFsd2F5cyBcImNsYXNzXCJcbiAgICAgICAgdGhpcy5hZGRDbGFzcyh2YWx1ZSk7XG4gICAgICAgIHRoaXMuZGF0YSgnYWRkZWQtY2xhc3NlcycsIGFkZGVkQ2xhc3Nlcyk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgRGVmYXVsdCBBdHRyaWJ1dGUgSGFuZGxpbmc6IFJlYWQtb25seSBCaW5kaW5nXG4gKlxuICogRmxvdy5qcyB1c2VzIHRoZSBIVE1MNSBjb252ZW50aW9uIG9mIHByZXBlbmRpbmcgZGF0YS0gdG8gYW55IGN1c3RvbSBIVE1MIGF0dHJpYnV0ZS4gRmxvdy5qcyBhbHNvIGFkZHMgYGZgIGZvciBlYXN5IGlkZW50aWZpY2F0aW9uIG9mIEZsb3cuanMuIEZvciBleGFtcGxlLCBGbG93LmpzIHByb3ZpZGVzIHNldmVyYWwgY3VzdG9tIGF0dHJpYnV0ZXMgYW5kIGF0dHJpYnV0ZSBoYW5kbGVycyAtLSBpbmNsdWRpbmcgW2RhdGEtZi1iaW5kXSguLi9iaW5kcy9kZWZhdWx0LWJpbmQtYXR0ciksIFtkYXRhLWYtZm9yZWFjaF0oLi4vZm9yZWFjaC9kZWZhdWx0LWZvcmVhY2gtYXR0ci8pLCBbZGF0YS1mLW9uLWluaXRdKC4uL2V2ZW50cy9pbml0LWV2ZW50LWF0dHIvKSwgZXRjLiBZb3UgY2FuIGFsc28gW2FkZCB5b3VyIG93biBhdHRyaWJ1dGUgaGFuZGxlcnNdKC4uL2F0dHJpYnV0ZS1tYW5hZ2VyLykuXG4gKlxuICogVGhlIGRlZmF1bHQgYmVoYXZpb3IgZm9yIGhhbmRsaW5nIGEga25vd24gYXR0cmlidXRlIGlzIHRvIHVzZSB0aGUgdmFsdWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlIGFzIHRoZSB2YWx1ZSBvZiB0aGUgYXR0cmlidXRlLiAoVGhlcmUgYXJlIGV4Y2VwdGlvbnMgZm9yIHNvbWUgW2Jvb2xlYW4gYXR0cmlidXRlc10oLi4vYm9vbGVhbi1hdHRyLykuKVxuICpcbiAqIFRoaXMgbWVhbnMgeW91IGNhbiBiaW5kIHZhcmlhYmxlcyBmcm9tIHRoZSBtb2RlbCBpbiB5b3VyIGludGVyZmFjZSBieSBhZGRpbmcgdGhlIGBkYXRhLWYtYCBwcmVmaXggdG8gYW55IHN0YW5kYXJkIERPTSBhdHRyaWJ1dGUuIFRoaXMgYXR0cmlidXRlIGJpbmRpbmcgaXMgKipyZWFkLW9ubHkqKiwgc28gYXMgdGhlIG1vZGVsIGNoYW5nZXMsIHRoZSBpbnRlcmZhY2UgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkOyBidXQgd2hlbiB1c2VycyBjaGFuZ2UgdmFsdWVzIGluIHRoZSBpbnRlcmZhY2UsIG5vIGFjdGlvbiBvY2N1cnMuXG4gKlxuICogKipUbyBkaXNwbGF5IGEgRE9NIGVsZW1lbnQgYmFzZWQgb24gYSB2YXJpYWJsZSBmcm9tIHRoZSBtb2RlbDoqKlxuICpcbiAqIDEuIEFkZCB0aGUgcHJlZml4IGBkYXRhLWYtYCB0byBhbnkgYXR0cmlidXRlIGluIGFueSBIVE1MIGVsZW1lbnQgdGhhdCBub3JtYWxseSB0YWtlcyBhIHZhbHVlLlxuICogMi4gU2V0IHRoZSB2YWx1ZSBvZiB0aGUgYXR0cmlidXRlIHRvIHRoZSBuYW1lIG9mIHRoZSBtb2RlbCB2YXJpYWJsZS5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqIFx0XHQ8IS0tIGlucHV0IGVsZW1lbnQgZGlzcGxheXMgdmFsdWUgb2Ygc2FtcGxlX2ludCwgaG93ZXZlcixcbiAqIFx0XHRcdG5vIGNhbGwgdG8gdGhlIG1vZGVsIGlzIG1hZGUgaWYgdXNlciBjaGFuZ2VzIHNhbXBsZV9pbnRcbiAqXG4gKlx0XHRcdGlmIHNhbXBsZV9pbnQgaXMgOCwgdGhpcyBpcyB0aGUgZXF1aXZhbGVudCBvZiA8aW5wdXQgdmFsdWU9XCI4XCI+PC9pbnB1dD4gLS0+XG4gKlxuICpcdFx0PGlucHV0IGRhdGEtZi12YWx1ZT1cInNhbXBsZV9pbnRcIj48L2lucHV0PlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGVzdDogJyonLFxuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSwgcHJvcCkge1xuICAgICAgICB0aGlzLnByb3AocHJvcCwgdmFsdWUpO1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjQ2FsbCBPcGVyYXRpb24gaW4gUmVzcG9uc2UgdG8gVXNlciBBY3Rpb25cbiAqXG4gKiBNYW55IG1vZGVscyBjYWxsIHBhcnRpY3VsYXIgb3BlcmF0aW9ucyBpbiByZXNwb25zZSB0byBlbmQgdXNlciBhY3Rpb25zLCBzdWNoIGFzIGNsaWNraW5nIGEgYnV0dG9uIG9yIHN1Ym1pdHRpbmcgYSBmb3JtLlxuICpcbiAqICMjIyNkYXRhLWYtb24tZXZlbnRcbiAqXG4gKiBGb3IgYW55IEhUTUwgYXR0cmlidXRlIHVzaW5nIGBvbmAgLS0gdHlwaWNhbGx5IG9uIGNsaWNrIG9yIG9uIHN1Ym1pdCAtLSB5b3UgY2FuIGFkZCB0aGUgYXR0cmlidXRlIGBkYXRhLWYtb24tWFhYYCwgYW5kIHNldCB0aGUgdmFsdWUgdG8gdGhlIG5hbWUgb2YgdGhlIG9wZXJhdGlvbi4gVG8gY2FsbCBtdWx0aXBsZSBvcGVyYXRpb25zLCB1c2UgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyIHRvIGNoYWluIG9wZXJhdGlvbnMuIE9wZXJhdGlvbnMgYXJlIGNhbGxlZCBzZXJpYWxseSwgaW4gdGhlIG9yZGVyIGxpc3RlZC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPGJ1dHRvbiBkYXRhLWYtb24tY2xpY2s9XCJyZXNldFwiPlJlc2V0PC9idXR0b24+XG4gKlxuICogICAgICA8YnV0dG9uIGRhdGEtZi1vbi1jbGljaz1cInN0ZXAoMSlcIj5BZHZhbmNlIE9uZSBTdGVwPC9idXR0b24+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IGZ1bmN0aW9uIChhdHRyLCAkbm9kZSkge1xuICAgICAgICByZXR1cm4gKGF0dHIuaW5kZXhPZignb24tJykgPT09IDApO1xuICAgIH0sXG5cbiAgICBzdG9wTGlzdGVuaW5nOiBmdW5jdGlvbiAoYXR0cikge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi0nLCAnJyk7XG4gICAgICAgIHRoaXMub2ZmKGF0dHIpO1xuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbiAoYXR0ciwgdmFsdWUpIHtcbiAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSgnb24tJywgJycpO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICB0aGlzLm9mZihhdHRyKS5vbihhdHRyLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbGlzdE9mT3BlcmF0aW9ucyA9IF8uaW52b2tlKHZhbHVlLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICBsaXN0T2ZPcGVyYXRpb25zID0gbGlzdE9mT3BlcmF0aW9ucy5tYXAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuTmFtZSA9IHZhbHVlLnNwbGl0KCcoJylbMF07XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHZhbHVlLnN1YnN0cmluZyh2YWx1ZS5pbmRleE9mKCcoJykgKyAxLCB2YWx1ZS5pbmRleE9mKCcpJykpO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gKCQudHJpbShwYXJhbXMpICE9PSAnJykgPyBwYXJhbXMuc3BsaXQoJywnKSA6IFtdO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IGZuTmFtZSwgcGFyYW1zOiBhcmdzIH07XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbWUudHJpZ2dlcignZi51aS5vcGVyYXRlJywgeyBvcGVyYXRpb25zOiBsaXN0T2ZPcGVyYXRpb25zLCBzZXJpYWw6IHRydWUgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vRG9uJ3QgYm90aGVyIGJpbmRpbmcgb24gdGhpcyBhdHRyLiBOT1RFOiBEbyByZWFkb25seSwgdHJ1ZSBpbnN0ZWFkPztcbiAgICB9XG59O1xuIiwiLyoqXG4gKiAjI0NhbGwgT3BlcmF0aW9uIHdoZW4gRWxlbWVudCBBZGRlZCB0byBET01cbiAqXG4gKiBNYW55IG1vZGVscyBjYWxsIGFuIGluaXRpYWxpemF0aW9uIG9wZXJhdGlvbiB3aGVuIHRoZSBbcnVuXSguLi8uLi8uLi8uLi8uLi8uLi9nbG9zc2FyeS8jcnVuKSBpcyBmaXJzdCBjcmVhdGVkLiBUaGlzIGlzIHBhcnRpY3VsYXJseSBjb21tb24gd2l0aCBbVmVuc2ltXSguLi8uLi8uLi8uLi8uLi8uLi9tb2RlbF9jb2RlL3ZlbnNpbS8pIG1vZGVscywgd2hpY2ggbmVlZCB0byBpbml0aWFsaXplIHZhcmlhYmxlcyAoJ3N0YXJ0R2FtZScpIGJlZm9yZSBzdGVwcGluZy4gWW91IGNhbiB1c2UgdGhlIGBkYXRhLWYtb24taW5pdGAgYXR0cmlidXRlIHRvIGNhbGwgYW4gb3BlcmF0aW9uIGZyb20gdGhlIG1vZGVsIHdoZW4gYSBwYXJ0aWN1bGFyIGVsZW1lbnQgaXMgYWRkZWQgdG8gdGhlIERPTS5cbiAqXG4gKiAjIyMjZGF0YS1mLW9uLWluaXRcbiAqXG4gKiBBZGQgdGhlIGF0dHJpYnV0ZSBgZGF0YS1mLW9uLWluaXRgLCBhbmQgc2V0IHRoZSB2YWx1ZSB0byB0aGUgbmFtZSBvZiB0aGUgb3BlcmF0aW9uLiBUbyBjYWxsIG11bHRpcGxlIG9wZXJhdGlvbnMsIHVzZSB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIgdG8gY2hhaW4gb3BlcmF0aW9ucy4gT3BlcmF0aW9ucyBhcmUgY2FsbGVkIHNlcmlhbGx5LCBpbiB0aGUgb3JkZXIgbGlzdGVkLiBUeXBpY2FsbHkgeW91IGFkZCB0aGlzIGF0dHJpYnV0ZSB0byB0aGUgYDxib2R5PmAgZWxlbWVudC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPGJvZHkgZGF0YS1mLW9uLWluaXQ9XCJzdGFydEdhbWVcIj5cbiAqXG4gKiAgICAgIDxib2R5IGRhdGEtZi1vbi1pbml0PVwic3RhcnRHYW1lIHwgc3RlcCgzKVwiPlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiBmdW5jdGlvbiAoYXR0ciwgJG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIChhdHRyLmluZGV4T2YoJ29uLWluaXQnKSA9PT0gMCk7XG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChhdHRyLCB2YWx1ZSkge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi1pbml0JywgJycpO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBsaXN0T2ZPcGVyYXRpb25zID0gXy5pbnZva2UodmFsdWUuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgIGxpc3RPZk9wZXJhdGlvbnMgPSBsaXN0T2ZPcGVyYXRpb25zLm1hcChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm5OYW1lID0gdmFsdWUuc3BsaXQoJygnKVswXTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gdmFsdWUuc3Vic3RyaW5nKHZhbHVlLmluZGV4T2YoJygnKSArIDEsIHZhbHVlLmluZGV4T2YoJyknKSk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSAoJC50cmltKHBhcmFtcykgIT09ICcnKSA/IHBhcmFtcy5zcGxpdCgnLCcpIDogW107XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogZm5OYW1lLCBwYXJhbXM6IGFyZ3MgfTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtZS50cmlnZ2VyKCdmLnVpLm9wZXJhdGUnLCB7IG9wZXJhdGlvbnM6IGxpc3RPZk9wZXJhdGlvbnMsIHNlcmlhbDogdHJ1ZSB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy9Eb24ndCBib3RoZXIgYmluZGluZyBvbiB0aGlzIGF0dHIuIE5PVEU6IERvIHJlYWRvbmx5LCB0cnVlIGluc3RlYWQ/O1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIERpc3BsYXkgQXJyYXkgYW5kIE9iamVjdCBWYXJpYWJsZXM6IGRhdGEtZi1mb3JlYWNoXG4gKlxuICogSWYgeW91ciBtb2RlbCB2YXJpYWJsZSBpcyBhbiBhcnJheSwgeW91IGNhbiByZWZlcmVuY2Ugc3BlY2lmaWMgZWxlbWVudHMgb2YgdGhlIGFycmF5IHVzaW5nIGBkYXRhLWYtYmluZGA6IGBkYXRhLWYtYmluZD1cInNhbGVzWzNdXCJgIG9yIGBkYXRhLWYtYmluZD1cInNhbGVzWzxjdXJyZW50UmVnaW9uPl1cImAsIGFzIGRlc2NyaWJlZCB1bmRlciBbZGF0YS1mLWJpbmRdKC4uLy4uL2JpbmRzL2RlZmF1bHQtYmluZC1hdHRyLykuXG4gKlxuICogSG93ZXZlciwgdGhhdCdzIG5vdCB0aGUgb25seSBvcHRpb24uIElmIHlvdSB3YW50IHRvIGF1dG9tYXRpY2FsbHkgbG9vcCBvdmVyIGFsbCBlbGVtZW50cyBvZiB0aGUgYXJyYXksIG9yIGFsbCB0aGUgZmllbGRzIG9mIGFuIG9iamVjdCwgeW91IGNhbiB1c2UgdGhlIGBkYXRhLWYtZm9yZWFjaGAgYXR0cmlidXRlIHRvIG5hbWUgdGhlIHZhcmlhYmxlLCB0aGVuIHVzZSB0ZW1wbGF0ZXMgdG8gYWNjZXNzIGl0cyBpbmRleCBhbmQgdmFsdWUgZm9yIGRpc3BsYXkuIChUZW1wbGF0ZXMgYXJlIGF2YWlsYWJsZSBhcyBwYXJ0IG9mIEZsb3cuanMncyBsb2Rhc2ggZGVwZW5kZW5jeS4gU2VlIG1vcmUgYmFja2dyb3VuZCBvbiBbd29ya2luZyB3aXRoIHRlbXBsYXRlc10oLi4vLi4vLi4vLi4vLi4vI3RlbXBsYXRlcykuKVxuICpcbiAqICoqVG8gZGlzcGxheSBhIERPTSBlbGVtZW50IGJhc2VkIG9uIGFuIGFycmF5IHZhcmlhYmxlIGZyb20gdGhlIG1vZGVsOioqXG4gKlxuICogMS4gQWRkIHRoZSBgZGF0YS1mLWZvcmVhY2hgIGF0dHJpYnV0ZSB0byBhbnkgSFRNTCBlbGVtZW50IHRoYXQgaGFzIHJlcGVhdGVkIHN1Yi1lbGVtZW50cy4gVGhlIHR3byBtb3N0IGNvbW1vbiBleGFtcGxlcyBhcmUgbGlzdHMgYW5kIHRhYmxlcy5cbiAqIDIuIFNldCB0aGUgdmFsdWUgb2YgdGhlIGBkYXRhLWYtZm9yZWFjaGAgYXR0cmlidXRlIGluIHlvdXIgdG9wLWxldmVsIEhUTUwgZWxlbWVudCB0byB0aGUgbmFtZSBvZiB0aGUgYXJyYXkgdmFyaWFibGUuXG4gKiAzLiBBZGQgdGhlIEhUTUwgaW4gd2hpY2ggdGhlIHZhbHVlIG9mIHlvdXIgYXJyYXkgdmFyaWFibGUgc2hvdWxkIGFwcGVhci5cbiAqIDQuIE9wdGlvbmFsbHksIGluc2lkZSB0aGUgaW5uZXIgSFRNTCBlbGVtZW50LCB1c2UgdGVtcGxhdGVzIChgPCU9ICU+YCkgdG8gcmVmZXJlbmNlIHRoZSBgaW5kZXhgIChmb3IgYXJyYXlzKSBvciBga2V5YCAoZm9yIG9iamVjdHMpIGFuZCBgdmFsdWVgIHRvIGRpc3BsYXkuIFRoZSBgaW5kZXhgLCBga2V5YCwgYW5kIGB2YWx1ZWAgYXJlIHNwZWNpYWwgdmFyaWFibGVzIHRoYXQgRmxvdy5qcyBwb3B1bGF0ZXMgZm9yIHlvdS5cbiAqXG4gKlxuICogKipFeGFtcGxlczoqKlxuICpcbiAqIEJ5IGRlZmF1bHQgJm1kYXNoOyB0aGF0IGlzLCBpZiB5b3UgZG8gbm90IGluY2x1ZGUgdGVtcGxhdGVzIGluIHlvdXIgSFRNTCAmbWRhc2g7IHRoZSBgdmFsdWVgIG9mIHRoZSBhcnJheSBlbGVtZW50IG9yIG9iamVjdCBmaWVsZCBhcHBlYXJzOlxuICpcbiAqICAgICAgPCEtLSB0aGUgbW9kZWwgdmFyaWFibGUgVGltZSBpcyBhbiBhcnJheSBvZiB5ZWFyc1xuICogICAgICAgICAgY3JlYXRlIGEgbGlzdCB0aGF0IHNob3dzIHdoaWNoIHllYXIgLS0+XG4gKlxuICogICAgICA8dWwgZGF0YS1mLWZvcmVhY2g9XCJUaW1lXCI+XG4gKiAgICAgICAgICA8bGk+PC9saT5cbiAqICAgICAgPC91bD5cbiAqXG4gKiBJbiB0aGUgdGhpcmQgc3RlcCBvZiB0aGUgbW9kZWwsIHRoaXMgZXhhbXBsZSBnZW5lcmF0ZXMgdGhlIEhUTUw6XG4gKlxuICogICAgICA8dWwgZGF0YS1mLWZvcmVhY2g9XCJUaW1lXCI+XG4gKiAgICAgICAgICAgIDxsaT4yMDE1PC9saT5cbiAqICAgICAgICAgICAgPGxpPjIwMTY8L2xpPlxuICogICAgICAgICAgICA8bGk+MjAxNzwvbGk+XG4gKiAgICAgIDwvdWw+XG4gKlxuICogd2hpY2ggYXBwZWFycyBhczpcbiAqXG4gKiAgICAgICogMjAxNVxuICogICAgICAqIDIwMTZcbiAqICAgICAgKiAyMDE3XG4gKlxuICogT3B0aW9uYWxseSwgeW91IGNhbiB1c2UgdGVtcGxhdGVzIChgPCU9ICU+YCkgdG8gcmVmZXJlbmNlIHRoZSBgaW5kZXhgIGFuZCBgdmFsdWVgIG9mIHRoZSBhcnJheSBlbGVtZW50IHRvIGRpc3BsYXkuXG4gKlxuICpcbiAqICAgICAgPCEtLSB0aGUgbW9kZWwgdmFyaWFibGUgVGltZSBpcyBhbiBhcnJheSBvZiB5ZWFyc1xuICogICAgICAgICAgY3JlYXRlIGEgbGlzdCB0aGF0IHNob3dzIHdoaWNoIHllYXIgLS0+XG4gKlxuICogICAgICA8dWwgZGF0YS1mLWZvcmVhY2g9XCJUaW1lXCI+XG4gKiAgICAgICAgICA8bGk+IFllYXIgPCU9IGluZGV4ICU+OiA8JT0gdmFsdWUgJT4gPC9saT5cbiAqICAgICAgPC91bD5cbiAqXG4gKiBJbiB0aGUgdGhpcmQgc3RlcCBvZiB0aGUgbW9kZWwsIHRoaXMgZXhhbXBsZSBnZW5lcmF0ZXM6XG4gKlxuICpcbiAqXG4gKiB3aGljaCBhcHBlYXJzIGFzOlxuICpcbiAqICAgICAgKiBZZWFyIDE6IDIwMTVcbiAqICAgICAgKiBZZWFyIDI6IDIwMTZcbiAqICAgICAgKiBZZWFyIDM6IDIwMTdcbiAqXG4gKiBBcyB3aXRoIG90aGVyIGBkYXRhLWYtYCBhdHRyaWJ1dGVzLCB5b3UgY2FuIHNwZWNpZnkgW2NvbnZlcnRlcnNdKC4uLy4uLy4uLy4uLy4uL2NvbnZlcnRlci1vdmVydmlldykgdG8gY29udmVydCBkYXRhIGZyb20gb25lIGZvcm0gdG8gYW5vdGhlcjpcbiAqXG4gKiAgICAgIDx1bCBkYXRhLWYtZm9yZWFjaD1cIlNhbGVzIHwgJHgseHh4XCI+XG4gKiAgICAgICAgICA8bGk+IFllYXIgPCU9IGluZGV4ICU+OiBTYWxlcyBvZiA8JT0gdmFsdWUgJT4gPC9saT5cbiAqICAgICAgPC91bD5cbiAqXG4gKlxuICogKipOb3RlczoqKlxuICpcbiAqICogWW91IGNhbiB1c2UgdGhlIGBkYXRhLWYtZm9yZWFjaGAgYXR0cmlidXRlIHdpdGggYm90aCBhcnJheXMgYW5kIG9iamVjdHMuIElmIHRoZSBtb2RlbCB2YXJpYWJsZSBpcyBhbiBvYmplY3QsIHJlZmVyZW5jZSB0aGUgYGtleWAgaW5zdGVhZCBvZiB0aGUgYGluZGV4YCBpbiB5b3VyIHRlbXBsYXRlcy5cbiAqICogVGhlIGBrZXlgLCBgaW5kZXhgLCBhbmQgYHZhbHVlYCBhcmUgc3BlY2lhbCB2YXJpYWJsZXMgdGhhdCBGbG93LmpzIHBvcHVsYXRlcyBmb3IgeW91LlxuICogKiBUaGUgdGVtcGxhdGUgc3ludGF4IGlzIHRvIGVuY2xvc2UgZWFjaCBrZXl3b3JkIChgaW5kZXhgLCBga2V5YCwgYHZhcmlhYmxlYCkgaW4gYDwlPWAgYW5kIGAlPmAuIFRlbXBsYXRlcyBhcmUgYXZhaWxhYmxlIGFzIHBhcnQgb2YgRmxvdy5qcydzIGxvZGFzaCBkZXBlbmRlbmN5LiBTZWUgbW9yZSBiYWNrZ3JvdW5kIG9uIFt3b3JraW5nIHdpdGggdGVtcGxhdGVzXSguLi8uLi8uLi8uLi8uLi8jdGVtcGxhdGVzKS5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xudmFyIHBhcnNlVXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi91dGlscy9wYXJzZS11dGlscycpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0ZXN0OiAnZm9yZWFjaCcsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIHZhbHVlID0gKCQuaXNQbGFpbk9iamVjdCh2YWx1ZSkgPyB2YWx1ZSA6IFtdLmNvbmNhdCh2YWx1ZSkpO1xuICAgICAgICB2YXIgbG9vcFRlbXBsYXRlID0gdGhpcy5kYXRhKCdmb3JlYWNoLXRlbXBsYXRlJyk7XG4gICAgICAgIGlmICghbG9vcFRlbXBsYXRlKSB7XG4gICAgICAgICAgICBsb29wVGVtcGxhdGUgPSB0aGlzLmh0bWwoKTtcbiAgICAgICAgICAgIHRoaXMuZGF0YSgnZm9yZWFjaC10ZW1wbGF0ZScsIGxvb3BUZW1wbGF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyICRtZSA9IHRoaXMuZW1wdHkoKTtcbiAgICAgICAgXy5lYWNoKHZhbHVlLCBmdW5jdGlvbiAoZGF0YXZhbCwgZGF0YWtleSkge1xuICAgICAgICAgICAgaWYgKCFkYXRhdmFsKSB7XG4gICAgICAgICAgICAgICAgZGF0YXZhbCA9IGRhdGF2YWwgKyAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjbG9vcCA9IGxvb3BUZW1wbGF0ZS5yZXBsYWNlKC8mbHQ7L2csICc8JykucmVwbGFjZSgvJmd0Oy9nLCAnPicpO1xuICAgICAgICAgICAgdmFyIHRlbXBsYXRlZExvb3AgPSBfLnRlbXBsYXRlKGNsb29wLCB7IHZhbHVlOiBkYXRhdmFsLCBrZXk6IGRhdGFrZXksIGluZGV4OiBkYXRha2V5IH0pO1xuICAgICAgICAgICAgdmFyIGlzVGVtcGxhdGVkID0gdGVtcGxhdGVkTG9vcCAhPT0gY2xvb3A7XG4gICAgICAgICAgICB2YXIgbm9kZXMgPSAkKHRlbXBsYXRlZExvb3ApO1xuXG4gICAgICAgICAgICBub2Rlcy5lYWNoKGZ1bmN0aW9uIChpLCBuZXdOb2RlKSB7XG4gICAgICAgICAgICAgICAgbmV3Tm9kZSA9ICQobmV3Tm9kZSk7XG4gICAgICAgICAgICAgICAgXy5lYWNoKG5ld05vZGUuZGF0YSgpLCBmdW5jdGlvbiAodmFsLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3Tm9kZS5kYXRhKGtleSwgcGFyc2VVdGlscy50b0ltcGxpY2l0VHlwZSh2YWwpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzVGVtcGxhdGVkICYmICFuZXdOb2RlLmh0bWwoKS50cmltKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3Tm9kZS5odG1sKGRhdGF2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJG1lLmFwcGVuZChub2Rlcyk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIEJpbmRpbmcgZm9yIGRhdGEtZi1bYm9vbGVhbl1cbiAqXG4gKiBGbG93LmpzIHByb3ZpZGVzIHNwZWNpYWwgaGFuZGxpbmcgZm9yIEhUTUwgYXR0cmlidXRlcyB0aGF0IHRha2UgQm9vbGVhbiB2YWx1ZXMuXG4gKlxuICogSW4gcGFydGljdWxhciwgZm9yIG1vc3QgSFRNTCBhdHRyaWJ1dGVzIHRoYXQgZXhwZWN0IEJvb2xlYW4gdmFsdWVzLCB0aGUgYXR0cmlidXRlIGlzIGRpcmVjdGx5IHNldCB0byB0aGUgdmFsdWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlLiBUaGlzIGlzIHRydWUgZm9yIGBjaGVja2VkYCwgYHNlbGVjdGVkYCwgYGFzeW5jYCwgYGF1dG9mb2N1c2AsIGBhdXRvcGxheWAsIGBjb250cm9sc2AsIGBkZWZlcmAsIGBpc21hcGAsIGBsb29wYCwgYG11bHRpcGxlYCwgYG9wZW5gLCBgcmVxdWlyZWRgLCBhbmQgYHNjb3BlZGAuXG4gKlxuICogSG93ZXZlciwgdGhlcmUgYXJlIGEgZmV3IG5vdGFibGUgZXhjZXB0aW9ucy4gRm9yIHRoZSBIVE1MIGF0dHJpYnV0ZXMgYGRpc2FibGVkYCwgYGhpZGRlbmAsIGFuZCBgcmVhZG9ubHlgLCB0aGUgYXR0cmlidXRlIGlzIHNldCB0byB0aGUgKm9wcG9zaXRlKiBvZiB0aGUgdmFsdWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlLiBUaGlzIG1ha2VzIHRoZSByZXN1bHRpbmcgSFRNTCBlYXNpZXIgdG8gcmVhZC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPCEtLSB0aGlzIGNoZWNrYm94IGlzIENIRUNLRUQgd2hlbiBzYW1wbGVCb29sIGlzIFRSVUUsXG4gKiAgICAgICAgICAgYW5kIFVOQ0hFQ0tFRCB3aGVuIHNhbXBsZUJvb2wgaXMgRkFMU0UgLS0+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBkYXRhLWYtY2hlY2tlZD1cInNhbXBsZUJvb2xcIiAvPlxuICpcbiAqICAgICAgPCEtLSB0aGlzIGJ1dHRvbiBpcyBFTkFCTEVEIHdoZW4gc2FtcGxlQm9vbCBpcyBUUlVFLFxuICogICAgICAgICAgIGFuZCBESVNBQkxFRCB3aGVuIHNhbXBsZUJvb2wgaXMgRkFMU0UgLS0+XG4gKiAgICAgIDxidXR0b24gZGF0YS1mLWRpc2FibGVkPVwic2FtcGxlQm9vbFwiPkNsaWNrIE1lPC9idXR0b24+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IC9eKD86ZGlzYWJsZWR8aGlkZGVufHJlYWRvbmx5KSQvaSxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCAhdmFsdWUpO1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIE5vLW9wIEF0dHJpYnV0ZXNcbiAqXG4gKiBGbG93LmpzIHByb3ZpZGVzIHNwZWNpYWwgaGFuZGxpbmcgZm9yIGJvdGggYGRhdGEtZi1tb2RlbGAgKGRlc2NyaWJlZCBbaGVyZV0oLi4vLi4vLi4vLi4vI3VzaW5nX2luX3Byb2plY3QpKSBhbmQgYGRhdGEtZi1jb252ZXJ0YCAoZGVzY3JpYmVkIFtoZXJlXSguLi8uLi8uLi8uLi9jb252ZXJ0ZXItb3ZlcnZpZXcvKSkuIEZvciB0aGVzZSBhdHRyaWJ1dGVzLCB0aGUgZGVmYXVsdCBiZWhhdmlvciBpcyB0byBkbyBub3RoaW5nLCBzbyB0aGF0IHRoaXMgYWRkaXRpb25hbCBzcGVjaWFsIGhhbmRsaW5nIGNhbiB0YWtlIHByZWNlbmRlbmNlLlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8vIEF0dHJpYnV0ZXMgd2hpY2ggYXJlIGp1c3QgcGFyYW1ldGVycyB0byBvdGhlcnMgYW5kIGNhbiBqdXN0IGJlIGlnbm9yZWRcbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/Om1vZGVsfGNvbnZlcnQpJC9pLFxuXG4gICAgaGFuZGxlOiAkLm5vb3AsXG5cbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuIiwiLyoqXG4gKiAjIyBCaW5kaW5nIGZvciBkYXRhLWYtW2Jvb2xlYW5dXG4gKlxuICogRmxvdy5qcyBwcm92aWRlcyBzcGVjaWFsIGhhbmRsaW5nIGZvciBIVE1MIGF0dHJpYnV0ZXMgdGhhdCB0YWtlIEJvb2xlYW4gdmFsdWVzLlxuICpcbiAqIEluIHBhcnRpY3VsYXIsIGZvciBtb3N0IEhUTUwgYXR0cmlidXRlcyB0aGF0IGV4cGVjdCBCb29sZWFuIHZhbHVlcywgdGhlIGF0dHJpYnV0ZSBpcyBkaXJlY3RseSBzZXQgdG8gdGhlIHZhbHVlIG9mIHRoZSBtb2RlbCB2YXJpYWJsZS4gVGhpcyBpcyB0cnVlIGZvciBgY2hlY2tlZGAsIGBzZWxlY3RlZGAsIGBhc3luY2AsIGBhdXRvZm9jdXNgLCBgYXV0b3BsYXlgLCBgY29udHJvbHNgLCBgZGVmZXJgLCBgaXNtYXBgLCBgbG9vcGAsIGBtdWx0aXBsZWAsIGBvcGVuYCwgYHJlcXVpcmVkYCwgYW5kIGBzY29wZWRgLlxuICpcbiAqIEhvd2V2ZXIsIHRoZXJlIGFyZSBhIGZldyBub3RhYmxlIGV4Y2VwdGlvbnMuIEZvciB0aGUgSFRNTCBhdHRyaWJ1dGVzIGBkaXNhYmxlZGAsIGBoaWRkZW5gLCBhbmQgYHJlYWRvbmx5YCwgdGhlIGF0dHJpYnV0ZSBpcyBzZXQgdG8gdGhlICpvcHBvc2l0ZSogb2YgdGhlIHZhbHVlIG9mIHRoZSBtb2RlbCB2YXJpYWJsZS4gVGhpcyBtYWtlcyB0aGUgcmVzdWx0aW5nIEhUTUwgZWFzaWVyIHRvIHJlYWQuXG4gKlxuICogKipFeGFtcGxlKipcbiAqXG4gKiAgICAgIDwhLS0gdGhpcyBjaGVja2JveCBpcyBDSEVDS0VEIHdoZW4gc2FtcGxlQm9vbCBpcyBUUlVFLFxuICogICAgICAgICAgIGFuZCBVTkNIRUNLRUQgd2hlbiBzYW1wbGVCb29sIGlzIEZBTFNFIC0tPlxuICogICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgZGF0YS1mLWNoZWNrZWQ9XCJzYW1wbGVCb29sXCIgLz5cbiAqXG4gKiAgICAgIDwhLS0gdGhpcyBidXR0b24gaXMgRU5BQkxFRCB3aGVuIHNhbXBsZUJvb2wgaXMgVFJVRSxcbiAqICAgICAgICAgICBhbmQgRElTQUJMRUQgd2hlbiBzYW1wbGVCb29sIGlzIEZBTFNFIC0tPlxuICogICAgICA8YnV0dG9uIGRhdGEtZi1kaXNhYmxlZD1cInNhbXBsZUJvb2xcIj5DbGljayBNZTwvYnV0dG9uPlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogL14oPzpjaGVja2VkfHNlbGVjdGVkfGFzeW5jfGF1dG9mb2N1c3xhdXRvcGxheXxjb250cm9sc3xkZWZlcnxpc21hcHxsb29wfG11bHRpcGxlfG9wZW58cmVxdWlyZWR8c2NvcGVkKSQvaSxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIC8qanNsaW50IGVxZXE6IHRydWUqL1xuICAgICAgICB2YXIgdmFsID0gKHRoaXMuYXR0cigndmFsdWUnKSkgPyAodmFsdWUgPT0gdGhpcy5wcm9wKCd2YWx1ZScpKSA6ICEhdmFsdWU7XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCB2YWwpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG52YXIgcGFyc2VVdGlscyA9IHJlcXVpcmUoJy4uLy4uL3V0aWxzL3BhcnNlLXV0aWxzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRlc3Q6ICdyZXBlYXQnLFxuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSwgcHJvcCkge1xuICAgICAgICB2YWx1ZSA9ICgkLmlzUGxhaW5PYmplY3QodmFsdWUpID8gdmFsdWUgOiBbXS5jb25jYXQodmFsdWUpKTtcbiAgICAgICAgdmFyIGxvb3BUZW1wbGF0ZSA9IHRoaXMuZGF0YSgncmVwZWF0LXRlbXBsYXRlJyk7XG4gICAgICAgIHZhciBpZCA9ICcnO1xuICAgICAgICBpZiAoIWxvb3BUZW1wbGF0ZSkge1xuICAgICAgICAgICAgbG9vcFRlbXBsYXRlID0gdGhpcy5nZXQoMCkub3V0ZXJIVE1MO1xuICAgICAgICAgICAgaWQgPSAgXy51bmlxdWVJZCgncmVwZWF0LScpO1xuICAgICAgICAgICAgdGhpcy5kYXRhKHtcbiAgICAgICAgICAgICAgICAncmVwZWF0LXRlbXBsYXRlJzogbG9vcFRlbXBsYXRlLFxuICAgICAgICAgICAgICAgICdyZXBlYXQtdGVtcGxhdGUtaWQnOiBpZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZCA9IHRoaXMuZGF0YSgncmVwZWF0LXRlbXBsYXRlLWlkJyk7XG4gICAgICAgICAgICB0aGlzLm5leHRVbnRpbCgnOm5vdChbJyArIGlkICsgJ10pJykucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGxhc3Q7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIF8uZWFjaCh2YWx1ZSwgZnVuY3Rpb24gKGRhdGF2YWwsIGRhdGFrZXkpIHtcbiAgICAgICAgICAgIGlmICghZGF0YXZhbCkge1xuICAgICAgICAgICAgICAgIGRhdGF2YWwgPSBkYXRhdmFsICsgJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgY2xvb3AgPSBsb29wVGVtcGxhdGUucmVwbGFjZSgvJmx0Oy9nLCAnPCcpLnJlcGxhY2UoLyZndDsvZywgJz4nKTtcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZWRMb29wID0gXy50ZW1wbGF0ZShjbG9vcCwgeyB2YWx1ZTogZGF0YXZhbCwga2V5OiBkYXRha2V5LCBpbmRleDogZGF0YWtleSB9KTtcbiAgICAgICAgICAgIHZhciBpc1RlbXBsYXRlZCA9IHRlbXBsYXRlZExvb3AgIT09IGNsb29wO1xuICAgICAgICAgICAgdmFyIG5vZGVzID0gJCh0ZW1wbGF0ZWRMb29wKTtcblxuICAgICAgICAgICAgbm9kZXMuZWFjaChmdW5jdGlvbiAoaSwgbmV3Tm9kZSkge1xuICAgICAgICAgICAgICAgIG5ld05vZGUgPSAkKG5ld05vZGUpLnJlbW92ZUF0dHIoJ2RhdGEtZi1yZXBlYXQnKTtcbiAgICAgICAgICAgICAgICBfLmVhY2gobmV3Tm9kZS5kYXRhKCksIGZ1bmN0aW9uICh2YWwsIGtleSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWxhc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lLmRhdGEoa2V5LCBwYXJzZVV0aWxzLnRvSW1wbGljaXRUeXBlKHZhbCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3Tm9kZS5kYXRhKGtleSwgcGFyc2VVdGlscy50b0ltcGxpY2l0VHlwZSh2YWwpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIG5ld05vZGUuYXR0cihpZCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKCFpc1RlbXBsYXRlZCAmJiAhbmV3Tm9kZS5odG1sKCkudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld05vZGUuaHRtbChkYXRhdmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghbGFzdCkge1xuICAgICAgICAgICAgICAgIGxhc3QgPSBtZS5odG1sKG5vZGVzLmh0bWwoKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxhc3QgPSBub2Rlcy5pbnNlcnRBZnRlcihsYXN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgRE9NIE1hbmFnZXJcbiAqXG4gKiBUaGUgRmxvdy5qcyBET00gTWFuYWdlciBwcm92aWRlcyB0d28td2F5IGRhdGEgYmluZGluZ3MgZnJvbSB5b3VyIHByb2plY3QncyB1c2VyIGludGVyZmFjZSB0byB0aGUgY2hhbm5lbC4gVGhlIERPTSBNYW5hZ2VyIGlzIHRoZSAnZ2x1ZScgdGhyb3VnaCB3aGljaCBIVE1MIERPTSBlbGVtZW50cyAtLSBpbmNsdWRpbmcgdGhlIGF0dHJpYnV0ZXMgYW5kIGF0dHJpYnV0ZSBoYW5kbGVycyBwcm92aWRlZCBieSBGbG93LmpzIGZvciBbdmFyaWFibGVzXSguLi8uLi9hdHRyaWJ1dGVzLW92ZXJ2aWV3LyksIFtvcGVyYXRpb25zXSguLi8uLi9vcGVyYXRpb25zLW92ZXJ2aWV3LykgYW5kIFtjb252ZXJzaW9uXSguLi8uLi9jb252ZXJ0ZXItb3ZlcnZpZXcvKSwgYW5kIHRob3NlIFt5b3UgY3JlYXRlXSguL2F0dHJpYnV0ZXMvYXR0cmlidXRlLW1hbmFnZXIvKSAtLSBhcmUgYm91bmQgdG8gdGhlIHZhcmlhYmxlIGFuZCBvcGVyYXRpb25zIFtjaGFubmVsc10oLi4vLi4vY2hhbm5lbC1vdmVydmlldy8pIHRvIGxpbmsgdGhlbSB3aXRoIHlvdXIgcHJvamVjdCdzIG1vZGVsLiBTZWUgdGhlIFtFcGljZW50ZXIgYXJjaGl0ZWN0dXJlIGRldGFpbHNdKC4uLy4uLy4uL2NyZWF0aW5nX3lvdXJfaW50ZXJmYWNlL2FyY2hfZGV0YWlscy8pIGZvciBhIHZpc3VhbCBkZXNjcmlwdGlvbiBvZiBob3cgdGhlIERPTSBNYW5hZ2VyIHJlbGF0ZXMgdG8gdGhlIFtyZXN0IG9mIHRoZSBFcGljZW50ZXIgc3RhY2tdKC4uLy4uLy4uL2NyZWF0aW5nX3lvdXJfaW50ZXJmYWNlLykuXG4gKlxuICogVGhlIERPTSBNYW5hZ2VyIGlzIGFuIGludGVncmFsIHBhcnQgb2YgdGhlIEZsb3cuanMgYXJjaGl0ZWN0dXJlIGJ1dCwgaW4ga2VlcGluZyB3aXRoIG91ciBnZW5lcmFsIHBoaWxvc29waHkgb2YgZXh0ZW5zaWJpbGl0eSBhbmQgY29uZmlndXJhYmlsaXR5LCBpdCBpcyBhbHNvIHJlcGxhY2VhYmxlLiBGb3IgaW5zdGFuY2UsIGlmIHlvdSB3YW50IHRvIG1hbmFnZSB5b3VyIERPTSBzdGF0ZSB3aXRoIFtCYWNrYm9uZSBWaWV3c10oaHR0cDovL2JhY2tib25lanMub3JnKSBvciBbQW5ndWxhci5qc10oaHR0cHM6Ly9hbmd1bGFyanMub3JnKSwgd2hpbGUgc3RpbGwgdXNpbmcgdGhlIGNoYW5uZWxzIHRvIGhhbmRsZSB0aGUgY29tbXVuaWNhdGlvbiB3aXRoIHlvdXIgbW9kZWwsIHRoaXMgaXMgdGhlIHBpZWNlIHlvdSdkIHJlcGxhY2UuIFtDb250YWN0IHVzXShodHRwOi8vZm9yaW8uY29tL2Fib3V0L2NvbnRhY3QvKSBpZiB5b3UgYXJlIGludGVyZXN0ZWQgaW4gZXh0ZW5kaW5nIEZsb3cuanMgaW4gdGhpcyB3YXkgLS0gd2UnbGwgYmUgaGFwcHkgdG8gdGFsayBhYm91dCBpdCBpbiBtb3JlIGRldGFpbC5cbiAqXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbiAgICB2YXIgbm9kZU1hbmFnZXIgPSByZXF1aXJlKCcuL25vZGVzL25vZGUtbWFuYWdlcicpO1xuICAgIHZhciBhdHRyTWFuYWdlciA9IHJlcXVpcmUoJy4vYXR0cmlidXRlcy9hdHRyaWJ1dGUtbWFuYWdlcicpO1xuICAgIHZhciBjb252ZXJ0ZXJNYW5hZ2VyID0gcmVxdWlyZSgnLi4vY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlcicpO1xuXG4gICAgdmFyIHBhcnNlVXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy9wYXJzZS11dGlscycpO1xuICAgIHZhciBkb21VdGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzL2RvbScpO1xuXG4gICAgdmFyIGF1dG9VcGRhdGVQbHVnaW4gPSByZXF1aXJlKCcuL3BsdWdpbnMvYXV0by11cGRhdGUtYmluZGluZ3MnKTtcblxuICAgIC8vSnF1ZXJ5IHNlbGVjdG9yIHRvIHJldHVybiBldmVyeXRoaW5nIHdoaWNoIGhhcyBhIGYtIHByb3BlcnR5IHNldFxuICAgICQuZXhwclsnOiddW2NvbmZpZy5wcmVmaXhdID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICB2YXIgJHRoaXMgPSAkKG9iaik7XG4gICAgICAgIHZhciBkYXRhcHJvcHMgPSBfLmtleXMoJHRoaXMuZGF0YSgpKTtcblxuICAgICAgICB2YXIgbWF0Y2ggPSBfLmZpbmQoZGF0YXByb3BzLCBmdW5jdGlvbiAoYXR0cikge1xuICAgICAgICAgICAgcmV0dXJuIChhdHRyLmluZGV4T2YoY29uZmlnLnByZWZpeCkgPT09IDApO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gISEobWF0Y2gpO1xuICAgIH07XG5cbiAgICAkLmV4cHJbJzonXS53ZWJjb21wb25lbnQgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmoubm9kZU5hbWUuaW5kZXhPZignLScpICE9PSAtMTtcbiAgICB9O1xuXG4gICAgdmFyIGdldE1hdGNoaW5nRWxlbWVudHMgPSBmdW5jdGlvbiAocm9vdCkge1xuICAgICAgICB2YXIgJHJvb3QgPSAkKHJvb3QpO1xuICAgICAgICB2YXIgbWF0Y2hlZEVsZW1lbnRzID0gJHJvb3QuZmluZCgnOicgKyBjb25maWcucHJlZml4KTtcbiAgICAgICAgaWYgKCRyb290LmlzKCc6JyArIGNvbmZpZy5wcmVmaXgpKSB7XG4gICAgICAgICAgICBtYXRjaGVkRWxlbWVudHMgPSBtYXRjaGVkRWxlbWVudHMuYWRkKCRyb290KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWF0Y2hlZEVsZW1lbnRzO1xuICAgIH07XG5cbiAgICB2YXIgZ2V0RWxlbWVudE9yRXJyb3IgPSBmdW5jdGlvbiAoZWxlbWVudCwgY29udGV4dCkge1xuICAgICAgICBpZiAoZWxlbWVudCBpbnN0YW5jZW9mICQpIHtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50LmdldCgwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWVsZW1lbnQgfHwgIWVsZW1lbnQubm9kZU5hbWUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoY29udGV4dCwgJ0V4cGVjdGVkIHRvIGdldCBET00gRWxlbWVudCwgZ290ICcsIGVsZW1lbnQpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGNvbnRleHQgKyAnOiBFeHBlY3RlZCB0byBnZXQgRE9NIEVsZW1lbnQsIGdvdCcgKyAodHlwZW9mIGVsZW1lbnQpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9O1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcblxuICAgICAgICBub2Rlczogbm9kZU1hbmFnZXIsXG4gICAgICAgIGF0dHJpYnV0ZXM6IGF0dHJNYW5hZ2VyLFxuICAgICAgICBjb252ZXJ0ZXJzOiBjb252ZXJ0ZXJNYW5hZ2VyLFxuICAgICAgICAvL3V0aWxzIGZvciB0ZXN0aW5nXG4gICAgICAgIHByaXZhdGU6IHtcbiAgICAgICAgICAgIG1hdGNoZWRFbGVtZW50czogW11cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogVW5iaW5kIHRoZSBlbGVtZW50OiB1bnN1YnNjcmliZSBmcm9tIGFsbCB1cGRhdGVzIG9uIHRoZSByZWxldmFudCBjaGFubmVscy5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtEb21FbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRvIHJlbW92ZSBmcm9tIHRoZSBkYXRhIGJpbmRpbmcuXG4gICAgICAgICAqIEBwYXJhbSB7Q2hhbm5lbEluc3RhbmNlfSBjaGFubmVsIChPcHRpb25hbCkgVGhlIGNoYW5uZWwgZnJvbSB3aGljaCB0byB1bnN1YnNjcmliZS4gRGVmYXVsdHMgdG8gdGhlIFt2YXJpYWJsZXMgY2hhbm5lbF0oLi4vY2hhbm5lbHMvdmFyaWFibGVzLWNoYW5uZWwvKS5cbiAgICAgICAgICovXG4gICAgICAgIHVuYmluZEVsZW1lbnQ6IGZ1bmN0aW9uIChlbGVtZW50LCBjaGFubmVsKSB7XG4gICAgICAgICAgICBpZiAoIWNoYW5uZWwpIHtcbiAgICAgICAgICAgICAgICBjaGFubmVsID0gdGhpcy5vcHRpb25zLmNoYW5uZWwudmFyaWFibGVzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxlbWVudCA9IGdldEVsZW1lbnRPckVycm9yKGVsZW1lbnQpO1xuICAgICAgICAgICAgdmFyICRlbCA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoISRlbC5pcygnOicgKyBjb25maWcucHJlZml4KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucHJpdmF0ZS5tYXRjaGVkRWxlbWVudHMgPSBfLndpdGhvdXQodGhpcy5wcml2YXRlLm1hdGNoZWRFbGVtZW50cywgZWxlbWVudCk7XG5cbiAgICAgICAgICAgIC8vRklYTUU6IGhhdmUgdG8gcmVhZGQgZXZlbnRzIHRvIGJlIGFibGUgdG8gcmVtb3ZlIHRoZW0uIFVnbHlcbiAgICAgICAgICAgIHZhciBIYW5kbGVyID0gbm9kZU1hbmFnZXIuZ2V0SGFuZGxlcigkZWwpO1xuICAgICAgICAgICAgdmFyIGggPSBuZXcgSGFuZGxlci5oYW5kbGUoe1xuICAgICAgICAgICAgICAgIGVsOiBlbGVtZW50XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChoLnJlbW92ZUV2ZW50cykge1xuICAgICAgICAgICAgICAgIGgucmVtb3ZlRXZlbnRzKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICQoZWxlbWVudC5hdHRyaWJ1dGVzKS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgbm9kZU1hcCkge1xuICAgICAgICAgICAgICAgIHZhciBhdHRyID0gbm9kZU1hcC5ub2RlTmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgd2FudGVkUHJlZml4ID0gJ2RhdGEtZi0nO1xuICAgICAgICAgICAgICAgIGlmIChhdHRyLmluZGV4T2Yod2FudGVkUHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKHdhbnRlZFByZWZpeCwgJycpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGVyID0gYXR0ck1hbmFnZXIuZ2V0SGFuZGxlcihhdHRyLCAkZWwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFuZGxlci5zdG9wTGlzdGVuaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyLnN0b3BMaXN0ZW5pbmcuY2FsbCgkZWwsIGF0dHIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBzdWJzaWQgPSAkZWwuZGF0YSgnZi1zdWJzY3JpcHRpb24taWQnKSB8fCBbXTtcbiAgICAgICAgICAgIF8uZWFjaChzdWJzaWQsIGZ1bmN0aW9uIChzdWJzKSB7XG4gICAgICAgICAgICAgICAgY2hhbm5lbC51bnN1YnNjcmliZShzdWJzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBCaW5kIHRoZSBlbGVtZW50OiBzdWJzY3JpYmUgZnJvbSB1cGRhdGVzIG9uIHRoZSByZWxldmFudCBjaGFubmVscy5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtEb21FbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRvIGFkZCB0byB0aGUgZGF0YSBiaW5kaW5nLlxuICAgICAgICAgKiBAcGFyYW0ge0NoYW5uZWxJbnN0YW5jZX0gY2hhbm5lbCAoT3B0aW9uYWwpIFRoZSBjaGFubmVsIHRvIHN1YnNjcmliZSB0by4gRGVmYXVsdHMgdG8gdGhlIFt2YXJpYWJsZXMgY2hhbm5lbF0oLi4vY2hhbm5lbHMvdmFyaWFibGVzLWNoYW5uZWwvKS5cbiAgICAgICAgICovXG4gICAgICAgIGJpbmRFbGVtZW50OiBmdW5jdGlvbiAoZWxlbWVudCwgY2hhbm5lbCkge1xuICAgICAgICAgICAgaWYgKCFjaGFubmVsKSB7XG4gICAgICAgICAgICAgICAgY2hhbm5lbCA9IHRoaXMub3B0aW9ucy5jaGFubmVsLnZhcmlhYmxlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsZW1lbnQgPSBnZXRFbGVtZW50T3JFcnJvcihlbGVtZW50KTtcbiAgICAgICAgICAgIHZhciAkZWwgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKCEkZWwuaXMoJzonICsgY29uZmlnLnByZWZpeCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIV8uY29udGFpbnModGhpcy5wcml2YXRlLm1hdGNoZWRFbGVtZW50cywgZWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzLnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vU2VuZCB0byBub2RlIG1hbmFnZXIgdG8gaGFuZGxlIHVpIGNoYW5nZXNcbiAgICAgICAgICAgIHZhciBIYW5kbGVyID0gbm9kZU1hbmFnZXIuZ2V0SGFuZGxlcigkZWwpO1xuICAgICAgICAgICAgbmV3IEhhbmRsZXIuaGFuZGxlKHtcbiAgICAgICAgICAgICAgICBlbDogZWxlbWVudFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBzdWJzY3JpYmUgPSBmdW5jdGlvbiAoY2hhbm5lbCwgdmFyc1RvQmluZCwgJGVsLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF2YXJzVG9CaW5kIHx8ICF2YXJzVG9CaW5kLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBzdWJzaWQgPSBjaGFubmVsLnN1YnNjcmliZSh2YXJzVG9CaW5kLCAkZWwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIHZhciBuZXdzdWJzID0gKCRlbC5kYXRhKCdmLXN1YnNjcmlwdGlvbi1pZCcpIHx8IFtdKS5jb25jYXQoc3Vic2lkKTtcbiAgICAgICAgICAgICAgICAkZWwuZGF0YSgnZi1zdWJzY3JpcHRpb24taWQnLCBuZXdzdWJzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBhdHRyQmluZGluZ3MgPSBbXTtcbiAgICAgICAgICAgIHZhciBub25CYXRjaGFibGVWYXJpYWJsZXMgPSBbXTtcbiAgICAgICAgICAgIC8vTk9URTogbG9vcGluZyB0aHJvdWdoIGF0dHJpYnV0ZXMgaW5zdGVhZCBvZiAuZGF0YSBiZWNhdXNlIC5kYXRhIGF1dG9tYXRpY2FsbHkgY2FtZWxjYXNlcyBwcm9wZXJ0aWVzIGFuZCBtYWtlIGl0IGhhcmQgdG8gcmV0cnZpZXZlXG4gICAgICAgICAgICAkKGVsZW1lbnQuYXR0cmlidXRlcykuZWFjaChmdW5jdGlvbiAoaW5kZXgsIG5vZGVNYXApIHtcbiAgICAgICAgICAgICAgICB2YXIgYXR0ciA9IG5vZGVNYXAubm9kZU5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGF0dHJWYWwgPSBub2RlTWFwLnZhbHVlO1xuXG4gICAgICAgICAgICAgICAgdmFyIHdhbnRlZFByZWZpeCA9ICdkYXRhLWYtJztcbiAgICAgICAgICAgICAgICBpZiAoYXR0ci5pbmRleE9mKHdhbnRlZFByZWZpeCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSh3YW50ZWRQcmVmaXgsICcnKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlciA9IGF0dHJNYW5hZ2VyLmdldEhhbmRsZXIoYXR0ciwgJGVsKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlzQmluZGFibGVBdHRyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhbmRsZXIgJiYgaGFuZGxlci5pbml0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc0JpbmRhYmxlQXR0ciA9IGhhbmRsZXIuaW5pdC5jYWxsKCRlbCwgYXR0ciwgYXR0clZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNCaW5kYWJsZUF0dHIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vQ29udmVydCBwaXBlcyB0byBjb252ZXJ0ZXIgYXR0cnNcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB3aXRoQ29udiA9IF8uaW52b2tlKGF0dHJWYWwuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3aXRoQ29udi5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0clZhbCA9IHdpdGhDb252LnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGVsLmRhdGEoJ2YtY29udmVydC0nICsgYXR0ciwgd2l0aENvbnYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYmluZGluZyA9IHsgYXR0cjogYXR0ciB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbW1hUmVnZXggPSAvLCg/IVteXFxbXSpcXF0pLztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRyVmFsLmluZGV4T2YoJzwlJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9Bc3N1bWUgaXQncyB0ZW1wbGF0ZWQgZm9yIGxhdGVyIHVzZVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGF0dHJWYWwuc3BsaXQoY29tbWFSZWdleCkubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YXJzVG9CaW5kID0gXy5pbnZva2UoYXR0clZhbC5zcGxpdChjb21tYVJlZ2V4KSwgJ3RyaW0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJzY3JpYmUoY2hhbm5lbCwgdmFyc1RvQmluZCwgJGVsLCB7IGJhdGNoOiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJpbmRpbmcudG9waWNzID0gdmFyc1RvQmluZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmluZGluZy50b3BpY3MgPSBbYXR0clZhbF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9uQmF0Y2hhYmxlVmFyaWFibGVzLnB1c2goYXR0clZhbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRyQmluZGluZ3MucHVzaChiaW5kaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJGVsLmRhdGEoJ2F0dHItYmluZGluZ3MnLCBhdHRyQmluZGluZ3MpO1xuICAgICAgICAgICAgaWYgKG5vbkJhdGNoYWJsZVZhcmlhYmxlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnc3Vic2NyaWJlJywgbm9uQmF0Y2hhYmxlVmFyaWFibGVzLCAkZWwuZ2V0KDApKVxuICAgICAgICAgICAgICAgIHN1YnNjcmliZShjaGFubmVsLCBub25CYXRjaGFibGVWYXJpYWJsZXMsICRlbCwgeyBiYXRjaDogZmFsc2UgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEJpbmQgYWxsIHByb3ZpZGVkIGVsZW1lbnRzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gIHtBcnJheXxqUXVlcnlTZWxlY3Rvcn0gZWxlbWVudHNUb0JpbmQgKE9wdGlvbmFsKSBJZiBub3QgcHJvdmlkZWQsIGJpbmRzIGFsbCBtYXRjaGluZyBlbGVtZW50cyB3aXRoaW4gZGVmYXVsdCByb290IHByb3ZpZGVkIGF0IGluaXRpYWxpemF0aW9uLlxuICAgICAgICAgKi9cbiAgICAgICAgYmluZEFsbDogZnVuY3Rpb24gKGVsZW1lbnRzVG9CaW5kKSB7XG4gICAgICAgICAgICBpZiAoIWVsZW1lbnRzVG9CaW5kKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudHNUb0JpbmQgPSBnZXRNYXRjaGluZ0VsZW1lbnRzKHRoaXMub3B0aW9ucy5yb290KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIV8uaXNBcnJheShlbGVtZW50c1RvQmluZCkpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50c1RvQmluZCA9IGdldE1hdGNoaW5nRWxlbWVudHMoZWxlbWVudHNUb0JpbmQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgLy9wYXJzZSB0aHJvdWdoIGRvbSBhbmQgZmluZCBldmVyeXRoaW5nIHdpdGggbWF0Y2hpbmcgYXR0cmlidXRlc1xuICAgICAgICAgICAgJC5lYWNoKGVsZW1lbnRzVG9CaW5kLCBmdW5jdGlvbiAoaW5kZXgsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBtZS5iaW5kRWxlbWVudC5jYWxsKG1lLCBlbGVtZW50LCBtZS5vcHRpb25zLmNoYW5uZWwudmFyaWFibGVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogVW5iaW5kIHByb3ZpZGVkIGVsZW1lbnRzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gIHtBcnJheX0gZWxlbWVudHNUb1VuYmluZCAoT3B0aW9uYWwpIElmIG5vdCBwcm92aWRlZCwgdW5iaW5kcyBldmVyeXRoaW5nLlxuICAgICAgICAgKi9cbiAgICAgICAgdW5iaW5kQWxsOiBmdW5jdGlvbiAoZWxlbWVudHNUb1VuYmluZCkge1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIGlmICghZWxlbWVudHNUb1VuYmluZCkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzVG9VbmJpbmQgPSB0aGlzLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJC5lYWNoKGVsZW1lbnRzVG9VbmJpbmQsIGZ1bmN0aW9uIChpbmRleCwgZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIG1lLnVuYmluZEVsZW1lbnQuY2FsbChtZSwgZWxlbWVudCwgbWUub3B0aW9ucy5jaGFubmVsLnZhcmlhYmxlcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogSW5pdGlhbGl6ZSB0aGUgRE9NIE1hbmFnZXIgdG8gd29yayB3aXRoIGEgcGFydGljdWxhciBIVE1MIGVsZW1lbnQgYW5kIGFsbCBlbGVtZW50cyB3aXRoaW4gdGhhdCByb290LiBEYXRhIGJpbmRpbmdzIGJldHdlZW4gaW5kaXZpZHVhbCBIVE1MIGVsZW1lbnRzIGFuZCB0aGUgbW9kZWwgdmFyaWFibGVzIHNwZWNpZmllZCBpbiB0aGUgYXR0cmlidXRlcyB3aWxsIGhhcHBlbiB2aWEgdGhlIGNoYW5uZWwuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIChPcHRpb25hbCkgT3ZlcnJpZGVzIGZvciB0aGUgZGVmYXVsdCBvcHRpb25zLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0aW9ucy5yb290IFRoZSByb290IEhUTUwgZWxlbWVudCBiZWluZyBtYW5hZ2VkIGJ5IHRoaXMgaW5zdGFuY2Ugb2YgdGhlIERPTSBNYW5hZ2VyLiBEZWZhdWx0cyB0byBgYm9keWAuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zLmNoYW5uZWwgVGhlIGNoYW5uZWwgdG8gY29tbXVuaWNhdGUgd2l0aC4gRGVmYXVsdHMgdG8gdGhlIENoYW5uZWwgTWFuYWdlciBmcm9tIFtFcGljZW50ZXIuanNdKC4uLy4uLy4uL2FwaV9hZGFwdGVycy8pLlxuICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuYXV0b0JpbmQgSWYgYHRydWVgIChkZWZhdWx0KSwgYW55IHZhcmlhYmxlcyBhZGRlZCB0byB0aGUgRE9NIGFmdGVyIGBGbG93LmluaXRpYWxpemUoKWAgaGFzIGJlZW4gY2FsbGVkIHdpbGwgYmUgYXV0b21hdGljYWxseSBwYXJzZWQsIGFuZCBzdWJzY3JpcHRpb25zIGFkZGVkIHRvIGNoYW5uZWxzLiBOb3RlLCB0aGlzIGRvZXMgbm90IHdvcmsgaW4gSUUgdmVyc2lvbnMgPCAxMS5cbiAgICAgICAgICovXG4gICAgICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUm9vdCBvZiB0aGUgZWxlbWVudCBmb3IgZmxvdy5qcyB0byBtYW5hZ2UgZnJvbS5cbiAgICAgICAgICAgICAgICAgKiBAdHlwZSB7U3RyaW5nfSBqUXVlcnkgc2VsZWN0b3JcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICByb290OiAnYm9keScsXG4gICAgICAgICAgICAgICAgY2hhbm5lbDogbnVsbCxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEFueSB2YXJpYWJsZXMgYWRkZWQgdG8gdGhlIERPTSBhZnRlciBgRmxvdy5pbml0aWFsaXplKClgIGhhcyBiZWVuIGNhbGxlZCB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgcGFyc2VkLCBhbmQgc3Vic2NyaXB0aW9ucyBhZGRlZCB0byBjaGFubmVscy4gTm90ZSwgdGhpcyBkb2VzIG5vdCB3b3JrIGluIElFIHZlcnNpb25zIDwgMTEuXG4gICAgICAgICAgICAgICAgICogQHR5cGUge0Jvb2xlYW59XG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgYXV0b0JpbmQ6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAkLmV4dGVuZChkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgICAgIHZhciBjaGFubmVsID0gZGVmYXVsdHMuY2hhbm5lbDtcblxuICAgICAgICAgICAgdGhpcy5vcHRpb25zID0gZGVmYXVsdHM7XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgJHJvb3QgPSAkKGRlZmF1bHRzLnJvb3QpO1xuICAgICAgICAgICAgJChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbWUuYmluZEFsbCgpO1xuICAgICAgICAgICAgICAgICRyb290LnRyaWdnZXIoJ2YuZG9tcmVhZHknKTtcblxuICAgICAgICAgICAgICAgIC8vQXR0YWNoIGxpc3RlbmVyc1xuICAgICAgICAgICAgICAgIC8vIExpc3RlbiBmb3IgY2hhbmdlcyB0byB1aSBhbmQgcHVibGlzaCB0byBhcGlcbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoY29uZmlnLmV2ZW50cy50cmlnZ2VyKS5vbihjb25maWcuZXZlbnRzLnRyaWdnZXIsIGZ1bmN0aW9uIChldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnNlZERhdGEgPSB7fTsgLy9pZiBub3QgYWxsIHN1YnNlcXVlbnQgbGlzdGVuZXJzIHdpbGwgZ2V0IHRoZSBtb2RpZmllZCBkYXRhXG5cbiAgICAgICAgICAgICAgICAgICAgdmFyICRlbCA9ICQoZXZ0LnRhcmdldCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhdHRyQ29udmVydGVycyA9ICBkb21VdGlscy5nZXRDb252ZXJ0ZXJzTGlzdCgkZWwsICdiaW5kJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGRhdGEsIGZ1bmN0aW9uICh2YWwsIGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5ID0ga2V5LnNwbGl0KCd8JylbMF0udHJpbSgpOyAvL2luIGNhc2UgdGhlIHBpcGUgZm9ybWF0dGluZyBzeW50YXggd2FzIHVzZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IGNvbnZlcnRlck1hbmFnZXIucGFyc2UodmFsLCBhdHRyQ29udmVydGVycyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZWREYXRhW2tleV0gPSBwYXJzZVV0aWxzLnRvSW1wbGljaXRUeXBlKHZhbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICRlbC50cmlnZ2VyKCdmLmNvbnZlcnQnLCB7IGJpbmQ6IHZhbCB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgY2hhbm5lbC52YXJpYWJsZXMucHVibGlzaChwYXJzZWREYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIExpc3RlbiBmb3IgY2hhbmdlcyBmcm9tIGFwaSBhbmQgdXBkYXRlIHVpXG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKGNvbmZpZy5ldmVudHMucmVhY3QpLm9uKGNvbmZpZy5ldmVudHMucmVhY3QsIGZ1bmN0aW9uIChldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZXZ0LnRhcmdldCwgZGF0YSwgXCJyb290IG9uXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgJGVsID0gJChldnQudGFyZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gJGVsLmRhdGEoJ2F0dHItYmluZGluZ3MnKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdG9jb252ZXJ0ID0ge307XG4gICAgICAgICAgICAgICAgICAgICQuZWFjaChkYXRhLCBmdW5jdGlvbiAodmFyaWFibGVOYW1lLCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGJpbmRpbmdzLCBmdW5jdGlvbiAoYmluZGluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfLmNvbnRhaW5zKGJpbmRpbmcudG9waWNzLCB2YXJpYWJsZU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChiaW5kaW5nLnRvcGljcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2NvbnZlcnRbYmluZGluZy5hdHRyXSA9IF8ucGljayhkYXRhLCBiaW5kaW5nLnRvcGljcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2NvbnZlcnRbYmluZGluZy5hdHRyXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAkZWwudHJpZ2dlcignZi5jb252ZXJ0JywgdG9jb252ZXJ0KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIGRhdGEgPSB7cHJvcHRvdXBkYXRlOiB2YWx1ZX0gfHwganVzdCBhIHZhbHVlIChhc3N1bWVzICdiaW5kJyBpZiBzbylcbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoJ2YuY29udmVydCcpLm9uKCdmLmNvbnZlcnQnLCBmdW5jdGlvbiAoZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkZWwgPSAkKGV2dC50YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29udmVydCA9IGZ1bmN0aW9uICh2YWwsIHByb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3AgPSBwcm9wLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXR0ckNvbnZlcnRlcnMgPSAgZG9tVXRpbHMuZ2V0Q29udmVydGVyc0xpc3QoJGVsLCBwcm9wKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGVyID0gYXR0ck1hbmFnZXIuZ2V0SGFuZGxlcihwcm9wLCAkZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnZlcnRlZFZhbHVlID0gY29udmVydGVyTWFuYWdlci5jb252ZXJ0KHZhbCwgYXR0ckNvbnZlcnRlcnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlci5oYW5kbGUuY2FsbCgkZWwsIGNvbnZlcnRlZFZhbHVlLCBwcm9wKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLmVhY2goZGF0YSwgY29udmVydCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb252ZXJ0KGRhdGEsICdiaW5kJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICRyb290Lm9mZignZi51aS5vcGVyYXRlJykub24oJ2YudWkub3BlcmF0ZScsIGZ1bmN0aW9uIChldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YSA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkYXRhKTsgLy9pZiBub3QgYWxsIHN1YnNlcXVlbnQgbGlzdGVuZXJzIHdpbGwgZ2V0IHRoZSBtb2RpZmllZCBkYXRhXG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaChkYXRhLm9wZXJhdGlvbnMsIGZ1bmN0aW9uIChvcG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgb3BuLnBhcmFtcyA9IF8ubWFwKG9wbi5wYXJhbXMsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVV0aWxzLnRvSW1wbGljaXRUeXBlKCQudHJpbSh2YWwpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjaGFubmVsLm9wZXJhdGlvbnMucHVibGlzaChkYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmIChtZS5vcHRpb25zLmF1dG9CaW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIGF1dG9VcGRhdGVQbHVnaW4oJHJvb3QuZ2V0KDApLCBtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuICQuZXh0ZW5kKHRoaXMsIHB1YmxpY0FQSSk7XG59KCkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uLy4uL2NvbmZpZycpO1xudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9kZWZhdWx0LW5vZGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIHByb3BlcnR5SGFuZGxlcnM6IFtdLFxuXG4gICAgdWlDaGFuZ2VFdmVudDogJ2NoYW5nZScsXG4gICAgZ2V0VUlWYWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy4kZWwudmFsKCk7XG4gICAgfSxcblxuICAgIHJlbW92ZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLiRlbC5vZmYodGhpcy51aUNoYW5nZUV2ZW50KTtcbiAgICB9LFxuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICB2YXIgcHJvcE5hbWUgPSB0aGlzLiRlbC5kYXRhKGNvbmZpZy5iaW5kZXJBdHRyKTtcblxuICAgICAgICBpZiAocHJvcE5hbWUpIHtcbiAgICAgICAgICAgIHRoaXMuJGVsLm9mZih0aGlzLnVpQ2hhbmdlRXZlbnQpLm9uKHRoaXMudWlDaGFuZ2VFdmVudCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciB2YWwgPSBtZS5nZXRVSVZhbHVlKCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0ge307XG4gICAgICAgICAgICAgICAgcGFyYW1zW3Byb3BOYW1lXSA9IHZhbDtcblxuICAgICAgICAgICAgICAgIG1lLiRlbC50cmlnZ2VyKGNvbmZpZy5ldmVudHMudHJpZ2dlciwgcGFyYW1zKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIEJhc2VWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxufSwgeyBzZWxlY3RvcjogJ2lucHV0LCBzZWxlY3QnIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuLi8uLi91dGlscy9iYXNlLXZpZXcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIHByb3BlcnR5SGFuZGxlcnM6IFtcblxuICAgIF0sXG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgfVxufSwgeyBzZWxlY3RvcjogJyonIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9kZWZhdWx0LWlucHV0LW5vZGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoe1xuXG4gICAgcHJvcGVydHlIYW5kbGVyczogW1xuXG4gICAgXSxcblxuICAgIGdldFVJVmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICRlbCA9IHRoaXMuJGVsO1xuICAgICAgICAvL1RPRE86IGZpbGUgYSBpc3N1ZSBmb3IgdGhlIHZlbnNpbSBtYW5hZ2VyIHRvIGNvbnZlcnQgdHJ1ZXMgdG8gMXMgYW5kIHNldCB0aGlzIHRvIHRydWUgYW5kIGZhbHNlXG5cbiAgICAgICAgdmFyIG9mZlZhbCA9ICAoJGVsLmRhdGEoJ2Ytb2ZmJykgIT09IHVuZGVmaW5lZCkgPyAkZWwuZGF0YSgnZi1vZmYnKSA6IDA7XG4gICAgICAgIC8vYXR0ciA9IGluaXRpYWwgdmFsdWUsIHByb3AgPSBjdXJyZW50IHZhbHVlXG4gICAgICAgIHZhciBvblZhbCA9ICgkZWwuYXR0cigndmFsdWUnKSAhPT0gdW5kZWZpbmVkKSA/ICRlbC5wcm9wKCd2YWx1ZScpOiAxO1xuXG4gICAgICAgIHZhciB2YWwgPSAoJGVsLmlzKCc6Y2hlY2tlZCcpKSA/IG9uVmFsIDogb2ZmVmFsO1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBCYXNlVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbn0sIHsgc2VsZWN0b3I6ICc6Y2hlY2tib3gsOnJhZGlvJyB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uIChzZWxlY3RvciwgaGFuZGxlcikge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICAgICAgaGFuZGxlciA9IHtcbiAgICAgICAgICAgIGhhbmRsZTogaGFuZGxlclxuICAgICAgICB9O1xuICAgIH1cbiAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICAgIHNlbGVjdG9yID0gJyonO1xuICAgIH1cbiAgICBoYW5kbGVyLnNlbGVjdG9yID0gc2VsZWN0b3I7XG4gICAgcmV0dXJuIGhhbmRsZXI7XG59O1xuXG52YXIgbWF0Y2ggPSBmdW5jdGlvbiAodG9NYXRjaCwgbm9kZSkge1xuICAgIGlmIChfLmlzU3RyaW5nKHRvTWF0Y2gpKSB7XG4gICAgICAgIHJldHVybiB0b01hdGNoID09PSBub2RlLnNlbGVjdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAkKHRvTWF0Y2gpLmlzKG5vZGUuc2VsZWN0b3IpO1xuICAgIH1cbn07XG5cbnZhciBub2RlTWFuYWdlciA9IHtcbiAgICBsaXN0OiBbXSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBub2RlIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmd9IHNlbGVjdG9yIGpRdWVyeS1jb21wYXRpYmxlIHNlbGVjdG9yIHRvIHVzZSB0byBtYXRjaCBub2Rlc1xuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufSBoYW5kbGVyICBIYW5kbGVycyBhcmUgbmV3LWFibGUgZnVuY3Rpb25zLiBUaGV5IHdpbGwgYmUgY2FsbGVkIHdpdGggJGVsIGFzIGNvbnRleHQuPyBUT0RPOiBUaGluayB0aGlzIHRocm91Z2hcbiAgICAgKi9cbiAgICByZWdpc3RlcjogZnVuY3Rpb24gKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMubGlzdC51bnNoaWZ0KG5vcm1hbGl6ZShzZWxlY3RvciwgaGFuZGxlcikpO1xuICAgIH0sXG5cbiAgICBnZXRIYW5kbGVyOiBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIF8uZmluZCh0aGlzLmxpc3QsIGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2goc2VsZWN0b3IsIG5vZGUpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgcmVwbGFjZTogZnVuY3Rpb24gKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgXy5lYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24gKGN1cnJlbnRIYW5kbGVyLCBpKSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09IGN1cnJlbnRIYW5kbGVyLnNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGlzdC5zcGxpY2UoaW5kZXgsIDEsIG5vcm1hbGl6ZShzZWxlY3RvciwgaGFuZGxlcikpO1xuICAgIH1cbn07XG5cbi8vYm9vdHN0cmFwc1xudmFyIGRlZmF1bHRIYW5kbGVycyA9IFtcbiAgICByZXF1aXJlKCcuL2lucHV0LWNoZWNrYm94LW5vZGUnKSxcbiAgICByZXF1aXJlKCcuL2RlZmF1bHQtaW5wdXQtbm9kZScpLFxuICAgIHJlcXVpcmUoJy4vZGVmYXVsdC1ub2RlJylcbl07XG5fLmVhY2goZGVmYXVsdEhhbmRsZXJzLnJldmVyc2UoKSwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICBub2RlTWFuYWdlci5yZWdpc3RlcihoYW5kbGVyLnNlbGVjdG9yLCBoYW5kbGVyKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5vZGVNYW5hZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh0YXJnZXQsIGRvbU1hbmFnZXIpIHtcbiAgICBpZiAoIXdpbmRvdy5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYW4gb2JzZXJ2ZXIgaW5zdGFuY2VcbiAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAobXV0YXRpb25zKSB7XG4gICAgICBtdXRhdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAobXV0YXRpb24pIHtcbiAgICAgICAgdmFyIGFkZGVkID0gJChtdXRhdGlvbi5hZGRlZE5vZGVzKS5maW5kKCc6ZicpO1xuICAgICAgICBhZGRlZCA9IGFkZGVkLmFkZCgkKG11dGF0aW9uLmFkZGVkTm9kZXMpLmZpbHRlcignOmYnKSk7XG5cbiAgICAgICAgdmFyIHJlbW92ZWQgPSAkKG11dGF0aW9uLnJlbW92ZWROb2RlcykuZmluZCgnOmYnKTtcbiAgICAgICAgcmVtb3ZlZCA9IHJlbW92ZWQuYWRkKCQobXV0YXRpb24ucmVtb3ZlZE5vZGVzKS5maWx0ZXIoJzpmJykpO1xuXG4gICAgICAgIGlmIChhZGRlZCAmJiBhZGRlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdtdXRhdGlvbiBvYnNlcnZlciBhZGRlZCcsIGFkZGVkLmdldCgpLCBtdXRhdGlvbi5hZGRlZE5vZGVzKTtcbiAgICAgICAgICAgIGRvbU1hbmFnZXIuYmluZEFsbChhZGRlZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlbW92ZWQgJiYgcmVtb3ZlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdtdXRhdGlvbiBvYnNlcnZlciByZW1vdmVkJywgcmVtb3ZlZCk7XG4gICAgICAgICAgICBkb21NYW5hZ2VyLnVuYmluZEFsbChyZW1vdmVkKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB2YXIgbXV0Y29uZmlnID0ge1xuICAgICAgICBhdHRyaWJ1dGVzOiBmYWxzZSxcbiAgICAgICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgICAgICBzdWJ0cmVlOiB0cnVlLFxuICAgICAgICBjaGFyYWN0ZXJEYXRhOiBmYWxzZVxuICAgIH07XG4gICAgb2JzZXJ2ZXIub2JzZXJ2ZSh0YXJnZXQsIG11dGNvbmZpZyk7XG4gICAgLy8gTGF0ZXIsIHlvdSBjYW4gc3RvcCBvYnNlcnZpbmdcbiAgICAvLyBvYnNlcnZlci5kaXNjb25uZWN0KCk7XG59O1xuIiwiLyoqXG4gKiAjIyBGbG93LmpzIEluaXRpYWxpemF0aW9uXG4gKlxuICogVG8gdXNlIEZsb3cuanMgaW4geW91ciBwcm9qZWN0LCBzaW1wbHkgY2FsbCBgRmxvdy5pbml0aWFsaXplKClgIGluIHlvdXIgdXNlciBpbnRlcmZhY2UuIEluIHRoZSBiYXNpYyBjYXNlLCBgRmxvdy5pbml0aWFsaXplKClgIGNhbiBiZSBjYWxsZWQgd2l0aG91dCBhbnkgYXJndW1lbnRzLiBXaGlsZSBGbG93LmpzIG5lZWRzIHRvIGtub3cgdGhlIGFjY291bnQsIHByb2plY3QsIGFuZCBtb2RlbCB5b3UgYXJlIHVzaW5nLCBieSBkZWZhdWx0IHRoZXNlIHZhbHVlcyBhcmUgZXh0cmFjdGVkIGZyb20gdGhlIFVSTCBvZiBFcGljZW50ZXIgcHJvamVjdCBhbmQgYnkgdGhlIHVzZSBvZiBgZGF0YS1mLW1vZGVsYCBpbiB5b3VyIGA8Ym9keT5gIHRhZy4gU2VlIG1vcmUgb24gdGhlIFtiYXNpY3Mgb2YgdXNpbmcgRmxvdy5qcyBpbiB5b3VyIHByb2plY3QuXSguLi8uLi8jdXNpbmdfaW5fcHJvamVjdCkuXG4gKlxuICogSG93ZXZlciwgc29tZXRpbWVzIHlvdSB3YW50IHRvIGJlIGV4cGxpY2l0IGluIHlvdXIgaW5pdGlhbGl6YXRpb24gY2FsbCwgYW5kIHRoZXJlIGFyZSBhbHNvIHNvbWUgYWRkaXRpb25hbCBwYXJhbWV0ZXJzIHRoYXQgbGV0IHlvdSBjdXN0b21pemUgeW91ciB1c2Ugb2YgRmxvdy5qcy5cbiAqXG4gKiAjIyMjUGFyYW1ldGVyc1xuICpcbiAqIFRoZSBwYXJhbWV0ZXJzIGZvciBpbml0aWFsaXppbmcgRmxvdy5qcyBpbmNsdWRlOlxuICpcbiAqICogYGNoYW5uZWxgIENvbmZpZ3VyYXRpb24gZGV0YWlscyBmb3IgdGhlIGNoYW5uZWwgRmxvdy5qcyB1c2VzIGluIGNvbm5lY3Rpbmcgd2l0aCB1bmRlcmx5aW5nIEFQSXMuXG4gKiAqIGBjaGFubmVsLnN0cmF0ZWd5YCBUaGUgcnVuIGNyZWF0aW9uIHN0cmF0ZWd5IGRlc2NyaWJlcyB3aGVuIHRvIGNyZWF0ZSBuZXcgcnVucyB3aGVuIGFuIGVuZCB1c2VyIHZpc2l0cyB0aGlzIHBhZ2UuIFRoZSBkZWZhdWx0IGlzIGBuZXctaWYtcGVyc2lzdGVkYCwgd2hpY2ggY3JlYXRlcyBhIG5ldyBydW4gd2hlbiB0aGUgZW5kIHVzZXIgaXMgaWRsZSBmb3IgbG9uZ2VyIHRoYW4geW91ciBwcm9qZWN0J3MgKipNb2RlbCBTZXNzaW9uIFRpbWVvdXQqKiAoY29uZmlndXJlZCBpbiB5b3VyIHByb2plY3QncyBbU2V0dGluZ3NdKC4uLy4uLy4uL3VwZGF0aW5nX3lvdXJfc2V0dGluZ3MvKSksIGJ1dCBvdGhlcndpc2UgdXNlcyB0aGUgY3VycmVudCBydW4uLiBTZWUgbW9yZSBvbiBbUnVuIFN0cmF0ZWdpZXNdKC4uLy4uLy4uL2FwaV9hZGFwdGVycy9zdHJhdGVneS8pLlxuICogKiBgY2hhbm5lbC5ydW5gIENvbmZpZ3VyYXRpb24gZGV0YWlscyBmb3IgZWFjaCBydW4gY3JlYXRlZC5cbiAqICogYGNoYW5uZWwucnVuLmFjY291bnRgIFRoZSAqKlVzZXIgSUQqKiBvciAqKlRlYW0gSUQqKiBmb3IgdGhpcyBwcm9qZWN0LiBCeSBkZWZhdWx0LCB0YWtlbiBmcm9tIHRoZSBVUkwgd2hlcmUgdGhlIHVzZXIgaW50ZXJmYWNlIGlzIGhvc3RlZCwgc28geW91IG9ubHkgbmVlZCB0byBzdXBwbHkgdGhpcyBpcyB5b3UgYXJlIHJ1bm5pbmcgeW91ciBwcm9qZWN0J3MgdXNlciBpbnRlcmZhY2UgW29uIHlvdXIgb3duIHNlcnZlcl0oLi4vLi4vLi4vaG93X3RvL3NlbGZfaG9zdGluZy8pLlxuICogKiBgY2hhbm5lbC5ydW4ucHJvamVjdGAgVGhlICoqUHJvamVjdCBJRCoqIGZvciB0aGlzIHByb2plY3QuXG4gKiAqIGBjaGFubmVsLnJ1bi5tb2RlbGAgTmFtZSBvZiB0aGUgcHJpbWFyeSBtb2RlbCBmaWxlIGZvciB0aGlzIHByb2plY3QuIEJ5IGRlZmF1bHQsIHRha2VuIGZyb20gYGRhdGEtZi1tb2RlbGAgaW4geW91ciBIVE1MIGA8Ym9keT5gIHRhZy5cbiAqICogYGNoYW5uZWwucnVuLnZhcmlhYmxlc2AgQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgdmFyaWFibGVzIGJlaW5nIGxpc3RlbmVkIHRvIG9uIHRoaXMgY2hhbm5lbC5cbiAqICogYGNoYW5uZWwucnVuLnZhcmlhYmxlcy5zaWxlbnRgIFByb3ZpZGVzIGdyYW51bGFyIGNvbnRyb2wgb3ZlciB3aGVuIHVzZXIgaW50ZXJmYWNlIHVwZGF0ZXMgaGFwcGVuIGZvciBjaGFuZ2VzIG9uIHRoaXMgY2hhbm5lbC4gU2VlIGJlbG93IGZvciBwb3NzaWJsZSB2YWx1ZXMuXG4gKiAqIGBjaGFubmVsLnJ1bi52YXJpYWJsZXMuYXV0b0ZldGNoYCBPcHRpb25zIGZvciBmZXRjaGluZyB2YXJpYWJsZXMgZnJvbSB0aGUgQVBJIGFzIHRoZXkncmUgYmVpbmcgc3Vic2NyaWJlZC4gU2VlIFtWYXJpYWJsZXMgQ2hhbm5lbF0oLi4vY2hhbm5lbHMvdmFyaWFibGVzLWNoYW5uZWwvKSBmb3IgZGV0YWlscy5cbiAqICogYGNoYW5uZWwucnVuLm9wZXJhdGlvbnNgIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIG9wZXJhdGlvbnMgYmVpbmcgbGlzdGVuZWQgdG8gb24gdGhpcyBjaGFubmVsLiBDdXJyZW50bHkgdGhlcmUgaXMgb25seSBvbmUgY29uZmlndXJhdGlvbiBvcHRpb246IGBzaWxlbnRgLlxuICogKiBgY2hhbm5lbC5ydW4ub3BlcmF0aW9ucy5zaWxlbnRgIFByb3ZpZGVzIGdyYW51bGFyIGNvbnRyb2wgb3ZlciB3aGVuIHVzZXIgaW50ZXJmYWNlIHVwZGF0ZXMgaGFwcGVuIGZvciBjaGFuZ2VzIG9uIHRoaXMgY2hhbm5lbC4gU2VlIGJlbG93IGZvciBwb3NzaWJsZSB2YWx1ZXMuXG4gKiAqIGBjaGFubmVsLnJ1bi5zZXJ2ZXJgIE9iamVjdCB3aXRoIGFkZGl0aW9uYWwgc2VydmVyIGNvbmZpZ3VyYXRpb24sIGRlZmF1bHRzIHRvIGBob3N0OiAnYXBpLmZvcmlvLmNvbSdgLlxuICogKiBgY2hhbm5lbC5ydW4udHJhbnNwb3J0YCBBbiBvYmplY3Qgd2hpY2ggdGFrZXMgYWxsIG9mIHRoZSBqcXVlcnkuYWpheCBvcHRpb25zIGF0IDxhIGhyZWY9XCJodHRwOi8vYXBpLmpxdWVyeS5jb20valF1ZXJ5LmFqYXgvXCI+aHR0cDovL2FwaS5qcXVlcnkuY29tL2pRdWVyeS5hamF4LzwvYT4uXG4gKiAqIGBkb21gIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIERPTSB3aGVyZSB0aGlzIGluc3RhbmNlIG9mIEZsb3cuanMgaXMgY3JlYXRlZC5cbiAqICogYGRvbS5yb290YCBUaGUgcm9vdCBIVE1MIGVsZW1lbnQgYmVpbmcgbWFuYWdlZCBieSB0aGUgRmxvdy5qcyBET00gTWFuYWdlci4gRGVmYXVsdHMgdG8gYGJvZHlgLlxuICogKiBgZG9tLmF1dG9CaW5kYCBJZiBgdHJ1ZWAgKGRlZmF1bHQpLCBhdXRvbWF0aWNhbGx5IHBhcnNlIHZhcmlhYmxlcyBhZGRlZCB0byB0aGUgRE9NIGFmdGVyIHRoaXMgYEZsb3cuaW5pdGlhbGl6ZSgpYCBjYWxsLiBOb3RlLCB0aGlzIGRvZXMgbm90IHdvcmsgaW4gSUUgdmVyc2lvbnMgPCAxMS5cbiAqXG4gKiBUaGUgYHNpbGVudGAgY29uZmlndXJhdGlvbiBvcHRpb24gZm9yIHRoZSBgcnVuLnZhcmlhYmxlc2AgYW5kIGBydW4ub3BlcmF0aW9uc2AgaXMgYSBmbGFnIGZvciBwcm92aWRpbmcgbW9yZSBncmFudWxhciBjb250cm9sIG92ZXIgd2hlbiB1c2VyIGludGVyZmFjZSB1cGRhdGVzIGhhcHBlbiBmb3IgY2hhbmdlcyBvbiB0aGlzIGNoYW5uZWwuIFZhbHVlcyBjYW4gYmU6XG4gKlxuICogKiBgZmFsc2VgOiBBbHdheXMgdXBkYXRlIHRoZSBVSSBmb3IgYW55IGNoYW5nZXMgKHZhcmlhYmxlcyB1cGRhdGVkLCBvcGVyYXRpb25zIGNhbGxlZCkgb24gdGhpcyBjaGFubmVsLiBUaGlzIGlzIHRoZSBkZWZhdWx0IGJlaGF2aW9yLlxuICogKiBgdHJ1ZWA6IE5ldmVyIHVwZGF0ZSB0aGUgVUkgZm9yIGFueSBvbiBjaGFuZ2VzICh2YXJpYWJsZXMgdXBkYXRlZCwgb3BlcmF0aW9ucyBjYWxsZWQpIG9uIHRoaXMgY2hhbm5lbC5cbiAqICogQXJyYXkgb2YgdmFyaWFibGVzIG9yIG9wZXJhdGlvbnMgZm9yIHdoaWNoIHRoZSBVSSAqc2hvdWxkIG5vdCogYmUgdXBkYXRlZC4gRm9yIGV4YW1wbGUsIGB2YXJpYWJsZXM6IHsgc2lsZW50OiBbICdwcmljZScsICdzYWxlcycgXSB9YCBtZWFucyB0aGlzIGNoYW5uZWwgaXMgc2lsZW50IChubyB1cGRhdGVzIGZvciB0aGUgVUkpIHdoZW4gdGhlIHZhcmlhYmxlcyAncHJpY2UnIG9yICdzYWxlcycgY2hhbmdlLCBhbmQgdGhlIFVJIGlzIGFsd2F5cyB1cGRhdGVkIGZvciBhbnkgY2hhbmdlcyB0byBvdGhlciB2YXJpYWJsZXMuIFRoaXMgaXMgdXNlZnVsIGlmIHlvdSBrbm93IHRoYXQgY2hhbmdpbmcgJ3ByaWNlJyBvciAnc2FsZXMnIGRvZXMgbm90IGltcGFjdCBhbnl0aGluZyBlbHNlIGluIHRoZSBVSSBkaXJlY3RseSwgZm9yIGluc3RhbmNlLlxuICogKiBgZXhjZXB0YDogV2l0aCBhcnJheSBvZiB2YXJpYWJsZXMgb3Igb3BlcmF0aW9ucyBmb3Igd2hpY2ggdGhlIFVJICpzaG91bGQqIGJlIHVwZGF0ZWQuIEZvciBleGFtcGxlLCBgdmFyaWFibGVzIHsgc2lsZW50OiB7IGV4Y2VwdDogWyAncHJpY2UnLCAnc2FsZXMnIF0gfSB9YCBpcyB0aGUgY29udmVyc2Ugb2YgdGhlIGFib3ZlLiBUaGUgVUkgaXMgYWx3YXlzIHVwZGF0ZWQgd2hlbiBhbnl0aGluZyBvbiB0aGlzIGNoYW5uZWwgY2hhbmdlcyAqZXhjZXB0KiB3aGVuIHRoZSB2YXJpYWJsZXMgJ3ByaWNlJyBvciAnc2FsZXMnIGFyZSB1cGRhdGVkLlxuICpcbiAqIEFsdGhvdWdoIEZsb3cuanMgcHJvdmlkZXMgYSBiaS1kaXJlY3Rpb25hbCBiaW5kaW5nIGJldHdlZW4gdGhlIG1vZGVsIGFuZCB0aGUgdXNlciBpbnRlcmZhY2UsIHRoZSBgc2lsZW50YCBjb25maWd1cmF0aW9uIG9wdGlvbiBhcHBsaWVzIG9ubHkgZm9yIHRoZSBiaW5kaW5nIGZyb20gdGhlIG1vZGVsIHRvIHRoZSB1c2VyIGludGVyZmFjZTsgdXBkYXRlcyBpbiB0aGUgdXNlciBpbnRlcmZhY2UgKGluY2x1ZGluZyBjYWxscyB0byBvcGVyYXRpb25zKSBhcmUgc3RpbGwgc2VudCB0byB0aGUgbW9kZWwuXG4gKlxuICogVGhlIGBGbG93LmluaXRpYWxpemUoKWAgY2FsbCBpcyBiYXNlZCBvbiB0aGUgRXBpY2VudGVyLmpzIFtSdW4gU2VydmljZV0oLi4vLi4vLi4vYXBpX2FkYXB0ZXJzL2dlbmVyYXRlZC9ydW4tYXBpLXNlcnZpY2UvKSBmcm9tIHRoZSBbQVBJIEFkYXB0ZXJzXSguLi8uLi8uLi9hcGlfYWRhcHRlcnMvKS4gU2VlIHRob3NlIHBhZ2VzIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uIG9uIHBhcmFtZXRlcnMuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgIEZsb3cuaW5pdGlhbGl6ZSh7XG4gKiAgICAgICAgICBjaGFubmVsOiB7XG4gKiAgICAgICAgICAgICAgc3RyYXRlZ3k6ICduZXctaWYtcGVyc2lzdGVkJyxcbiAqICAgICAgICAgICAgICBydW46IHtcbiAqICAgICAgICAgICAgICAgICAgbW9kZWw6ICdzdXBwbHktY2hhaW4tZ2FtZS5weScsXG4gKiAgICAgICAgICAgICAgICAgIGFjY291bnQ6ICdhY21lLXNpbXVsYXRpb25zJyxcbiAqICAgICAgICAgICAgICAgICAgcHJvamVjdDogJ3N1cHBseS1jaGFpbi1nYW1lJyxcbiAqICAgICAgICAgICAgICAgICAgc2VydmVyOiB7IGhvc3Q6ICdhcGkuZm9yaW8uY29tJyB9LFxuICogICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6IHsgc2lsZW50OiBbJ3ByaWNlJywgJ3NhbGVzJ10gfSxcbiAqICAgICAgICAgICAgICAgICAgb3BlcmF0aW9uczogeyBzaWxlbnQ6IGZhbHNlIH0sXG4gKiAgICAgICAgICAgICAgICAgIHRyYW5zcG9ydDoge1xuICogICAgICAgICAgICAgICAgICAgICAgYmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7ICQoJ2JvZHknKS5hZGRDbGFzcygnbG9hZGluZycpOyB9LFxuICogICAgICAgICAgICAgICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uKCkgeyAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTsgfVxuICogICAgICAgICAgICAgICAgICB9XG4gKiAgICAgICAgICAgICAgfVxuICogICAgICAgICAgfVxuICogICAgICB9KTtcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkb21NYW5hZ2VyID0gcmVxdWlyZSgnLi9kb20vZG9tLW1hbmFnZXInKTtcbnZhciBDaGFubmVsID0gcmVxdWlyZSgnLi9jaGFubmVscy9ydW4tY2hhbm5lbCcpO1xudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi91dGlscy9iYXNlLXZpZXcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZG9tOiBkb21NYW5hZ2VyLFxuICAgIHV0aWxzOiB7XG4gICAgICAgIEJhc2VWaWV3OiBCYXNlVmlld1xuICAgIH0sXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICB2YXIgbW9kZWwgPSAkKCdib2R5JykuZGF0YSgnZi1tb2RlbCcpO1xuXG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIGNoYW5uZWw6IHtcbiAgICAgICAgICAgICAgICBydW46IHtcbiAgICAgICAgICAgICAgICAgICAgYWNjb3VudDogJycsXG4gICAgICAgICAgICAgICAgICAgIHByb2plY3Q6ICcnLFxuICAgICAgICAgICAgICAgICAgICBtb2RlbDogbW9kZWwsXG5cbiAgICAgICAgICAgICAgICAgICAgb3BlcmF0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9GZXRjaDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRvbToge1xuICAgICAgICAgICAgICAgIHJvb3Q6ICdib2R5JyxcbiAgICAgICAgICAgICAgICBhdXRvQmluZDogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBvcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBjb25maWcpO1xuICAgICAgICB2YXIgJHJvb3QgPSAkKG9wdGlvbnMuZG9tLnJvb3QpO1xuICAgICAgICB2YXIgaW5pdEZuID0gJHJvb3QuZGF0YSgnZi1vbi1pbml0Jyk7XG4gICAgICAgIHZhciBvcG5TaWxlbnQgPSBvcHRpb25zLmNoYW5uZWwucnVuLm9wZXJhdGlvbnMuc2lsZW50O1xuICAgICAgICB2YXIgaXNJbml0T3BlcmF0aW9uU2lsZW50ID0gaW5pdEZuICYmIChvcG5TaWxlbnQgPT09IHRydWUgfHwgKF8uaXNBcnJheShvcG5TaWxlbnQpICYmIF8uY29udGFpbnMob3BuU2lsZW50LCBpbml0Rm4pKSk7XG4gICAgICAgIHZhciBwcmVGZXRjaFZhcmlhYmxlcyA9ICFpbml0Rm4gfHwgaXNJbml0T3BlcmF0aW9uU2lsZW50O1xuXG4gICAgICAgIGlmIChwcmVGZXRjaFZhcmlhYmxlcykge1xuICAgICAgICAgICAgb3B0aW9ucy5jaGFubmVsLnJ1bi52YXJpYWJsZXMuYXV0b0ZldGNoLnN0YXJ0ID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcgJiYgY29uZmlnLmNoYW5uZWwgJiYgKGNvbmZpZy5jaGFubmVsIGluc3RhbmNlb2YgQ2hhbm5lbCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2hhbm5lbCA9IGNvbmZpZy5jaGFubmVsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jaGFubmVsID0gbmV3IENoYW5uZWwob3B0aW9ucy5jaGFubmVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvbU1hbmFnZXIuaW5pdGlhbGl6ZSgkLmV4dGVuZCh0cnVlLCB7XG4gICAgICAgICAgICBjaGFubmVsOiB0aGlzLmNoYW5uZWxcbiAgICAgICAgfSwgb3B0aW9ucy5kb20pKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZXh0ZW5kID0gZnVuY3Rpb24gKHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7XG4gICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgdmFyIGNoaWxkO1xuXG4gICAgLy8gVGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciB0aGUgbmV3IHN1YmNsYXNzIGlzIGVpdGhlciBkZWZpbmVkIGJ5IHlvdVxuICAgIC8vICh0aGUgXCJjb25zdHJ1Y3RvclwiIHByb3BlcnR5IGluIHlvdXIgYGV4dGVuZGAgZGVmaW5pdGlvbiksIG9yIGRlZmF1bHRlZFxuICAgIC8vIGJ5IHVzIHRvIHNpbXBseSBjYWxsIHRoZSBwYXJlbnQncyBjb25zdHJ1Y3Rvci5cbiAgICBpZiAocHJvdG9Qcm9wcyAmJiBfLmhhcyhwcm90b1Byb3BzLCAnY29uc3RydWN0b3InKSkge1xuICAgICAgICBjaGlsZCA9IHByb3RvUHJvcHMuY29uc3RydWN0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2hpbGQgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBwYXJlbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTsgfTtcbiAgICB9XG5cbiAgICAvLyBBZGQgc3RhdGljIHByb3BlcnRpZXMgdG8gdGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLCBpZiBzdXBwbGllZC5cbiAgICBfLmV4dGVuZChjaGlsZCwgcGFyZW50LCBzdGF0aWNQcm9wcyk7XG5cbiAgICAvLyBTZXQgdGhlIHByb3RvdHlwZSBjaGFpbiB0byBpbmhlcml0IGZyb20gYHBhcmVudGAsIHdpdGhvdXQgY2FsbGluZ1xuICAgIC8vIGBwYXJlbnRgJ3MgY29uc3RydWN0b3IgZnVuY3Rpb24uXG4gICAgdmFyIFN1cnJvZ2F0ZSA9IGZ1bmN0aW9uICgpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGNoaWxkOyB9O1xuICAgIFN1cnJvZ2F0ZS5wcm90b3R5cGUgPSBwYXJlbnQucHJvdG90eXBlO1xuICAgIGNoaWxkLnByb3RvdHlwZSA9IG5ldyBTdXJyb2dhdGUoKTtcblxuICAgIC8vIEFkZCBwcm90b3R5cGUgcHJvcGVydGllcyAoaW5zdGFuY2UgcHJvcGVydGllcykgdG8gdGhlIHN1YmNsYXNzLFxuICAgIC8vIGlmIHN1cHBsaWVkLlxuICAgIGlmIChwcm90b1Byb3BzKSB7XG4gICAgICAgIF8uZXh0ZW5kKGNoaWxkLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7XG4gICAgfVxuXG4gICAgLy8gU2V0IGEgY29udmVuaWVuY2UgcHJvcGVydHkgaW4gY2FzZSB0aGUgcGFyZW50J3MgcHJvdG90eXBlIGlzIG5lZWRlZFxuICAgIC8vIGxhdGVyLlxuICAgIGNoaWxkLl9fc3VwZXJfXyA9IHBhcmVudC5wcm90b3R5cGU7XG5cbiAgICByZXR1cm4gY2hpbGQ7XG59O1xuXG52YXIgVmlldyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdGhpcy4kZWwgPSAob3B0aW9ucy4kZWwpIHx8ICQob3B0aW9ucy5lbCk7XG4gICAgdGhpcy5lbCA9IG9wdGlvbnMuZWw7XG4gICAgdGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbn07XG5cbl8uZXh0ZW5kKFZpZXcucHJvdG90eXBlLCB7XG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge30sXG59KTtcblxuVmlldy5leHRlbmQgPSBleHRlbmQ7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldztcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBtYXRjaDogZnVuY3Rpb24gKG1hdGNoRXhwciwgbWF0Y2hWYWx1ZSwgY29udGV4dCkge1xuICAgICAgICBpZiAoXy5pc1N0cmluZyhtYXRjaEV4cHIpKSB7XG4gICAgICAgICAgICByZXR1cm4gKG1hdGNoRXhwciA9PT0gJyonIHx8IChtYXRjaEV4cHIudG9Mb3dlckNhc2UoKSA9PT0gbWF0Y2hWYWx1ZS50b0xvd2VyQ2FzZSgpKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKG1hdGNoRXhwcikpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaEV4cHIobWF0Y2hWYWx1ZSwgY29udGV4dCk7XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc1JlZ0V4cChtYXRjaEV4cHIpKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hWYWx1ZS5tYXRjaChtYXRjaEV4cHIpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGdldENvbnZlcnRlcnNMaXN0OiBmdW5jdGlvbiAoJGVsLCBwcm9wZXJ0eSkge1xuICAgICAgICB2YXIgYXR0ckNvbnZlcnRlcnMgPSAkZWwuZGF0YSgnZi1jb252ZXJ0LScgKyBwcm9wZXJ0eSk7XG5cbiAgICAgICAgaWYgKCFhdHRyQ29udmVydGVycyAmJiAocHJvcGVydHkgPT09ICdiaW5kJyB8fCBwcm9wZXJ0eSA9PT0gJ2ZvcmVhY2gnKSkge1xuICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSAkZWwuZGF0YSgnZi1jb252ZXJ0Jyk7XG4gICAgICAgICAgICBpZiAoIWF0dHJDb252ZXJ0ZXJzKSB7XG4gICAgICAgICAgICAgICAgdmFyICRwYXJlbnRFbCA9ICRlbC5jbG9zZXN0KCdbZGF0YS1mLWNvbnZlcnRdJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRwYXJlbnRFbCkge1xuICAgICAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9ICRwYXJlbnRFbC5kYXRhKCdmLWNvbnZlcnQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYXR0ckNvbnZlcnRlcnMpIHtcbiAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9IF8uaW52b2tlKGF0dHJDb252ZXJ0ZXJzLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXR0ckNvbnZlcnRlcnM7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0b0ltcGxpY2l0VHlwZTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIHJicmFjZSA9IC9eKD86XFx7LipcXH18XFxbLipcXF0pJC87XG4gICAgICAgIHZhciBjb252ZXJ0ZWQgPSBkYXRhO1xuICAgICAgICBpZiAodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBkYXRhID0gZGF0YS50cmltKCk7XG5cbiAgICAgICAgICAgIGlmIChkYXRhID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEgPT09ICdudWxsJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gJyc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnZlcnRlZC5jaGFyQXQoMCkgPT09ICdcXCcnIHx8IGNvbnZlcnRlZC5jaGFyQXQoMCkgPT09ICdcIicpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBkYXRhLnN1YnN0cmluZygxLCBkYXRhLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkLmlzTnVtZXJpYyhkYXRhKSkge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9ICtkYXRhO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyYnJhY2UudGVzdChkYXRhKSkge1xuICAgICAgICAgICAgICAgIC8vVE9ETzogVGhpcyBvbmx5IHdvcmtzIHdpdGggZG91YmxlIHF1b3RlcywgaS5lLiwgWzEsXCIyXCJdIHdvcmtzIGJ1dCBub3QgWzEsJzInXVxuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9ICQucGFyc2VKU09OKGRhdGEpIDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29udmVydGVkO1xuICAgIH1cbn07XG4iXX0=
