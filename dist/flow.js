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
        var $loopTemplate = this.data('foreach-template');
        if (!$loopTemplate) {
            $loopTemplate = this.children();
            this.data('foreach-template', $loopTemplate);
        }
        var $me = this.empty();
        _.each(value, function (dataval, datakey) {
            if (!dataval) {
                dataval = dataval + '';
            }
            var nodes = $loopTemplate.clone();
            nodes.each(function (i, newNode) {
                newNode = $(newNode);
                _.each(newNode.data(), function (val, key) {
                    var templated =  _.template(val, { value: dataval, index: datakey, key: datakey });
                    newNode.data(key, parseUtils.toImplicitType(templated));
                });
                var oldHTML = newNode.html();
                var cleanedHTML = oldHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                var templated = _.template(cleanedHTML, { value: dataval, key: datakey, index: datakey });
                if (cleanedHTML === templated) {
                    newNode.html(dataval);
                } else {
                    newNode.html(templated);
                }
                $me.append(newNode);
            });
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYXBwLmpzIiwic3JjL2NoYW5uZWxzL29wZXJhdGlvbnMtY2hhbm5lbC5qcyIsInNyYy9jaGFubmVscy9ydW4tY2hhbm5lbC5qcyIsInNyYy9jaGFubmVscy92YXJpYWJsZXMtY2hhbm5lbC5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvY29udmVydGVycy9hcnJheS1jb252ZXJ0ZXIuanMiLCJzcmMvY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlci5qcyIsInNyYy9jb252ZXJ0ZXJzL251bWJlci1jb252ZXJ0ZXIuanMiLCJzcmMvY29udmVydGVycy9udW1iZXJmb3JtYXQtY29udmVydGVyLmpzIiwic3JjL2NvbnZlcnRlcnMvc3RyaW5nLWNvbnZlcnRlci5qcyIsInNyYy9jb252ZXJ0ZXJzL3VuZGVyc2NvcmUtdXRpbHMtY29udmVydGVyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2F0dHJpYnV0ZS1tYW5hZ2VyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2NoZWNrYm94LXJhZGlvLWJpbmQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9kZWZhdWx0LWJpbmQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9pbnB1dC1iaW5kLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvY2xhc3MtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9kZWZhdWx0LWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvZXZlbnRzL2RlZmF1bHQtZXZlbnQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9ldmVudHMvaW5pdC1ldmVudC1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2ZvcmVhY2gvZGVmYXVsdC1mb3JlYWNoLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvbmVnYXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL25vLW9wLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvcG9zaXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwic3JjL2RvbS9kb20tbWFuYWdlci5qcyIsInNyYy9kb20vbm9kZXMvYmFzZS5qcyIsInNyYy9kb20vbm9kZXMvZGVmYXVsdC1pbnB1dC1ub2RlLmpzIiwic3JjL2RvbS9ub2Rlcy9kZWZhdWx0LW5vZGUuanMiLCJzcmMvZG9tL25vZGVzL2lucHV0LWNoZWNrYm94LW5vZGUuanMiLCJzcmMvZG9tL25vZGVzL25vZGUtbWFuYWdlci5qcyIsInNyYy9kb20vcGx1Z2lucy9hdXRvLXVwZGF0ZS1iaW5kaW5ncy5qcyIsInNyYy9mbG93LmpzIiwic3JjL3V0aWxzL2RvbS5qcyIsInNyYy91dGlscy9wYXJzZS11dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIndpbmRvdy5GbG93ID0gcmVxdWlyZSgnLi9mbG93LmpzJyk7XG53aW5kb3cuRmxvdy52ZXJzaW9uID0gJzwlPSB2ZXJzaW9uICU+JzsgLy9wb3B1bGF0ZWQgYnkgZ3J1bnRcbiIsIi8qKlxuICogIyMgT3BlcmF0aW9ucyBDaGFubmVsXG4gKlxuICogQ2hhbm5lbHMgYXJlIHdheXMgZm9yIEZsb3cuanMgdG8gdGFsayB0byBleHRlcm5hbCBBUElzIC0tIHByaW1hcmlseSB0aGUgW3VuZGVybHlpbmcgRXBpY2VudGVyIEFQSXNdKC4uLy4uLy4uLy4uL2NyZWF0aW5nX3lvdXJfaW50ZXJmYWNlLykuXG4gKlxuICogVGhlIHByaW1hcnkgdXNlIGNhc2VzIGZvciB0aGUgT3BlcmF0aW9ucyBDaGFubmVsIGFyZTpcbiAqXG4gKiAqIGBwdWJsaXNoYDogQ2FsbCBhbiBvcGVyYXRpb24uXG4gKiAqIGBzdWJzY3JpYmVgOiBSZWNlaXZlIG5vdGlmaWNhdGlvbnMgd2hlbiBhbiBvcGVyYXRpb24gaXMgY2FsbGVkLlxuICpcbiAqIEZvciBleGFtcGxlLCB1c2UgYHB1Ymxpc2goKWAgdG8gY2FsbCBhbiBvcGVyYXRpb24gKG1ldGhvZCkgZnJvbSB5b3VyIG1vZGVsOlxuICpcbiAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMucHVibGlzaCgnbXlNZXRob2QnLCBteU1ldGhvZFBhcmFtKTtcbiAqXG4gKiBGb3IgcmVmZXJlbmNlLCBhbiBlcXVpdmFsZW50IGNhbGwgdXNpbmcgRmxvdy5qcyBjdXN0b20gSFRNTCBhdHRyaWJ1dGVzIGlzOlxuICpcbiAqICAgICAgPGJ1dHRvbiBkYXRhLWYtb24tY2xpY2s9XCJteU1ldGhvZChteU1ldGhvZFBhcmFtKVwiPkNsaWNrIG1lPC9idXR0b24+XG4gKlxuICogWW91IGNhbiBhbHNvIHVzZSBgc3Vic2NyaWJlKClgIGFuZCBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGxpc3RlbiBhbmQgcmVhY3Qgd2hlbiB0aGUgb3BlcmF0aW9uIGhhcyBiZWVuIGNhbGxlZDpcbiAqXG4gKiAgICAgIEZsb3cuY2hhbm5lbC5vcGVyYXRpb25zLnN1YnNjcmliZSgnbXlNZXRob2QnLFxuICogICAgICAgICAgZnVuY3Rpb24oKSB7IGNvbnNvbGUubG9nKCdjYWxsZWQhJyk7IH0gKTtcbiAqXG4gKiBVc2UgYHN1YnNjcmliZSgqKWAgdG8gbGlzdGVuIGZvciBub3RpZmljYXRpb25zIG9uIGFsbCBvcGVyYXRpb25zLlxuICpcbiAqIFRvIHVzZSB0aGUgT3BlcmF0aW9ucyBDaGFubmVsLCBzaW1wbHkgW2luaXRpYWxpemUgRmxvdy5qcyBpbiB5b3VyIHByb2plY3RdKC4uLy4uLy4uLyNjdXN0b20taW5pdGlhbGl6ZSkuXG4gKlxuKi9cblxuXG4ndXNlIHN0cmljdCc7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZXRlcm1pbmUgd2hlbiB0byB1cGRhdGUgc3RhdGUuIERlZmF1bHRzIHRvIGBmYWxzZWA6IGFsd2F5cyB0cmlnZ2VyIHVwZGF0ZXMuXG4gICAgICAgICAqXG4gICAgICAgICAqIFBvc3NpYmxlIG9wdGlvbnMgYXJlOlxuICAgICAgICAgKlxuICAgICAgICAgKiAqIGB0cnVlYDogTmV2ZXIgdHJpZ2dlciBhbnkgdXBkYXRlcy4gVXNlIHRoaXMgaWYgeW91IGtub3cgeW91ciBtb2RlbCBzdGF0ZSB3b24ndCBjaGFuZ2UgYmFzZWQgb24gb3BlcmF0aW9ucy5cbiAgICAgICAgICogKiBgZmFsc2VgOiBBbHdheXMgdHJpZ2dlciB1cGRhdGVzLlxuICAgICAgICAgKiAqIGBbYXJyYXkgb2Ygb3BlcmF0aW9uIG5hbWVzXWA6IE9wZXJhdGlvbnMgaW4gdGhpcyBhcnJheSAqd2lsbCBub3QqIHRyaWdnZXIgdXBkYXRlczsgZXZlcnl0aGluZyBlbHNlIHdpbGwuXG4gICAgICAgICAqICogYHsgZXhjZXB0OiBbYXJyYXkgb2Ygb3BlcmF0aW9uIG5hbWVzXSB9YDogT3BlcmF0aW9ucyBpbiB0aGlzIGFycmF5ICp3aWxsKiB0cmlnZ2VyIHVwZGF0ZXM7IG5vdGhpbmcgZWxzZSB3aWxsLlxuICAgICAgICAgKlxuICAgICAgICAgKiBUbyBzZXQsIHBhc3MgdGhpcyBpbnRvIHRoZSBgRmxvdy5pbml0aWFsaXplKClgIGNhbGwgaW4gdGhlIGBjaGFubmVsLnJ1bi5vcGVyYXRpb25zYCBmaWVsZDpcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICBGbG93LmluaXRpYWxpemUoe1xuICAgICAgICAgKiAgICAgICAgICBjaGFubmVsOiB7XG4gICAgICAgICAqICAgICAgICAgICAgICBydW46IHtcbiAgICAgICAgICogICAgICAgICAgICAgICAgICBtb2RlbDogJ215TW9kZWwucHknLFxuICAgICAgICAgKiAgICAgICAgICAgICAgICAgIGFjY291bnQ6ICdhY21lLXNpbXVsYXRpb25zJyxcbiAgICAgICAgICogICAgICAgICAgICAgICAgICBwcm9qZWN0OiAnc3VwcGx5LWNoYWluLWdhbWUnLFxuICAgICAgICAgKiAgICAgICAgICAgICAgICAgIG9wZXJhdGlvbnM6IHsgc2lsZW50OiB0cnVlIH1cbiAgICAgICAgICogICAgICAgICAgICAgIH1cbiAgICAgICAgICogICAgICAgICAgfVxuICAgICAgICAgKiAgICAgIH0pO1xuICAgICAgICAgKlxuICAgICAgICAgKiBUbyBvdmVycmlkZSBmb3IgYSBzcGVjaWZpYyBjYWxsIHRvIHRoZSBPcGVyYXRpb25zIENoYW5uZWwsIHBhc3MgdGhpcyBhcyB0aGUgZmluYWwgYG9wdGlvbnNgIHBhcmFtZXRlcjpcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMucHVibGlzaCgnbXlNZXRob2QnLCBteU1ldGhvZFBhcmFtLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge1N0cmluZ3xBcnJheXxPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBzaWxlbnQ6IGZhbHNlLFxuXG4gICAgICAgIGludGVycG9sYXRlOiB7fVxuICAgIH07XG5cbiAgICB2YXIgY2hhbm5lbE9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuICAgIHRoaXMub3B0aW9ucyA9IGNoYW5uZWxPcHRpb25zO1xuXG4gICAgdmFyIHJ1biA9IGNoYW5uZWxPcHRpb25zLnJ1bjtcblxuICAgIHZhciBwdWJsaWNBUEkgPSB7XG4gICAgICAgIC8vZm9yIHRlc3RpbmdcbiAgICAgICAgcHJpdmF0ZToge1xuICAgICAgICAgICAgb3B0aW9uczogY2hhbm5lbE9wdGlvbnNcbiAgICAgICAgfSxcblxuICAgICAgICBsaXN0ZW5lck1hcDoge30sXG5cbiAgICAgICAgZ2V0U3Vic2NyaWJlcnM6IGZ1bmN0aW9uICh0b3BpYykge1xuICAgICAgICAgICAgdmFyIHRvcGljU3Vic2NyaWJlcnMgPSB0aGlzLmxpc3RlbmVyTWFwW3RvcGljXSB8fCBbXTtcbiAgICAgICAgICAgIHZhciBnbG9iYWxTdWJzY3JpYmVycyA9IHRoaXMubGlzdGVuZXJNYXBbJyonXSB8fCBbXTtcbiAgICAgICAgICAgIHJldHVybiB0b3BpY1N1YnNjcmliZXJzLmNvbmNhdChnbG9iYWxTdWJzY3JpYmVycyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy9DaGVjayBmb3IgdXBkYXRlc1xuICAgICAgICAvKipcbiAgICAgICAgICogRm9yY2UgYSBjaGVjayBmb3IgdXBkYXRlcyBvbiB0aGUgY2hhbm5lbCwgYW5kIG5vdGlmeSBhbGwgbGlzdGVuZXJzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gIGV4ZWN1dGVkT3BucyBPcGVyYXRpb25zIHdoaWNoIGp1c3QgaGFwcGVuZWQuXG4gICAgICAgICAqIEBwYXJhbSB7QW55fSByZXNwb25zZSAgUmVzcG9uc2UgZnJvbSB0aGUgb3BlcmF0aW9uLlxuICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGZvcmNlICBJZ25vcmUgYWxsIGBzaWxlbnRgIG9wdGlvbnMgYW5kIGZvcmNlIHJlZnJlc2guXG4gICAgICAgICAqL1xuICAgICAgICByZWZyZXNoOiBmdW5jdGlvbiAoZXhlY3V0ZWRPcG5zLCByZXNwb25zZSwgZm9yY2UpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdPcGVyYXRpb25zIHJlZnJlc2gnLCBleGVjdXRlZE9wbnMpO1xuICAgICAgICAgICAgdmFyIHNpbGVudCA9IGNoYW5uZWxPcHRpb25zLnNpbGVudDtcblxuICAgICAgICAgICAgdmFyIHRvTm90aWZ5ID0gZXhlY3V0ZWRPcG5zO1xuICAgICAgICAgICAgaWYgKGZvcmNlID09PSB0cnVlKSB7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNpbGVudCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHRvTm90aWZ5ID0gW107XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNBcnJheShzaWxlbnQpICYmIGV4ZWN1dGVkT3Bucykge1xuICAgICAgICAgICAgICAgIHRvTm90aWZ5ID0gXy5kaWZmZXJlbmNlKGV4ZWN1dGVkT3Bucywgc2lsZW50KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJC5pc1BsYWluT2JqZWN0KHNpbGVudCkgJiYgZXhlY3V0ZWRPcG5zKSB7XG4gICAgICAgICAgICAgICAgdG9Ob3RpZnkgPSBfLmludGVyc2VjdGlvbihzaWxlbnQuZXhjZXB0LCBleGVjdXRlZE9wbnMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfLmVhY2godG9Ob3RpZnksIGZ1bmN0aW9uIChvcG4pIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5vdGlmeShvcG4sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbGVydCBlYWNoIHN1YnNjcmliZXIgYWJvdXQgdGhlIG9wZXJhdGlvbiBhbmQgaXRzIHBhcmFtZXRlcnMuIFRoaXMgY2FuIGJlIHVzZWQgdG8gcHJvdmlkZSBhbiB1cGRhdGUgd2l0aG91dCBhIHJvdW5kIHRyaXAgdG8gdGhlIHNlcnZlci4gSG93ZXZlciwgaXQgaXMgcmFyZWx5IHVzZWQ6IHlvdSBhbG1vc3QgYWx3YXlzIHdhbnQgdG8gYHN1YnNjcmliZSgpYCBpbnN0ZWFkIHNvIHRoYXQgdGhlIG9wZXJhdGlvbiBpcyBhY3R1YWxseSBjYWxsZWQgaW4gdGhlIG1vZGVsLlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC5vcGVyYXRpb25zLm5vdGlmeSgnbXlNZXRob2QnLCBteU1ldGhvZFJlc3BvbnNlKTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG9wZXJhdGlvbiBOYW1lIG9mIG9wZXJhdGlvbi5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfEFycmF5fE9iamVjdH0gdmFsdWUgUGFyYW1ldGVyIHZhbHVlcyBmb3IgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAgICAqL1xuICAgICAgICBub3RpZnk6IGZ1bmN0aW9uIChvcGVyYXRpb24sIHZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nZXRTdWJzY3JpYmVycyhvcGVyYXRpb24pO1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zW29wZXJhdGlvbl0gPSB2YWx1ZTtcblxuICAgICAgICAgICAgXy5lYWNoKGxpc3RlbmVycywgZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9IGxpc3RlbmVyLnRhcmdldDtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNhbGwobnVsbCwgcGFyYW1zLCB2YWx1ZSwgb3BlcmF0aW9uKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRhcmdldC50cmlnZ2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyLnRhcmdldC50cmlnZ2VyKGNvbmZpZy5ldmVudHMucmVhY3QsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGxpc3RlbmVyIGZvcm1hdCBmb3IgJyArIG9wZXJhdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW50ZXJwb2xhdGU6IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICAgIHZhciBpcCA9IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0ZTtcbiAgICAgICAgICAgIHZhciBtYXRjaCA9IGZ1bmN0aW9uIChwKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1hcHBlZCA9IHA7XG4gICAgICAgICAgICAgICAgaWYgKGlwW3BdKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcHBlZCA9IF8uaXNGdW5jdGlvbihpcFtwXSkgPyBpcFtwXShwKSA6IGlwW3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbWFwcGVkO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiAoJC5pc0FycmF5KHBhcmFtcykpID8gXy5tYXAocGFyYW1zLCBtYXRjaCkgOiBtYXRjaChwYXJhbXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDYWxsIHRoZSBvcGVyYXRpb24gd2l0aCBwYXJhbWV0ZXJzLCBhbmQgYWxlcnQgc3Vic2NyaWJlcnMuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMucHVibGlzaCgnbXlNZXRob2QnLCBteU1ldGhvZFBhcmFtKTtcbiAgICAgICAgICogICAgICBGbG93LmNoYW5uZWwub3BlcmF0aW9ucy5wdWJsaXNoKHtcbiAgICAgICAgICogICAgICAgICAgb3BlcmF0aW9uczogW3sgbmFtZTogJ215TWV0aG9kJywgcGFyYW1zOiBbbXlNZXRob2RQYXJhbV0gfV1cbiAgICAgICAgICogICAgICB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtICB7U3RyaW5nfE9iamVjdH0gb3BlcmF0aW9uIEZvciBvbmUgb3BlcmF0aW9uLCBwYXNzIHRoZSBuYW1lIG9mIG9wZXJhdGlvbiAoc3RyaW5nKS4gRm9yIG11bHRpcGxlIG9wZXJhdGlvbnMsIHBhc3MgYW4gb2JqZWN0IHdpdGggZmllbGQgYG9wZXJhdGlvbnNgIGFuZCB2YWx1ZSBhcnJheSBvZiBvYmplY3RzLCBlYWNoIHdpdGggYG5hbWVgIGFuZCBgcGFyYW1zYDogYHtvcGVyYXRpb25zOiBbeyBuYW1lOiBvcG4sIHBhcmFtczpbXSB9XSB9YC5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfEFycmF5fE9iamVjdH0gcGFyYW1zIChPcHRpb25hbCkgIFBhcmFtZXRlcnMgdG8gc2VuZCB0byBvcGVyYXRpb24uIFVzZSBmb3Igb25lIG9wZXJhdGlvbjsgZm9yIG11bHRpcGxlIG9wZXJhdGlvbnMsIHBhcmFtZXRlcnMgYXJlIGFscmVhZHkgaW5jbHVkZWQgaW4gdGhlIG9iamVjdCBmb3JtYXQuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIChPcHRpb25hbCkgT3ZlcnJpZGVzIGZvciB0aGUgZGVmYXVsdCBjaGFubmVsIG9wdGlvbnMuXG4gICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5zaWxlbnQgRGV0ZXJtaW5lIHdoZW4gdG8gdXBkYXRlIHN0YXRlLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJuIHskcHJvbWlzZX0gUHJvbWlzZSB0byBjb21wbGV0ZSB0aGUgY2FsbC5cbiAgICAgICAgICovXG4gICAgICAgIHB1Ymxpc2g6IGZ1bmN0aW9uIChvcGVyYXRpb24sIHBhcmFtcywgb3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3Qob3BlcmF0aW9uKSAmJiBvcGVyYXRpb24ub3BlcmF0aW9ucykge1xuICAgICAgICAgICAgICAgIHZhciBmbiA9IChvcGVyYXRpb24uc2VyaWFsKSA/IHJ1bi5zZXJpYWwgOiBydW4ucGFyYWxsZWw7XG4gICAgICAgICAgICAgICAgXy5lYWNoKG9wZXJhdGlvbi5vcGVyYXRpb25zLCBmdW5jdGlvbiAob3BuKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wbi5wYXJhbXMgPSB0aGlzLmludGVycG9sYXRlKG9wbi5wYXJhbXMpO1xuICAgICAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmbi5jYWxsKHJ1biwgb3BlcmF0aW9uLm9wZXJhdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXBhcmFtcyB8fCAhcGFyYW1zLnNpbGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUsIF8ucGx1Y2sob3BlcmF0aW9uLm9wZXJhdGlvbnMsICduYW1lJyksIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdHMgPSAoJC5pc1BsYWluT2JqZWN0KG9wZXJhdGlvbikpID8gcGFyYW1zIDogb3B0aW9ucztcbiAgICAgICAgICAgICAgICBpZiAoISQuaXNQbGFpbk9iamVjdChvcGVyYXRpb24pICYmIHBhcmFtcykge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMgPSB0aGlzLmludGVycG9sYXRlKHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBydW4uZG8uY2FsbChydW4sIG9wZXJhdGlvbiwgcGFyYW1zKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb3B0cyB8fCAhb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUsIFtvcGVyYXRpb25dLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdvcGVyYXRpb25zIHB1Ymxpc2gnLCBvcGVyYXRpb24sIHBhcmFtcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN1YnNjcmliZSB0byBjaGFuZ2VzIG9uIGEgY2hhbm5lbDogQXNrIGZvciBub3RpZmljYXRpb24gd2hlbiBvcGVyYXRpb25zIGFyZSBjYWxsZWQuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMuc3Vic2NyaWJlKCdteU1ldGhvZCcsXG4gICAgICAgICAqICAgICAgICAgIGZ1bmN0aW9uKCkgeyBjb25zb2xlLmxvZygnY2FsbGVkIScpOyB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IG9wZXJhdGlvbnMgVGhlIG5hbWVzIG9mIHRoZSBvcGVyYXRpb25zLiBVc2UgYCpgIHRvIGxpc3RlbiBmb3Igbm90aWZpY2F0aW9ucyBvbiBhbGwgb3BlcmF0aW9ucy5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R8RnVuY3Rpb259IHN1YnNjcmliZXIgVGhlIG9iamVjdCBvciBmdW5jdGlvbiBiZWluZyBub3RpZmllZC4gT2Z0ZW4gdGhpcyBpcyBhIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IEFuIGlkZW50aWZ5aW5nIHRva2VuIGZvciB0aGlzIHN1YnNjcmlwdGlvbi4gUmVxdWlyZWQgYXMgYSBwYXJhbWV0ZXIgd2hlbiB1bnN1YnNjcmliaW5nLlxuICAgICAgICAqL1xuICAgICAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uIChvcGVyYXRpb25zLCBzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnb3BlcmF0aW9ucyBzdWJzY3JpYmUnLCBvcGVyYXRpb25zLCBzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIG9wZXJhdGlvbnMgPSBbXS5jb25jYXQob3BlcmF0aW9ucyk7XG4gICAgICAgICAgICAvL3VzZSBqcXVlcnkgdG8gbWFrZSBldmVudCBzaW5rXG4gICAgICAgICAgICBpZiAoIXN1YnNjcmliZXIub24gJiYgIV8uaXNGdW5jdGlvbihzdWJzY3JpYmVyKSkge1xuICAgICAgICAgICAgICAgIHN1YnNjcmliZXIgPSAkKHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaWQgID0gXy51bmlxdWVJZCgnZXBpY2hhbm5lbC5vcGVyYXRpb24nKTtcbiAgICAgICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHN1YnNjcmliZXJcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG5cbiAgICAgICAgICAgICQuZWFjaChvcGVyYXRpb25zLCBmdW5jdGlvbiAoaW5kZXgsIG9wbikge1xuICAgICAgICAgICAgICAgIGlmICghbWUubGlzdGVuZXJNYXBbb3BuXSkge1xuICAgICAgICAgICAgICAgICAgICBtZS5saXN0ZW5lck1hcFtvcG5dID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1lLmxpc3RlbmVyTWFwW29wbl0gPSBtZS5saXN0ZW5lck1hcFtvcG5dLmNvbmNhdChkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN0b3AgcmVjZWl2aW5nIG5vdGlmaWNhdGlvbiB3aGVuIGFuIG9wZXJhdGlvbiBpcyBjYWxsZWQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBvcGVyYXRpb24gVGhlIG5hbWVzIG9mIHRoZSBvcGVyYXRpb25zLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gdG9rZW4gVGhlIGlkZW50aWZ5aW5nIHRva2VuIGZvciB0aGlzIHN1YnNjcmlwdGlvbi4gKENyZWF0ZWQgYW5kIHJldHVybmVkIGJ5IHRoZSBgc3Vic2NyaWJlKClgIGNhbGwuKVxuICAgICAgICAqL1xuICAgICAgICB1bnN1YnNjcmliZTogZnVuY3Rpb24gKG9wZXJhdGlvbiwgdG9rZW4pIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXJNYXBbb3BlcmF0aW9uXSA9IF8ucmVqZWN0KHRoaXMubGlzdGVuZXJNYXBbb3BlcmF0aW9uXSwgZnVuY3Rpb24gKHN1YnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3Vicy5pZCA9PT0gdG9rZW47XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3RvcCByZWNlaXZpbmcgbm90aWZpY2F0aW9ucyBmb3IgYWxsIG9wZXJhdGlvbnMuIE5vIHBhcmFtZXRlcnMuXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm4ge05vbmV9XG4gICAgICAgICovXG4gICAgICAgIHVuc3Vic2NyaWJlQWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlbmVyTWFwID0ge307XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiAkLmV4dGVuZCh0aGlzLCBwdWJsaWNBUEkpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFZhcnNDaGFubmVsID0gcmVxdWlyZSgnLi92YXJpYWJsZXMtY2hhbm5lbCcpO1xudmFyIE9wZXJhdGlvbnNDaGFubmVsID0gcmVxdWlyZSgnLi9vcGVyYXRpb25zLWNoYW5uZWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgcnVuOiB7XG4gICAgICAgICAgICB2YXJpYWJsZXM6IHtcblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9wZXJhdGlvbnM6IHtcblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgY29uZmlnID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgIHZhciBybSA9IG5ldyBGLm1hbmFnZXIuUnVuTWFuYWdlcihjb25maWcpO1xuICAgIHZhciBycyA9IHJtLnJ1bjtcblxuICAgIHZhciAkY3JlYXRpb25Qcm9taXNlID0gcm0uZ2V0UnVuKCk7XG4gICAgcnMuY3VycmVudFByb21pc2UgPSAkY3JlYXRpb25Qcm9taXNlO1xuXG4gICAgLy8gJGNyZWF0aW9uUHJvbWlzZVxuICAgIC8vICAgICAudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZygnZG9uZScpO1xuICAgIC8vICAgICB9KVxuICAgIC8vICAgICAuZmFpbChmdW5jdGlvbiAoKSB7XG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZygnZmFpbHQnKTtcbiAgICAvLyAgICAgfSk7XG5cbiAgICB2YXIgY3JlYXRlQW5kVGhlbiA9IGZ1bmN0aW9uIChmbiwgY29udGV4dCkge1xuICAgICAgICByZXR1cm4gXy53cmFwKGZuLCBmdW5jdGlvbiAoZnVuYykge1xuICAgICAgICAgICAgdmFyIHBhc3NlZEluUGFyYW1zID0gXy50b0FycmF5KGFyZ3VtZW50cykuc2xpY2UoMSk7XG4gICAgICAgICAgICByZXR1cm4gcnMuY3VycmVudFByb21pc2UudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcnMuY3VycmVudFByb21pc2UgPSBmdW5jLmFwcGx5KGNvbnRleHQsIHBhc3NlZEluUGFyYW1zKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcnMuY3VycmVudFByb21pc2U7XG4gICAgICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1RoaXMgZmFpbGVkLCBidXQgd2VcXCdyZSBtb3ZpbmcgYWhlYWQgd2l0aCB0aGUgbmV4dCBvbmUgYW55d2F5JywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICBycy5jdXJyZW50UHJvbWlzZSA9IGZ1bmMuYXBwbHkoY29udGV4dCwgcGFzc2VkSW5QYXJhbXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBycy5jdXJyZW50UHJvbWlzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy9NYWtlIHN1cmUgbm90aGluZyBoYXBwZW5zIGJlZm9yZSB0aGUgcnVuIGlzIGNyZWF0ZWRcbiAgICB2YXIgbm9uV3JhcHBlZCA9IFsndmFyaWFibGVzJywgJ2NyZWF0ZScsICdsb2FkJywgJ2dldEN1cnJlbnRDb25maWcnXTtcbiAgICBfLmVhY2gocnMsIGZ1bmN0aW9uICh2YWx1ZSwgbmFtZSkge1xuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSAmJiAhXy5jb250YWlucyhub25XcmFwcGVkLCBuYW1lKSkge1xuICAgICAgICAgICAgcnNbbmFtZV0gPSBjcmVhdGVBbmRUaGVuKHZhbHVlLCBycyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBvcmlnaW5hbFZhcmlhYmxlc0ZuID0gcnMudmFyaWFibGVzO1xuICAgIHJzLnZhcmlhYmxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZzID0gb3JpZ2luYWxWYXJpYWJsZXNGbi5hcHBseShycywgYXJndW1lbnRzKTtcbiAgICAgICAgXy5lYWNoKHZzLCBmdW5jdGlvbiAodmFsdWUsIG5hbWUpIHtcbiAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdnNbbmFtZV0gPSBjcmVhdGVBbmRUaGVuKHZhbHVlLCB2cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdnM7XG4gICAgfTtcblxuICAgIHRoaXMucnVuID0gcnM7XG4gICAgdmFyIHZhck9wdGlvbnMgPSBjb25maWcucnVuLnZhcmlhYmxlcztcbiAgICB0aGlzLnZhcmlhYmxlcyA9IG5ldyBWYXJzQ2hhbm5lbCgkLmV4dGVuZCh0cnVlLCB7fSwgdmFyT3B0aW9ucywgeyBydW46IHJzIH0pKTtcbiAgICB0aGlzLm9wZXJhdGlvbnMgPSBuZXcgT3BlcmF0aW9uc0NoYW5uZWwoJC5leHRlbmQodHJ1ZSwge30sIGNvbmZpZy5ydW4ub3BlcmF0aW9ucywgeyBydW46IHJzIH0pKTtcblxuICAgIHZhciBtZSA9IHRoaXM7XG4gICAgdmFyIGRlYm91bmNlZFJlZnJlc2ggPSBfLmRlYm91bmNlKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIG1lLnZhcmlhYmxlcy5yZWZyZXNoLmNhbGwobWUudmFyaWFibGVzLCBudWxsLCB0cnVlKTtcbiAgICAgICAgaWYgKG1lLnZhcmlhYmxlcy5vcHRpb25zLmF1dG9GZXRjaC5lbmFibGUpIHtcbiAgICAgICAgICAgIG1lLnZhcmlhYmxlcy5zdGFydEF1dG9GZXRjaCgpO1xuICAgICAgICB9XG4gICAgfSwgMjAwLCB7IGxlYWRpbmc6IHRydWUgfSk7XG5cbiAgICB0aGlzLm9wZXJhdGlvbnMuc3Vic2NyaWJlKCcqJywgZGVib3VuY2VkUmVmcmVzaCk7XG59O1xuIiwiLyoqXG4gKiAjIyBWYXJpYWJsZXMgQ2hhbm5lbFxuICpcbiAqIENoYW5uZWxzIGFyZSB3YXlzIGZvciBGbG93LmpzIHRvIHRhbGsgdG8gZXh0ZXJuYWwgQVBJcyAtLSBwcmltYXJpbHkgdGhlIFt1bmRlcmx5aW5nIEVwaWNlbnRlciBBUElzXSguLi8uLi8uLi8uLi9jcmVhdGluZ195b3VyX2ludGVyZmFjZS8pLlxuICpcbiAqIFRoZSBwcmltYXJ5IHVzZSBjYXNlcyBmb3IgdGhlIFZhcmlhYmxlcyBDaGFubmVsIGFyZTpcbiAqXG4gKiAqIGBwdWJsaXNoYDogVXBkYXRlIGEgbW9kZWwgdmFyaWFibGUuXG4gKiAqIGBzdWJzY3JpYmVgOiBSZWNlaXZlIG5vdGlmaWNhdGlvbnMgd2hlbiBhIG1vZGVsIHZhcmlhYmxlIGlzIHVwZGF0ZWQuXG4gKlxuICogRm9yIGV4YW1wbGUsIHVzZSBgcHVibGlzaCgpYCB0byB1cGRhdGUgYSBtb2RlbCB2YXJpYWJsZTpcbiAqXG4gKiAgICAgIEZsb3cuY2hhbm5lbC5vcGVyYXRpb25zLnB1Ymxpc2goJ215VmFyaWFibGUnLCBuZXdWYWx1ZSk7XG4gKlxuICogRm9yIHJlZmVyZW5jZSwgYW4gZXF1aXZhbGVudCBjYWxsIHVzaW5nIEZsb3cuanMgY3VzdG9tIEhUTUwgYXR0cmlidXRlcyBpczpcbiAqXG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwibXlWYXJpYWJsZVwiIHZhbHVlPVwibmV3VmFsdWVcIj48L2lucHV0PlxuICpcbiAqIHdoZXJlIHRoZSBuZXcgdmFsdWUgaXMgaW5wdXQgYnkgdGhlIHVzZXIuXG4gKlxuICogWW91IGNhbiBhbHNvIHVzZSBgc3Vic2NyaWJlKClgIGFuZCBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGxpc3RlbiBhbmQgcmVhY3Qgd2hlbiB0aGUgbW9kZWwgdmFyaWFibGUgaGFzIGJlZW4gdXBkYXRlZDpcbiAqXG4gKiAgICAgIEZsb3cuY2hhbm5lbC5vcGVyYXRpb25zLnN1YnNjcmliZSgnbXlWYXJpYWJsZScsXG4gKiAgICAgICAgICBmdW5jdGlvbigpIHsgY29uc29sZS5sb2coJ2NhbGxlZCEnKTsgfSApO1xuICpcbiAqIFRvIHVzZSB0aGUgVmFyaWFibGVzIENoYW5uZWwsIHNpbXBseSBbaW5pdGlhbGl6ZSBGbG93LmpzIGluIHlvdXIgcHJvamVjdF0oLi4vLi4vLi4vI2N1c3RvbS1pbml0aWFsaXplKS5cbiAqXG4qL1xuXG4ndXNlIHN0cmljdCc7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZXRlcm1pbmUgd2hlbiB0byB1cGRhdGUgc3RhdGUuIERlZmF1bHRzIHRvIGBmYWxzZWA6IGFsd2F5cyB0cmlnZ2VyIHVwZGF0ZXMuXG4gICAgICAgICAqXG4gICAgICAgICAqIFBvc3NpYmxlIG9wdGlvbnMgYXJlOlxuICAgICAgICAgKlxuICAgICAgICAgKiAqIGB0cnVlYDogTmV2ZXIgdHJpZ2dlciBhbnkgdXBkYXRlcy4gVXNlIHRoaXMgaWYgeW91IGtub3cgeW91ciBtb2RlbCBzdGF0ZSB3b24ndCBjaGFuZ2UgYmFzZWQgb24gb3RoZXIgdmFyaWFibGVzLlxuICAgICAgICAgKiAqIGBmYWxzZWA6IEFsd2F5cyB0cmlnZ2VyIHVwZGF0ZXMuXG4gICAgICAgICAqICogYFthcnJheSBvZiB2YXJpYWJsZSBuYW1lc11gOiBWYXJpYWJsZXMgaW4gdGhpcyBhcnJheSAqd2lsbCBub3QqIHRyaWdnZXIgdXBkYXRlczsgZXZlcnl0aGluZyBlbHNlIHdpbGwuXG4gICAgICAgICAqICogYHsgZXhjZXB0OiBbYXJyYXkgb2YgdmFyaWFibGUgbmFtZXNdIH1gOiBWYXJpYWJsZXMgaW4gdGhpcyBhcnJheSAqd2lsbCogdHJpZ2dlciB1cGRhdGVzOyBub3RoaW5nIGVsc2Ugd2lsbC5cbiAgICAgICAgICpcbiAgICAgICAgICogVG8gc2V0LCBwYXNzIHRoaXMgaW50byB0aGUgYEZsb3cuaW5pdGlhbGl6ZSgpYCBjYWxsIGluIHRoZSBgY2hhbm5lbC5ydW4udmFyaWFibGVzYCBmaWVsZDpcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICBGbG93LmluaXRpYWxpemUoe1xuICAgICAgICAgKiAgICAgICAgICBjaGFubmVsOiB7XG4gICAgICAgICAqICAgICAgICAgICAgICBydW46IHtcbiAgICAgICAgICogICAgICAgICAgICAgICAgICBtb2RlbDogJ215TW9kZWwucHknLFxuICAgICAgICAgKiAgICAgICAgICAgICAgICAgIGFjY291bnQ6ICdhY21lLXNpbXVsYXRpb25zJyxcbiAgICAgICAgICogICAgICAgICAgICAgICAgICBwcm9qZWN0OiAnc3VwcGx5LWNoYWluLWdhbWUnLFxuICAgICAgICAgKiAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczogeyBzaWxlbnQ6IHRydWUgfVxuICAgICAgICAgKiAgICAgICAgICAgICAgfVxuICAgICAgICAgKiAgICAgICAgICB9XG4gICAgICAgICAqICAgICAgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIFRvIG92ZXJyaWRlIGZvciBhIHNwZWNpZmljIGNhbGwgdG8gdGhlIFZhcmlhYmxlcyBDaGFubmVsLCBwYXNzIHRoaXMgYXMgdGhlIGZpbmFsIGBvcHRpb25zYCBwYXJhbWV0ZXI6XG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgIEZsb3cuY2hhbm5lbC52YXJpYWJsZXMucHVibGlzaCgnbXlWYXJpYWJsZScsIG5ld1ZhbHVlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge1N0cmluZ3xBcnJheXxPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBzaWxlbnQ6IGZhbHNlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbGxvd3MgeW91IHRvIGF1dG9tYXRpY2FsbHkgZmV0Y2ggdmFyaWFibGVzIGZyb20gdGhlIEFQSSBhcyB0aGV5J3JlIGJlaW5nIHN1YnNjcmliZWQuIElmIHRoaXMgaXMgc2V0IHRvIGBlbmFibGU6IGZhbHNlYCB5b3UnbGwgbmVlZCB0byBleHBsaWNpdGx5IGNhbGwgYHJlZnJlc2goKWAgdG8gZ2V0IGRhdGEgYW5kIG5vdGlmeSB5b3VyIGxpc3RlbmVycy5cbiAgICAgICAgICpcbiAgICAgICAgICogVGhlIHByb3BlcnRpZXMgb2YgdGhpcyBvYmplY3QgaW5jbHVkZTpcbiAgICAgICAgICpcbiAgICAgICAgICogKiBgYXV0b0ZldGNoLmVuYWJsZWAgKkJvb2xlYW4qIEVuYWJsZSBhdXRvLWZldGNoIGJlaGF2aW9yLiBJZiBzZXQgdG8gYGZhbHNlYCBkdXJpbmcgaW5zdGFudGlhdGlvbiB0aGVyZSdzIG5vIHdheSB0byBlbmFibGUgdGhpcyBhZ2Fpbi4gRGVmYXVsdHMgdG8gYHRydWVgLlxuICAgICAgICAgKiAqIGBhdXRvRmV0Y2guc3RhcnRgICpCb29sZWFuKiBJZiBhdXRvLWZldGNoIGlzIGVuYWJsZWQsIGNvbnRyb2wgd2hlbiB0byBzdGFydCBmZXRjaGluZy4gVHlwaWNhbGx5IHlvdSdkIHdhbnQgdG8gc3RhcnQgcmlnaHQgYXdheSwgYnV0IGlmIHlvdSB3YW50IHRvIHdhaXQgdGlsbCBzb21ldGhpbmcgZWxzZSBoYXBwZW5zIChsaWtlIGFuIG9wZXJhdGlvbiBvciB1c2VyIGFjdGlvbikgc2V0IHRvIGBmYWxzZWAgYW5kIGNvbnRyb2wgdXNpbmcgdGhlIGBzdGFydEF1dG9GZXRjaCgpYCBmdW5jdGlvbi4gRGVmYXVsdHMgdG8gYHRydWVgLlxuICAgICAgICAgKiAqIGBhdXRvRmV0Y2guZGVib3VuY2VgICpOdW1iZXIqIE1pbGxpc2Vjb25kcyB0byB3YWl0IGJldHdlZW4gY2FsbHMgdG8gYHN1YnNjcmliZSgpYCBiZWZvcmUgY2FsbGluZyBgZmV0Y2goKWAuIFNlZSBbaHR0cDovL2RydXBhbG1vdGlvbi5jb20vYXJ0aWNsZS9kZWJvdW5jZS1hbmQtdGhyb3R0bGUtdmlzdWFsLWV4cGxhbmF0aW9uXShodHRwOi8vZHJ1cGFsbW90aW9uLmNvbS9hcnRpY2xlL2RlYm91bmNlLWFuZC10aHJvdHRsZS12aXN1YWwtZXhwbGFuYXRpb24pIGZvciBhbiBleHBsYW5hdGlvbiBvZiBob3cgZGVib3VuY2luZyB3b3Jrcy4gRGVmYXVsdHMgdG8gYDIwMGAuXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBhdXRvRmV0Y2g6IHtcblxuICAgICAgICAgICAgIC8vIEVuYWJsZSBhdXRvLWZldGNoIGJlaGF2aW9yLiBJZiBzZXQgdG8gYGZhbHNlYCBkdXJpbmcgaW5zdGFudGlhdGlvbiB0aGVyZSdzIG5vIHdheSB0byBlbmFibGUgdGhpcyBhZ2FpblxuICAgICAgICAgICAgIC8vIEB0eXBlIHtCb29sZWFufVxuICAgICAgICAgICAgZW5hYmxlOiB0cnVlLFxuXG4gICAgICAgICAgICAgLy8gSWYgYXV0by1mZXRjaCBpcyBlbmFibGVkLCBjb250cm9sIHdoZW4gdG8gc3RhcnQgZmV0Y2hpbmcuIFR5cGljYWxseSB5b3UnZCB3YW50IHRvIHN0YXJ0IHJpZ2h0IGF3YXksIGJ1dCBpZiB5b3Ugd2FudCB0byB3YWl0IHRpbGwgc29tZXRoaW5nIGVsc2UgaGFwcGVucyAobGlrZSBhbiBvcGVyYXRpb24gb3IgdXNlciBhY3Rpb24pIHNldCB0byBgZmFsc2VgIGFuZCBjb250cm9sIHVzaW5nIHRoZSBgc3RhcnRBdXRvRmV0Y2goKWAgZnVuY3Rpb24uXG4gICAgICAgICAgICAgLy8gQHR5cGUge0Jvb2xlYW59XG4gICAgICAgICAgICBzdGFydDogdHJ1ZSxcblxuICAgICAgICAgICAgIC8vIENvbnRyb2wgdGltZSB0byB3YWl0IGJldHdlZW4gY2FsbHMgdG8gYHN1YnNjcmliZSgpYCBiZWZvcmUgY2FsbGluZyBgZmV0Y2goKWAuIFNlZSBbaHR0cDovL2RydXBhbG1vdGlvbi5jb20vYXJ0aWNsZS9kZWJvdW5jZS1hbmQtdGhyb3R0bGUtdmlzdWFsLWV4cGxhbmF0aW9uXShodHRwOi8vZHJ1cGFsbW90aW9uLmNvbS9hcnRpY2xlL2RlYm91bmNlLWFuZC10aHJvdHRsZS12aXN1YWwtZXhwbGFuYXRpb24pIGZvciBhbiBleHBsYW5hdGlvbiBvZiBob3cgZGVib3VuY2luZyB3b3Jrcy5cbiAgICAgICAgICAgICAvLyBAdHlwZSB7TnVtYmVyfSBNaWxsaXNlY29uZHMgdG8gd2FpdFxuICAgICAgICAgICAgZGVib3VuY2U6IDIwMFxuICAgICAgICB9LFxuXG4gICAgICAgIGludGVycG9sYXRlOiB7fVxuICAgIH07XG5cbiAgICB2YXIgY2hhbm5lbE9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuICAgIHRoaXMub3B0aW9ucyA9IGNoYW5uZWxPcHRpb25zO1xuXG4gICAgdmFyIHZzID0gY2hhbm5lbE9wdGlvbnMucnVuLnZhcmlhYmxlcygpO1xuXG4gICAgdmFyIGN1cnJlbnREYXRhID0ge307XG5cbiAgICAvL1RPRE86IGFjdHVhbGx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgc28gb25cbiAgICB2YXIgaXNFcXVhbCA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgdmFyIGdldElubmVyVmFyaWFibGVzID0gZnVuY3Rpb24gKHN0cikge1xuICAgICAgICB2YXIgaW5uZXIgPSBzdHIubWF0Y2goLzwoLio/KT4vZyk7XG4gICAgICAgIGlubmVyID0gXy5tYXAoaW5uZXIsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWwuc3Vic3RyaW5nKDEsIHZhbC5sZW5ndGggLSAxKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBpbm5lcjtcbiAgICB9O1xuXG4gICAgLy9SZXBsYWNlcyBzdHViYmVkIG91dCBrZXluYW1lcyBpbiB2YXJpYWJsZXN0b2ludGVycG9sYXRlIHdpdGggdGhlaXIgY29ycmVzcG9uZGluZyB2YWx1ZXNcbiAgICB2YXIgaW50ZXJwb2xhdGUgPSBmdW5jdGlvbiAodmFyaWFibGVzVG9JbnRlcnBvbGF0ZSwgdmFsdWVzKSB7XG4gICAgICAgIC8ve3ByaWNlWzFdOiBwcmljZVs8dGltZT5dfVxuICAgICAgICB2YXIgaW50ZXJwb2xhdGlvbk1hcCA9IHt9O1xuICAgICAgICAvL3twcmljZVsxXTogMX1cbiAgICAgICAgdmFyIGludGVycG9sYXRlZCA9IHt9O1xuXG4gICAgICAgIF8uZWFjaCh2YXJpYWJsZXNUb0ludGVycG9sYXRlLCBmdW5jdGlvbiAob3V0ZXJWYXJpYWJsZSkge1xuICAgICAgICAgICAgdmFyIGlubmVyID0gZ2V0SW5uZXJWYXJpYWJsZXMob3V0ZXJWYXJpYWJsZSk7XG4gICAgICAgICAgICB2YXIgb3JpZ2luYWxPdXRlciA9IG91dGVyVmFyaWFibGU7XG4gICAgICAgICAgICBpZiAoaW5uZXIgJiYgaW5uZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJC5lYWNoKGlubmVyLCBmdW5jdGlvbiAoaW5kZXgsIGlubmVyVmFyaWFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRoaXN2YWwgPSB2YWx1ZXNbaW5uZXJWYXJpYWJsZV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzdmFsICE9PSBudWxsICYmIHRoaXN2YWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh0aGlzdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vRm9yIGFycmF5ZWQgdGhpbmdzIGdldCB0aGUgbGFzdCBvbmUgZm9yIGludGVycG9sYXRpb24gcHVycG9zZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzdmFsID0gdGhpc3ZhbFt0aGlzdmFsLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBSZWdleCB0byBtYXRjaCBzcGFjZXMgYW5kIHNvIG9uXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRlclZhcmlhYmxlID0gb3V0ZXJWYXJpYWJsZS5yZXBsYWNlKCc8JyArIGlubmVyVmFyaWFibGUgKyAnPicsIHRoaXN2YWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaW50ZXJwb2xhdGlvbk1hcFtvdXRlclZhcmlhYmxlXSA9IChpbnRlcnBvbGF0aW9uTWFwW291dGVyVmFyaWFibGVdKSA/IFtvcmlnaW5hbE91dGVyXS5jb25jYXQoaW50ZXJwb2xhdGlvbk1hcFtvdXRlclZhcmlhYmxlXSkgOiBvcmlnaW5hbE91dGVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW50ZXJwb2xhdGVkW29yaWdpbmFsT3V0ZXJdID0gb3V0ZXJWYXJpYWJsZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIG9wID0ge1xuICAgICAgICAgICAgaW50ZXJwb2xhdGVkOiBpbnRlcnBvbGF0ZWQsXG4gICAgICAgICAgICBpbnRlcnBvbGF0aW9uTWFwOiBpbnRlcnBvbGF0aW9uTWFwXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBvcDtcbiAgICB9O1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcbiAgICAgICAgLy9mb3IgdGVzdGluZ1xuICAgICAgICBwcml2YXRlOiB7XG4gICAgICAgICAgICBnZXRJbm5lclZhcmlhYmxlczogZ2V0SW5uZXJWYXJpYWJsZXMsXG4gICAgICAgICAgICBpbnRlcnBvbGF0ZTogaW50ZXJwb2xhdGUsXG4gICAgICAgICAgICBjdXJyZW50RGF0YTogY3VycmVudERhdGEsXG4gICAgICAgICAgICBvcHRpb25zOiBjaGFubmVsT3B0aW9uc1xuICAgICAgICB9LFxuXG4gICAgICAgIHN1YnNjcmlwdGlvbnM6IFtdLFxuXG4gICAgICAgIHVuZmV0Y2hlZDogW10sXG5cbiAgICAgICAgZ2V0U3Vic2NyaWJlcnM6IGZ1bmN0aW9uICh0b3BpYykge1xuICAgICAgICAgICAgaWYgKHRvcGljKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF8uZmlsdGVyKHRoaXMuc3Vic2NyaXB0aW9ucywgZnVuY3Rpb24gKHN1YnMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF8uY29udGFpbnMoc3Vicy50b3BpY3MsIHRvcGljKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3Vic2NyaXB0aW9ucztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0QWxsVG9waWNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gXyh0aGlzLnN1YnNjcmlwdGlvbnMpLnBsdWNrKCd0b3BpY3MnKS5mbGF0dGVuKCkudW5pcSgpLnZhbHVlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFRvcGljRGVwZW5kZW5jaWVzOiBmdW5jdGlvbiAobGlzdCkge1xuICAgICAgICAgICAgaWYgKCFsaXN0KSB7XG4gICAgICAgICAgICAgICAgbGlzdCA9IHRoaXMuZ2V0QWxsVG9waWNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaW5uZXJMaXN0ID0gW107XG4gICAgICAgICAgICBfLmVhY2gobGlzdCwgZnVuY3Rpb24gKHZuYW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlubmVyID0gZ2V0SW5uZXJWYXJpYWJsZXModm5hbWUpO1xuICAgICAgICAgICAgICAgIGlmIChpbm5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5uZXJMaXN0ID0gXy51bmlxKGlubmVyTGlzdC5jb25jYXQoaW5uZXIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBpbm5lckxpc3Q7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlQW5kQ2hlY2tGb3JSZWZyZXNoOiBmdW5jdGlvbiAodG9waWNzLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAodG9waWNzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51bmZldGNoZWQgPSBfLnVuaXEodGhpcy51bmZldGNoZWQuY29uY2F0KHRvcGljcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFjaGFubmVsT3B0aW9ucy5hdXRvRmV0Y2guZW5hYmxlIHx8ICFjaGFubmVsT3B0aW9ucy5hdXRvRmV0Y2guc3RhcnQgfHwgIXRoaXMudW5mZXRjaGVkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpcy5kZWJvdW5jZWRGZXRjaCkge1xuICAgICAgICAgICAgICAgIHZhciBkZWJvdW5jZU9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7fSwge1xuICAgICAgICAgICAgICAgICAgICBtYXhXYWl0OiBjaGFubmVsT3B0aW9ucy5hdXRvRmV0Y2guZGVib3VuY2UgKiA0LFxuICAgICAgICAgICAgICAgICAgICBsZWFkaW5nOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sIG9wdGlvbnMpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5kZWJvdW5jZWRGZXRjaCA9IF8uZGVib3VuY2UoZnVuY3Rpb24gKHRvcGljcykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZldGNoKHRoaXMudW5mZXRjaGVkKS50aGVuKGZ1bmN0aW9uIChjaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkLmV4dGVuZChjdXJyZW50RGF0YSwgY2hhbmdlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVuZmV0Y2hlZCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3RpZnkoY2hhbmdlZCk7XG4gICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgfSwgY2hhbm5lbE9wdGlvbnMuYXV0b0ZldGNoLmRlYm91bmNlLCBkZWJvdW5jZU9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmRlYm91bmNlZEZldGNoKHRvcGljcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcG9wdWxhdGVJbm5lclZhcmlhYmxlczogZnVuY3Rpb24gKHZhcnMpIHtcbiAgICAgICAgICAgIHZhciB1bm1hcHBlZFZhcmlhYmxlcyA9IFtdO1xuICAgICAgICAgICAgdmFyIHZhbHVlTGlzdCA9IHt9O1xuICAgICAgICAgICAgXy5lYWNoKHZhcnMsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0ZVt2XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWwgPSBfLmlzRnVuY3Rpb24odGhpcy5vcHRpb25zLmludGVycG9sYXRlW3ZdKSA/IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0ZVt2XSh2KSA6IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0ZVt2XTtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVMaXN0W3ZdID0gdmFsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHVubWFwcGVkVmFyaWFibGVzLnB1c2godik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgICAgICBpZiAodW5tYXBwZWRWYXJpYWJsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZzLnF1ZXJ5KHVubWFwcGVkVmFyaWFibGVzKS50aGVuKGZ1bmN0aW9uICh2YXJpYWJsZVZhbHVlTGlzdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJC5leHRlbmQodmFsdWVMaXN0LCB2YXJpYWJsZVZhbHVlTGlzdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAkLkRlZmVycmVkKCkucmVzb2x2ZSh2YWx1ZUxpc3QpLnByb21pc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBmZXRjaDogZnVuY3Rpb24gKHZhcmlhYmxlc0xpc3QpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdmZXRjaCBjYWxsZWQnLCB2YXJpYWJsZXNMaXN0KTtcbiAgICAgICAgICAgIHZhcmlhYmxlc0xpc3QgPSBbXS5jb25jYXQodmFyaWFibGVzTGlzdCk7XG4gICAgICAgICAgICBpZiAoIXZhcmlhYmxlc0xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICQuRGVmZXJyZWQoKS5yZXNvbHZlKCkucHJvbWlzZSh7fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaW5uZXJWYXJpYWJsZXMgPSB0aGlzLmdldFRvcGljRGVwZW5kZW5jaWVzKHZhcmlhYmxlc0xpc3QpO1xuICAgICAgICAgICAgdmFyIGdldFZhcmlhYmxlcyA9IGZ1bmN0aW9uICh2YXJzLCBpbnRlcnBvbGF0aW9uTWFwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZzLnF1ZXJ5KHZhcnMpLnRoZW4oZnVuY3Rpb24gKHZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnR290IHZhcmlhYmxlcycsIHZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjaGFuZ2VTZXQgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKHZhcmlhYmxlcywgZnVuY3Rpb24gKHZhbHVlLCB2bmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9sZFZhbHVlID0gY3VycmVudERhdGFbdm5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0VxdWFsKHZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VTZXRbdm5hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGludGVycG9sYXRpb25NYXAgJiYgaW50ZXJwb2xhdGlvbk1hcFt2bmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1hcCA9IFtdLmNvbmNhdChpbnRlcnBvbGF0aW9uTWFwW3ZuYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uZWFjaChtYXAsIGZ1bmN0aW9uIChpbnRlcnBvbGF0ZWROYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VTZXRbaW50ZXJwb2xhdGVkTmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoYW5nZVNldDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoaW5uZXJWYXJpYWJsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucG9wdWxhdGVJbm5lclZhcmlhYmxlcyhpbm5lclZhcmlhYmxlcykudGhlbihmdW5jdGlvbiAoaW5uZXJWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnaW5uZXInLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgICQuZXh0ZW5kKGN1cnJlbnREYXRhLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpcCA9ICBpbnRlcnBvbGF0ZSh2YXJpYWJsZXNMaXN0LCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRWYXJpYWJsZXMoXy52YWx1ZXMoaXAuaW50ZXJwb2xhdGVkKSwgaXAuaW50ZXJwb2xhdGlvbk1hcCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBnZXRWYXJpYWJsZXModmFyaWFibGVzTGlzdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3RhcnRBdXRvRmV0Y2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNoYW5uZWxPcHRpb25zLmF1dG9GZXRjaC5zdGFydCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUFuZENoZWNrRm9yUmVmcmVzaCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN0b3BBdXRvRmV0Y2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNoYW5uZWxPcHRpb25zLmF1dG9GZXRjaC5zdGFydCA9IGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGb3JjZSBhIGNoZWNrIGZvciB1cGRhdGVzIG9uIHRoZSBjaGFubmVsLCBhbmQgbm90aWZ5IGFsbCBsaXN0ZW5lcnMuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBjaGFuZ2VMaXN0IEtleS12YWx1ZSBwYWlycyBvZiBjaGFuZ2VkIHZhcmlhYmxlcy5cbiAgICAgICAgICogQHBhcmFtIHtCb29sZWFufSBmb3JjZSAgSWdub3JlIGFsbCBgc2lsZW50YCBvcHRpb25zIGFuZCBmb3JjZSByZWZyZXNoLlxuICAgICAgICAgKi9cbiAgICAgICAgcmVmcmVzaDogZnVuY3Rpb24gKGNoYW5nZUxpc3QsIGZvcmNlKSB7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIHNpbGVudCA9IGNoYW5uZWxPcHRpb25zLnNpbGVudDtcbiAgICAgICAgICAgIHZhciBjaGFuZ2VkVmFyaWFibGVzID0gXy5pc0FycmF5KGNoYW5nZUxpc3QpID8gIGNoYW5nZUxpc3QgOiBfLmtleXMoY2hhbmdlTGlzdCk7XG5cbiAgICAgICAgICAgIHZhciBzaG91bGRTaWxlbmNlID0gc2lsZW50ID09PSB0cnVlO1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheShzaWxlbnQpICYmIGNoYW5nZWRWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBzaG91bGRTaWxlbmNlID0gXy5pbnRlcnNlY3Rpb24oc2lsZW50LCBjaGFuZ2VkVmFyaWFibGVzKS5sZW5ndGggPj0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3Qoc2lsZW50KSAmJiBjaGFuZ2VkVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgc2hvdWxkU2lsZW5jZSA9IF8uaW50ZXJzZWN0aW9uKHNpbGVudC5leGNlcHQsIGNoYW5nZWRWYXJpYWJsZXMpLmxlbmd0aCAhPT0gY2hhbmdlZFZhcmlhYmxlcy5sZW5ndGg7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzaG91bGRTaWxlbmNlICYmIGZvcmNlICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICQuRGVmZXJyZWQoKS5yZXNvbHZlKCkucHJvbWlzZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgdmFyaWFibGVzID0gdGhpcy5nZXRBbGxUb3BpY3MoKTtcbiAgICAgICAgICAgIG1lLnVuZmV0Y2hlZCA9IFtdO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mZXRjaCh2YXJpYWJsZXMpLnRoZW4oZnVuY3Rpb24gKGNoYW5nZVNldCkge1xuICAgICAgICAgICAgICAgICQuZXh0ZW5kKGN1cnJlbnREYXRhLCBjaGFuZ2VTZXQpO1xuICAgICAgICAgICAgICAgIG1lLm5vdGlmeShjaGFuZ2VTZXQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFsZXJ0IGVhY2ggc3Vic2NyaWJlciBhYm91dCB0aGUgdmFyaWFibGUgYW5kIGl0cyBuZXcgdmFsdWUuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMubm90aWZ5KCdteVZhcmlhYmxlJywgbmV3VmFsdWUpO1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gdG9waWNzIE5hbWVzIG9mIHZhcmlhYmxlcy5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfEFycmF5fE9iamVjdH0gdmFsdWUgTmV3IHZhbHVlcyBmb3IgdGhlIHZhcmlhYmxlcy5cbiAgICAgICAgKi9cbiAgICAgICAgbm90aWZ5OiBmdW5jdGlvbiAodG9waWNzLCB2YWx1ZSkge1xuICAgICAgICAgICAgdmFyIGNhbGxUYXJnZXQgPSBmdW5jdGlvbiAodGFyZ2V0LCBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNhbGwobnVsbCwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQudHJpZ2dlcihjb25maWcuZXZlbnRzLnJlYWN0LCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICghJC5pc1BsYWluT2JqZWN0KHRvcGljcykpIHtcbiAgICAgICAgICAgICAgICB0b3BpY3MgPSBfLm9iamVjdChbdG9waWNzXSwgW3ZhbHVlXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfLmVhY2godGhpcy5zdWJzY3JpcHRpb25zLCBmdW5jdGlvbiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9IHN1YnNjcmlwdGlvbi50YXJnZXQ7XG4gICAgICAgICAgICAgICAgaWYgKHN1YnNjcmlwdGlvbi5iYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWF0Y2hpbmdUb3BpY3MgPSBfLnBpY2sodG9waWNzLCBzdWJzY3JpcHRpb24udG9waWNzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uc2l6ZShtYXRjaGluZ1RvcGljcykgPT09IF8uc2l6ZShzdWJzY3JpcHRpb24udG9waWNzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFRhcmdldCh0YXJnZXQsIG1hdGNoaW5nVG9waWNzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaChzdWJzY3JpcHRpb24udG9waWNzLCBmdW5jdGlvbiAodG9waWMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXRjaGluZ1RvcGljcyA9IF8ucGljayh0b3BpY3MsIHRvcGljKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfLnNpemUobWF0Y2hpbmdUb3BpY3MpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFRhcmdldCh0YXJnZXQsIG1hdGNoaW5nVG9waWNzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFVwZGF0ZSB0aGUgdmFyaWFibGVzIHdpdGggbmV3IHZhbHVlcywgYW5kIGFsZXJ0IHN1YnNjcmliZXJzLlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC52YXJpYWJsZXMucHVibGlzaCgnbXlWYXJpYWJsZScsIG5ld1ZhbHVlKTtcbiAgICAgICAgICogICAgICBGbG93LmNoYW5uZWwudmFyaWFibGVzLnB1Ymxpc2goeyBteVZhcjE6IG5ld1ZhbDEsIG15VmFyMjogbmV3VmFsMiB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtICB7U3RyaW5nfE9iamVjdH0gdmFyaWFibGUgU3RyaW5nIHdpdGggbmFtZSBvZiB2YXJpYWJsZS4gQWx0ZXJuYXRpdmVseSwgb2JqZWN0IGluIGZvcm0gYHsgdmFyaWFibGVOYW1lOiB2YWx1ZSB9YC5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfEFycmF5fE9iamVjdH0gdmFsdWUgKE9wdGlvbmFsKSAgVmFsdWUgb2YgdGhlIHZhcmlhYmxlLCBpZiBwcmV2aW91cyBhcmd1bWVudCB3YXMgYSBzdHJpbmcuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIChPcHRpb25hbCkgT3ZlcnJpZGVzIGZvciB0aGUgZGVmYXVsdCBjaGFubmVsIG9wdGlvbnMuIFN1cHBvcnRlZCBvcHRpb25zOiBgeyBzaWxlbnQ6IEJvb2xlYW4gfWAgYW5kIGB7IGJhdGNoOiBCb29sZWFuIH1gLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJuIHskcHJvbWlzZX0gUHJvbWlzZSB0byBjb21wbGV0ZSB0aGUgdXBkYXRlLlxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGlzaDogZnVuY3Rpb24gKHZhcmlhYmxlLCB2YWx1ZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3B1Ymxpc2gnLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIGF0dHJzO1xuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdCh2YXJpYWJsZSkpIHtcbiAgICAgICAgICAgICAgICBhdHRycyA9IHZhcmlhYmxlO1xuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgKGF0dHJzID0ge30pW3ZhcmlhYmxlXSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGl0ID0gaW50ZXJwb2xhdGUoXy5rZXlzKGF0dHJzKSwgY3VycmVudERhdGEpO1xuXG4gICAgICAgICAgICB2YXIgdG9TYXZlID0ge307XG4gICAgICAgICAgICBfLmVhY2goYXR0cnMsIGZ1bmN0aW9uICh2YWwsIGF0dHIpIHtcbiAgICAgICAgICAgICAgIHZhciBrZXkgPSAoaXQuaW50ZXJwb2xhdGVkW2F0dHJdKSA/IGl0LmludGVycG9sYXRlZFthdHRyXSA6IGF0dHI7XG4gICAgICAgICAgICAgICB0b1NhdmVba2V5XSA9IHZhbDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIHJldHVybiB2cy5zYXZlLmNhbGwodnMsIHRvU2F2ZSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghb3B0aW9ucyB8fCAhb3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lLnJlZnJlc2guY2FsbChtZSwgYXR0cnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN1YnNjcmliZSB0byBjaGFuZ2VzIG9uIGEgY2hhbm5lbDogQXNrIGZvciBub3RpZmljYXRpb24gd2hlbiB2YXJpYWJsZXMgYXJlIHVwZGF0ZWQuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLnZhcmlhYmxlcy5zdWJzY3JpYmUoJ215VmFyaWFibGUnLFxuICAgICAgICAgKiAgICAgICAgICBmdW5jdGlvbigpIHsgY29uc29sZS5sb2coJ2NhbGxlZCEnKTsgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLnZhcmlhYmxlcy5zdWJzY3JpYmUoWydwcmljZScsICdjb3N0J10sXG4gICAgICAgICAqICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgKiAgICAgICAgICAgICAgLy8gdGhpcyBmdW5jdGlvbiBjYWxsZWQgb25seSBvbmNlLCB3aXRoIHsgcHJpY2U6IFgsIGNvc3Q6IFkgfVxuICAgICAgICAgKiAgICAgICAgICB9LFxuICAgICAgICAgKiAgICAgICAgICB7IGJhdGNoOiB0cnVlIH0pO1xuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC52YXJpYWJsZXMuc3Vic2NyaWJlKFsncHJpY2UnLCAnY29zdCddLFxuICAgICAgICAgKiAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICogICAgICAgICAgICAgIC8vIHRoaXMgZnVuY3Rpb24gY2FsbGVkIHR3aWNlLCBvbmNlIHdpdGggeyBwcmljZTogWCB9XG4gICAgICAgICAqICAgICAgICAgICAgICAvLyBhbmQgYWdhaW4gd2l0aCB7IGNvc3Q6IFkgfVxuICAgICAgICAgKiAgICAgICAgICB9LFxuICAgICAgICAgKiAgICAgICAgICB7IGJhdGNoOiBmYWxzZSB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IHRvcGljcyBUaGUgbmFtZXMgb2YgdGhlIHZhcmlhYmxlcy5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R8RnVuY3Rpb259IHN1YnNjcmliZXIgVGhlIG9iamVjdCBvciBmdW5jdGlvbiBiZWluZyBub3RpZmllZC4gT2Z0ZW4gdGhpcyBpcyBhIGNhbGxiYWNrIGZ1bmN0aW9uLiBJZiB0aGlzIGlzIG5vdCBhIGZ1bmN0aW9uLCBhIGB0cmlnZ2VyYCBtZXRob2QgaXMgY2FsbGVkIGlmIGF2YWlsYWJsZTsgaWYgbm90LCBldmVudCBpcyB0cmlnZ2VyZWQgb24gJChvYmplY3QpLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAoT3B0aW9uYWwpIE92ZXJyaWRlcyBmb3IgdGhlIGRlZmF1bHQgY2hhbm5lbCBvcHRpb25zLlxuICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuc2lsZW50IERldGVybWluZSB3aGVuIHRvIHVwZGF0ZSBzdGF0ZS5cbiAgICAgICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLmJhdGNoIElmIHlvdSBhcmUgc3Vic2NyaWJpbmcgdG8gbXVsdGlwbGUgdmFyaWFibGVzLCBieSBkZWZhdWx0IHRoZSBjYWxsYmFjayBmdW5jdGlvbiBpcyBjYWxsZWQgb25jZSBmb3IgZWFjaCBpdGVtIHRvIHdoaWNoIHlvdSBzdWJzY3JpYmU6IGBiYXRjaDogZmFsc2VgLiBXaGVuIGBiYXRjaGAgaXMgc2V0IHRvIGB0cnVlYCwgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGlzIG9ubHkgY2FsbGVkIG9uY2UsIG5vIG1hdHRlciBob3cgbWFueSBpdGVtcyB5b3UgYXJlIHN1YnNjcmliaW5nIHRvLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IEFuIGlkZW50aWZ5aW5nIHRva2VuIGZvciB0aGlzIHN1YnNjcmlwdGlvbi4gUmVxdWlyZWQgYXMgYSBwYXJhbWV0ZXIgd2hlbiB1bnN1YnNjcmliaW5nLlxuICAgICAgICAqL1xuICAgICAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uICh0b3BpY3MsIHN1YnNjcmliZXIsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdzdWJzY3JpYmluZycsIHRvcGljcywgc3Vic2NyaWJlcik7XG4gICAgICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICAgICAgYmF0Y2g6IGZhbHNlXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0b3BpY3MgPSBbXS5jb25jYXQodG9waWNzKTtcbiAgICAgICAgICAgIC8vdXNlIGpxdWVyeSB0byBtYWtlIGV2ZW50IHNpbmtcbiAgICAgICAgICAgIGlmICghc3Vic2NyaWJlci5vbiAmJiAhXy5pc0Z1bmN0aW9uKHN1YnNjcmliZXIpKSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlciA9ICQoc3Vic2NyaWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpZCAgPSBfLnVuaXF1ZUlkKCdlcGljaGFubmVsLnZhcmlhYmxlJyk7XG4gICAgICAgICAgICB2YXIgZGF0YSA9ICQuZXh0ZW5kKHtcbiAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgdG9waWNzOiB0b3BpY3MsXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBzdWJzY3JpYmVyXG4gICAgICAgICAgICB9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKGRhdGEpO1xuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUFuZENoZWNrRm9yUmVmcmVzaCh0b3BpY3MpO1xuICAgICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdG9wIHJlY2VpdmluZyBub3RpZmljYXRpb25zIGZvciBhbGwgc3Vic2NyaXB0aW9ucyByZWZlcmVuY2VkIGJ5IHRoaXMgdG9rZW4uXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSB0b2tlbiBUaGUgaWRlbnRpZnlpbmcgdG9rZW4gZm9yIHRoaXMgc3Vic2NyaXB0aW9uLiAoQ3JlYXRlZCBhbmQgcmV0dXJuZWQgYnkgdGhlIGBzdWJzY3JpYmUoKWAgY2FsbC4pXG4gICAgICAgICovXG4gICAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbiAodG9rZW4pIHtcbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucyA9IF8ucmVqZWN0KHRoaXMuc3Vic2NyaXB0aW9ucywgZnVuY3Rpb24gKHN1YnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3Vicy5pZCA9PT0gdG9rZW47XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3RvcCByZWNlaXZpbmcgbm90aWZpY2F0aW9ucyBmb3IgYWxsIHN1YnNjcmlwdGlvbnMuIE5vIHBhcmFtZXRlcnMuXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm4ge05vbmV9XG4gICAgICAgICovXG4gICAgICAgIHVuc3Vic2NyaWJlQWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnN1YnNjcmlwdGlvbnMgPSBbXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkLmV4dGVuZCh0aGlzLCBwdWJsaWNBUEkpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHByZWZpeDogJ2YnLFxuICAgIGRlZmF1bHRBdHRyOiAnYmluZCcsXG5cbiAgICBiaW5kZXJBdHRyOiAnZi1iaW5kJyxcblxuICAgIGV2ZW50czoge1xuICAgICAgICB0cmlnZ2VyOiAndXBkYXRlLmYudWknLFxuICAgICAgICByZWFjdDogJ3VwZGF0ZS5mLm1vZGVsJ1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIEFycmF5IENvbnZlcnRlcnNcbiAqXG4gKiBDb252ZXJ0ZXJzIGFsbG93IHlvdSB0byBjb252ZXJ0IGRhdGEgLS0gaW4gcGFydGljdWxhciwgbW9kZWwgdmFyaWFibGVzIHRoYXQgeW91IGRpc3BsYXkgaW4geW91ciBwcm9qZWN0J3MgdXNlciBpbnRlcmZhY2UgLS0gZnJvbSBvbmUgZm9ybSB0byBhbm90aGVyLlxuICpcbiAqIFRoZXJlIGFyZSB0d28gd2F5cyB0byBzcGVjaWZ5IGNvbnZlcnNpb24gb3IgZm9ybWF0dGluZyBmb3IgdGhlIGRpc3BsYXkgb3V0cHV0IG9mIGEgcGFydGljdWxhciBtb2RlbCB2YXJpYWJsZTpcbiAqXG4gKiAqIEFkZCB0aGUgYXR0cmlidXRlIGBkYXRhLWYtY29udmVydGAgdG8gYW55IGVsZW1lbnQgdGhhdCBhbHNvIGhhcyB0aGUgYGRhdGEtZi1iaW5kYCBvciBgZGF0YS1mLWZvcmVhY2hgLlxuICogKiBVc2UgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyIHdpdGhpbiB0aGUgdmFsdWUgb2YgYW55IGBkYXRhLWYtYCBhdHRyaWJ1dGUgKG5vdCBqdXN0IGBkYXRhLWYtYmluZGAgb3IgYGRhdGEtZi1mb3JlYWNoYCkuXG4gKlxuICogSW4gZ2VuZXJhbCwgaWYgdGhlIG1vZGVsIHZhcmlhYmxlIGlzIGFuIGFycmF5LCB0aGUgY29udmVydGVyIGlzIGFwcGxpZWQgdG8gZWFjaCBlbGVtZW50IG9mIHRoZSBhcnJheS4gVGhlcmUgYXJlIGEgZmV3IGJ1aWx0IGluIGFycmF5IGNvbnZlcnRlcnMgd2hpY2gsIHJhdGhlciB0aGFuIGNvbnZlcnRpbmcgYWxsIGVsZW1lbnRzIG9mIGFuIGFycmF5LCBzZWxlY3QgcGFydGljdWxhciBlbGVtZW50cyBmcm9tIHdpdGhpbiB0aGUgYXJyYXkgb3Igb3RoZXJ3aXNlIHRyZWF0IGFycmF5IHZhcmlhYmxlcyBzcGVjaWFsbHkuXG4gKlxuICovXG5cblxuJ3VzZSBzdHJpY3QnO1xudmFyIGxpc3QgPSBbXG4gICAge1xuICAgICAgICAvKipcbiAgICAgICAgICogQ29udmVydCB0aGUgaW5wdXQgaW50byBhbiBhcnJheS4gQ29uY2F0ZW5hdGVzIGFsbCBlbGVtZW50cyBvZiB0aGUgaW5wdXQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgYXJyYXkgbW9kZWwgdmFyaWFibGUuXG4gICAgICAgICAqL1xuICAgICAgICBhbGlhczogJ2xpc3QnLFxuICAgICAgICBhY2NlcHRMaXN0OiB0cnVlLFxuICAgICAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICByZXR1cm4gW10uY29uY2F0KHZhbCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNlbGVjdCBvbmx5IHRoZSBsYXN0IGVsZW1lbnQgb2YgdGhlIGFycmF5LlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIDxkaXY+XG4gICAgICAgICAqICAgICAgICAgIEluIHRoZSBjdXJyZW50IHllYXIsIHdlIGhhdmUgPHNwYW4gZGF0YS1mLWJpbmQ9XCJTYWxlcyB8IGxhc3RcIj48L3NwYW4+IGluIHNhbGVzLlxuICAgICAgICAgKiAgICAgIDwvZGl2PlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWwgVGhlIGFycmF5IG1vZGVsIHZhcmlhYmxlLlxuICAgICAgICAgKi9cbiAgICAgICAgYWxpYXM6ICdsYXN0JyxcbiAgICAgICAgYWNjZXB0TGlzdDogdHJ1ZSxcbiAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgdmFsID0gW10uY29uY2F0KHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gdmFsW3ZhbC5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXZlcnNlIHRoZSBhcnJheS5cbiAgICAgICAgICpcbiAgICAgICAgICogKipFeGFtcGxlKipcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICA8cD5TaG93IHRoZSBoaXN0b3J5IG9mIG91ciBzYWxlcywgc3RhcnRpbmcgd2l0aCB0aGUgbGFzdCAobW9zdCByZWNlbnQpOjwvcD5cbiAgICAgICAgICogICAgICA8dWwgZGF0YS1mLWZvcmVhY2g9XCJTYWxlcyB8IHJldmVyc2VcIj5cbiAgICAgICAgICogICAgICAgICAgPGxpPjwvbGk+XG4gICAgICAgICAqICAgICAgPC91bD5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtBcnJheX0gdmFsIFRoZSBhcnJheSBtb2RlbCB2YXJpYWJsZS5cbiAgICAgICAgICovXG4gICAge1xuICAgICAgICBhbGlhczogJ3JldmVyc2UnLFxuICAgICAgICBhY2NlcHRMaXN0OiB0cnVlLFxuICAgICAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICB2YWwgPSBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgICAgIHJldHVybiB2YWwucmV2ZXJzZSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZWxlY3Qgb25seSB0aGUgZmlyc3QgZWxlbWVudCBvZiB0aGUgYXJyYXkuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgPGRpdj5cbiAgICAgICAgICogICAgICAgICAgT3VyIGluaXRpYWwgaW52ZXN0bWVudCB3YXMgPHNwYW4gZGF0YS1mLWJpbmQ9XCJDYXBpdGFsIHwgZmlyc3RcIj48L3NwYW4+LlxuICAgICAgICAgKiAgICAgIDwvZGl2PlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWwgVGhlIGFycmF5IG1vZGVsIHZhcmlhYmxlLlxuICAgICAgICAgKi9cbiAgICAgICAgYWxpYXM6ICdmaXJzdCcsXG4gICAgICAgIGFjY2VwdExpc3Q6IHRydWUsXG4gICAgICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHZhbCA9IFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbFswXTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICAvKipcbiAgICAgICAgICogU2VsZWN0IG9ubHkgdGhlIHByZXZpb3VzIChzZWNvbmQgdG8gbGFzdCkgZWxlbWVudCBvZiB0aGUgYXJyYXkuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgPGRpdj5cbiAgICAgICAgICogICAgICAgICAgTGFzdCB5ZWFyIHdlIGhhZCA8c3BhbiBkYXRhLWYtYmluZD1cIlNhbGVzIHwgcHJldmlvdXNcIj48L3NwYW4+IGluIHNhbGVzLlxuICAgICAgICAgKiAgICAgIDwvZGl2PlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWwgVGhlIGFycmF5IG1vZGVsIHZhcmlhYmxlLlxuICAgICAgICAgKi9cbiAgICAgICAgYWxpYXM6ICdwcmV2aW91cycsXG4gICAgICAgIGFjY2VwdExpc3Q6IHRydWUsXG4gICAgICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHZhbCA9IFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICAgICAgcmV0dXJuICh2YWwubGVuZ3RoIDw9IDEpID8gdmFsWzBdIDogdmFsW3ZhbC5sZW5ndGggLSAyXTtcbiAgICAgICAgfVxuICAgIH1cbl07XG5cbl8uZWFjaChsaXN0LCBmdW5jdGlvbiAoaXRlbSkge1xuICAgdmFyIG9sZGZuID0gaXRlbS5jb252ZXJ0O1xuICAgdmFyIG5ld2ZuID0gZnVuY3Rpb24gKHZhbCkge1xuICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QodmFsKSkge1xuICAgICAgICAgICAgcmV0dXJuIF8ubWFwVmFsdWVzKHZhbCwgb2xkZm4pO1xuICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gb2xkZm4odmFsKTtcbiAgICAgICB9XG4gICB9O1xuICAgaXRlbS5jb252ZXJ0ID0gbmV3Zm47XG59KTtcbm1vZHVsZS5leHBvcnRzID0gbGlzdDtcbiIsIi8qKlxuICogIyMgQ29udmVydGVyIE1hbmFnZXI6IE1ha2UgeW91ciBvd24gQ29udmVydGVyc1xuICpcbiAqIENvbnZlcnRlcnMgYWxsb3cgeW91IHRvIGNvbnZlcnQgZGF0YSAtLSBpbiBwYXJ0aWN1bGFyLCBtb2RlbCB2YXJpYWJsZXMgdGhhdCB5b3UgZGlzcGxheSBpbiB5b3VyIHByb2plY3QncyB1c2VyIGludGVyZmFjZSAtLSBmcm9tIG9uZSBmb3JtIHRvIGFub3RoZXIuXG4gKlxuICogQmFzaWMgY29udmVydGluZyBhbmQgZm9ybWF0dGluZyBvcHRpb25zIGFyZSBidWlsdCBpbiB0byBGbG93LmpzLlxuICpcbiAqIFlvdSBjYW4gYWxzbyBjcmVhdGUgeW91ciBvd24gY29udmVydGVycy4gRWFjaCBjb252ZXJ0ZXIgc2hvdWxkIGJlIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBpbiBhIHZhbHVlIG9yIHZhbHVlcyB0byBjb252ZXJ0LiBUbyB1c2UgeW91ciBjb252ZXJ0ZXIsIGByZWdpc3RlcigpYCBpdCBpbiB5b3VyIGluc3RhbmNlIG9mIEZsb3cuanMuXG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLy9UT0RPOiBNYWtlIGFsbCB1bmRlcnNjb3JlIGZpbHRlcnMgYXZhaWxhYmxlXG5cbnZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlciwgYWNjZXB0TGlzdCkge1xuICAgIHZhciByZXQgPSBbXTtcbiAgICAvL25vbWFsaXplKCdmbGlwJywgZm4pXG4gICAgaWYgKF8uaXNGdW5jdGlvbihjb252ZXJ0ZXIpKSB7XG4gICAgICAgIHJldC5wdXNoKHtcbiAgICAgICAgICAgIGFsaWFzOiBhbGlhcyxcbiAgICAgICAgICAgIGNvbnZlcnQ6IGNvbnZlcnRlcixcbiAgICAgICAgICAgIGFjY2VwdExpc3Q6IGFjY2VwdExpc3RcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICgkLmlzUGxhaW5PYmplY3QoY29udmVydGVyKSAmJiBjb252ZXJ0ZXIuY29udmVydCkge1xuICAgICAgICBjb252ZXJ0ZXIuYWxpYXMgPSBhbGlhcztcbiAgICAgICAgY29udmVydGVyLmFjY2VwdExpc3QgPSBhY2NlcHRMaXN0O1xuICAgICAgICByZXQucHVzaChjb252ZXJ0ZXIpO1xuICAgIH0gZWxzZSBpZiAoJC5pc1BsYWluT2JqZWN0KGFsaWFzKSkge1xuICAgICAgICAvL25vcm1hbGl6ZSh7YWxpYXM6ICdmbGlwJywgY29udmVydDogZnVuY3Rpb259KVxuICAgICAgICBpZiAoYWxpYXMuY29udmVydCkge1xuICAgICAgICAgICAgcmV0LnB1c2goYWxpYXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gbm9ybWFsaXplKHtmbGlwOiBmdW59KVxuICAgICAgICAgICAgJC5lYWNoKGFsaWFzLCBmdW5jdGlvbiAoa2V5LCB2YWwpIHtcbiAgICAgICAgICAgICAgICByZXQucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIGFsaWFzOiBrZXksXG4gICAgICAgICAgICAgICAgICAgIGNvbnZlcnQ6IHZhbCxcbiAgICAgICAgICAgICAgICAgICAgYWNjZXB0TGlzdDogYWNjZXB0TGlzdFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbnZhciBtYXRjaENvbnZlcnRlciA9IGZ1bmN0aW9uIChhbGlhcywgY29udmVydGVyKSB7XG4gICAgaWYgKF8uaXNTdHJpbmcoY29udmVydGVyLmFsaWFzKSkge1xuICAgICAgICByZXR1cm4gYWxpYXMgPT09IGNvbnZlcnRlci5hbGlhcztcbiAgICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbihjb252ZXJ0ZXIuYWxpYXMpKSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0ZXIuYWxpYXMoYWxpYXMpO1xuICAgIH0gZWxzZSBpZiAoXy5pc1JlZ2V4KGNvbnZlcnRlci5hbGlhcykpIHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRlci5hbGlhcy5tYXRjaChhbGlhcyk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBjb252ZXJ0ZXJNYW5hZ2VyID0ge1xuICAgIHByaXZhdGU6IHtcbiAgICAgICAgbWF0Y2hDb252ZXJ0ZXI6IG1hdGNoQ29udmVydGVyXG4gICAgfSxcblxuICAgIGxpc3Q6IFtdLFxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBhdHRyaWJ1dGUgY29udmVydGVyIHRvIHRoaXMgaW5zdGFuY2Ugb2YgRmxvdy5qcy5cbiAgICAgKlxuICAgICAqICoqRXhhbXBsZSoqXG4gICAgICpcbiAgICAgKiAgICAgIEZsb3cuZG9tLmNvbnZlcnRlcnMucmVnaXN0ZXIoJ21heCcsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAqICAgICAgICAgIHJldHVybiBfLm1heCh2YWx1ZSk7XG4gICAgICogICAgICB9LCB0cnVlKTtcbiAgICAgKlxuICAgICAqICAgICAgRmxvdy5kb20uY29udmVydGVycy5yZWdpc3Rlcih7XG4gICAgICogICAgICAgICAgYWxpYXM6ICdzaWcnLFxuICAgICAqICAgICAgICAgIHBhcnNlOiAkLm5vb3AsXG4gICAgICogICAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICogICAgICAgICAgICAgIHJldHVybiB2YWx1ZS5maXJzdE5hbWUgKyAnICcgKyB2YWx1ZS5sYXN0TmFtZSArICcsICcgKyB2YWx1ZS5qb2JUaXRsZTtcbiAgICAgKiAgICAgIH0sIGZhbHNlKTtcbiAgICAgKlxuICAgICAqICAgICAgPGRpdj5cbiAgICAgKiAgICAgICAgICBUaGUgbGFyZ2VzdCBzYWxlcyB5b3UgaGFkIHdhcyA8c3BhbiBkYXRhLWYtYmluZD1cInNhbGVzQnlZZWFyIHwgbWF4IHwgJCMsIyMjXCI+PC9zcGFuPi5cbiAgICAgKiAgICAgICAgICBUaGUgY3VycmVudCBzYWxlcyBtYW5hZ2VyIGlzIDxzcGFuIGRhdGEtZi1iaW5kPVwic2FsZXNNZ3IgfCBzaWdcIj48L3NwYW4+LlxuICAgICAqICAgICAgPC9kaXY+XG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd8RnVuY3Rpb258UmVnZXh9IGFsaWFzIEZvcm1hdHRlciBuYW1lLlxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufE9iamVjdH0gY29udmVydGVyIElmIGEgZnVuY3Rpb24sIGBjb252ZXJ0ZXJgIGlzIGNhbGxlZCB3aXRoIHRoZSB2YWx1ZS4gSWYgYW4gb2JqZWN0LCBzaG91bGQgaW5jbHVkZSBmaWVsZHMgZm9yIGBhbGlhc2AgKG5hbWUpLCBgcGFyc2VgIChmdW5jdGlvbiksIGFuZCBgY29udmVydGAgKGZ1bmN0aW9uKS5cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGFjY2VwdExpc3QgRGV0ZXJtaW5lcyBpZiB0aGUgY29udmVydGVyIGlzIGEgJ2xpc3QnIGNvbnZlcnRlciBvciBub3QuIExpc3QgY29udmVydGVycyB0YWtlIGluIGFycmF5cyBhcyBpbnB1dHMsIG90aGVycyBleHBlY3Qgc2luZ2xlIHZhbHVlcy5cbiAgICAgKi9cbiAgICByZWdpc3RlcjogZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIsIGFjY2VwdExpc3QpIHtcbiAgICAgICAgdmFyIG5vcm1hbGl6ZWQgPSBub3JtYWxpemUoYWxpYXMsIGNvbnZlcnRlciwgYWNjZXB0TGlzdCk7XG4gICAgICAgIHRoaXMubGlzdCA9IG5vcm1hbGl6ZWQuY29uY2F0KHRoaXMubGlzdCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlcGxhY2UgYW4gYWxyZWFkeSByZWdpc3RlcmVkIGNvbnZlcnRlciB3aXRoIGEgbmV3IG9uZSBvZiB0aGUgc2FtZSBuYW1lLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGFsaWFzIEZvcm1hdHRlciBuYW1lLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fSBjb252ZXJ0ZXIgSWYgYSBmdW5jdGlvbiwgYGNvbnZlcnRlcmAgaXMgY2FsbGVkIHdpdGggdGhlIHZhbHVlLiBJZiBhbiBvYmplY3QsIHNob3VsZCBpbmNsdWRlIGZpZWxkcyBmb3IgYGFsaWFzYCAobmFtZSksIGBwYXJzZWAgKGZ1bmN0aW9uKSwgYW5kIGBjb252ZXJ0YCAoZnVuY3Rpb24pLlxuICAgICAqL1xuICAgIHJlcGxhY2U6IGZ1bmN0aW9uIChhbGlhcywgY29udmVydGVyKSB7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgXy5lYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24gKGN1cnJlbnRDb252ZXJ0ZXIsIGkpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaENvbnZlcnRlcihhbGlhcywgY3VycmVudENvbnZlcnRlcikpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5saXN0LnNwbGljZShpbmRleCwgMSwgbm9ybWFsaXplKGFsaWFzLCBjb252ZXJ0ZXIpWzBdKTtcbiAgICB9LFxuXG4gICAgZ2V0Q29udmVydGVyOiBmdW5jdGlvbiAoYWxpYXMpIHtcbiAgICAgICAgcmV0dXJuIF8uZmluZCh0aGlzLmxpc3QsIGZ1bmN0aW9uIChjb252ZXJ0ZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaENvbnZlcnRlcihhbGlhcywgY29udmVydGVyKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBpcGVzIHRoZSB2YWx1ZSBzZXF1ZW50aWFsbHkgdGhyb3VnaCBhIGxpc3Qgb2YgcHJvdmlkZWQgY29udmVydGVycy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge0FueX0gdmFsdWUgSW5wdXQgZm9yIHRoZSBjb252ZXJ0ZXIgdG8gdGFnLlxuICAgICAqIEBwYXJhbSAge0FycmF5fE9iamVjdH0gbGlzdCBMaXN0IG9mIGNvbnZlcnRlcnMgKG1hcHMgdG8gY29udmVydGVyIGFsaWFzKS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge0FueX0gQ29udmVydGVkIHZhbHVlLlxuICAgICAqL1xuICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWx1ZSwgbGlzdCkge1xuICAgICAgICBpZiAoIWxpc3QgfHwgIWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgbGlzdCA9IFtdLmNvbmNhdChsaXN0KTtcbiAgICAgICAgbGlzdCA9IF8uaW52b2tlKGxpc3QsICd0cmltJyk7XG5cbiAgICAgICAgdmFyIGN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuXG4gICAgICAgIHZhciBjb252ZXJ0QXJyYXkgPSBmdW5jdGlvbiAoY29udmVydGVyLCB2YWwsIGNvbnZlcnRlck5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBfLm1hcCh2YWwsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnZlcnRlci5jb252ZXJ0KHYsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBjb252ZXJ0T2JqZWN0ID0gZnVuY3Rpb24gKGNvbnZlcnRlciwgdmFsdWUsIGNvbnZlcnRlck5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBfLm1hcFZhbHVlcyh2YWx1ZSwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgICAgICAgICAgICByZXR1cm4gY29udmVydChjb252ZXJ0ZXIsIHZhbCwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgY29udmVydCA9IGZ1bmN0aW9uIChjb252ZXJ0ZXIsIHZhbHVlLCBjb252ZXJ0ZXJOYW1lKSB7XG4gICAgICAgICAgICB2YXIgY29udmVydGVkO1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkgJiYgY29udmVydGVyLmFjY2VwdExpc3QgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0QXJyYXkoY29udmVydGVyLCB2YWx1ZSwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRlci5jb252ZXJ0KHZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjb252ZXJ0ZWQ7XG4gICAgICAgIH07XG4gICAgICAgIF8uZWFjaChsaXN0LCBmdW5jdGlvbiAoY29udmVydGVyTmFtZSkge1xuICAgICAgICAgICAgdmFyIGNvbnZlcnRlciA9IG1lLmdldENvbnZlcnRlcihjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIGlmICghY29udmVydGVyKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCBjb252ZXJ0ZXIgZm9yICcgKyBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QoY3VycmVudFZhbHVlKSAmJiBjb252ZXJ0ZXIuYWNjZXB0TGlzdCAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9IGNvbnZlcnRPYmplY3QoY29udmVydGVyLCBjdXJyZW50VmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUgPSBjb252ZXJ0KGNvbnZlcnRlciwgY3VycmVudFZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvdW50ZXItcGFydCB0byBgY29udmVydCgpYC4gVHJhbnNsYXRlcyBjb252ZXJ0ZWQgdmFsdWVzIGJhY2sgdG8gdGhlaXIgb3JpZ2luYWwgZm9ybS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gdmFsdWUgVmFsdWUgdG8gcGFyc2UuXG4gICAgICogQHBhcmFtICB7U3RyaW5nfEFycmF5fSBsaXN0ICBMaXN0IG9mIHBhcnNlcnMgdG8gcnVuIHRoZSB2YWx1ZSB0aHJvdWdoLiBPdXRlcm1vc3QgaXMgaW52b2tlZCBmaXJzdC5cbiAgICAgKiBAcmV0dXJuIHtBbnl9IE9yaWdpbmFsIHZhbHVlLlxuICAgICAqL1xuICAgIHBhcnNlOiBmdW5jdGlvbiAodmFsdWUsIGxpc3QpIHtcbiAgICAgICAgaWYgKCFsaXN0IHx8ICFsaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGxpc3QgPSBbXS5jb25jYXQobGlzdCkucmV2ZXJzZSgpO1xuICAgICAgICBsaXN0ID0gXy5pbnZva2UobGlzdCwgJ3RyaW0nKTtcblxuICAgICAgICB2YXIgY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIF8uZWFjaChsaXN0LCBmdW5jdGlvbiAoY29udmVydGVyTmFtZSkge1xuICAgICAgICAgICAgdmFyIGNvbnZlcnRlciA9IG1lLmdldENvbnZlcnRlcihjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIGlmIChjb252ZXJ0ZXIucGFyc2UpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUgPSBjb252ZXJ0ZXIucGFyc2UoY3VycmVudFZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgfVxufTtcblxuXG4vL0Jvb3RzdHJhcFxudmFyIGRlZmF1bHRjb252ZXJ0ZXJzID0gW1xuICAgIHJlcXVpcmUoJy4vbnVtYmVyLWNvbnZlcnRlcicpLFxuICAgIHJlcXVpcmUoJy4vc3RyaW5nLWNvbnZlcnRlcicpLFxuICAgIHJlcXVpcmUoJy4vYXJyYXktY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi91bmRlcnNjb3JlLXV0aWxzLWNvbnZlcnRlcicpLFxuICAgIHJlcXVpcmUoJy4vbnVtYmVyZm9ybWF0LWNvbnZlcnRlcicpLFxuXTtcblxuJC5lYWNoKGRlZmF1bHRjb252ZXJ0ZXJzLnJldmVyc2UoKSwgZnVuY3Rpb24gKGluZGV4LCBjb252ZXJ0ZXIpIHtcbiAgICBpZiAoXy5pc0FycmF5KGNvbnZlcnRlcikpIHtcbiAgICAgICAgXy5lYWNoKGNvbnZlcnRlciwgZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgICAgY29udmVydGVyTWFuYWdlci5yZWdpc3RlcihjKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29udmVydGVyTWFuYWdlci5yZWdpc3Rlcihjb252ZXJ0ZXIpO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbnZlcnRlck1hbmFnZXI7XG4iLCIvKipcbiAqICMjIE51bWJlciBDb252ZXJ0ZXJzXG4gKlxuICogQ29udmVydGVycyBhbGxvdyB5b3UgdG8gY29udmVydCBkYXRhIC0tIGluIHBhcnRpY3VsYXIsIG1vZGVsIHZhcmlhYmxlcyB0aGF0IHlvdSBkaXNwbGF5IGluIHlvdXIgcHJvamVjdCdzIHVzZXIgaW50ZXJmYWNlIC0tIGZyb20gb25lIGZvcm0gdG8gYW5vdGhlci5cbiAqXG4gKiBUaGVyZSBhcmUgdHdvIHdheXMgdG8gc3BlY2lmeSBjb252ZXJzaW9uIG9yIGZvcm1hdHRpbmcgZm9yIHRoZSBkaXNwbGF5IG91dHB1dCBvZiBhIHBhcnRpY3VsYXIgbW9kZWwgdmFyaWFibGU6XG4gKlxuICogKiBBZGQgdGhlIGF0dHJpYnV0ZSBgZGF0YS1mLWNvbnZlcnRgIHRvIGFueSBlbGVtZW50IHRoYXQgYWxzbyBoYXMgdGhlIGBkYXRhLWYtYmluZGAgb3IgYGRhdGEtZi1mb3JlYWNoYC5cbiAqICogVXNlIHRoZSBgfGAgKHBpcGUpIGNoYXJhY3RlciB3aXRoaW4gdGhlIHZhbHVlIG9mIGFueSBgZGF0YS1mLWAgYXR0cmlidXRlIChub3QganVzdCBgZGF0YS1mLWJpbmRgIG9yIGBkYXRhLWYtZm9yZWFjaGApLlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHRoZSBtb2RlbCB2YXJpYWJsZSB0byBhbiBpbnRlZ2VyLiBPZnRlbiB1c2VkIGZvciBjaGFpbmluZyB0byBhbm90aGVyIGNvbnZlcnRlci5cbiAgICAgKlxuICAgICAqICoqRXhhbXBsZSoqXG4gICAgICpcbiAgICAgKiAgICAgIDxkaXY+XG4gICAgICogICAgICAgICAgWW91ciBjYXIgaGFzIGRyaXZlblxuICAgICAqICAgICAgICAgIDxzcGFuIGRhdGEtZi1iaW5kPVwiT2RvbWV0ZXIgfCBpIHwgczAuMFwiPjwvc3Bhbj4gbWlsZXMuXG4gICAgICogICAgICA8L2Rpdj5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlIFRoZSBtb2RlbCB2YXJpYWJsZS5cbiAgICAgKi9cbiAgICBhbGlhczogJ2knLFxuICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCh2YWx1ZSwgMTApO1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIE51bWJlciBGb3JtYXQgQ29udmVydGVyc1xuICpcbiAqIENvbnZlcnRlcnMgYWxsb3cgeW91IHRvIGNvbnZlcnQgZGF0YSAtLSBpbiBwYXJ0aWN1bGFyLCBtb2RlbCB2YXJpYWJsZXMgdGhhdCB5b3UgZGlzcGxheSBpbiB5b3VyIHByb2plY3QncyB1c2VyIGludGVyZmFjZSAtLSBmcm9tIG9uZSBmb3JtIHRvIGFub3RoZXIuXG4gKlxuICogVGhlcmUgYXJlIHR3byB3YXlzIHRvIHNwZWNpZnkgY29udmVyc2lvbiBvciBmb3JtYXR0aW5nIGZvciB0aGUgZGlzcGxheSBvdXRwdXQgb2YgYSBwYXJ0aWN1bGFyIG1vZGVsIHZhcmlhYmxlOlxuICpcbiAqICogQWRkIHRoZSBhdHRyaWJ1dGUgYGRhdGEtZi1jb252ZXJ0YCB0byBhbnkgZWxlbWVudCB0aGF0IGFsc28gaGFzIHRoZSBgZGF0YS1mLWJpbmRgIG9yIGBkYXRhLWYtZm9yZWFjaGAuXG4gKiAqIFVzZSB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIgd2l0aGluIHRoZSB2YWx1ZSBvZiBhbnkgYGRhdGEtZi1gIGF0dHJpYnV0ZSAobm90IGp1c3QgYGRhdGEtZi1iaW5kYCBvciBgZGF0YS1mLWZvcmVhY2hgKS5cbiAqXG4gKiBGb3IgbW9kZWwgdmFyaWFibGVzIHRoYXQgYXJlIG51bWJlcnMgKG9yIHRoYXQgaGF2ZSBiZWVuIFtjb252ZXJ0ZWQgdG8gbnVtYmVyc10oLi4vbnVtYmVyLWNvbnZlcnRlci8pKSwgdGhlcmUgYXJlIHNldmVyYWwgc3BlY2lhbCBudW1iZXIgZm9ybWF0cyB5b3UgY2FuIGFwcGx5LlxuICpcbiAqICMjIyNDdXJyZW5jeSBOdW1iZXIgRm9ybWF0XG4gKlxuICogQWZ0ZXIgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyLCB1c2UgYCRgIChkb2xsYXIgc2lnbiksIGAwYCwgYW5kIGAuYCAoZGVjaW1hbCBwb2ludCkgaW4geW91ciBjb252ZXJ0ZXIgdG8gZGVzY3JpYmUgaG93IGN1cnJlbmN5IHNob3VsZCBhcHBlYXIuIFRoZSBzcGVjaWZpY2F0aW9ucyBmb2xsb3cgdGhlIEV4Y2VsIGN1cnJlbmN5IGZvcm1hdHRpbmcgY29udmVudGlvbnMuXG4gKlxuICogKipFeGFtcGxlKipcbiAqXG4gKiAgICAgIDwhLS0gY29udmVydCB0byBkb2xsYXJzIChpbmNsdWRlIGNlbnRzKSAtLT5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJwcmljZVtjYXJdXCIgZGF0YS1mLWNvbnZlcnQ9XCIkMC4wMFwiIC8+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwicHJpY2VbY2FyXSB8ICQwLjAwXCIgLz5cbiAqXG4gKiAgICAgIDwhLS0gY29udmVydCB0byBkb2xsYXJzICh0cnVuY2F0ZSBjZW50cykgLS0+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwicHJpY2VbY2FyXVwiIGRhdGEtZi1jb252ZXJ0PVwiJDAuXCIgLz5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJwcmljZVtjYXJdIHwgJDAuXCIgLz5cbiAqXG4gKlxuICogIyMjI1NwZWNpZmljIERpZ2l0cyBOdW1iZXIgRm9ybWF0XG4gKlxuICogQWZ0ZXIgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyLCB1c2UgYCNgIChwb3VuZCkgYW5kIGAsYCAoY29tbWEpIGluIHlvdXIgY29udmVydGVyIHRvIGRlc2NyaWJlIGhvdyB0aGUgbnVtYmVyIHNob3VsZCBhcHBlYXIuIFRoZSBzcGVjaWZpY2F0aW9ucyBmb2xsb3cgdGhlIEV4Y2VsIG51bWJlciBmb3JtYXR0aW5nIGNvbnZlbnRpb25zLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8IS0tIGNvbnZlcnQgdG8gdGhvdXNhbmRzIC0tPlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInNhbGVzW2Nhcl1cIiBkYXRhLWYtY29udmVydD1cIiMsIyMjXCIgLz5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJzYWxlc1tjYXJdIHwgIywjIyNcIiAvPlxuICpcbiAqXG4gKiAjIyMjUGVyY2VudGFnZSBOdW1iZXIgRm9ybWF0XG4gKlxuICogQWZ0ZXIgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyLCB1c2UgYCVgIChwZXJjZW50KSBhbmQgYDBgIGluIHlvdXIgY29udmVydGVyIHRvIGRpc3BsYXkgdGhlIG51bWJlciBhcyBhIHBlcmNlbnQuXG4gKlxuICogKipFeGFtcGxlKipcbiAqXG4gKiAgICAgIDwhLS0gY29udmVydCB0byBwZXJjZW50YWdlIC0tPlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInByb2ZpdE1hcmdpbltjYXJdXCIgZGF0YS1mLWNvbnZlcnQ9XCIwJVwiIC8+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwicHJvZml0TWFyZ2luW2Nhcl0gfCAwJVwiIC8+XG4gKlxuICpcbiAqICMjIyNTaG9ydCBOdW1iZXIgRm9ybWF0XG4gKlxuICogQWZ0ZXIgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyLCB1c2UgYHNgIGFuZCBgMGAgaW4geW91ciBjb252ZXJ0ZXIgdG8gZGVzY3JpYmUgaG93IHRoZSBudW1iZXIgc2hvdWxkIGFwcGVhci5cbiAqXG4gKiBUaGUgYDBgcyBkZXNjcmliZSB0aGUgc2lnbmlmaWNhbnQgZGlnaXRzLlxuICpcbiAqIFRoZSBgc2AgZGVzY3JpYmVzIHRoZSBcInNob3J0IGZvcm1hdCxcIiB3aGljaCB1c2VzICdLJyBmb3IgdGhvdXNhbmRzLCAnTScgZm9yIG1pbGxpb25zLCAnQicgZm9yIGJpbGxpb25zLiBGb3IgZXhhbXBsZSwgYDI0NjhgIGNvbnZlcnRlZCB3aXRoIGBzMC4wYCBkaXNwbGF5cyBhcyBgMi41S2AuXG4gKlxuICogKipFeGFtcGxlKipcbiAqXG4gKiAgICAgIDwhLS0gY29udmVydCB0byB0aG91c2FuZHMgKHNob3cgMTIsNDY4IGFzIDEyLjVLKSAtLT5cbiAqICAgICAgPHNwYW4gdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInByaWNlW2Nhcl0gfCBzMC4wXCI+PC9zcGFuPlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBhbGlhczogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgLy9UT0RPOiBGYW5jeSByZWdleCB0byBtYXRjaCBudW1iZXIgZm9ybWF0cyBoZXJlXG4gICAgICAgIHJldHVybiAobmFtZS5pbmRleE9mKCcjJykgIT09IC0xIHx8IG5hbWUuaW5kZXhPZignMCcpICE9PSAtMSk7XG4gICAgfSxcblxuICAgIHBhcnNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhbCs9ICcnO1xuICAgICAgICB2YXIgaXNOZWdhdGl2ZSA9IHZhbC5jaGFyQXQoMCkgPT09ICctJztcblxuICAgICAgICB2YWwgID0gdmFsLnJlcGxhY2UoLywvZywgJycpO1xuICAgICAgICB2YXIgZmxvYXRNYXRjaGVyID0gLyhbLStdP1swLTldKlxcLj9bMC05XSspKEs/TT9CPyU/KS9pO1xuICAgICAgICB2YXIgcmVzdWx0cyA9IGZsb2F0TWF0Y2hlci5leGVjKHZhbCk7XG4gICAgICAgIHZhciBudW1iZXIsIHN1ZmZpeCA9ICcnO1xuICAgICAgICBpZiAocmVzdWx0cyAmJiByZXN1bHRzWzFdKSB7XG4gICAgICAgICAgICBudW1iZXIgPSByZXN1bHRzWzFdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHRzICYmIHJlc3VsdHNbMl0pIHtcbiAgICAgICAgICAgIHN1ZmZpeCA9IHJlc3VsdHNbMl0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAoc3VmZml4KSB7XG4gICAgICAgICAgICBjYXNlICclJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgLyAxMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdrJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAxMDAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbSc6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogMTAwMDAwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2InOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIDEwMDAwMDAwMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbnVtYmVyID0gcGFyc2VGbG9hdChudW1iZXIpO1xuICAgICAgICBpZiAoaXNOZWdhdGl2ZSAmJiBudW1iZXIgPiAwKSB7XG4gICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAtMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVtYmVyO1xuICAgIH0sXG5cbiAgICBjb252ZXJ0OiAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciBzY2FsZXMgPSBbJycsICdLJywgJ00nLCAnQicsICdUJ107XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0RGlnaXRzKHZhbHVlLCBkaWdpdHMpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUgPT09IDAgPyAwIDogcm91bmRUbyh2YWx1ZSwgTWF0aC5tYXgoMCwgZGlnaXRzIC0gTWF0aC5jZWlsKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4xMCkpKTtcblxuICAgICAgICAgICAgdmFyIFRYVCA9ICcnO1xuICAgICAgICAgICAgdmFyIG51bWJlclRYVCA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB2YXIgZGVjaW1hbFNldCA9IGZhbHNlO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpVFhUID0gMDsgaVRYVCA8IG51bWJlclRYVC5sZW5ndGg7IGlUWFQrKykge1xuICAgICAgICAgICAgICAgIFRYVCArPSBudW1iZXJUWFQuY2hhckF0KGlUWFQpO1xuICAgICAgICAgICAgICAgIGlmIChudW1iZXJUWFQuY2hhckF0KGlUWFQpID09PSAnLicpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVjaW1hbFNldCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGlnaXRzLS07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGRpZ2l0cyA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBUWFQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWRlY2ltYWxTZXQpIHtcbiAgICAgICAgICAgICAgICBUWFQgKz0gJy4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUgKGRpZ2l0cyA+IDApIHtcbiAgICAgICAgICAgICAgICBUWFQgKz0gJzAnO1xuICAgICAgICAgICAgICAgIGRpZ2l0cy0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFRYVDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFkZERlY2ltYWxzKHZhbHVlLCBkZWNpbWFscywgbWluRGVjaW1hbHMsIGhhc0NvbW1hcykge1xuICAgICAgICAgICAgaGFzQ29tbWFzID0gKGhhc0NvbW1hcyA9PT0gZmFsc2UpID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICAgICAgdmFyIG51bWJlclRYVCA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB2YXIgaGFzRGVjaW1hbHMgPSAobnVtYmVyVFhULnNwbGl0KCcuJykubGVuZ3RoID4gMSk7XG4gICAgICAgICAgICB2YXIgaURlYyA9IDA7XG5cbiAgICAgICAgICAgIGlmIChoYXNDb21tYXMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpQ2hhciA9IG51bWJlclRYVC5sZW5ndGggLSAxOyBpQ2hhciA+IDA7IGlDaGFyLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc0RlY2ltYWxzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNEZWNpbWFscyA9IChudW1iZXJUWFQuY2hhckF0KGlDaGFyKSAhPT0gJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlEZWMgPSAoaURlYyArIDEpICUgMztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpRGVjID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyVFhUID0gbnVtYmVyVFhULnN1YnN0cigwLCBpQ2hhcikgKyAnLCcgKyBudW1iZXJUWFQuc3Vic3RyKGlDaGFyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRlY2ltYWxzID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciB0b0FERDtcbiAgICAgICAgICAgICAgICBpZiAobnVtYmVyVFhULnNwbGl0KCcuJykubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9BREQgPSBtaW5EZWNpbWFscztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvQUREID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyVFhUICs9ICcuJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRvQUREID0gbWluRGVjaW1hbHMgLSBudW1iZXJUWFQuc3BsaXQoJy4nKVsxXS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgd2hpbGUgKHRvQUREID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBudW1iZXJUWFQgKz0gJzAnO1xuICAgICAgICAgICAgICAgICAgICB0b0FERC0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudW1iZXJUWFQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByb3VuZFRvKHZhbHVlLCBkaWdpdHMpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHZhbHVlICogTWF0aC5wb3coMTAsIGRpZ2l0cykpIC8gTWF0aC5wb3coMTAsIGRpZ2l0cyk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRTdWZmaXgoZm9ybWF0VFhUKSB7XG4gICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQucmVwbGFjZSgnLicsICcnKTtcbiAgICAgICAgICAgIHZhciBmaXhlc1RYVCA9IGZvcm1hdFRYVC5zcGxpdChuZXcgUmVnRXhwKCdbMHwsfCNdKycsICdnJykpO1xuICAgICAgICAgICAgcmV0dXJuIChmaXhlc1RYVC5sZW5ndGggPiAxKSA/IGZpeGVzVFhUWzFdLnRvU3RyaW5nKCkgOiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGlzQ3VycmVuY3koc3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgcyA9ICQudHJpbShzdHJpbmcpO1xuXG4gICAgICAgICAgICBpZiAocyA9PT0gJyQnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqwnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OCwqUnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OCwqMnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqEnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawrEnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ0vDhD8nIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ2tyJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDgsKiJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKqJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDhuKAmScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCqScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCqycpIHtcblxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBmb3JtYXQobnVtYmVyLCBmb3JtYXRUWFQpIHtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkobnVtYmVyKSkge1xuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlcltudW1iZXIubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIV8uaXNTdHJpbmcobnVtYmVyKSAmJiAhXy5pc051bWJlcihudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bWJlcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFmb3JtYXRUWFQgfHwgZm9ybWF0VFhULnRvTG93ZXJDYXNlKCkgPT09ICdkZWZhdWx0Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiBudW1iZXIudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGlzTmFOKG51bWJlcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJz8nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL3ZhciBmb3JtYXRUWFQ7XG4gICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQucmVwbGFjZSgnJmV1cm87JywgJ8Oi4oCawqwnKTtcblxuICAgICAgICAgICAgLy8gRGl2aWRlICsvLSBOdW1iZXIgRm9ybWF0XG4gICAgICAgICAgICB2YXIgZm9ybWF0cyA9IGZvcm1hdFRYVC5zcGxpdCgnOycpO1xuICAgICAgICAgICAgaWYgKGZvcm1hdHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmb3JtYXQoTWF0aC5hYnMobnVtYmVyKSwgZm9ybWF0c1soKG51bWJlciA+PSAwKSA/IDAgOiAxKV0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTYXZlIFNpZ25cbiAgICAgICAgICAgIHZhciBzaWduID0gKG51bWJlciA+PSAwKSA/ICcnIDogJy0nO1xuICAgICAgICAgICAgbnVtYmVyID0gTWF0aC5hYnMobnVtYmVyKTtcblxuXG4gICAgICAgICAgICB2YXIgbGVmdE9mRGVjaW1hbCA9IGZvcm1hdFRYVDtcbiAgICAgICAgICAgIHZhciBkID0gbGVmdE9mRGVjaW1hbC5pbmRleE9mKCcuJyk7XG4gICAgICAgICAgICBpZiAoZCA+IC0xKSB7XG4gICAgICAgICAgICAgICAgbGVmdE9mRGVjaW1hbCA9IGxlZnRPZkRlY2ltYWwuc3Vic3RyaW5nKDAsIGQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbm9ybWFsaXplZCA9IGxlZnRPZkRlY2ltYWwudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IG5vcm1hbGl6ZWQubGFzdEluZGV4T2YoJ3MnKTtcbiAgICAgICAgICAgIHZhciBpc1Nob3J0Rm9ybWF0ID0gaW5kZXggPiAtMTtcblxuICAgICAgICAgICAgaWYgKGlzU2hvcnRGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dENoYXIgPSBsZWZ0T2ZEZWNpbWFsLmNoYXJBdChpbmRleCArIDEpO1xuICAgICAgICAgICAgICAgIGlmIChuZXh0Q2hhciA9PT0gJyAnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzU2hvcnRGb3JtYXQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBsZWFkaW5nVGV4dCA9IGlzU2hvcnRGb3JtYXQgPyBmb3JtYXRUWFQuc3Vic3RyaW5nKDAsIGluZGV4KSA6ICcnO1xuICAgICAgICAgICAgdmFyIHJpZ2h0T2ZQcmVmaXggPSBpc1Nob3J0Rm9ybWF0ID8gZm9ybWF0VFhULnN1YnN0cihpbmRleCArIDEpIDogZm9ybWF0VFhULnN1YnN0cihpbmRleCk7XG5cbiAgICAgICAgICAgIC8vZmlyc3QgY2hlY2sgdG8gbWFrZSBzdXJlICdzJyBpcyBhY3R1YWxseSBzaG9ydCBmb3JtYXQgYW5kIG5vdCBwYXJ0IG9mIHNvbWUgbGVhZGluZyB0ZXh0XG4gICAgICAgICAgICBpZiAoaXNTaG9ydEZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHZhciBzaG9ydEZvcm1hdFRlc3QgPSAvWzAtOSMqXS87XG4gICAgICAgICAgICAgICAgdmFyIHNob3J0Rm9ybWF0VGVzdFJlc3VsdCA9IHJpZ2h0T2ZQcmVmaXgubWF0Y2goc2hvcnRGb3JtYXRUZXN0KTtcbiAgICAgICAgICAgICAgICBpZiAoIXNob3J0Rm9ybWF0VGVzdFJlc3VsdCB8fCBzaG9ydEZvcm1hdFRlc3RSZXN1bHQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vbm8gc2hvcnQgZm9ybWF0IGNoYXJhY3RlcnMgc28gdGhpcyBtdXN0IGJlIGxlYWRpbmcgdGV4dCBpZS4gJ3dlZWtzICdcbiAgICAgICAgICAgICAgICAgICAgaXNTaG9ydEZvcm1hdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBsZWFkaW5nVGV4dCA9ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9pZiAoZm9ybWF0VFhULmNoYXJBdCgwKSA9PSAncycpXG4gICAgICAgICAgICBpZiAoaXNTaG9ydEZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHZhciB2YWxTY2FsZSA9IG51bWJlciA9PT0gMCA/IDAgOiBNYXRoLmZsb29yKE1hdGgubG9nKE1hdGguYWJzKG51bWJlcikpIC8gKDMgKiBNYXRoLkxOMTApKTtcbiAgICAgICAgICAgICAgICB2YWxTY2FsZSA9ICgobnVtYmVyIC8gTWF0aC5wb3coMTAsIDMgKiB2YWxTY2FsZSkpIDwgMTAwMCkgPyB2YWxTY2FsZSA6ICh2YWxTY2FsZSArIDEpO1xuICAgICAgICAgICAgICAgIHZhbFNjYWxlID0gTWF0aC5tYXgodmFsU2NhbGUsIDApO1xuICAgICAgICAgICAgICAgIHZhbFNjYWxlID0gTWF0aC5taW4odmFsU2NhbGUsIDQpO1xuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAvIE1hdGgucG93KDEwLCAzICogdmFsU2NhbGUpO1xuICAgICAgICAgICAgICAgIC8vaWYgKCFpc05hTihOdW1iZXIoZm9ybWF0VFhULnN1YnN0cigxKSApICkgKVxuXG4gICAgICAgICAgICAgICAgaWYgKCFpc05hTihOdW1iZXIocmlnaHRPZlByZWZpeCkpICYmIHJpZ2h0T2ZQcmVmaXguaW5kZXhPZignLicpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGltaXREaWdpdHMgPSBOdW1iZXIocmlnaHRPZlByZWZpeCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChudW1iZXIgPCBNYXRoLnBvdygxMCwgbGltaXREaWdpdHMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDdXJyZW5jeShsZWFkaW5nVGV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiArIGxlYWRpbmdUZXh0ICsgZ2V0RGlnaXRzKG51bWJlciwgTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsZWFkaW5nVGV4dCArIHNpZ24gKyBnZXREaWdpdHMobnVtYmVyLCBOdW1iZXIocmlnaHRPZlByZWZpeCkpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0N1cnJlbmN5KGxlYWRpbmdUZXh0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzaWduICsgbGVhZGluZ1RleHQgKyBNYXRoLnJvdW5kKG51bWJlcikgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ1RleHQgKyBzaWduICsgTWF0aC5yb3VuZChudW1iZXIpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vZm9ybWF0VFhUID0gZm9ybWF0VFhULnN1YnN0cigxKTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnN1YnN0cihpbmRleCArIDEpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgU1VGRklYID0gZ2V0U3VmZml4KGZvcm1hdFRYVCk7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5zdWJzdHIoMCwgZm9ybWF0VFhULmxlbmd0aCAtIFNVRkZJWC5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWxXaXRob3V0TGVhZGluZyA9IGZvcm1hdCgoKHNpZ24gPT09ICcnKSA/IDEgOiAtMSkgKiBudW1iZXIsIGZvcm1hdFRYVCkgKyBzY2FsZXNbdmFsU2NhbGVdICsgU1VGRklYO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNDdXJyZW5jeShsZWFkaW5nVGV4dCkgJiYgc2lnbiAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbFdpdGhvdXRMZWFkaW5nID0gdmFsV2l0aG91dExlYWRpbmcuc3Vic3RyKHNpZ24ubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzaWduICsgbGVhZGluZ1RleHQgKyB2YWxXaXRob3V0TGVhZGluZztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsZWFkaW5nVGV4dCArIHZhbFdpdGhvdXRMZWFkaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHN1YkZvcm1hdHMgPSBmb3JtYXRUWFQuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgIHZhciBkZWNpbWFscztcbiAgICAgICAgICAgIHZhciBtaW5EZWNpbWFscztcbiAgICAgICAgICAgIGlmIChzdWJGb3JtYXRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBkZWNpbWFscyA9IHN1YkZvcm1hdHNbMV0ubGVuZ3RoIC0gc3ViRm9ybWF0c1sxXS5yZXBsYWNlKG5ldyBSZWdFeHAoJ1swfCNdKycsICdnJyksICcnKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgbWluRGVjaW1hbHMgPSBzdWJGb3JtYXRzWzFdLmxlbmd0aCAtIHN1YkZvcm1hdHNbMV0ucmVwbGFjZShuZXcgUmVnRXhwKCcwKycsICdnJyksICcnKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9ybWF0VFhUID0gc3ViRm9ybWF0c1swXSArIHN1YkZvcm1hdHNbMV0ucmVwbGFjZShuZXcgUmVnRXhwKCdbMHwjXSsnLCAnZycpLCAnJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlY2ltYWxzID0gMDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGZpeGVzVFhUID0gZm9ybWF0VFhULnNwbGl0KG5ldyBSZWdFeHAoJ1swfCx8I10rJywgJ2cnKSk7XG4gICAgICAgICAgICB2YXIgcHJlZmZpeCA9IGZpeGVzVFhUWzBdLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB2YXIgc3VmZml4ID0gKGZpeGVzVFhULmxlbmd0aCA+IDEpID8gZml4ZXNUWFRbMV0udG9TdHJpbmcoKSA6ICcnO1xuXG4gICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAoKGZvcm1hdFRYVC5zcGxpdCgnJScpLmxlbmd0aCA+IDEpID8gMTAwIDogMSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgIGlmIChmb3JtYXRUWFQuaW5kZXhPZignJScpICE9PSAtMSkgbnVtYmVyID0gbnVtYmVyICogMTAwO1xuICAgICAgICAgICAgbnVtYmVyID0gcm91bmRUbyhudW1iZXIsIGRlY2ltYWxzKTtcblxuICAgICAgICAgICAgc2lnbiA9IChudW1iZXIgPT09IDApID8gJycgOiBzaWduO1xuXG4gICAgICAgICAgICB2YXIgaGFzQ29tbWFzID0gKGZvcm1hdFRYVC5zdWJzdHIoZm9ybWF0VFhULmxlbmd0aCAtIDQgLSBzdWZmaXgubGVuZ3RoLCAxKSA9PT0gJywnKTtcbiAgICAgICAgICAgIHZhciBmb3JtYXR0ZWQgPSBzaWduICsgcHJlZmZpeCArIGFkZERlY2ltYWxzKG51bWJlciwgZGVjaW1hbHMsIG1pbkRlY2ltYWxzLCBoYXNDb21tYXMpICsgc3VmZml4O1xuXG4gICAgICAgICAgICAvLyAgY29uc29sZS5sb2cob3JpZ2luYWxOdW1iZXIsIG9yaWdpbmFsRm9ybWF0LCBmb3JtYXR0ZWQpXG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0dGVkO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdDtcbiAgICB9KCkpXG59O1xuIiwiLyoqXG4gKiAjIyBTdHJpbmcgQ29udmVydGVyc1xuICpcbiAqIENvbnZlcnRlcnMgYWxsb3cgeW91IHRvIGNvbnZlcnQgZGF0YSAtLSBpbiBwYXJ0aWN1bGFyLCBtb2RlbCB2YXJpYWJsZXMgdGhhdCB5b3UgZGlzcGxheSBpbiB5b3VyIHByb2plY3QncyB1c2VyIGludGVyZmFjZSAtLSBmcm9tIG9uZSBmb3JtIHRvIGFub3RoZXIuXG4gKlxuICogVGhlcmUgYXJlIHR3byB3YXlzIHRvIHNwZWNpZnkgY29udmVyc2lvbiBvciBmb3JtYXR0aW5nIGZvciB0aGUgZGlzcGxheSBvdXRwdXQgb2YgYSBwYXJ0aWN1bGFyIG1vZGVsIHZhcmlhYmxlOlxuICpcbiAqICogQWRkIHRoZSBhdHRyaWJ1dGUgYGRhdGEtZi1jb252ZXJ0YCB0byBhbnkgZWxlbWVudCB0aGF0IGFsc28gaGFzIHRoZSBgZGF0YS1mLWJpbmRgIG9yIGBkYXRhLWYtZm9yZWFjaGAuXG4gKiAqIFVzZSB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIgd2l0aGluIHRoZSB2YWx1ZSBvZiBhbnkgYGRhdGEtZi1gIGF0dHJpYnV0ZSAobm90IGp1c3QgYGRhdGEtZi1iaW5kYCBvciBgZGF0YS1mLWZvcmVhY2hgKS5cbiAqXG4gKiBGb3IgbW9kZWwgdmFyaWFibGVzIHRoYXQgYXJlIHN0cmluZ3MgKG9yIHRoYXQgaGF2ZSBiZWVuIGNvbnZlcnRlZCB0byBzdHJpbmdzKSwgdGhlcmUgYXJlIHNldmVyYWwgc3BlY2lhbCBzdHJpbmcgZm9ybWF0cyB5b3UgY2FuIGFwcGx5LlxuICovXG5cbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgLyoqXG4gICAgICogQ29udmVydCB0aGUgbW9kZWwgdmFyaWFibGUgdG8gYSBzdHJpbmcuIE9mdGVuIHVzZWQgZm9yIGNoYWluaW5nIHRvIGFub3RoZXIgY29udmVydGVyLlxuICAgICAqXG4gICAgICogKipFeGFtcGxlKipcbiAgICAgKlxuICAgICAqICAgICAgPGRpdj5cbiAgICAgKiAgICAgICAgICBUaGlzIHllYXIgeW91IGFyZSBpbiBjaGFyZ2Ugb2Ygc2FsZXMgZm9yXG4gICAgICogICAgICAgICAgPHNwYW4gZGF0YS1mLWJpbmQ9XCJzYWxlc01nci5yZWdpb24gfCBzIHwgdXBwZXJDYXNlXCI+PC9zcGFuPi5cbiAgICAgKiAgICAgIDwvZGl2PlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gdmFsIFRoZSBtb2RlbCB2YXJpYWJsZS5cbiAgICAgKi9cbiAgICBzOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiB2YWwgKyAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCB0aGUgbW9kZWwgdmFyaWFibGUgdG8gVVBQRVIgQ0FTRS5cbiAgICAgKlxuICAgICAqICoqRXhhbXBsZSoqXG4gICAgICpcbiAgICAgKiAgICAgIDxkaXY+XG4gICAgICogICAgICAgICAgVGhpcyB5ZWFyIHlvdSBhcmUgaW4gY2hhcmdlIG9mIHNhbGVzIGZvclxuICAgICAqICAgICAgICAgIDxzcGFuIGRhdGEtZi1iaW5kPVwic2FsZXNNZ3IucmVnaW9uIHwgcyB8IHVwcGVyQ2FzZVwiPjwvc3Bhbj4uXG4gICAgICogICAgICA8L2Rpdj5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgbW9kZWwgdmFyaWFibGUuXG4gICAgICovXG4gICAgdXBwZXJDYXNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiAodmFsICsgJycpLnRvVXBwZXJDYXNlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgdGhlIG1vZGVsIHZhcmlhYmxlIHRvIGxvd2VyIGNhc2UuXG4gICAgICpcbiAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAqXG4gICAgICogICAgICA8ZGl2PlxuICAgICAqICAgICAgICAgIEVudGVyIHlvdXIgdXNlciBuYW1lOlxuICAgICAqICAgICAgICAgIDxpbnB1dCBkYXRhLWYtYmluZD1cInVzZXJOYW1lIHwgbG93ZXJDYXNlXCI+PC9pbnB1dD4uXG4gICAgICogICAgICA8L2Rpdj5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgbW9kZWwgdmFyaWFibGUuXG4gICAgICovXG4gICAgbG93ZXJDYXNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiAodmFsICsgJycpLnRvTG93ZXJDYXNlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgdGhlIG1vZGVsIHZhcmlhYmxlIHRvIFRpdGxlIENhc2UuXG4gICAgICpcbiAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAqXG4gICAgICogICAgICA8ZGl2PlxuICAgICAqICAgICAgICAgIENvbmdyYXR1bGF0aW9ucyBvbiB5b3VyIHByb21vdGlvbiFcbiAgICAgKiAgICAgICAgICBZb3VyIG5ldyB0aXRsZSBpczogPHNwYW4gZGF0YS1mLWJpbmQ9XCJjdXJyZW50Um9sZSB8IHRpdGxlQ2FzZVwiPjwvc3Bhbj4uXG4gICAgICogICAgICA8L2Rpdj5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgbW9kZWwgdmFyaWFibGUuXG4gICAgICovXG4gICAgdGl0bGVDYXNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhbCA9IHZhbCArICcnO1xuICAgICAgICByZXR1cm4gdmFsLnJlcGxhY2UoL1xcd1xcUyovZywgZnVuY3Rpb24gKHR4dCkge3JldHVybiB0eHQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0eHQuc3Vic3RyKDEpLnRvTG93ZXJDYXNlKCk7fSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBsaXN0ID0gW107XG5cbnZhciBzdXBwb3J0ZWQgPSBbXG4gICAgJ3ZhbHVlcycsICdrZXlzJywgJ2NvbXBhY3QnLCAnZGlmZmVyZW5jZScsXG4gICAgJ2ZsYXR0ZW4nLCAncmVzdCcsXG4gICAgJ3VuaW9uJyxcbiAgICAndW5pcScsICd6aXAnLCAnd2l0aG91dCcsXG4gICAgJ3hvcicsICd6aXAnXG5dO1xuXy5lYWNoKHN1cHBvcnRlZCwgZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIGl0ZW0gPSB7XG4gICAgICAgIGFsaWFzOiBmbixcbiAgICAgICAgYWNjZXB0TGlzdDogdHJ1ZSxcbiAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdCh2YWwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF8ubWFwVmFsdWVzKHZhbCwgX1tmbl0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX1tmbl0odmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgbGlzdC5wdXNoKGl0ZW0pO1xufSk7XG5tb2R1bGUuZXhwb3J0cyA9IGxpc3Q7XG4iLCIvKipcbiAqICMjIEF0dHJpYnV0ZSBNYW5hZ2VyXG4gKlxuICogRmxvdy5qcyBwcm92aWRlcyBhIHNldCBvZiBjdXN0b20gRE9NIGF0dHJpYnV0ZXMgdGhhdCBzZXJ2ZSBhcyBhIGRhdGEgYmluZGluZyBiZXR3ZWVuIHZhcmlhYmxlcyBhbmQgb3BlcmF0aW9ucyBpbiB5b3VyIHByb2plY3QncyBtb2RlbCBhbmQgSFRNTCBlbGVtZW50cyBpbiB5b3VyIHByb2plY3QncyB1c2VyIGludGVyZmFjZS4gVW5kZXIgdGhlIGhvb2QsIEZsb3cuanMgaXMgZG9pbmcgYXV0b21hdGljIGNvbnZlcnNpb24gb2YgdGhlc2UgY3VzdG9tIGF0dHJpYnV0ZXMsIGxpa2UgYGRhdGEtZi1iaW5kYCwgaW50byBIVE1MIHNwZWNpZmljIHRvIHRoZSBhdHRyaWJ1dGUncyBhc3NpZ25lZCB2YWx1ZSwgbGlrZSB0aGUgY3VycmVudCB2YWx1ZSBvZiBgbXlNb2RlbFZhcmAuXG4gKlxuICogSWYgeW91IGFyZSBsb29raW5nIGZvciBleGFtcGxlcyBvZiB1c2luZyBwYXJ0aWN1bGFyIGF0dHJpYnV0ZXMsIHNlZSB0aGUgW3NwZWNpZmljIGF0dHJpYnV0ZXMgc3VicGFnZXNdKC4uLy4uLy4uLy4uL2F0dHJpYnV0ZXMtb3ZlcnZpZXcvKS5cbiAqXG4gKiBJZiB5b3Ugd291bGQgbGlrZSB0byBleHRlbmQgRmxvdy5qcyB3aXRoIHlvdXIgb3duIGN1c3RvbSBhdHRyaWJ1dGVzLCB5b3UgY2FuIGFkZCB0aGVtIHRvIEZsb3cuanMgdXNpbmcgdGhlIEF0dHJpYnV0ZSBNYW5hZ2VyLlxuICpcbiAqIFRoZSBBdHRyaWJ1dGUgTWFuYWdlciBpcyBzcGVjaWZpYyB0byBhZGRpbmcgY3VzdG9tIGF0dHJpYnV0ZXMgYW5kIGRlc2NyaWJpbmcgdGhlaXIgaW1wbGVtZW50YXRpb24gKGhhbmRsZXJzKS4gKFRoZSBbRG9tIE1hbmFnZXJdKC4uLy4uLykgY29udGFpbnMgdGhlIGdlbmVyYWwgaW1wbGVtZW50YXRpb24uKVxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWZhdWx0SGFuZGxlcnMgPSBbXG4gICAgcmVxdWlyZSgnLi9uby1vcC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9ldmVudHMvaW5pdC1ldmVudC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9ldmVudHMvZGVmYXVsdC1ldmVudC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9mb3JlYWNoL2RlZmF1bHQtZm9yZWFjaC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9iaW5kcy9jaGVja2JveC1yYWRpby1iaW5kLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2JpbmRzL2lucHV0LWJpbmQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vY2xhc3MtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vcG9zaXRpdmUtYm9vbGVhbi1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9uZWdhdGl2ZS1ib29sZWFuLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2JpbmRzL2RlZmF1bHQtYmluZC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9kZWZhdWx0LWF0dHInKVxuXTtcblxudmFyIGhhbmRsZXJzTGlzdCA9IFtdO1xuXG52YXIgbm9ybWFsaXplID0gZnVuY3Rpb24gKGF0dHJpYnV0ZU1hdGNoZXIsIG5vZGVNYXRjaGVyLCBoYW5kbGVyKSB7XG4gICAgaWYgKCFub2RlTWF0Y2hlcikge1xuICAgICAgICBub2RlTWF0Y2hlciA9ICcqJztcbiAgICB9XG4gICAgaWYgKF8uaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgICAgICBoYW5kbGVyID0ge1xuICAgICAgICAgICAgaGFuZGxlOiBoYW5kbGVyXG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiAkLmV4dGVuZChoYW5kbGVyLCB7IHRlc3Q6IGF0dHJpYnV0ZU1hdGNoZXIsIHRhcmdldDogbm9kZU1hdGNoZXIgfSk7XG59O1xuXG4kLmVhY2goZGVmYXVsdEhhbmRsZXJzLCBmdW5jdGlvbiAoaW5kZXgsIGhhbmRsZXIpIHtcbiAgICBoYW5kbGVyc0xpc3QucHVzaChub3JtYWxpemUoaGFuZGxlci50ZXN0LCBoYW5kbGVyLnRhcmdldCwgaGFuZGxlcikpO1xufSk7XG5cblxudmFyIG1hdGNoQXR0ciA9IGZ1bmN0aW9uIChtYXRjaEV4cHIsIGF0dHIsICRlbCkge1xuICAgIHZhciBhdHRyTWF0Y2g7XG5cbiAgICBpZiAoXy5pc1N0cmluZyhtYXRjaEV4cHIpKSB7XG4gICAgICAgIGF0dHJNYXRjaCA9IChtYXRjaEV4cHIgPT09ICcqJyB8fCAobWF0Y2hFeHByLnRvTG93ZXJDYXNlKCkgPT09IGF0dHIudG9Mb3dlckNhc2UoKSkpO1xuICAgIH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKG1hdGNoRXhwcikpIHtcbiAgICAgICAgLy9UT0RPOiByZW1vdmUgZWxlbWVudCBzZWxlY3RvcnMgZnJvbSBhdHRyaWJ1dGVzXG4gICAgICAgIGF0dHJNYXRjaCA9IG1hdGNoRXhwcihhdHRyLCAkZWwpO1xuICAgIH0gZWxzZSBpZiAoXy5pc1JlZ0V4cChtYXRjaEV4cHIpKSB7XG4gICAgICAgIGF0dHJNYXRjaCA9IGF0dHIubWF0Y2gobWF0Y2hFeHByKTtcbiAgICB9XG4gICAgcmV0dXJuIGF0dHJNYXRjaDtcbn07XG5cbnZhciBtYXRjaE5vZGUgPSBmdW5jdGlvbiAodGFyZ2V0LCBub2RlRmlsdGVyKSB7XG4gICAgcmV0dXJuIChfLmlzU3RyaW5nKG5vZGVGaWx0ZXIpKSA/IChub2RlRmlsdGVyID09PSB0YXJnZXQpIDogbm9kZUZpbHRlci5pcyh0YXJnZXQpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGlzdDogaGFuZGxlcnNMaXN0LFxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBhdHRyaWJ1dGUgaGFuZGxlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge1N0cmluZ3xGdW5jdGlvbnxSZWdleH0gYXR0cmlidXRlTWF0Y2hlciBEZXNjcmlwdGlvbiBvZiB3aGljaCBhdHRyaWJ1dGVzIHRvIG1hdGNoLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gbm9kZU1hdGNoZXIgV2hpY2ggbm9kZXMgdG8gYWRkIGF0dHJpYnV0ZXMgdG8uIFVzZSBbanF1ZXJ5IFNlbGVjdG9yIHN5bnRheF0oaHR0cHM6Ly9hcGkuanF1ZXJ5LmNvbS9jYXRlZ29yeS9zZWxlY3RvcnMvKS5cbiAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbnxPYmplY3R9IGhhbmRsZXIgSWYgYGhhbmRsZXJgIGlzIGEgZnVuY3Rpb24sIHRoZSBmdW5jdGlvbiBpcyBjYWxsZWQgd2l0aCBgJGVsZW1lbnRgIGFzIGNvbnRleHQsIGFuZCBhdHRyaWJ1dGUgdmFsdWUgKyBuYW1lLiBJZiBgaGFuZGxlcmAgaXMgYW4gb2JqZWN0LCBpdCBzaG91bGQgaW5jbHVkZSB0d28gZnVuY3Rpb25zLCBhbmQgaGF2ZSB0aGUgZm9ybTogYHsgaW5pdDogZm4sICBoYW5kbGU6IGZuIH1gLiBUaGUgYGluaXRgIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aGVuIHRoZSBwYWdlIGxvYWRzOyB1c2UgdGhpcyB0byBkZWZpbmUgZXZlbnQgaGFuZGxlcnMuIFRoZSBgaGFuZGxlYCBmdW5jdGlvbiBpcyBjYWxsZWQgd2l0aCBgJGVsZW1lbnRgIGFzIGNvbnRleHQsIGFuZCBhdHRyaWJ1dGUgdmFsdWUgKyBuYW1lLlxuICAgICAqL1xuICAgIHJlZ2lzdGVyOiBmdW5jdGlvbiAoYXR0cmlidXRlTWF0Y2hlciwgbm9kZU1hdGNoZXIsIGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlcnNMaXN0LnVuc2hpZnQobm9ybWFsaXplLmFwcGx5KG51bGwsIGFyZ3VtZW50cykpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGaW5kIGFuIGF0dHJpYnV0ZSBtYXRjaGVyIG1hdGNoaW5nIHNvbWUgY3JpdGVyaWEuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGF0dHJGaWx0ZXIgQXR0cmlidXRlIHRvIG1hdGNoLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ3wkZWx9IG5vZGVGaWx0ZXIgTm9kZSB0byBtYXRjaC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge0FycmF5fE51bGx9IEFuIGFycmF5IG9mIG1hdGNoaW5nIGF0dHJpYnV0ZSBoYW5kbGVycywgb3IgbnVsbCBpZiBubyBtYXRjaGVzIGZvdW5kLlxuICAgICAqL1xuICAgIGZpbHRlcjogZnVuY3Rpb24gKGF0dHJGaWx0ZXIsIG5vZGVGaWx0ZXIpIHtcbiAgICAgICAgdmFyIGZpbHRlcmVkID0gXy5zZWxlY3QoaGFuZGxlcnNMaXN0LCBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoQXR0cihoYW5kbGVyLnRlc3QsIGF0dHJGaWx0ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKG5vZGVGaWx0ZXIpIHtcbiAgICAgICAgICAgIGZpbHRlcmVkID0gXy5zZWxlY3QoZmlsdGVyZWQsIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoTm9kZShoYW5kbGVyLnRhcmdldCwgbm9kZUZpbHRlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmlsdGVyZWQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlcGxhY2UgYW4gZXhpc3RpbmcgYXR0cmlidXRlIGhhbmRsZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGF0dHJGaWx0ZXIgQXR0cmlidXRlIHRvIG1hdGNoLlxuICAgICAqIEBwYXJhbSAge1N0cmluZyB8ICRlbH0gbm9kZUZpbHRlciBOb2RlIHRvIG1hdGNoLlxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufE9iamVjdH0gaGFuZGxlciBUaGUgdXBkYXRlZCBhdHRyaWJ1dGUgaGFuZGxlci4gSWYgYGhhbmRsZXJgIGlzIGEgZnVuY3Rpb24sIHRoZSBmdW5jdGlvbiBpcyBjYWxsZWQgd2l0aCBgJGVsZW1lbnRgIGFzIGNvbnRleHQsIGFuZCBhdHRyaWJ1dGUgdmFsdWUgKyBuYW1lLiBJZiBgaGFuZGxlcmAgaXMgYW4gb2JqZWN0LCBpdCBzaG91bGQgaW5jbHVkZSB0d28gZnVuY3Rpb25zLCBhbmQgaGF2ZSB0aGUgZm9ybTogYHsgaW5pdDogZm4sICBoYW5kbGU6IGZuIH1gLiBUaGUgYGluaXRgIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aGVuIHRoZSBwYWdlIGxvYWRzOyB1c2UgdGhpcyB0byBkZWZpbmUgZXZlbnQgaGFuZGxlcnMuIFRoZSBgaGFuZGxlYCBmdW5jdGlvbiBpcyBjYWxsZWQgd2l0aCBgJGVsZW1lbnRgIGFzIGNvbnRleHQsIGFuZCBhdHRyaWJ1dGUgdmFsdWUgKyBuYW1lLlxuICAgICAqL1xuICAgIHJlcGxhY2U6IGZ1bmN0aW9uIChhdHRyRmlsdGVyLCBub2RlRmlsdGVyLCBoYW5kbGVyKSB7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgXy5lYWNoKGhhbmRsZXJzTGlzdCwgZnVuY3Rpb24gKGN1cnJlbnRIYW5kbGVyLCBpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2hBdHRyKGN1cnJlbnRIYW5kbGVyLnRlc3QsIGF0dHJGaWx0ZXIpICYmIG1hdGNoTm9kZShjdXJyZW50SGFuZGxlci50YXJnZXQsIG5vZGVGaWx0ZXIpKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGhhbmRsZXJzTGlzdC5zcGxpY2UoaW5kZXgsIDEsIG5vcm1hbGl6ZShhdHRyRmlsdGVyLCBub2RlRmlsdGVyLCBoYW5kbGVyKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBSZXRyaWV2ZSB0aGUgYXBwcm9wcmlhdGUgaGFuZGxlciBmb3IgYSBwYXJ0aWN1bGFyIGF0dHJpYnV0ZS4gVGhlcmUgbWF5IGJlIG11bHRpcGxlIG1hdGNoaW5nIGhhbmRsZXJzLCBidXQgdGhlIGZpcnN0IChtb3N0IGV4YWN0KSBtYXRjaCBpcyBhbHdheXMgdXNlZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwcm9wZXJ0eSBUaGUgYXR0cmlidXRlLlxuICAgICAqIEBwYXJhbSB7JGVsfSAkZWwgVGhlIERPTSBlbGVtZW50LlxuICAgICAqXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgYXR0cmlidXRlIGhhbmRsZXIuXG4gICAgICovXG4gICAgZ2V0SGFuZGxlcjogZnVuY3Rpb24gKHByb3BlcnR5LCAkZWwpIHtcbiAgICAgICAgdmFyIGZpbHRlcmVkID0gdGhpcy5maWx0ZXIocHJvcGVydHksICRlbCk7XG4gICAgICAgIC8vVGhlcmUgY291bGQgYmUgbXVsdGlwbGUgbWF0Y2hlcywgYnV0IHRoZSB0b3AgZmlyc3QgaGFzIHRoZSBtb3N0IHByaW9yaXR5XG4gICAgICAgIHJldHVybiBmaWx0ZXJlZFswXTtcbiAgICB9XG59O1xuXG4iLCIvKipcbiAqICMjIENoZWNrYm94ZXMgYW5kIFJhZGlvIEJ1dHRvbnNcbiAqXG4gKiBJbiB0aGUgW2RlZmF1bHQgY2FzZV0oLi4vZGVmYXVsdC1iaW5kLWF0dHIvKSwgdGhlIGBkYXRhLWYtYmluZGAgYXR0cmlidXRlIGNyZWF0ZXMgYSBiaS1kaXJlY3Rpb25hbCBiaW5kaW5nIGJldHdlZW4gdGhlIERPTSBlbGVtZW50IGFuZCB0aGUgbW9kZWwgdmFyaWFibGUuIFRoaXMgYmluZGluZyBpcyAqKmJpLWRpcmVjdGlvbmFsKiosIG1lYW5pbmcgdGhhdCBhcyB0aGUgbW9kZWwgY2hhbmdlcywgdGhlIGludGVyZmFjZSBpcyBhdXRvbWF0aWNhbGx5IHVwZGF0ZWQ7IGFuZCB3aGVuIGVuZCB1c2VycyBjaGFuZ2UgdmFsdWVzIGluIHRoZSBpbnRlcmZhY2UsIHRoZSBtb2RlbCBpcyBhdXRvbWF0aWNhbGx5IHVwZGF0ZWQuXG4gKlxuICogRmxvdy5qcyBwcm92aWRlcyBzcGVjaWFsIGhhbmRsaW5nIGZvciBET00gZWxlbWVudHMgd2l0aCBgdHlwZT1cImNoZWNrYm94XCJgIGFuZCBgdHlwZT1cInJhZGlvXCJgLlxuICpcbiAqIEluIHBhcnRpY3VsYXIsIGlmIHlvdSBhZGQgdGhlIGBkYXRhLWYtYmluZGAgYXR0cmlidXRlIHRvIGFuIGBpbnB1dGAgd2l0aCBgdHlwZT1cImNoZWNrYm94XCJgIGFuZCBgdHlwZT1cInJhZGlvXCJgLCB0aGUgY2hlY2tib3ggb3IgcmFkaW8gYnV0dG9uIGlzIGF1dG9tYXRpY2FsbHkgc2VsZWN0ZWQgaWYgdGhlIGB2YWx1ZWAgbWF0Y2hlcyB0aGUgdmFsdWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlIHJlZmVyZW5jZWQsIG9yIGlmIHRoZSBtb2RlbCB2YXJpYWJsZSBpcyBgdHJ1ZWAuXG4gKlxuICogKipFeGFtcGxlKipcbiAqXG4gKiAgICAgIDwhLS0gcmFkaW8gYnV0dG9uLCBzZWxlY3RlZCBpZiBzYW1wbGVJbnQgaXMgOCAtLT5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJyYWRpb1wiIGRhdGEtZi1iaW5kPVwic2FtcGxlSW50XCIgdmFsdWU9XCI4XCIgLz5cbiAqXG4gKiAgICAgIDwhLS0gY2hlY2tib3gsIGNoZWNrZWQgaWYgc2FtcGxlQm9vbCBpcyB0cnVlIC0tPlxuICogICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgZGF0YS1mLWJpbmQ9XCJzYW1wbGVCb29sXCIgLz5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJzpjaGVja2JveCw6cmFkaW8nLFxuXG4gICAgdGVzdDogJ2JpbmQnLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNldHRhYmxlVmFsdWUgPSB0aGlzLmF0dHIoJ3ZhbHVlJyk7IC8vaW5pdGlhbCB2YWx1ZVxuICAgICAgICAvKmpzbGludCBlcWVxOiB0cnVlKi9cbiAgICAgICAgdmFyIGlzQ2hlY2tlZCA9IChzZXR0YWJsZVZhbHVlICE9PSB1bmRlZmluZWQpID8gKHNldHRhYmxlVmFsdWUgPT0gdmFsdWUpIDogISF2YWx1ZTtcbiAgICAgICAgdGhpcy5wcm9wKCdjaGVja2VkJywgaXNDaGVja2VkKTtcbiAgICB9XG59O1xuIiwiLyoqXG4gKiAjIyBEZWZhdWx0IEJpLWRpcmVjdGlvbmFsIEJpbmRpbmc6IGRhdGEtZi1iaW5kXG4gKlxuICogVGhlIG1vc3QgY29tbW9ubHkgdXNlZCBhdHRyaWJ1dGUgcHJvdmlkZWQgYnkgRmxvdy5qcyBpcyB0aGUgYGRhdGEtZi1iaW5kYCBhdHRyaWJ1dGUuXG4gKlxuICogIyMjI2RhdGEtZi1iaW5kIHdpdGggYSBzaW5nbGUgdmFsdWVcbiAqXG4gKiBZb3UgY2FuIGJpbmQgdmFyaWFibGVzIGZyb20gdGhlIG1vZGVsIGluIHlvdXIgaW50ZXJmYWNlIGJ5IHNldHRpbmcgdGhlIGBkYXRhLWYtYmluZGAgYXR0cmlidXRlLiBUaGlzIGF0dHJpYnV0ZSBiaW5kaW5nIGlzIGJpLWRpcmVjdGlvbmFsLCBtZWFuaW5nIHRoYXQgYXMgdGhlIG1vZGVsIGNoYW5nZXMsIHRoZSBpbnRlcmZhY2UgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkOyBhbmQgd2hlbiB1c2VycyBjaGFuZ2UgdmFsdWVzIGluIHRoZSBpbnRlcmZhY2UsIHRoZSBtb2RlbCBpcyBhdXRvbWF0aWNhbGx5IHVwZGF0ZWQuIFNwZWNpZmljYWxseTpcbiAqXG4gKiAqIFRoZSBiaW5kaW5nIGZyb20gdGhlIG1vZGVsIHRvIHRoZSBpbnRlcmZhY2UgZW5zdXJlcyB0aGF0IHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoZSB2YXJpYWJsZSBpcyBkaXNwbGF5ZWQgaW4gdGhlIEhUTUwgZWxlbWVudC4gVGhpcyBpbmNsdWRlcyBhdXRvbWF0aWMgdXBkYXRlcyB0byB0aGUgZGlzcGxheWVkIHZhbHVlIGlmIHNvbWV0aGluZyBlbHNlIGNoYW5nZXMgaW4gdGhlIG1vZGVsLlxuICpcbiAqICogVGhlIGJpbmRpbmcgZnJvbSB0aGUgaW50ZXJmYWNlIHRvIHRoZSBtb2RlbCBlbnN1cmVzIHRoYXQgaWYgdGhlIEhUTUwgZWxlbWVudCBpcyBlZGl0YWJsZSwgY2hhbmdlcyBhcmUgc2VudCB0byB0aGUgbW9kZWwuXG4gKlxuICogT25jZSB5b3Ugc2V0IGBkYXRhLWYtYmluZGAsIEZsb3cuanMgZmlndXJlcyBvdXQgdGhlIGFwcHJvcHJpYXRlIGFjdGlvbiB0byB0YWtlIGJhc2VkIG9uIHRoZSBlbGVtZW50IHR5cGUgYW5kIHRoZSBkYXRhIHJlc3BvbnNlIGZyb20geW91ciBtb2RlbC5cbiAqXG4gKiAqKlRvIGRpc3BsYXkgYW5kIGF1dG9tYXRpY2FsbHkgdXBkYXRlIGEgdmFyaWFibGUgaW4gdGhlIGludGVyZmFjZToqKlxuICpcbiAqIDEuIEFkZCB0aGUgYGRhdGEtZi1iaW5kYCBhdHRyaWJ1dGUgdG8gYW55IEhUTUwgZWxlbWVudCB0aGF0IG5vcm1hbGx5IHRha2VzIGEgdmFsdWUuXG4gKiAyLiBTZXQgdGhlIHZhbHVlIG9mIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZSB0byB0aGUgbmFtZSBvZiB0aGUgdmFyaWFibGUuXG4gKlxuICogKipFeGFtcGxlKipcbiAqXG4gKiAgICAgIDxzcGFuIGRhdGEtZi1iaW5kPVwic2FsZXNNYW5hZ2VyLm5hbWVcIiAvPlxuICpcbiAqICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJzYW1wbGVTdHJpbmdcIiAvPlxuICpcbiAqICoqTm90ZXM6KipcbiAqXG4gKiAqIFVzZSBzcXVhcmUgYnJhY2tldHMsIGBbXWAsIHRvIHJlZmVyZW5jZSBhcnJheWVkIHZhcmlhYmxlczogYHNhbGVzW1dlc3RdYC5cbiAqICogVXNlIGFuZ2xlIGJyYWNrZXRzLCBgPD5gLCB0byByZWZlcmVuY2Ugb3RoZXIgdmFyaWFibGVzIGluIHlvdXIgYXJyYXkgaW5kZXg6IGBzYWxlc1s8Y3VycmVudFJlZ2lvbj5dYC5cbiAqICogUmVtZW1iZXIgdGhhdCBpZiB5b3VyIG1vZGVsIGlzIGluIFZlbnNpbSwgdGhlIHRpbWUgc3RlcCBjYW4gYmUgdGhlIGZpcnN0IGFycmF5IGluZGV4IG9yIHRoZSBsYXN0IGFycmF5IGluZGV4LCBkZXBlbmRpbmcgb24geW91ciBbbW9kZWwuY2ZnXSguLi8uLi8uLi8uLi8uLi8uLi9tb2RlbF9jb2RlL3ZlbnNpbS8jY3JlYXRpbmctY2ZnKSBmaWxlLlxuICogKiBCeSBkZWZhdWx0LCBhbGwgSFRNTCBlbGVtZW50cyB1cGRhdGUgZm9yIGFueSBjaGFuZ2UgZm9yIGVhY2ggdmFyaWFibGUuIEhvd2V2ZXIsIHlvdSBjYW4gcHJldmVudCB0aGUgdXNlciBpbnRlcmZhY2UgZnJvbSB1cGRhdGluZyAmbWRhc2g7IGVpdGhlciBmb3IgYWxsIHZhcmlhYmxlcyBvciBmb3IgcGFydGljdWxhciB2YXJpYWJsZXMgJm1kYXNoOyBieSBzZXR0aW5nIHRoZSBgc2lsZW50YCBwcm9wZXJ0eSB3aGVuIHlvdSBpbml0aWFsaXplIEZsb3cuanMuIFNlZSBtb3JlIG9uIFthZGRpdGlvbmFsIG9wdGlvbnMgZm9yIHRoZSBGbG93LmluaXRpYWxpemUoKSBtZXRob2RdKC4uLy4uLy4uLy4uLy4uLyNjdXN0b20taW5pdGlhbGl6ZSkuXG4gKlxuICogIyMjI2RhdGEtZi1iaW5kIHdpdGggbXVsdGlwbGUgdmFsdWVzIGFuZCB0ZW1wbGF0ZXNcbiAqXG4gKiBJZiB5b3UgaGF2ZSBtdWx0aXBsZSB2YXJpYWJsZXMsIHlvdSBjYW4gdXNlIHRoZSBzaG9ydGN1dCBvZiBsaXN0aW5nIG11bHRpcGxlIHZhcmlhYmxlcyBpbiBhbiBlbmNsb3NpbmcgSFRNTCBlbGVtZW50IGFuZCB0aGVuIHJlZmVyZW5jaW5nIGVhY2ggdmFyaWFibGUgdXNpbmcgdGVtcGxhdGVzLiAoVGVtcGxhdGVzIGFyZSBhdmFpbGFibGUgYXMgcGFydCBvZiBGbG93LmpzJ3MgbG9kYXNoIGRlcGVuZGVuY3kuIFNlZSBtb3JlIGJhY2tncm91bmQgb24gW3dvcmtpbmcgd2l0aCB0ZW1wbGF0ZXNdKC4uLy4uLy4uLy4uLy4uLyN0ZW1wbGF0ZXMpLilcbiAqXG4gKiAqKlRvIGRpc3BsYXkgYW5kIGF1dG9tYXRpY2FsbHkgdXBkYXRlIG11bHRpcGxlIHZhcmlhYmxlcyBpbiB0aGUgaW50ZXJmYWNlOioqXG4gKlxuICogMS4gQWRkIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZSB0byBhbnkgSFRNTCBlbGVtZW50IGZyb20gd2hpY2ggeW91IHdhbnQgdG8gcmVmZXJlbmNlIG1vZGVsIHZhcmlhYmxlcywgc3VjaCBhcyBhIGBkaXZgIG9yIGB0YWJsZWAuXG4gKiAyLiBTZXQgdGhlIHZhbHVlIG9mIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZSBpbiB5b3VyIHRvcC1sZXZlbCBIVE1MIGVsZW1lbnQgdG8gYSBjb21tYS1zZXBhcmF0ZWQgbGlzdCBvZiB0aGUgdmFyaWFibGVzLiAoVGhlIHZhcmlhYmxlcyBtYXkgb3IgbWF5IG5vdCBiZSBjYXNlLXNlbnNpdGl2ZSwgZGVwZW5kaW5nIG9uIHlvdXIgbW9kZWxpbmcgbGFuZ3VhZ2UuKVxuICpcbiAqIDMuIEluc2lkZSB0aGUgSFRNTCBlbGVtZW50LCB1c2UgdGVtcGxhdGVzIChgPCU9ICU+YCkgdG8gcmVmZXJlbmNlIHRoZSBzcGVjaWZpYyB2YXJpYWJsZSBuYW1lcy4gVGhlc2UgdmFyaWFibGUgbmFtZXMgYXJlIGNhc2Utc2Vuc2l0aXZlOiB0aGV5IHNob3VsZCBtYXRjaCB0aGUgY2FzZSB5b3UgdXNlZCBpbiB0aGUgYGRhdGEtZi1iaW5kYCBpbiBzdGVwIDIuXG4gKlxuICogKipFeGFtcGxlKipcbiAqXG4gKiAgICAgIDwhLS0gbWFrZSB0aGVzZSB0aHJlZSBtb2RlbCB2YXJpYWJsZXMgYXZhaWxhYmxlIHRocm91Z2hvdXQgZGl2IC0tPlxuICpcbiAqICAgICAgPGRpdiBkYXRhLWYtYmluZD1cIkN1cnJlbnRZZWFyLCBSZXZlbnVlLCBQcm9maXRcIj5cbiAqICAgICAgICAgIEluIDwlPSBDdXJyZW50WWVhciAlPixcbiAqICAgICAgICAgIG91ciBjb21wYW55IGVhcm5lZCA8JT0gUmV2ZW51ZSAlPixcbiAqICAgICAgICAgIHJlc3VsdGluZyBpbiA8JT0gUHJvZml0ICU+IHByb2ZpdC5cbiAqICAgICAgPC9kaXY+XG4gKlxuICogVGhpcyBleGFtcGxlIGlzIHNob3J0aGFuZCBmb3IgcmVwZWF0ZWRseSB1c2luZyBkYXRhLWYtYmluZC4gRm9yIGluc3RhbmNlLCB0aGlzIGNvZGUgYWxzbyBnZW5lcmF0ZXMgdGhlIHNhbWUgb3V0cHV0OlxuICpcbiAqICAgICAgPGRpdj5cbiAqICAgICAgICAgIEluIDxzcGFuIGRhdGEtZi1iaW5kPVwiQ3VycmVudFllYXJcIj48L3NwYW4+LFxuICogICAgICAgICAgb3VyIGNvbXBhbnkgZWFybmVkIDxzcGFuIGRhdGEtZi1iaW5kPVwiUmV2ZW51ZVwiPjwvc3Bhbj4sXG4gKiAgICAgICAgICByZXN1bHRpbmcgaW4gPHNwYW4gZGF0YS1mLWJpbmQ9XCJQcm9maXRcIj4gcHJvZml0PC9zcGFuPi5cbiAqICAgICAgPC9kaXY+XG4gKlxuICogKipOb3RlczoqKlxuICpcbiAqICogQWRkaW5nIGBkYXRhLWYtYmluZGAgdG8gdGhlIGVuY2xvc2luZyBIVE1MIGVsZW1lbnQgcmF0aGVyIHRoYW4gcmVwZWF0ZWRseSB1c2luZyBpdCB3aXRoaW4gdGhlIGVsZW1lbnQgaXMgYSBjb2RlIHN0eWxlIHByZWZlcmVuY2UuIEluIG1hbnkgY2FzZXMsIGFkZGluZyBgZGF0YS1mLWJpbmRgIGF0IHRoZSB0b3AgbGV2ZWwsIGFzIGluIHRoZSBmaXJzdCBleGFtcGxlLCBjYW4gbWFrZSB5b3VyIGNvZGUgZWFzaWVyIHRvIHJlYWQgYW5kIG1haW50YWluLlxuICogKiBIb3dldmVyLCB5b3UgbWlnaHQgY2hvb3NlIHRvIHJlcGVhdGVkbHkgdXNlIGBkYXRhLWYtYmluZGAgaW4gc29tZSBjYXNlcywgZm9yIGV4YW1wbGUgaWYgeW91IHdhbnQgZGlmZmVyZW50IFtmb3JtYXR0aW5nXSguLi8uLi8uLi8uLi8uLi9jb252ZXJ0ZXItb3ZlcnZpZXcvKSBmb3IgZGlmZmVyZW50IHZhcmlhYmxlczpcbiAqXG4gKiAgICAgIDxkaXY+XG4gKiAgICAgICAgICBJbiA8c3BhbiBkYXRhLWYtYmluZD1cIkN1cnJlbnRZZWFyIHwgI1wiPjwvc3Bhbj4sXG4gKiAgICAgICAgICBvdXIgY29tcGFueSBlYXJuZWQgPHNwYW4gZGF0YS1mLWJpbmQ9XCJSZXZlbnVlIHwgJCMsIyMjXCI+PC9zcGFuPlxuICogICAgICA8L2Rpdj5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogJ2JpbmQnLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIHRlbXBsYXRlZDtcbiAgICAgICAgdmFyIHZhbHVlVG9UZW1wbGF0ZSA9ICQuZXh0ZW5kKHt9LCB2YWx1ZSk7XG4gICAgICAgIGlmICghJC5pc1BsYWluT2JqZWN0KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFyIHZhcmlhYmxlTmFtZSA9IHRoaXMuZGF0YSgnZi1iaW5kJyk7Ly9IYWNrIGJlY2F1c2UgaSBkb24ndCBoYXZlIGFjY2VzcyB0byB2YXJpYWJsZSBuYW1lIGhlcmUgb3RoZXJ3aXNlXG4gICAgICAgICAgICB2YWx1ZVRvVGVtcGxhdGUgPSB7IHZhbHVlOiB2YWx1ZSB9O1xuICAgICAgICAgICAgdmFsdWVUb1RlbXBsYXRlW3ZhcmlhYmxlTmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlVG9UZW1wbGF0ZS52YWx1ZSA9IHZhbHVlOyAvL0lmIHRoZSBrZXkgaGFzICd3ZWlyZCcgY2hhcmFjdGVycyBsaWtlICc8PicgaGFyZCB0byBnZXQgYXQgd2l0aCBhIHRlbXBsYXRlIG90aGVyd2lzZVxuICAgICAgICB9XG4gICAgICAgIHZhciBiaW5kVGVtcGxhdGUgPSB0aGlzLmRhdGEoJ2JpbmQtdGVtcGxhdGUnKTtcbiAgICAgICAgaWYgKGJpbmRUZW1wbGF0ZSkge1xuICAgICAgICAgICAgdGVtcGxhdGVkID0gXy50ZW1wbGF0ZShiaW5kVGVtcGxhdGUsIHZhbHVlVG9UZW1wbGF0ZSk7XG4gICAgICAgICAgICB0aGlzLmh0bWwodGVtcGxhdGVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBvbGRIVE1MID0gdGhpcy5odG1sKCk7XG4gICAgICAgICAgICB2YXIgY2xlYW5lZEhUTUwgPSBvbGRIVE1MLnJlcGxhY2UoLyZsdDsvZywgJzwnKS5yZXBsYWNlKC8mZ3Q7L2csICc+Jyk7XG4gICAgICAgICAgICB0ZW1wbGF0ZWQgPSBfLnRlbXBsYXRlKGNsZWFuZWRIVE1MLCB2YWx1ZVRvVGVtcGxhdGUpO1xuICAgICAgICAgICAgaWYgKGNsZWFuZWRIVE1MID09PSB0ZW1wbGF0ZWQpIHsgLy90ZW1wbGF0aW5nIGRpZCBub3RoaW5nXG4gICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFsdWUgPSAoJC5pc1BsYWluT2JqZWN0KHZhbHVlKSkgPyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgOiB2YWx1ZSArICcnO1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbCh2YWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YSgnYmluZC10ZW1wbGF0ZScsIGNsZWFuZWRIVE1MKTtcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWwodGVtcGxhdGVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIElucHV0cyBhbmQgU2VsZWN0c1xuICpcbiAqIEluIHRoZSBbZGVmYXVsdCBjYXNlXSguLi9kZWZhdWx0LWJpbmQtYXR0ci8pLCB0aGUgYGRhdGEtZi1iaW5kYCBhdHRyaWJ1dGUgY3JlYXRlcyBhIGJpLWRpcmVjdGlvbmFsIGJpbmRpbmcgYmV0d2VlbiB0aGUgRE9NIGVsZW1lbnQgYW5kIHRoZSBtb2RlbCB2YXJpYWJsZS4gVGhpcyBiaW5kaW5nIGlzICoqYmktZGlyZWN0aW9uYWwqKiwgbWVhbmluZyB0aGF0IGFzIHRoZSBtb2RlbCBjaGFuZ2VzLCB0aGUgaW50ZXJmYWNlIGlzIGF1dG9tYXRpY2FsbHkgdXBkYXRlZDsgYW5kIHdoZW4gZW5kIHVzZXJzIGNoYW5nZSB2YWx1ZXMgaW4gdGhlIGludGVyZmFjZSwgdGhlIG1vZGVsIGlzIGF1dG9tYXRpY2FsbHkgdXBkYXRlZC5cbiAqXG4gKiBGbG93LmpzIHByb3ZpZGVzIHNwZWNpYWwgaGFuZGxpbmcgZm9yIERPTSBlbGVtZW50cyBgaW5wdXRgIGFuZCBgc2VsZWN0YC5cbiAqXG4gKiBJbiBwYXJ0aWN1bGFyLCBpZiB5b3UgYWRkIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZSB0byBhIGBzZWxlY3RgIG9yIGBpbnB1dGAgZWxlbWVudCwgdGhlIG9wdGlvbiBtYXRjaGluZyB0aGUgdmFsdWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlIGlzIGF1dG9tYXRpY2FsbHkgc2VsZWN0ZWQuXG4gKlxuICogKipFeGFtcGxlKipcbiAqXG4gKiBcdFx0PCEtLSBvcHRpb24gc2VsZWN0ZWQgaWYgc2FtcGxlX2ludCBpcyA4LCAxMCwgb3IgMTIgLS0+XG4gKiBcdFx0PHNlbGVjdCBkYXRhLWYtYmluZD1cInNhbXBsZV9pbnRcIj5cbiAqIFx0XHRcdDxvcHRpb24gdmFsdWU9XCI4XCI+IDggPC9vcHRpb24+XG4gKiBcdFx0XHQ8b3B0aW9uIHZhbHVlPVwiMTBcIj4gMTAgPC9vcHRpb24+XG4gKiBcdFx0XHQ8b3B0aW9uIHZhbHVlPVwiMTJcIj4gMTIgPC9vcHRpb24+XG4gKiBcdFx0PC9zZWxlY3Q+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgdGFyZ2V0OiAnaW5wdXQsIHNlbGVjdCcsXG5cbiAgICB0ZXN0OiAnYmluZCcsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnZhbCh2YWx1ZSk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgQ2xhc3MgQXR0cmlidXRlOiBkYXRhLWYtY2xhc3NcbiAqXG4gKiBZb3UgY2FuIGJpbmQgbW9kZWwgdmFyaWFibGVzIHRvIG5hbWVzIG9mIENTUyBjbGFzc2VzLCBzbyB0aGF0IHlvdSBjYW4gZWFzaWx5IGNoYW5nZSB0aGUgc3R5bGluZyBvZiBIVE1MIGVsZW1lbnRzIGJhc2VkIG9uIHRoZSB2YWx1ZXMgb2YgbW9kZWwgdmFyaWFibGVzLlxuICpcbiAqICoqVG8gYmluZCBtb2RlbCB2YXJpYWJsZXMgdG8gQ1NTIGNsYXNzZXM6KipcbiAqXG4gKiAxLiBBZGQgdGhlIGBkYXRhLWYtY2xhc3NgIGF0dHJpYnV0ZSB0byBhbiBIVE1MIGVsZW1lbnQuXG4gKiAyLiBTZXQgdGhlIHZhbHVlIHRvIHRoZSBuYW1lIG9mIHRoZSBtb2RlbCB2YXJpYWJsZS5cbiAqIDMuIE9wdGlvbmFsbHksIGFkZCBhbiBhZGRpdGlvbmFsIGBjbGFzc2AgYXR0cmlidXRlIHRvIHRoZSBIVE1MIGVsZW1lbnQuXG4gKiAgICAgICogSWYgeW91IG9ubHkgdXNlIHRoZSBgZGF0YS1mLWNsYXNzYCBhdHRyaWJ1dGUsIHRoZSB2YWx1ZSBvZiBgZGF0YS1mLWNsYXNzYCBpcyB0aGUgY2xhc3MgbmFtZS5cbiAqICAgICAgKiBJZiB5b3UgKmFsc28qIGFkZCBhIGBjbGFzc2AgYXR0cmlidXRlLCB0aGUgdmFsdWUgb2YgYGRhdGEtZi1jbGFzc2AgaXMgKmFwcGVuZGVkKiB0byB0aGUgY2xhc3MgbmFtZS5cbiAqIDQuIEFkZCBjbGFzc2VzIHRvIHlvdXIgQ1NTIGNvZGUgd2hvc2UgbmFtZXMgaW5jbHVkZSBwb3NzaWJsZSB2YWx1ZXMgb2YgdGhhdCBtb2RlbCB2YXJpYWJsZS5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPHN0eWxlIHR5cGU9XCJ0ZXh0L2Nzc1wiPlxuICogICAgICAgICAgLk5vcnRoIHsgY29sb3I6IGdyZXkgfVxuICogICAgICAgICAgLlNvdXRoIHsgY29sb3I6IHB1cnBsZSB9XG4gKiAgICAgICAgICAuRWFzdCB7IGNvbG9yOiBibHVlIH1cbiAqICAgICAgICAgIC5XZXN0IHsgY29sb3I6IG9yYW5nZSB9XG4gKiAgICAgICAgICAuc2FsZXMuZ29vZCB7IGNvbG9yOiBncmVlbiB9XG4gKiAgICAgICAgICAuc2FsZXMuYmFkIHsgY29sb3I6IHJlZCB9XG4gKiAgICAgICAgICAuc2FsZXMudmFsdWUtMTAwIHsgY29sb3I6IHllbGxvdyB9XG4gKiAgICAgICA8L3N0eWxlPlxuICpcbiAqICAgICAgIDxkaXYgZGF0YS1mLWNsYXNzPVwic2FsZXNNZ3IucmVnaW9uXCI+XG4gKiAgICAgICAgICAgQ29udGVudCBjb2xvcmVkIGJ5IHJlZ2lvblxuICogICAgICAgPC9kaXY+XG4gKlxuICogICAgICAgPGRpdiBkYXRhLWYtY2xhc3M9XCJzYWxlc01nci5wZXJmb3JtYW5jZVwiIGNsYXNzPVwic2FsZXNcIj5cbiAqICAgICAgICAgICBDb250ZW50IGdyZWVuIGlmIHNhbGVzTWdyLnBlcmZvcm1hbmNlIGlzIGdvb2QsIHJlZCBpZiBiYWRcbiAqICAgICAgIDwvZGl2PlxuICpcbiAqICAgICAgIDxkaXYgZGF0YS1mLWNsYXNzPVwic2FsZXNNZ3IubnVtUmVnaW9uc1wiIGNsYXNzPVwic2FsZXNcIj5cbiAqICAgICAgICAgICBDb250ZW50IHllbGxvdyBpZiBzYWxlc01nci5udW1SZWdpb25zIGlzIDEwMFxuICogICAgICAgPC9kaXY+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0ZXN0OiAnY2xhc3MnLFxuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSwgcHJvcCkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhZGRlZENsYXNzZXMgPSB0aGlzLmRhdGEoJ2FkZGVkLWNsYXNzZXMnKTtcbiAgICAgICAgaWYgKCFhZGRlZENsYXNzZXMpIHtcbiAgICAgICAgICAgIGFkZGVkQ2xhc3NlcyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChhZGRlZENsYXNzZXNbcHJvcF0pIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoYWRkZWRDbGFzc2VzW3Byb3BdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLmlzTnVtYmVyKHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSAndmFsdWUtJyArIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGFkZGVkQ2xhc3Nlc1twcm9wXSA9IHZhbHVlO1xuICAgICAgICAvL0ZpeG1lOiBwcm9wIGlzIGFsd2F5cyBcImNsYXNzXCJcbiAgICAgICAgdGhpcy5hZGRDbGFzcyh2YWx1ZSk7XG4gICAgICAgIHRoaXMuZGF0YSgnYWRkZWQtY2xhc3NlcycsIGFkZGVkQ2xhc3Nlcyk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgRGVmYXVsdCBBdHRyaWJ1dGUgSGFuZGxpbmc6IFJlYWQtb25seSBCaW5kaW5nXG4gKlxuICogRmxvdy5qcyB1c2VzIHRoZSBIVE1MNSBjb252ZW50aW9uIG9mIHByZXBlbmRpbmcgZGF0YS0gdG8gYW55IGN1c3RvbSBIVE1MIGF0dHJpYnV0ZS4gRmxvdy5qcyBhbHNvIGFkZHMgYGZgIGZvciBlYXN5IGlkZW50aWZpY2F0aW9uIG9mIEZsb3cuanMuIEZvciBleGFtcGxlLCBGbG93LmpzIHByb3ZpZGVzIHNldmVyYWwgY3VzdG9tIGF0dHJpYnV0ZXMgYW5kIGF0dHJpYnV0ZSBoYW5kbGVycyAtLSBpbmNsdWRpbmcgW2RhdGEtZi1iaW5kXSguLi9iaW5kcy9kZWZhdWx0LWJpbmQtYXR0ciksIFtkYXRhLWYtZm9yZWFjaF0oLi4vZm9yZWFjaC9kZWZhdWx0LWZvcmVhY2gtYXR0ci8pLCBbZGF0YS1mLW9uLWluaXRdKC4uL2V2ZW50cy9pbml0LWV2ZW50LWF0dHIvKSwgZXRjLiBZb3UgY2FuIGFsc28gW2FkZCB5b3VyIG93biBhdHRyaWJ1dGUgaGFuZGxlcnNdKC4uL2F0dHJpYnV0ZS1tYW5hZ2VyLykuXG4gKlxuICogVGhlIGRlZmF1bHQgYmVoYXZpb3IgZm9yIGhhbmRsaW5nIGEga25vd24gYXR0cmlidXRlIGlzIHRvIHVzZSB0aGUgdmFsdWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlIGFzIHRoZSB2YWx1ZSBvZiB0aGUgYXR0cmlidXRlLiAoVGhlcmUgYXJlIGV4Y2VwdGlvbnMgZm9yIHNvbWUgW2Jvb2xlYW4gYXR0cmlidXRlc10oLi4vYm9vbGVhbi1hdHRyLykuKVxuICpcbiAqIFRoaXMgbWVhbnMgeW91IGNhbiBiaW5kIHZhcmlhYmxlcyBmcm9tIHRoZSBtb2RlbCBpbiB5b3VyIGludGVyZmFjZSBieSBhZGRpbmcgdGhlIGBkYXRhLWYtYCBwcmVmaXggdG8gYW55IHN0YW5kYXJkIERPTSBhdHRyaWJ1dGUuIFRoaXMgYXR0cmlidXRlIGJpbmRpbmcgaXMgKipyZWFkLW9ubHkqKiwgc28gYXMgdGhlIG1vZGVsIGNoYW5nZXMsIHRoZSBpbnRlcmZhY2UgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkOyBidXQgd2hlbiB1c2VycyBjaGFuZ2UgdmFsdWVzIGluIHRoZSBpbnRlcmZhY2UsIG5vIGFjdGlvbiBvY2N1cnMuXG4gKlxuICogKipUbyBkaXNwbGF5IGEgRE9NIGVsZW1lbnQgYmFzZWQgb24gYSB2YXJpYWJsZSBmcm9tIHRoZSBtb2RlbDoqKlxuICpcbiAqIDEuIEFkZCB0aGUgcHJlZml4IGBkYXRhLWYtYCB0byBhbnkgYXR0cmlidXRlIGluIGFueSBIVE1MIGVsZW1lbnQgdGhhdCBub3JtYWxseSB0YWtlcyBhIHZhbHVlLlxuICogMi4gU2V0IHRoZSB2YWx1ZSBvZiB0aGUgYXR0cmlidXRlIHRvIHRoZSBuYW1lIG9mIHRoZSBtb2RlbCB2YXJpYWJsZS5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqIFx0XHQ8IS0tIGlucHV0IGVsZW1lbnQgZGlzcGxheXMgdmFsdWUgb2Ygc2FtcGxlX2ludCwgaG93ZXZlcixcbiAqIFx0XHRcdG5vIGNhbGwgdG8gdGhlIG1vZGVsIGlzIG1hZGUgaWYgdXNlciBjaGFuZ2VzIHNhbXBsZV9pbnRcbiAqXG4gKlx0XHRcdGlmIHNhbXBsZV9pbnQgaXMgOCwgdGhpcyBpcyB0aGUgZXF1aXZhbGVudCBvZiA8aW5wdXQgdmFsdWU9XCI4XCI+PC9pbnB1dD4gLS0+XG4gKlxuICpcdFx0PGlucHV0IGRhdGEtZi12YWx1ZT1cInNhbXBsZV9pbnRcIj48L2lucHV0PlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGVzdDogJyonLFxuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSwgcHJvcCkge1xuICAgICAgICB0aGlzLnByb3AocHJvcCwgdmFsdWUpO1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjQ2FsbCBPcGVyYXRpb24gaW4gUmVzcG9uc2UgdG8gVXNlciBBY3Rpb25cbiAqXG4gKiBNYW55IG1vZGVscyBjYWxsIHBhcnRpY3VsYXIgb3BlcmF0aW9ucyBpbiByZXNwb25zZSB0byBlbmQgdXNlciBhY3Rpb25zLCBzdWNoIGFzIGNsaWNraW5nIGEgYnV0dG9uIG9yIHN1Ym1pdHRpbmcgYSBmb3JtLlxuICpcbiAqICMjIyNkYXRhLWYtb24tZXZlbnRcbiAqXG4gKiBGb3IgYW55IEhUTUwgYXR0cmlidXRlIHVzaW5nIGBvbmAgLS0gdHlwaWNhbGx5IG9uIGNsaWNrIG9yIG9uIHN1Ym1pdCAtLSB5b3UgY2FuIGFkZCB0aGUgYXR0cmlidXRlIGBkYXRhLWYtb24tWFhYYCwgYW5kIHNldCB0aGUgdmFsdWUgdG8gdGhlIG5hbWUgb2YgdGhlIG9wZXJhdGlvbi4gVG8gY2FsbCBtdWx0aXBsZSBvcGVyYXRpb25zLCB1c2UgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyIHRvIGNoYWluIG9wZXJhdGlvbnMuIE9wZXJhdGlvbnMgYXJlIGNhbGxlZCBzZXJpYWxseSwgaW4gdGhlIG9yZGVyIGxpc3RlZC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPGJ1dHRvbiBkYXRhLWYtb24tY2xpY2s9XCJyZXNldFwiPlJlc2V0PC9idXR0b24+XG4gKlxuICogICAgICA8YnV0dG9uIGRhdGEtZi1vbi1jbGljaz1cInN0ZXAoMSlcIj5BZHZhbmNlIE9uZSBTdGVwPC9idXR0b24+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IGZ1bmN0aW9uIChhdHRyLCAkbm9kZSkge1xuICAgICAgICByZXR1cm4gKGF0dHIuaW5kZXhPZignb24tJykgPT09IDApO1xuICAgIH0sXG5cbiAgICBzdG9wTGlzdGVuaW5nOiBmdW5jdGlvbiAoYXR0cikge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi0nLCAnJyk7XG4gICAgICAgIHRoaXMub2ZmKGF0dHIpO1xuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbiAoYXR0ciwgdmFsdWUpIHtcbiAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSgnb24tJywgJycpO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICB0aGlzLm9mZihhdHRyKS5vbihhdHRyLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbGlzdE9mT3BlcmF0aW9ucyA9IF8uaW52b2tlKHZhbHVlLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICBsaXN0T2ZPcGVyYXRpb25zID0gbGlzdE9mT3BlcmF0aW9ucy5tYXAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuTmFtZSA9IHZhbHVlLnNwbGl0KCcoJylbMF07XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHZhbHVlLnN1YnN0cmluZyh2YWx1ZS5pbmRleE9mKCcoJykgKyAxLCB2YWx1ZS5pbmRleE9mKCcpJykpO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gKCQudHJpbShwYXJhbXMpICE9PSAnJykgPyBwYXJhbXMuc3BsaXQoJywnKSA6IFtdO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IGZuTmFtZSwgcGFyYW1zOiBhcmdzIH07XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbWUudHJpZ2dlcignZi51aS5vcGVyYXRlJywgeyBvcGVyYXRpb25zOiBsaXN0T2ZPcGVyYXRpb25zLCBzZXJpYWw6IHRydWUgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vRG9uJ3QgYm90aGVyIGJpbmRpbmcgb24gdGhpcyBhdHRyLiBOT1RFOiBEbyByZWFkb25seSwgdHJ1ZSBpbnN0ZWFkPztcbiAgICB9XG59O1xuIiwiLyoqXG4gKiAjI0NhbGwgT3BlcmF0aW9uIHdoZW4gRWxlbWVudCBBZGRlZCB0byBET01cbiAqXG4gKiBNYW55IG1vZGVscyBjYWxsIGFuIGluaXRpYWxpemF0aW9uIG9wZXJhdGlvbiB3aGVuIHRoZSBbcnVuXSguLi8uLi8uLi8uLi8uLi8uLi9nbG9zc2FyeS8jcnVuKSBpcyBmaXJzdCBjcmVhdGVkLiBUaGlzIGlzIHBhcnRpY3VsYXJseSBjb21tb24gd2l0aCBbVmVuc2ltXSguLi8uLi8uLi8uLi8uLi8uLi9tb2RlbF9jb2RlL3ZlbnNpbS8pIG1vZGVscywgd2hpY2ggbmVlZCB0byBpbml0aWFsaXplIHZhcmlhYmxlcyAoJ3N0YXJ0R2FtZScpIGJlZm9yZSBzdGVwcGluZy4gWW91IGNhbiB1c2UgdGhlIGBkYXRhLWYtb24taW5pdGAgYXR0cmlidXRlIHRvIGNhbGwgYW4gb3BlcmF0aW9uIGZyb20gdGhlIG1vZGVsIHdoZW4gYSBwYXJ0aWN1bGFyIGVsZW1lbnQgaXMgYWRkZWQgdG8gdGhlIERPTS5cbiAqXG4gKiAjIyMjZGF0YS1mLW9uLWluaXRcbiAqXG4gKiBBZGQgdGhlIGF0dHJpYnV0ZSBgZGF0YS1mLW9uLWluaXRgLCBhbmQgc2V0IHRoZSB2YWx1ZSB0byB0aGUgbmFtZSBvZiB0aGUgb3BlcmF0aW9uLiBUbyBjYWxsIG11bHRpcGxlIG9wZXJhdGlvbnMsIHVzZSB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIgdG8gY2hhaW4gb3BlcmF0aW9ucy4gT3BlcmF0aW9ucyBhcmUgY2FsbGVkIHNlcmlhbGx5LCBpbiB0aGUgb3JkZXIgbGlzdGVkLiBUeXBpY2FsbHkgeW91IGFkZCB0aGlzIGF0dHJpYnV0ZSB0byB0aGUgYDxib2R5PmAgZWxlbWVudC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPGJvZHkgZGF0YS1mLW9uLWluaXQ9XCJzdGFydEdhbWVcIj5cbiAqXG4gKiAgICAgIDxib2R5IGRhdGEtZi1vbi1pbml0PVwic3RhcnRHYW1lIHwgc3RlcCgzKVwiPlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiBmdW5jdGlvbiAoYXR0ciwgJG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIChhdHRyLmluZGV4T2YoJ29uLWluaXQnKSA9PT0gMCk7XG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChhdHRyLCB2YWx1ZSkge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi1pbml0JywgJycpO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBsaXN0T2ZPcGVyYXRpb25zID0gXy5pbnZva2UodmFsdWUuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgIGxpc3RPZk9wZXJhdGlvbnMgPSBsaXN0T2ZPcGVyYXRpb25zLm1hcChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm5OYW1lID0gdmFsdWUuc3BsaXQoJygnKVswXTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gdmFsdWUuc3Vic3RyaW5nKHZhbHVlLmluZGV4T2YoJygnKSArIDEsIHZhbHVlLmluZGV4T2YoJyknKSk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSAoJC50cmltKHBhcmFtcykgIT09ICcnKSA/IHBhcmFtcy5zcGxpdCgnLCcpIDogW107XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogZm5OYW1lLCBwYXJhbXM6IGFyZ3MgfTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtZS50cmlnZ2VyKCdmLnVpLm9wZXJhdGUnLCB7IG9wZXJhdGlvbnM6IGxpc3RPZk9wZXJhdGlvbnMsIHNlcmlhbDogdHJ1ZSB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy9Eb24ndCBib3RoZXIgYmluZGluZyBvbiB0aGlzIGF0dHIuIE5PVEU6IERvIHJlYWRvbmx5LCB0cnVlIGluc3RlYWQ/O1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIERpc3BsYXkgQXJyYXkgYW5kIE9iamVjdCBWYXJpYWJsZXM6IGRhdGEtZi1mb3JlYWNoXG4gKlxuICogSWYgeW91ciBtb2RlbCB2YXJpYWJsZSBpcyBhbiBhcnJheSwgeW91IGNhbiByZWZlcmVuY2Ugc3BlY2lmaWMgZWxlbWVudHMgb2YgdGhlIGFycmF5IHVzaW5nIGBkYXRhLWYtYmluZGA6IGBkYXRhLWYtYmluZD1cInNhbGVzWzNdXCJgIG9yIGBkYXRhLWYtYmluZD1cInNhbGVzWzxjdXJyZW50UmVnaW9uPl1cImAsIGFzIGRlc2NyaWJlZCB1bmRlciBbZGF0YS1mLWJpbmRdKC4uLy4uL2JpbmRzL2RlZmF1bHQtYmluZC1hdHRyLykuXG4gKlxuICogSG93ZXZlciwgdGhhdCdzIG5vdCB0aGUgb25seSBvcHRpb24uIElmIHlvdSB3YW50IHRvIGF1dG9tYXRpY2FsbHkgbG9vcCBvdmVyIGFsbCBlbGVtZW50cyBvZiB0aGUgYXJyYXksIG9yIGFsbCB0aGUgZmllbGRzIG9mIGFuIG9iamVjdCwgeW91IGNhbiB1c2UgdGhlIGBkYXRhLWYtZm9yZWFjaGAgYXR0cmlidXRlIHRvIG5hbWUgdGhlIHZhcmlhYmxlLCB0aGVuIHVzZSB0ZW1wbGF0ZXMgdG8gYWNjZXNzIGl0cyBpbmRleCBhbmQgdmFsdWUgZm9yIGRpc3BsYXkuIChUZW1wbGF0ZXMgYXJlIGF2YWlsYWJsZSBhcyBwYXJ0IG9mIEZsb3cuanMncyBsb2Rhc2ggZGVwZW5kZW5jeS4gU2VlIG1vcmUgYmFja2dyb3VuZCBvbiBbd29ya2luZyB3aXRoIHRlbXBsYXRlc10oLi4vLi4vLi4vLi4vLi4vI3RlbXBsYXRlcykuKVxuICpcbiAqICoqVG8gZGlzcGxheSBhIERPTSBlbGVtZW50IGJhc2VkIG9uIGFuIGFycmF5IHZhcmlhYmxlIGZyb20gdGhlIG1vZGVsOioqXG4gKlxuICogMS4gQWRkIHRoZSBgZGF0YS1mLWZvcmVhY2hgIGF0dHJpYnV0ZSB0byBhbnkgSFRNTCBlbGVtZW50IHRoYXQgaGFzIHJlcGVhdGVkIHN1Yi1lbGVtZW50cy4gVGhlIHR3byBtb3N0IGNvbW1vbiBleGFtcGxlcyBhcmUgbGlzdHMgYW5kIHRhYmxlcy5cbiAqIDIuIFNldCB0aGUgdmFsdWUgb2YgdGhlIGBkYXRhLWYtZm9yZWFjaGAgYXR0cmlidXRlIGluIHlvdXIgdG9wLWxldmVsIEhUTUwgZWxlbWVudCB0byB0aGUgbmFtZSBvZiB0aGUgYXJyYXkgdmFyaWFibGUuXG4gKiAzLiBBZGQgdGhlIEhUTUwgaW4gd2hpY2ggdGhlIHZhbHVlIG9mIHlvdXIgYXJyYXkgdmFyaWFibGUgc2hvdWxkIGFwcGVhci5cbiAqIDQuIE9wdGlvbmFsbHksIGluc2lkZSB0aGUgaW5uZXIgSFRNTCBlbGVtZW50LCB1c2UgdGVtcGxhdGVzIChgPCU9ICU+YCkgdG8gcmVmZXJlbmNlIHRoZSBgaW5kZXhgIChmb3IgYXJyYXlzKSBvciBga2V5YCAoZm9yIG9iamVjdHMpIGFuZCBgdmFsdWVgIHRvIGRpc3BsYXkuIFRoZSBgaW5kZXhgLCBga2V5YCwgYW5kIGB2YWx1ZWAgYXJlIHNwZWNpYWwgdmFyaWFibGVzIHRoYXQgRmxvdy5qcyBwb3B1bGF0ZXMgZm9yIHlvdS5cbiAqXG4gKlxuICogKipFeGFtcGxlczoqKlxuICpcbiAqIEJ5IGRlZmF1bHQgJm1kYXNoOyB0aGF0IGlzLCBpZiB5b3UgZG8gbm90IGluY2x1ZGUgdGVtcGxhdGVzIGluIHlvdXIgSFRNTCAmbWRhc2g7IHRoZSBgdmFsdWVgIG9mIHRoZSBhcnJheSBlbGVtZW50IG9yIG9iamVjdCBmaWVsZCBhcHBlYXJzOlxuICpcbiAqICAgICAgPCEtLSB0aGUgbW9kZWwgdmFyaWFibGUgVGltZSBpcyBhbiBhcnJheSBvZiB5ZWFyc1xuICogICAgICAgICAgY3JlYXRlIGEgbGlzdCB0aGF0IHNob3dzIHdoaWNoIHllYXIgLS0+XG4gKlxuICogICAgICA8dWwgZGF0YS1mLWZvcmVhY2g9XCJUaW1lXCI+XG4gKiAgICAgICAgICA8bGk+PC9saT5cbiAqICAgICAgPC91bD5cbiAqXG4gKiBJbiB0aGUgdGhpcmQgc3RlcCBvZiB0aGUgbW9kZWwsIHRoaXMgZXhhbXBsZSBnZW5lcmF0ZXM6XG4gKlxuICogICAgICAqIDIwMTVcbiAqICAgICAgKiAyMDE2XG4gKiAgICAgICogMjAxN1xuICpcbiAqIE9wdGlvbmFsbHksIHlvdSBjYW4gdXNlIHRlbXBsYXRlcyAoYDwlPSAlPmApIHRvIHJlZmVyZW5jZSB0aGUgYGluZGV4YCBhbmQgYHZhbHVlYCBvZiB0aGUgYXJyYXkgZWxlbWVudCB0byBkaXNwbGF5LlxuICpcbiAqXG4gKiAgICAgIDwhLS0gdGhlIG1vZGVsIHZhcmlhYmxlIFRpbWUgaXMgYW4gYXJyYXkgb2YgeWVhcnNcbiAqICAgICAgICAgIGNyZWF0ZSBhIGxpc3QgdGhhdCBzaG93cyB3aGljaCB5ZWFyIC0tPlxuICpcbiAqICAgICAgPHVsIGRhdGEtZi1mb3JlYWNoPVwiVGltZVwiPlxuICogICAgICAgICAgPGxpPiBZZWFyIDwlPSBpbmRleCAlPjogPCU9IHZhbHVlICU+IDwvbGk+XG4gKiAgICAgIDwvdWw+XG4gKlxuICogSW4gdGhlIHRoaXJkIHN0ZXAgb2YgdGhlIG1vZGVsLCB0aGlzIGV4YW1wbGUgZ2VuZXJhdGVzOlxuICpcbiAqICAgICAgKiBZZWFyIDE6IDIwMTVcbiAqICAgICAgKiBZZWFyIDI6IDIwMTZcbiAqICAgICAgKiBZZWFyIDM6IDIwMTdcbiAqXG4gKiBBcyB3aXRoIG90aGVyIGBkYXRhLWYtYCBhdHRyaWJ1dGVzLCB5b3UgY2FuIHNwZWNpZnkgW2NvbnZlcnRlcnNdKC4uLy4uLy4uLy4uLy4uL2NvbnZlcnRlci1vdmVydmlldykgdG8gY29udmVydCBkYXRhIGZyb20gb25lIGZvcm0gdG8gYW5vdGhlcjpcbiAqXG4gKiAgICAgIDx1bCBkYXRhLWYtZm9yZWFjaD1cIlNhbGVzIHwgJHgseHh4XCI+XG4gKiAgICAgICAgICA8bGk+IFllYXIgPCU9IGluZGV4ICU+OiBTYWxlcyBvZiA8JT0gdmFsdWUgJT4gPC9saT5cbiAqICAgICAgPC91bD5cbiAqXG4gKlxuICogKipOb3RlczoqKlxuICpcbiAqICogWW91IGNhbiB1c2UgdGhlIGBkYXRhLWYtZm9yZWFjaGAgYXR0cmlidXRlIHdpdGggYm90aCBhcnJheXMgYW5kIG9iamVjdHMuIElmIHRoZSBtb2RlbCB2YXJpYWJsZSBpcyBhbiBvYmplY3QsIHJlZmVyZW5jZSB0aGUgYGtleWAgaW5zdGVhZCBvZiB0aGUgYGluZGV4YCBpbiB5b3VyIHRlbXBsYXRlcy5cbiAqICogVGhlIGBrZXlgLCBgaW5kZXhgLCBhbmQgYHZhbHVlYCBhcmUgc3BlY2lhbCB2YXJpYWJsZXMgdGhhdCBGbG93LmpzIHBvcHVsYXRlcyBmb3IgeW91LlxuICogKiBUaGUgdGVtcGxhdGUgc3ludGF4IGlzIHRvIGVuY2xvc2UgZWFjaCBrZXl3b3JkIChgaW5kZXhgLCBga2V5YCwgYHZhcmlhYmxlYCkgaW4gYDwlPWAgYW5kIGAlPmAuIFRlbXBsYXRlcyBhcmUgYXZhaWxhYmxlIGFzIHBhcnQgb2YgRmxvdy5qcydzIGxvZGFzaCBkZXBlbmRlbmN5LiBTZWUgbW9yZSBiYWNrZ3JvdW5kIG9uIFt3b3JraW5nIHdpdGggdGVtcGxhdGVzXSguLi8uLi8uLi8uLi8uLi8jdGVtcGxhdGVzKS5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xudmFyIHBhcnNlVXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi91dGlscy9wYXJzZS11dGlscycpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0ZXN0OiAnZm9yZWFjaCcsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIHZhbHVlID0gKCQuaXNQbGFpbk9iamVjdCh2YWx1ZSkgPyB2YWx1ZSA6IFtdLmNvbmNhdCh2YWx1ZSkpO1xuICAgICAgICB2YXIgJGxvb3BUZW1wbGF0ZSA9IHRoaXMuZGF0YSgnZm9yZWFjaC10ZW1wbGF0ZScpO1xuICAgICAgICBpZiAoISRsb29wVGVtcGxhdGUpIHtcbiAgICAgICAgICAgICRsb29wVGVtcGxhdGUgPSB0aGlzLmNoaWxkcmVuKCk7XG4gICAgICAgICAgICB0aGlzLmRhdGEoJ2ZvcmVhY2gtdGVtcGxhdGUnLCAkbG9vcFRlbXBsYXRlKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgJG1lID0gdGhpcy5lbXB0eSgpO1xuICAgICAgICBfLmVhY2godmFsdWUsIGZ1bmN0aW9uIChkYXRhdmFsLCBkYXRha2V5KSB7XG4gICAgICAgICAgICBpZiAoIWRhdGF2YWwpIHtcbiAgICAgICAgICAgICAgICBkYXRhdmFsID0gZGF0YXZhbCArICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG5vZGVzID0gJGxvb3BUZW1wbGF0ZS5jbG9uZSgpO1xuICAgICAgICAgICAgbm9kZXMuZWFjaChmdW5jdGlvbiAoaSwgbmV3Tm9kZSkge1xuICAgICAgICAgICAgICAgIG5ld05vZGUgPSAkKG5ld05vZGUpO1xuICAgICAgICAgICAgICAgIF8uZWFjaChuZXdOb2RlLmRhdGEoKSwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wbGF0ZWQgPSAgXy50ZW1wbGF0ZSh2YWwsIHsgdmFsdWU6IGRhdGF2YWwsIGluZGV4OiBkYXRha2V5LCBrZXk6IGRhdGFrZXkgfSk7XG4gICAgICAgICAgICAgICAgICAgIG5ld05vZGUuZGF0YShrZXksIHBhcnNlVXRpbHMudG9JbXBsaWNpdFR5cGUodGVtcGxhdGVkKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdmFyIG9sZEhUTUwgPSBuZXdOb2RlLmh0bWwoKTtcbiAgICAgICAgICAgICAgICB2YXIgY2xlYW5lZEhUTUwgPSBvbGRIVE1MLnJlcGxhY2UoLyZsdDsvZywgJzwnKS5yZXBsYWNlKC8mZ3Q7L2csICc+Jyk7XG4gICAgICAgICAgICAgICAgdmFyIHRlbXBsYXRlZCA9IF8udGVtcGxhdGUoY2xlYW5lZEhUTUwsIHsgdmFsdWU6IGRhdGF2YWwsIGtleTogZGF0YWtleSwgaW5kZXg6IGRhdGFrZXkgfSk7XG4gICAgICAgICAgICAgICAgaWYgKGNsZWFuZWRIVE1MID09PSB0ZW1wbGF0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3Tm9kZS5odG1sKGRhdGF2YWwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld05vZGUuaHRtbCh0ZW1wbGF0ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkbWUuYXBwZW5kKG5ld05vZGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIEJpbmRpbmcgZm9yIGRhdGEtZi1bYm9vbGVhbl1cbiAqXG4gKiBGbG93LmpzIHByb3ZpZGVzIHNwZWNpYWwgaGFuZGxpbmcgZm9yIEhUTUwgYXR0cmlidXRlcyB0aGF0IHRha2UgQm9vbGVhbiB2YWx1ZXMuXG4gKlxuICogSW4gcGFydGljdWxhciwgZm9yIG1vc3QgSFRNTCBhdHRyaWJ1dGVzIHRoYXQgZXhwZWN0IEJvb2xlYW4gdmFsdWVzLCB0aGUgYXR0cmlidXRlIGlzIGRpcmVjdGx5IHNldCB0byB0aGUgdmFsdWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlLiBUaGlzIGlzIHRydWUgZm9yIGBjaGVja2VkYCwgYHNlbGVjdGVkYCwgYGFzeW5jYCwgYGF1dG9mb2N1c2AsIGBhdXRvcGxheWAsIGBjb250cm9sc2AsIGBkZWZlcmAsIGBpc21hcGAsIGBsb29wYCwgYG11bHRpcGxlYCwgYG9wZW5gLCBgcmVxdWlyZWRgLCBhbmQgYHNjb3BlZGAuXG4gKlxuICogSG93ZXZlciwgdGhlcmUgYXJlIGEgZmV3IG5vdGFibGUgZXhjZXB0aW9ucy4gRm9yIHRoZSBIVE1MIGF0dHJpYnV0ZXMgYGRpc2FibGVkYCwgYGhpZGRlbmAsIGFuZCBgcmVhZG9ubHlgLCB0aGUgYXR0cmlidXRlIGlzIHNldCB0byB0aGUgKm9wcG9zaXRlKiBvZiB0aGUgdmFsdWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlLiBUaGlzIG1ha2VzIHRoZSByZXN1bHRpbmcgSFRNTCBlYXNpZXIgdG8gcmVhZC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPCEtLSB0aGlzIGNoZWNrYm94IGlzIENIRUNLRUQgd2hlbiBzYW1wbGVCb29sIGlzIFRSVUUsXG4gKiAgICAgICAgICAgYW5kIFVOQ0hFQ0tFRCB3aGVuIHNhbXBsZUJvb2wgaXMgRkFMU0UgLS0+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBkYXRhLWYtY2hlY2tlZD1cInNhbXBsZUJvb2xcIiAvPlxuICpcbiAqICAgICAgPCEtLSB0aGlzIGJ1dHRvbiBpcyBFTkFCTEVEIHdoZW4gc2FtcGxlQm9vbCBpcyBUUlVFLFxuICogICAgICAgICAgIGFuZCBESVNBQkxFRCB3aGVuIHNhbXBsZUJvb2wgaXMgRkFMU0UgLS0+XG4gKiAgICAgIDxidXR0b24gZGF0YS1mLWRpc2FibGVkPVwic2FtcGxlQm9vbFwiPkNsaWNrIE1lPC9idXR0b24+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IC9eKD86ZGlzYWJsZWR8aGlkZGVufHJlYWRvbmx5KSQvaSxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCAhdmFsdWUpO1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIE5vLW9wIEF0dHJpYnV0ZXNcbiAqXG4gKiBGbG93LmpzIHByb3ZpZGVzIHNwZWNpYWwgaGFuZGxpbmcgZm9yIGJvdGggYGRhdGEtZi1tb2RlbGAgKGRlc2NyaWJlZCBbaGVyZV0oLi4vLi4vLi4vLi4vI3VzaW5nX2luX3Byb2plY3QpKSBhbmQgYGRhdGEtZi1jb252ZXJ0YCAoZGVzY3JpYmVkIFtoZXJlXSguLi8uLi8uLi8uLi9jb252ZXJ0ZXItb3ZlcnZpZXcvKSkuIEZvciB0aGVzZSBhdHRyaWJ1dGVzLCB0aGUgZGVmYXVsdCBiZWhhdmlvciBpcyB0byBkbyBub3RoaW5nLCBzbyB0aGF0IHRoaXMgYWRkaXRpb25hbCBzcGVjaWFsIGhhbmRsaW5nIGNhbiB0YWtlIHByZWNlbmRlbmNlLlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8vIEF0dHJpYnV0ZXMgd2hpY2ggYXJlIGp1c3QgcGFyYW1ldGVycyB0byBvdGhlcnMgYW5kIGNhbiBqdXN0IGJlIGlnbm9yZWRcbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/Om1vZGVsfGNvbnZlcnQpJC9pLFxuXG4gICAgaGFuZGxlOiAkLm5vb3AsXG5cbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuIiwiLyoqXG4gKiAjIyBCaW5kaW5nIGZvciBkYXRhLWYtW2Jvb2xlYW5dXG4gKlxuICogRmxvdy5qcyBwcm92aWRlcyBzcGVjaWFsIGhhbmRsaW5nIGZvciBIVE1MIGF0dHJpYnV0ZXMgdGhhdCB0YWtlIEJvb2xlYW4gdmFsdWVzLlxuICpcbiAqIEluIHBhcnRpY3VsYXIsIGZvciBtb3N0IEhUTUwgYXR0cmlidXRlcyB0aGF0IGV4cGVjdCBCb29sZWFuIHZhbHVlcywgdGhlIGF0dHJpYnV0ZSBpcyBkaXJlY3RseSBzZXQgdG8gdGhlIHZhbHVlIG9mIHRoZSBtb2RlbCB2YXJpYWJsZS4gVGhpcyBpcyB0cnVlIGZvciBgY2hlY2tlZGAsIGBzZWxlY3RlZGAsIGBhc3luY2AsIGBhdXRvZm9jdXNgLCBgYXV0b3BsYXlgLCBgY29udHJvbHNgLCBgZGVmZXJgLCBgaXNtYXBgLCBgbG9vcGAsIGBtdWx0aXBsZWAsIGBvcGVuYCwgYHJlcXVpcmVkYCwgYW5kIGBzY29wZWRgLlxuICpcbiAqIEhvd2V2ZXIsIHRoZXJlIGFyZSBhIGZldyBub3RhYmxlIGV4Y2VwdGlvbnMuIEZvciB0aGUgSFRNTCBhdHRyaWJ1dGVzIGBkaXNhYmxlZGAsIGBoaWRkZW5gLCBhbmQgYHJlYWRvbmx5YCwgdGhlIGF0dHJpYnV0ZSBpcyBzZXQgdG8gdGhlICpvcHBvc2l0ZSogb2YgdGhlIHZhbHVlIG9mIHRoZSBtb2RlbCB2YXJpYWJsZS4gVGhpcyBtYWtlcyB0aGUgcmVzdWx0aW5nIEhUTUwgZWFzaWVyIHRvIHJlYWQuXG4gKlxuICogKipFeGFtcGxlKipcbiAqXG4gKiAgICAgIDwhLS0gdGhpcyBjaGVja2JveCBpcyBDSEVDS0VEIHdoZW4gc2FtcGxlQm9vbCBpcyBUUlVFLFxuICogICAgICAgICAgIGFuZCBVTkNIRUNLRUQgd2hlbiBzYW1wbGVCb29sIGlzIEZBTFNFIC0tPlxuICogICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgZGF0YS1mLWNoZWNrZWQ9XCJzYW1wbGVCb29sXCIgLz5cbiAqXG4gKiAgICAgIDwhLS0gdGhpcyBidXR0b24gaXMgRU5BQkxFRCB3aGVuIHNhbXBsZUJvb2wgaXMgVFJVRSxcbiAqICAgICAgICAgICBhbmQgRElTQUJMRUQgd2hlbiBzYW1wbGVCb29sIGlzIEZBTFNFIC0tPlxuICogICAgICA8YnV0dG9uIGRhdGEtZi1kaXNhYmxlZD1cInNhbXBsZUJvb2xcIj5DbGljayBNZTwvYnV0dG9uPlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogL14oPzpjaGVja2VkfHNlbGVjdGVkfGFzeW5jfGF1dG9mb2N1c3xhdXRvcGxheXxjb250cm9sc3xkZWZlcnxpc21hcHxsb29wfG11bHRpcGxlfG9wZW58cmVxdWlyZWR8c2NvcGVkKSQvaSxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIC8qanNsaW50IGVxZXE6IHRydWUqL1xuICAgICAgICB2YXIgdmFsID0gKHRoaXMuYXR0cigndmFsdWUnKSkgPyAodmFsdWUgPT0gdGhpcy5wcm9wKCd2YWx1ZScpKSA6ICEhdmFsdWU7XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCB2YWwpO1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIERPTSBNYW5hZ2VyXG4gKlxuICogVGhlIEZsb3cuanMgRE9NIE1hbmFnZXIgcHJvdmlkZXMgdHdvLXdheSBkYXRhIGJpbmRpbmdzIGZyb20geW91ciBwcm9qZWN0J3MgdXNlciBpbnRlcmZhY2UgdG8gdGhlIGNoYW5uZWwuIFRoZSBET00gTWFuYWdlciBpcyB0aGUgJ2dsdWUnIHRocm91Z2ggd2hpY2ggSFRNTCBET00gZWxlbWVudHMgLS0gaW5jbHVkaW5nIHRoZSBhdHRyaWJ1dGVzIGFuZCBhdHRyaWJ1dGUgaGFuZGxlcnMgcHJvdmlkZWQgYnkgRmxvdy5qcyBmb3IgW3ZhcmlhYmxlc10oLi4vLi4vYXR0cmlidXRlcy1vdmVydmlldy8pLCBbb3BlcmF0aW9uc10oLi4vLi4vb3BlcmF0aW9ucy1vdmVydmlldy8pIGFuZCBbY29udmVyc2lvbl0oLi4vLi4vY29udmVydGVyLW92ZXJ2aWV3LyksIGFuZCB0aG9zZSBbeW91IGNyZWF0ZV0oLi9hdHRyaWJ1dGVzL2F0dHJpYnV0ZS1tYW5hZ2VyLykgLS0gYXJlIGJvdW5kIHRvIHRoZSB2YXJpYWJsZSBhbmQgb3BlcmF0aW9ucyBbY2hhbm5lbHNdKC4uLy4uL2NoYW5uZWwtb3ZlcnZpZXcvKSB0byBsaW5rIHRoZW0gd2l0aCB5b3VyIHByb2plY3QncyBtb2RlbC4gU2VlIHRoZSBbRXBpY2VudGVyIGFyY2hpdGVjdHVyZSBkZXRhaWxzXSguLi8uLi8uLi9jcmVhdGluZ195b3VyX2ludGVyZmFjZS9hcmNoX2RldGFpbHMvKSBmb3IgYSB2aXN1YWwgZGVzY3JpcHRpb24gb2YgaG93IHRoZSBET00gTWFuYWdlciByZWxhdGVzIHRvIHRoZSBbcmVzdCBvZiB0aGUgRXBpY2VudGVyIHN0YWNrXSguLi8uLi8uLi9jcmVhdGluZ195b3VyX2ludGVyZmFjZS8pLlxuICpcbiAqIFRoZSBET00gTWFuYWdlciBpcyBhbiBpbnRlZ3JhbCBwYXJ0IG9mIHRoZSBGbG93LmpzIGFyY2hpdGVjdHVyZSBidXQsIGluIGtlZXBpbmcgd2l0aCBvdXIgZ2VuZXJhbCBwaGlsb3NvcGh5IG9mIGV4dGVuc2liaWxpdHkgYW5kIGNvbmZpZ3VyYWJpbGl0eSwgaXQgaXMgYWxzbyByZXBsYWNlYWJsZS4gRm9yIGluc3RhbmNlLCBpZiB5b3Ugd2FudCB0byBtYW5hZ2UgeW91ciBET00gc3RhdGUgd2l0aCBbQmFja2JvbmUgVmlld3NdKGh0dHA6Ly9iYWNrYm9uZWpzLm9yZykgb3IgW0FuZ3VsYXIuanNdKGh0dHBzOi8vYW5ndWxhcmpzLm9yZyksIHdoaWxlIHN0aWxsIHVzaW5nIHRoZSBjaGFubmVscyB0byBoYW5kbGUgdGhlIGNvbW11bmljYXRpb24gd2l0aCB5b3VyIG1vZGVsLCB0aGlzIGlzIHRoZSBwaWVjZSB5b3UnZCByZXBsYWNlLiBbQ29udGFjdCB1c10oaHR0cDovL2ZvcmlvLmNvbS9hYm91dC9jb250YWN0LykgaWYgeW91IGFyZSBpbnRlcmVzdGVkIGluIGV4dGVuZGluZyBGbG93LmpzIGluIHRoaXMgd2F5IC0tIHdlJ2xsIGJlIGhhcHB5IHRvIHRhbGsgYWJvdXQgaXQgaW4gbW9yZSBkZXRhaWwuXG4gKlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgdmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xuXG4gICAgdmFyIG5vZGVNYW5hZ2VyID0gcmVxdWlyZSgnLi9ub2Rlcy9ub2RlLW1hbmFnZXInKTtcbiAgICB2YXIgYXR0ck1hbmFnZXIgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZXMvYXR0cmlidXRlLW1hbmFnZXInKTtcbiAgICB2YXIgY29udmVydGVyTWFuYWdlciA9IHJlcXVpcmUoJy4uL2NvbnZlcnRlcnMvY29udmVydGVyLW1hbmFnZXInKTtcblxuICAgIHZhciBwYXJzZVV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvcGFyc2UtdXRpbHMnKTtcbiAgICB2YXIgZG9tVXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy9kb20nKTtcblxuICAgIHZhciBhdXRvVXBkYXRlUGx1Z2luID0gcmVxdWlyZSgnLi9wbHVnaW5zL2F1dG8tdXBkYXRlLWJpbmRpbmdzJyk7XG5cbiAgICAvL0pxdWVyeSBzZWxlY3RvciB0byByZXR1cm4gZXZlcnl0aGluZyB3aGljaCBoYXMgYSBmLSBwcm9wZXJ0eSBzZXRcbiAgICAkLmV4cHJbJzonXVtjb25maWcucHJlZml4XSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyICR0aGlzID0gJChvYmopO1xuICAgICAgICB2YXIgZGF0YXByb3BzID0gXy5rZXlzKCR0aGlzLmRhdGEoKSk7XG5cbiAgICAgICAgdmFyIG1hdGNoID0gXy5maW5kKGRhdGFwcm9wcywgZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgICAgICAgIHJldHVybiAoYXR0ci5pbmRleE9mKGNvbmZpZy5wcmVmaXgpID09PSAwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuICEhKG1hdGNoKTtcbiAgICB9O1xuXG4gICAgJC5leHByWyc6J10ud2ViY29tcG9uZW50ID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gb2JqLm5vZGVOYW1lLmluZGV4T2YoJy0nKSAhPT0gLTE7XG4gICAgfTtcblxuICAgIHZhciBnZXRNYXRjaGluZ0VsZW1lbnRzID0gZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAgICAgdmFyICRyb290ID0gJChyb290KTtcbiAgICAgICAgdmFyIG1hdGNoZWRFbGVtZW50cyA9ICRyb290LmZpbmQoJzonICsgY29uZmlnLnByZWZpeCk7XG4gICAgICAgIGlmICgkcm9vdC5pcygnOicgKyBjb25maWcucHJlZml4KSkge1xuICAgICAgICAgICAgbWF0Y2hlZEVsZW1lbnRzID0gbWF0Y2hlZEVsZW1lbnRzLmFkZCgkcm9vdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1hdGNoZWRFbGVtZW50cztcbiAgICB9O1xuXG4gICAgdmFyIGdldEVsZW1lbnRPckVycm9yID0gZnVuY3Rpb24gKGVsZW1lbnQsIGNvbnRleHQpIHtcbiAgICAgICAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiAkKSB7XG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5nZXQoMCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFlbGVtZW50IHx8ICFlbGVtZW50Lm5vZGVOYW1lKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGNvbnRleHQsICdFeHBlY3RlZCB0byBnZXQgRE9NIEVsZW1lbnQsIGdvdCAnLCBlbGVtZW50KTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihjb250ZXh0ICsgJzogRXhwZWN0ZWQgdG8gZ2V0IERPTSBFbGVtZW50LCBnb3QnICsgKHR5cGVvZiBlbGVtZW50KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfTtcblxuICAgIHZhciBwdWJsaWNBUEkgPSB7XG5cbiAgICAgICAgbm9kZXM6IG5vZGVNYW5hZ2VyLFxuICAgICAgICBhdHRyaWJ1dGVzOiBhdHRyTWFuYWdlcixcbiAgICAgICAgY29udmVydGVyczogY29udmVydGVyTWFuYWdlcixcbiAgICAgICAgLy91dGlscyBmb3IgdGVzdGluZ1xuICAgICAgICBwcml2YXRlOiB7XG4gICAgICAgICAgICBtYXRjaGVkRWxlbWVudHM6IFtdXG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFVuYmluZCB0aGUgZWxlbWVudDogdW5zdWJzY3JpYmUgZnJvbSBhbGwgdXBkYXRlcyBvbiB0aGUgcmVsZXZhbnQgY2hhbm5lbHMuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7RG9tRWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0byByZW1vdmUgZnJvbSB0aGUgZGF0YSBiaW5kaW5nLlxuICAgICAgICAgKiBAcGFyYW0ge0NoYW5uZWxJbnN0YW5jZX0gY2hhbm5lbCAoT3B0aW9uYWwpIFRoZSBjaGFubmVsIGZyb20gd2hpY2ggdG8gdW5zdWJzY3JpYmUuIERlZmF1bHRzIHRvIHRoZSBbdmFyaWFibGVzIGNoYW5uZWxdKC4uL2NoYW5uZWxzL3ZhcmlhYmxlcy1jaGFubmVsLykuXG4gICAgICAgICAqL1xuICAgICAgICB1bmJpbmRFbGVtZW50OiBmdW5jdGlvbiAoZWxlbWVudCwgY2hhbm5lbCkge1xuICAgICAgICAgICAgaWYgKCFjaGFubmVsKSB7XG4gICAgICAgICAgICAgICAgY2hhbm5lbCA9IHRoaXMub3B0aW9ucy5jaGFubmVsLnZhcmlhYmxlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsZW1lbnQgPSBnZXRFbGVtZW50T3JFcnJvcihlbGVtZW50KTtcbiAgICAgICAgICAgIHZhciAkZWwgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKCEkZWwuaXMoJzonICsgY29uZmlnLnByZWZpeCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzID0gXy53aXRob3V0KHRoaXMucHJpdmF0ZS5tYXRjaGVkRWxlbWVudHMsIGVsZW1lbnQpO1xuXG4gICAgICAgICAgICAvL0ZJWE1FOiBoYXZlIHRvIHJlYWRkIGV2ZW50cyB0byBiZSBhYmxlIHRvIHJlbW92ZSB0aGVtLiBVZ2x5XG4gICAgICAgICAgICB2YXIgSGFuZGxlciA9IG5vZGVNYW5hZ2VyLmdldEhhbmRsZXIoJGVsKTtcbiAgICAgICAgICAgIHZhciBoID0gbmV3IEhhbmRsZXIuaGFuZGxlKHtcbiAgICAgICAgICAgICAgICBlbDogZWxlbWVudFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoaC5yZW1vdmVFdmVudHMpIHtcbiAgICAgICAgICAgICAgICBoLnJlbW92ZUV2ZW50cygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkKGVsZW1lbnQuYXR0cmlidXRlcykuZWFjaChmdW5jdGlvbiAoaW5kZXgsIG5vZGVNYXApIHtcbiAgICAgICAgICAgICAgICB2YXIgYXR0ciA9IG5vZGVNYXAubm9kZU5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIHdhbnRlZFByZWZpeCA9ICdkYXRhLWYtJztcbiAgICAgICAgICAgICAgICBpZiAoYXR0ci5pbmRleE9mKHdhbnRlZFByZWZpeCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSh3YW50ZWRQcmVmaXgsICcnKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlciA9IGF0dHJNYW5hZ2VyLmdldEhhbmRsZXIoYXR0ciwgJGVsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhbmRsZXIuc3RvcExpc3RlbmluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlci5zdG9wTGlzdGVuaW5nLmNhbGwoJGVsLCBhdHRyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgc3Vic2lkID0gJGVsLmRhdGEoJ2Ytc3Vic2NyaXB0aW9uLWlkJykgfHwgW107XG4gICAgICAgICAgICBfLmVhY2goc3Vic2lkLCBmdW5jdGlvbiAoc3Vicykge1xuICAgICAgICAgICAgICAgIGNoYW5uZWwudW5zdWJzY3JpYmUoc3Vicyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQmluZCB0aGUgZWxlbWVudDogc3Vic2NyaWJlIGZyb20gdXBkYXRlcyBvbiB0aGUgcmVsZXZhbnQgY2hhbm5lbHMuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7RG9tRWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0byBhZGQgdG8gdGhlIGRhdGEgYmluZGluZy5cbiAgICAgICAgICogQHBhcmFtIHtDaGFubmVsSW5zdGFuY2V9IGNoYW5uZWwgKE9wdGlvbmFsKSBUaGUgY2hhbm5lbCB0byBzdWJzY3JpYmUgdG8uIERlZmF1bHRzIHRvIHRoZSBbdmFyaWFibGVzIGNoYW5uZWxdKC4uL2NoYW5uZWxzL3ZhcmlhYmxlcy1jaGFubmVsLykuXG4gICAgICAgICAqL1xuICAgICAgICBiaW5kRWxlbWVudDogZnVuY3Rpb24gKGVsZW1lbnQsIGNoYW5uZWwpIHtcbiAgICAgICAgICAgIGlmICghY2hhbm5lbCkge1xuICAgICAgICAgICAgICAgIGNoYW5uZWwgPSB0aGlzLm9wdGlvbnMuY2hhbm5lbC52YXJpYWJsZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtZW50ID0gZ2V0RWxlbWVudE9yRXJyb3IoZWxlbWVudCk7XG4gICAgICAgICAgICB2YXIgJGVsID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGlmICghJGVsLmlzKCc6JyArIGNvbmZpZy5wcmVmaXgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFfLmNvbnRhaW5zKHRoaXMucHJpdmF0ZS5tYXRjaGVkRWxlbWVudHMsIGVsZW1lbnQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcml2YXRlLm1hdGNoZWRFbGVtZW50cy5wdXNoKGVsZW1lbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL1NlbmQgdG8gbm9kZSBtYW5hZ2VyIHRvIGhhbmRsZSB1aSBjaGFuZ2VzXG4gICAgICAgICAgICB2YXIgSGFuZGxlciA9IG5vZGVNYW5hZ2VyLmdldEhhbmRsZXIoJGVsKTtcbiAgICAgICAgICAgIG5ldyBIYW5kbGVyLmhhbmRsZSh7XG4gICAgICAgICAgICAgICAgZWw6IGVsZW1lbnRcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgc3Vic2NyaWJlID0gZnVuY3Rpb24gKGNoYW5uZWwsIHZhcnNUb0JpbmQsICRlbCwgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIGlmICghdmFyc1RvQmluZCB8fCAhdmFyc1RvQmluZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgc3Vic2lkID0gY2hhbm5lbC5zdWJzY3JpYmUodmFyc1RvQmluZCwgJGVsLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB2YXIgbmV3c3VicyA9ICgkZWwuZGF0YSgnZi1zdWJzY3JpcHRpb24taWQnKSB8fCBbXSkuY29uY2F0KHN1YnNpZCk7XG4gICAgICAgICAgICAgICAgJGVsLmRhdGEoJ2Ytc3Vic2NyaXB0aW9uLWlkJywgbmV3c3Vicyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgYXR0ckJpbmRpbmdzID0gW107XG4gICAgICAgICAgICB2YXIgbm9uQmF0Y2hhYmxlVmFyaWFibGVzID0gW107XG4gICAgICAgICAgICAvL05PVEU6IGxvb3BpbmcgdGhyb3VnaCBhdHRyaWJ1dGVzIGluc3RlYWQgb2YgLmRhdGEgYmVjYXVzZSAuZGF0YSBhdXRvbWF0aWNhbGx5IGNhbWVsY2FzZXMgcHJvcGVydGllcyBhbmQgbWFrZSBpdCBoYXJkIHRvIHJldHJ2aWV2ZVxuICAgICAgICAgICAgJChlbGVtZW50LmF0dHJpYnV0ZXMpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBub2RlTWFwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGF0dHIgPSBub2RlTWFwLm5vZGVOYW1lO1xuICAgICAgICAgICAgICAgIHZhciBhdHRyVmFsID0gbm9kZU1hcC52YWx1ZTtcblxuICAgICAgICAgICAgICAgIHZhciB3YW50ZWRQcmVmaXggPSAnZGF0YS1mLSc7XG4gICAgICAgICAgICAgICAgaWYgKGF0dHIuaW5kZXhPZih3YW50ZWRQcmVmaXgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGF0dHIgPSBhdHRyLnJlcGxhY2Uod2FudGVkUHJlZml4LCAnJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBhdHRyTWFuYWdlci5nZXRIYW5kbGVyKGF0dHIsICRlbCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpc0JpbmRhYmxlQXR0ciA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYW5kbGVyICYmIGhhbmRsZXIuaW5pdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNCaW5kYWJsZUF0dHIgPSBoYW5kbGVyLmluaXQuY2FsbCgkZWwsIGF0dHIsIGF0dHJWYWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQmluZGFibGVBdHRyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL0NvbnZlcnQgcGlwZXMgdG8gY29udmVydGVyIGF0dHJzXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgd2l0aENvbnYgPSBfLmludm9rZShhdHRyVmFsLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAod2l0aENvbnYubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJWYWwgPSB3aXRoQ29udi5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRlbC5kYXRhKCdmLWNvbnZlcnQtJyArIGF0dHIsIHdpdGhDb252KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJpbmRpbmcgPSB7IGF0dHI6IGF0dHIgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb21tYVJlZ2V4ID0gLywoPyFbXlxcW10qXFxdKS87XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0clZhbC5pbmRleE9mKCc8JScpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vQXNzdW1lIGl0J3MgdGVtcGxhdGVkIGZvciBsYXRlciB1c2VcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhdHRyVmFsLnNwbGl0KGNvbW1hUmVnZXgpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFyc1RvQmluZCA9IF8uaW52b2tlKGF0dHJWYWwuc3BsaXQoY29tbWFSZWdleCksICd0cmltJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Vic2NyaWJlKGNoYW5uZWwsIHZhcnNUb0JpbmQsICRlbCwgeyBiYXRjaDogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiaW5kaW5nLnRvcGljcyA9IHZhcnNUb0JpbmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJpbmRpbmcudG9waWNzID0gW2F0dHJWYWxdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vbkJhdGNoYWJsZVZhcmlhYmxlcy5wdXNoKGF0dHJWYWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYXR0ckJpbmRpbmdzLnB1c2goYmluZGluZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRlbC5kYXRhKCdhdHRyLWJpbmRpbmdzJywgYXR0ckJpbmRpbmdzKTtcbiAgICAgICAgICAgIGlmIChub25CYXRjaGFibGVWYXJpYWJsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3N1YnNjcmliZScsIG5vbkJhdGNoYWJsZVZhcmlhYmxlcywgJGVsLmdldCgwKSlcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmUoY2hhbm5lbCwgbm9uQmF0Y2hhYmxlVmFyaWFibGVzLCAkZWwsIHsgYmF0Y2g6IGZhbHNlIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBCaW5kIGFsbCBwcm92aWRlZCBlbGVtZW50cy5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtICB7QXJyYXl8alF1ZXJ5U2VsZWN0b3J9IGVsZW1lbnRzVG9CaW5kIChPcHRpb25hbCkgSWYgbm90IHByb3ZpZGVkLCBiaW5kcyBhbGwgbWF0Y2hpbmcgZWxlbWVudHMgd2l0aGluIGRlZmF1bHQgcm9vdCBwcm92aWRlZCBhdCBpbml0aWFsaXphdGlvbi5cbiAgICAgICAgICovXG4gICAgICAgIGJpbmRBbGw6IGZ1bmN0aW9uIChlbGVtZW50c1RvQmluZCkge1xuICAgICAgICAgICAgaWYgKCFlbGVtZW50c1RvQmluZCkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzVG9CaW5kID0gZ2V0TWF0Y2hpbmdFbGVtZW50cyh0aGlzLm9wdGlvbnMucm9vdCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFfLmlzQXJyYXkoZWxlbWVudHNUb0JpbmQpKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudHNUb0JpbmQgPSBnZXRNYXRjaGluZ0VsZW1lbnRzKGVsZW1lbnRzVG9CaW5kKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIC8vcGFyc2UgdGhyb3VnaCBkb20gYW5kIGZpbmQgZXZlcnl0aGluZyB3aXRoIG1hdGNoaW5nIGF0dHJpYnV0ZXNcbiAgICAgICAgICAgICQuZWFjaChlbGVtZW50c1RvQmluZCwgZnVuY3Rpb24gKGluZGV4LCBlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgbWUuYmluZEVsZW1lbnQuY2FsbChtZSwgZWxlbWVudCwgbWUub3B0aW9ucy5jaGFubmVsLnZhcmlhYmxlcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFVuYmluZCBwcm92aWRlZCBlbGVtZW50cy5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtICB7QXJyYXl9IGVsZW1lbnRzVG9VbmJpbmQgKE9wdGlvbmFsKSBJZiBub3QgcHJvdmlkZWQsIHVuYmluZHMgZXZlcnl0aGluZy5cbiAgICAgICAgICovXG4gICAgICAgIHVuYmluZEFsbDogZnVuY3Rpb24gKGVsZW1lbnRzVG9VbmJpbmQpIHtcbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICBpZiAoIWVsZW1lbnRzVG9VbmJpbmQpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50c1RvVW5iaW5kID0gdGhpcy5wcml2YXRlLm1hdGNoZWRFbGVtZW50cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQuZWFjaChlbGVtZW50c1RvVW5iaW5kLCBmdW5jdGlvbiAoaW5kZXgsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBtZS51bmJpbmRFbGVtZW50LmNhbGwobWUsIGVsZW1lbnQsIG1lLm9wdGlvbnMuY2hhbm5lbC52YXJpYWJsZXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEluaXRpYWxpemUgdGhlIERPTSBNYW5hZ2VyIHRvIHdvcmsgd2l0aCBhIHBhcnRpY3VsYXIgSFRNTCBlbGVtZW50IGFuZCBhbGwgZWxlbWVudHMgd2l0aGluIHRoYXQgcm9vdC4gRGF0YSBiaW5kaW5ncyBiZXR3ZWVuIGluZGl2aWR1YWwgSFRNTCBlbGVtZW50cyBhbmQgdGhlIG1vZGVsIHZhcmlhYmxlcyBzcGVjaWZpZWQgaW4gdGhlIGF0dHJpYnV0ZXMgd2lsbCBoYXBwZW4gdmlhIHRoZSBjaGFubmVsLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAoT3B0aW9uYWwpIE92ZXJyaWRlcyBmb3IgdGhlIGRlZmF1bHQgb3B0aW9ucy5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdGlvbnMucm9vdCBUaGUgcm9vdCBIVE1MIGVsZW1lbnQgYmVpbmcgbWFuYWdlZCBieSB0aGlzIGluc3RhbmNlIG9mIHRoZSBET00gTWFuYWdlci4gRGVmYXVsdHMgdG8gYGJvZHlgLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucy5jaGFubmVsIFRoZSBjaGFubmVsIHRvIGNvbW11bmljYXRlIHdpdGguIERlZmF1bHRzIHRvIHRoZSBDaGFubmVsIE1hbmFnZXIgZnJvbSBbRXBpY2VudGVyLmpzXSguLi8uLi8uLi9hcGlfYWRhcHRlcnMvKS5cbiAgICAgICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLmF1dG9CaW5kIElmIGB0cnVlYCAoZGVmYXVsdCksIGFueSB2YXJpYWJsZXMgYWRkZWQgdG8gdGhlIERPTSBhZnRlciBgRmxvdy5pbml0aWFsaXplKClgIGhhcyBiZWVuIGNhbGxlZCB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgcGFyc2VkLCBhbmQgc3Vic2NyaXB0aW9ucyBhZGRlZCB0byBjaGFubmVscy4gTm90ZSwgdGhpcyBkb2VzIG5vdCB3b3JrIGluIElFIHZlcnNpb25zIDwgMTEuXG4gICAgICAgICAqL1xuICAgICAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJvb3Qgb2YgdGhlIGVsZW1lbnQgZm9yIGZsb3cuanMgdG8gbWFuYWdlIGZyb20uXG4gICAgICAgICAgICAgICAgICogQHR5cGUge1N0cmluZ30galF1ZXJ5IHNlbGVjdG9yXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcm9vdDogJ2JvZHknLFxuICAgICAgICAgICAgICAgIGNoYW5uZWw6IG51bGwsXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBBbnkgdmFyaWFibGVzIGFkZGVkIHRvIHRoZSBET00gYWZ0ZXIgYEZsb3cuaW5pdGlhbGl6ZSgpYCBoYXMgYmVlbiBjYWxsZWQgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHBhcnNlZCwgYW5kIHN1YnNjcmlwdGlvbnMgYWRkZWQgdG8gY2hhbm5lbHMuIE5vdGUsIHRoaXMgZG9lcyBub3Qgd29yayBpbiBJRSB2ZXJzaW9ucyA8IDExLlxuICAgICAgICAgICAgICAgICAqIEB0eXBlIHtCb29sZWFufVxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGF1dG9CaW5kOiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgJC5leHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gICAgICAgICAgICB2YXIgY2hhbm5lbCA9IGRlZmF1bHRzLmNoYW5uZWw7XG5cbiAgICAgICAgICAgIHRoaXMub3B0aW9ucyA9IGRlZmF1bHRzO1xuXG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgdmFyICRyb290ID0gJChkZWZhdWx0cy5yb290KTtcbiAgICAgICAgICAgICQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIG1lLmJpbmRBbGwoKTtcbiAgICAgICAgICAgICAgICAkcm9vdC50cmlnZ2VyKCdmLmRvbXJlYWR5Jyk7XG5cbiAgICAgICAgICAgICAgICAvL0F0dGFjaCBsaXN0ZW5lcnNcbiAgICAgICAgICAgICAgICAvLyBMaXN0ZW4gZm9yIGNoYW5nZXMgdG8gdWkgYW5kIHB1Ymxpc2ggdG8gYXBpXG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKGNvbmZpZy5ldmVudHMudHJpZ2dlcikub24oY29uZmlnLmV2ZW50cy50cmlnZ2VyLCBmdW5jdGlvbiAoZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJzZWREYXRhID0ge307IC8vaWYgbm90IGFsbCBzdWJzZXF1ZW50IGxpc3RlbmVycyB3aWxsIGdldCB0aGUgbW9kaWZpZWQgZGF0YVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciAkZWwgPSAkKGV2dC50YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXR0ckNvbnZlcnRlcnMgPSAgZG9tVXRpbHMuZ2V0Q29udmVydGVyc0xpc3QoJGVsLCAnYmluZCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaChkYXRhLCBmdW5jdGlvbiAodmFsLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleSA9IGtleS5zcGxpdCgnfCcpWzBdLnRyaW0oKTsgLy9pbiBjYXNlIHRoZSBwaXBlIGZvcm1hdHRpbmcgc3ludGF4IHdhcyB1c2VkXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSBjb252ZXJ0ZXJNYW5hZ2VyLnBhcnNlKHZhbCwgYXR0ckNvbnZlcnRlcnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VkRGF0YVtrZXldID0gcGFyc2VVdGlscy50b0ltcGxpY2l0VHlwZSh2YWwpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAkZWwudHJpZ2dlcignZi5jb252ZXJ0JywgeyBiaW5kOiB2YWwgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGNoYW5uZWwudmFyaWFibGVzLnB1Ymxpc2gocGFyc2VkRGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBMaXN0ZW4gZm9yIGNoYW5nZXMgZnJvbSBhcGkgYW5kIHVwZGF0ZSB1aVxuICAgICAgICAgICAgICAgICRyb290Lm9mZihjb25maWcuZXZlbnRzLnJlYWN0KS5vbihjb25maWcuZXZlbnRzLnJlYWN0LCBmdW5jdGlvbiAoZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGV2dC50YXJnZXQsIGRhdGEsIFwicm9vdCBvblwiKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRlbCA9ICQoZXZ0LnRhcmdldCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBiaW5kaW5ncyA9ICRlbC5kYXRhKCdhdHRyLWJpbmRpbmdzJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHRvY29udmVydCA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAkLmVhY2goZGF0YSwgZnVuY3Rpb24gKHZhcmlhYmxlTmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZWFjaChiaW5kaW5ncywgZnVuY3Rpb24gKGJpbmRpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoXy5jb250YWlucyhiaW5kaW5nLnRvcGljcywgdmFyaWFibGVOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmluZGluZy50b3BpY3MubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9jb252ZXJ0W2JpbmRpbmcuYXR0cl0gPSBfLnBpY2soZGF0YSwgYmluZGluZy50b3BpY3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9jb252ZXJ0W2JpbmRpbmcuYXR0cl0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgJGVsLnRyaWdnZXIoJ2YuY29udmVydCcsIHRvY29udmVydCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBkYXRhID0ge3Byb3B0b3VwZGF0ZTogdmFsdWV9IHx8IGp1c3QgYSB2YWx1ZSAoYXNzdW1lcyAnYmluZCcgaWYgc28pXG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKCdmLmNvbnZlcnQnKS5vbignZi5jb252ZXJ0JywgZnVuY3Rpb24gKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgJGVsID0gJChldnQudGFyZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnZlcnQgPSBmdW5jdGlvbiAodmFsLCBwcm9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wID0gcHJvcC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJDb252ZXJ0ZXJzID0gIGRvbVV0aWxzLmdldENvbnZlcnRlcnNMaXN0KCRlbCwgcHJvcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlciA9IGF0dHJNYW5hZ2VyLmdldEhhbmRsZXIocHJvcCwgJGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb252ZXJ0ZWRWYWx1ZSA9IGNvbnZlcnRlck1hbmFnZXIuY29udmVydCh2YWwsIGF0dHJDb252ZXJ0ZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXIuaGFuZGxlLmNhbGwoJGVsLCBjb252ZXJ0ZWRWYWx1ZSwgcHJvcCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGRhdGEsIGNvbnZlcnQpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udmVydChkYXRhLCAnYmluZCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoJ2YudWkub3BlcmF0ZScpLm9uKCdmLnVpLm9wZXJhdGUnLCBmdW5jdGlvbiAoZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGF0YSk7IC8vaWYgbm90IGFsbCBzdWJzZXF1ZW50IGxpc3RlbmVycyB3aWxsIGdldCB0aGUgbW9kaWZpZWQgZGF0YVxuICAgICAgICAgICAgICAgICAgICBfLmVhY2goZGF0YS5vcGVyYXRpb25zLCBmdW5jdGlvbiAob3BuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgIG9wbi5wYXJhbXMgPSBfLm1hcChvcG4ucGFyYW1zLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VVdGlscy50b0ltcGxpY2l0VHlwZSgkLnRyaW0odmFsKSk7XG4gICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2hhbm5lbC5vcGVyYXRpb25zLnB1Ymxpc2goZGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAobWUub3B0aW9ucy5hdXRvQmluZCkge1xuICAgICAgICAgICAgICAgICAgICBhdXRvVXBkYXRlUGx1Z2luKCRyb290LmdldCgwKSwgbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiAkLmV4dGVuZCh0aGlzLCBwdWJsaWNBUEkpO1xufSgpKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGV4dGVuZCA9IGZ1bmN0aW9uIChwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgIHZhciBjaGlsZDtcblxuICAgIC8vIFRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgdGhlIG5ldyBzdWJjbGFzcyBpcyBlaXRoZXIgZGVmaW5lZCBieSB5b3VcbiAgICAvLyAodGhlIFwiY29uc3RydWN0b3JcIiBwcm9wZXJ0eSBpbiB5b3VyIGBleHRlbmRgIGRlZmluaXRpb24pLCBvciBkZWZhdWx0ZWRcbiAgICAvLyBieSB1cyB0byBzaW1wbHkgY2FsbCB0aGUgcGFyZW50J3MgY29uc3RydWN0b3IuXG4gICAgaWYgKHByb3RvUHJvcHMgJiYgXy5oYXMocHJvdG9Qcm9wcywgJ2NvbnN0cnVjdG9yJykpIHtcbiAgICAgICAgY2hpbGQgPSBwcm90b1Byb3BzLmNvbnN0cnVjdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNoaWxkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gcGFyZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7IH07XG4gICAgfVxuXG4gICAgLy8gQWRkIHN0YXRpYyBwcm9wZXJ0aWVzIHRvIHRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiwgaWYgc3VwcGxpZWQuXG4gICAgXy5leHRlbmQoY2hpbGQsIHBhcmVudCwgc3RhdGljUHJvcHMpO1xuXG4gICAgLy8gU2V0IHRoZSBwcm90b3R5cGUgY2hhaW4gdG8gaW5oZXJpdCBmcm9tIGBwYXJlbnRgLCB3aXRob3V0IGNhbGxpbmdcbiAgICAvLyBgcGFyZW50YCdzIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICAgIHZhciBTdXJyb2dhdGUgPSBmdW5jdGlvbiAoKSB7IHRoaXMuY29uc3RydWN0b3IgPSBjaGlsZDsgfTtcbiAgICBTdXJyb2dhdGUucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTtcbiAgICBjaGlsZC5wcm90b3R5cGUgPSBuZXcgU3Vycm9nYXRlKCk7XG5cbiAgICAvLyBBZGQgcHJvdG90eXBlIHByb3BlcnRpZXMgKGluc3RhbmNlIHByb3BlcnRpZXMpIHRvIHRoZSBzdWJjbGFzcyxcbiAgICAvLyBpZiBzdXBwbGllZC5cbiAgICBpZiAocHJvdG9Qcm9wcykge1xuICAgICAgICBfLmV4dGVuZChjaGlsZC5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICAgIH1cblxuICAgIC8vIFNldCBhIGNvbnZlbmllbmNlIHByb3BlcnR5IGluIGNhc2UgdGhlIHBhcmVudCdzIHByb3RvdHlwZSBpcyBuZWVkZWRcbiAgICAvLyBsYXRlci5cbiAgICBjaGlsZC5fX3N1cGVyX18gPSBwYXJlbnQucHJvdG90eXBlO1xuXG4gICAgcmV0dXJuIGNoaWxkO1xufTtcblxudmFyIFZpZXcgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHRoaXMuJGVsID0gKG9wdGlvbnMuJGVsKSB8fCAkKG9wdGlvbnMuZWwpO1xuICAgIHRoaXMuZWwgPSBvcHRpb25zLmVsO1xuICAgIHRoaXMuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG59O1xuXG5fLmV4dGVuZChWaWV3LnByb3RvdHlwZSwge1xuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHt9LFxufSk7XG5cblZpZXcuZXh0ZW5kID0gZXh0ZW5kO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXc7XG4iLCIndXNlIHN0cmljdCc7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vLi4vY29uZmlnJyk7XG52YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL2RlZmF1bHQtbm9kZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgcHJvcGVydHlIYW5kbGVyczogW10sXG5cbiAgICB1aUNoYW5nZUV2ZW50OiAnY2hhbmdlJyxcbiAgICBnZXRVSVZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLiRlbC52YWwoKTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuJGVsLm9mZih0aGlzLnVpQ2hhbmdlRXZlbnQpO1xuICAgIH0sXG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIHZhciBwcm9wTmFtZSA9IHRoaXMuJGVsLmRhdGEoY29uZmlnLmJpbmRlckF0dHIpO1xuXG4gICAgICAgIGlmIChwcm9wTmFtZSkge1xuICAgICAgICAgICAgdGhpcy4kZWwub2ZmKHRoaXMudWlDaGFuZ2VFdmVudCkub24odGhpcy51aUNoYW5nZUV2ZW50LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbCA9IG1lLmdldFVJVmFsdWUoKTtcblxuICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgICAgICBwYXJhbXNbcHJvcE5hbWVdID0gdmFsO1xuXG4gICAgICAgICAgICAgICAgbWUuJGVsLnRyaWdnZXIoY29uZmlnLmV2ZW50cy50cmlnZ2VyLCBwYXJhbXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgQmFzZVZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG59LCB7IHNlbGVjdG9yOiAnaW5wdXQsIHNlbGVjdCcgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vYmFzZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgcHJvcGVydHlIYW5kbGVyczogW1xuXG4gICAgXSxcblxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB9XG59LCB7IHNlbGVjdG9yOiAnKicgfSk7XG4iLCIndXNlIHN0cmljdCc7XG52YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL2RlZmF1bHQtaW5wdXQtbm9kZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VWaWV3LmV4dGVuZCh7XG5cbiAgICBwcm9wZXJ0eUhhbmRsZXJzOiBbXG5cbiAgICBdLFxuXG4gICAgZ2V0VUlWYWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJGVsID0gdGhpcy4kZWw7XG4gICAgICAgIC8vVE9ETzogZmlsZSBhIGlzc3VlIGZvciB0aGUgdmVuc2ltIG1hbmFnZXIgdG8gY29udmVydCB0cnVlcyB0byAxcyBhbmQgc2V0IHRoaXMgdG8gdHJ1ZSBhbmQgZmFsc2VcblxuICAgICAgICB2YXIgb2ZmVmFsID0gICgkZWwuZGF0YSgnZi1vZmYnKSAhPT0gdW5kZWZpbmVkKSA/ICRlbC5kYXRhKCdmLW9mZicpIDogMDtcbiAgICAgICAgLy9hdHRyID0gaW5pdGlhbCB2YWx1ZSwgcHJvcCA9IGN1cnJlbnQgdmFsdWVcbiAgICAgICAgdmFyIG9uVmFsID0gKCRlbC5hdHRyKCd2YWx1ZScpICE9PSB1bmRlZmluZWQpID8gJGVsLnByb3AoJ3ZhbHVlJyk6IDE7XG5cbiAgICAgICAgdmFyIHZhbCA9ICgkZWwuaXMoJzpjaGVja2VkJykpID8gb25WYWwgOiBvZmZWYWw7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEJhc2VWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxufSwgeyBzZWxlY3RvcjogJzpjaGVja2JveCw6cmFkaW8nIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbm9ybWFsaXplID0gZnVuY3Rpb24gKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgICAgICBoYW5kbGVyID0ge1xuICAgICAgICAgICAgaGFuZGxlOiBoYW5kbGVyXG4gICAgICAgIH07XG4gICAgfVxuICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgICAgc2VsZWN0b3IgPSAnKic7XG4gICAgfVxuICAgIGhhbmRsZXIuc2VsZWN0b3IgPSBzZWxlY3RvcjtcbiAgICByZXR1cm4gaGFuZGxlcjtcbn07XG5cbnZhciBtYXRjaCA9IGZ1bmN0aW9uICh0b01hdGNoLCBub2RlKSB7XG4gICAgaWYgKF8uaXNTdHJpbmcodG9NYXRjaCkpIHtcbiAgICAgICAgcmV0dXJuIHRvTWF0Y2ggPT09IG5vZGUuc2VsZWN0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICQodG9NYXRjaCkuaXMobm9kZS5zZWxlY3Rvcik7XG4gICAgfVxufTtcblxudmFyIG5vZGVNYW5hZ2VyID0ge1xuICAgIGxpc3Q6IFtdLFxuXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IG5vZGUgaGFuZGxlclxuICAgICAqIEBwYXJhbSAge3N0cmluZ30gc2VsZWN0b3IgalF1ZXJ5LWNvbXBhdGlibGUgc2VsZWN0b3IgdG8gdXNlIHRvIG1hdGNoIG5vZGVzXG4gICAgICogQHBhcmFtICB7ZnVuY3Rpb259IGhhbmRsZXIgIEhhbmRsZXJzIGFyZSBuZXctYWJsZSBmdW5jdGlvbnMuIFRoZXkgd2lsbCBiZSBjYWxsZWQgd2l0aCAkZWwgYXMgY29udGV4dC4/IFRPRE86IFRoaW5rIHRoaXMgdGhyb3VnaFxuICAgICAqL1xuICAgIHJlZ2lzdGVyOiBmdW5jdGlvbiAoc2VsZWN0b3IsIGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5saXN0LnVuc2hpZnQobm9ybWFsaXplKHNlbGVjdG9yLCBoYW5kbGVyKSk7XG4gICAgfSxcblxuICAgIGdldEhhbmRsZXI6IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICByZXR1cm4gXy5maW5kKHRoaXMubGlzdCwgZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaChzZWxlY3Rvciwgbm9kZSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICByZXBsYWNlOiBmdW5jdGlvbiAoc2VsZWN0b3IsIGhhbmRsZXIpIHtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBfLmVhY2godGhpcy5saXN0LCBmdW5jdGlvbiAoY3VycmVudEhhbmRsZXIsIGkpIHtcbiAgICAgICAgICAgIGlmIChzZWxlY3RvciA9PT0gY3VycmVudEhhbmRsZXIuc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5saXN0LnNwbGljZShpbmRleCwgMSwgbm9ybWFsaXplKHNlbGVjdG9yLCBoYW5kbGVyKSk7XG4gICAgfVxufTtcblxuLy9ib290c3RyYXBzXG52YXIgZGVmYXVsdEhhbmRsZXJzID0gW1xuICAgIHJlcXVpcmUoJy4vaW5wdXQtY2hlY2tib3gtbm9kZScpLFxuICAgIHJlcXVpcmUoJy4vZGVmYXVsdC1pbnB1dC1ub2RlJyksXG4gICAgcmVxdWlyZSgnLi9kZWZhdWx0LW5vZGUnKVxuXTtcbl8uZWFjaChkZWZhdWx0SGFuZGxlcnMucmV2ZXJzZSgpLCBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgIG5vZGVNYW5hZ2VyLnJlZ2lzdGVyKGhhbmRsZXIuc2VsZWN0b3IsIGhhbmRsZXIpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbm9kZU1hbmFnZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHRhcmdldCwgZG9tTWFuYWdlcikge1xuICAgIGlmICghd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhbiBvYnNlcnZlciBpbnN0YW5jZVxuICAgIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uIChtdXRhdGlvbnMpIHtcbiAgICAgIG11dGF0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChtdXRhdGlvbikge1xuICAgICAgICB2YXIgYWRkZWQgPSAkKG11dGF0aW9uLmFkZGVkTm9kZXMpLmZpbmQoJzpmJyk7XG4gICAgICAgIGFkZGVkID0gYWRkZWQuYWRkKCQobXV0YXRpb24uYWRkZWROb2RlcykuZmlsdGVyKCc6ZicpKTtcblxuICAgICAgICB2YXIgcmVtb3ZlZCA9ICQobXV0YXRpb24ucmVtb3ZlZE5vZGVzKS5maW5kKCc6ZicpO1xuICAgICAgICByZW1vdmVkID0gcmVtb3ZlZC5hZGQoJChtdXRhdGlvbi5yZW1vdmVkTm9kZXMpLmZpbHRlcignOmYnKSk7XG5cbiAgICAgICAgaWYgKGFkZGVkICYmIGFkZGVkLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ211dGF0aW9uIG9ic2VydmVyIGFkZGVkJywgYWRkZWQuZ2V0KCksIG11dGF0aW9uLmFkZGVkTm9kZXMpO1xuICAgICAgICAgICAgZG9tTWFuYWdlci5iaW5kQWxsKGFkZGVkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVtb3ZlZCAmJiByZW1vdmVkLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ211dGF0aW9uIG9ic2VydmVyIHJlbW92ZWQnLCByZW1vdmVkKTtcbiAgICAgICAgICAgIGRvbU1hbmFnZXIudW5iaW5kQWxsKHJlbW92ZWQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciBtdXRjb25maWcgPSB7XG4gICAgICAgIGF0dHJpYnV0ZXM6IGZhbHNlLFxuICAgICAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgICAgIHN1YnRyZWU6IHRydWUsXG4gICAgICAgIGNoYXJhY3RlckRhdGE6IGZhbHNlXG4gICAgfTtcbiAgICBvYnNlcnZlci5vYnNlcnZlKHRhcmdldCwgbXV0Y29uZmlnKTtcbiAgICAvLyBMYXRlciwgeW91IGNhbiBzdG9wIG9ic2VydmluZ1xuICAgIC8vIG9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbn07XG4iLCIvKipcbiAqICMjIEZsb3cuanMgSW5pdGlhbGl6YXRpb25cbiAqXG4gKiBUbyB1c2UgRmxvdy5qcyBpbiB5b3VyIHByb2plY3QsIHNpbXBseSBjYWxsIGBGbG93LmluaXRpYWxpemUoKWAgaW4geW91ciB1c2VyIGludGVyZmFjZS4gSW4gdGhlIGJhc2ljIGNhc2UsIGBGbG93LmluaXRpYWxpemUoKWAgY2FuIGJlIGNhbGxlZCB3aXRob3V0IGFueSBhcmd1bWVudHMuIFdoaWxlIEZsb3cuanMgbmVlZHMgdG8ga25vdyB0aGUgYWNjb3VudCwgcHJvamVjdCwgYW5kIG1vZGVsIHlvdSBhcmUgdXNpbmcsIGJ5IGRlZmF1bHQgdGhlc2UgdmFsdWVzIGFyZSBleHRyYWN0ZWQgZnJvbSB0aGUgVVJMIG9mIEVwaWNlbnRlciBwcm9qZWN0IGFuZCBieSB0aGUgdXNlIG9mIGBkYXRhLWYtbW9kZWxgIGluIHlvdXIgYDxib2R5PmAgdGFnLiBTZWUgbW9yZSBvbiB0aGUgW2Jhc2ljcyBvZiB1c2luZyBGbG93LmpzIGluIHlvdXIgcHJvamVjdC5dKC4uLy4uLyN1c2luZ19pbl9wcm9qZWN0KS5cbiAqXG4gKiBIb3dldmVyLCBzb21ldGltZXMgeW91IHdhbnQgdG8gYmUgZXhwbGljaXQgaW4geW91ciBpbml0aWFsaXphdGlvbiBjYWxsLCBhbmQgdGhlcmUgYXJlIGFsc28gc29tZSBhZGRpdGlvbmFsIHBhcmFtZXRlcnMgdGhhdCBsZXQgeW91IGN1c3RvbWl6ZSB5b3VyIHVzZSBvZiBGbG93LmpzLlxuICpcbiAqICMjIyNQYXJhbWV0ZXJzXG4gKlxuICogVGhlIHBhcmFtZXRlcnMgZm9yIGluaXRpYWxpemluZyBGbG93LmpzIGluY2x1ZGU6XG4gKlxuICogKiBgY2hhbm5lbGAgQ29uZmlndXJhdGlvbiBkZXRhaWxzIGZvciB0aGUgY2hhbm5lbCBGbG93LmpzIHVzZXMgaW4gY29ubmVjdGluZyB3aXRoIHVuZGVybHlpbmcgQVBJcy5cbiAqICogYGNoYW5uZWwuc3RyYXRlZ3lgIFRoZSBydW4gY3JlYXRpb24gc3RyYXRlZ3kgZGVzY3JpYmVzIHdoZW4gdG8gY3JlYXRlIG5ldyBydW5zIHdoZW4gYW4gZW5kIHVzZXIgdmlzaXRzIHRoaXMgcGFnZS4gVGhlIGRlZmF1bHQgaXMgYG5ldy1pZi1wZXJzaXN0ZWRgLCB3aGljaCBjcmVhdGVzIGEgbmV3IHJ1biB3aGVuIHRoZSBlbmQgdXNlciBpcyBpZGxlIGZvciBsb25nZXIgdGhhbiB5b3VyIHByb2plY3QncyAqKk1vZGVsIFNlc3Npb24gVGltZW91dCoqIChjb25maWd1cmVkIGluIHlvdXIgcHJvamVjdCdzIFtTZXR0aW5nc10oLi4vLi4vLi4vdXBkYXRpbmdfeW91cl9zZXR0aW5ncy8pKSwgYnV0IG90aGVyd2lzZSB1c2VzIHRoZSBjdXJyZW50IHJ1bi4uIFNlZSBtb3JlIG9uIFtSdW4gU3RyYXRlZ2llc10oLi4vLi4vLi4vYXBpX2FkYXB0ZXJzL3N0cmF0ZWd5LykuXG4gKiAqIGBjaGFubmVsLnJ1bmAgQ29uZmlndXJhdGlvbiBkZXRhaWxzIGZvciBlYWNoIHJ1biBjcmVhdGVkLlxuICogKiBgY2hhbm5lbC5ydW4uYWNjb3VudGAgVGhlICoqVXNlciBJRCoqIG9yICoqVGVhbSBJRCoqIGZvciB0aGlzIHByb2plY3QuIEJ5IGRlZmF1bHQsIHRha2VuIGZyb20gdGhlIFVSTCB3aGVyZSB0aGUgdXNlciBpbnRlcmZhY2UgaXMgaG9zdGVkLCBzbyB5b3Ugb25seSBuZWVkIHRvIHN1cHBseSB0aGlzIGlzIHlvdSBhcmUgcnVubmluZyB5b3VyIHByb2plY3QncyB1c2VyIGludGVyZmFjZSBbb24geW91ciBvd24gc2VydmVyXSguLi8uLi8uLi9ob3dfdG8vc2VsZl9ob3N0aW5nLykuXG4gKiAqIGBjaGFubmVsLnJ1bi5wcm9qZWN0YCBUaGUgKipQcm9qZWN0IElEKiogZm9yIHRoaXMgcHJvamVjdC5cbiAqICogYGNoYW5uZWwucnVuLm1vZGVsYCBOYW1lIG9mIHRoZSBwcmltYXJ5IG1vZGVsIGZpbGUgZm9yIHRoaXMgcHJvamVjdC4gQnkgZGVmYXVsdCwgdGFrZW4gZnJvbSBgZGF0YS1mLW1vZGVsYCBpbiB5b3VyIEhUTUwgYDxib2R5PmAgdGFnLlxuICogKiBgY2hhbm5lbC5ydW4udmFyaWFibGVzYCBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSB2YXJpYWJsZXMgYmVpbmcgbGlzdGVuZWQgdG8gb24gdGhpcyBjaGFubmVsLlxuICogKiBgY2hhbm5lbC5ydW4udmFyaWFibGVzLnNpbGVudGAgUHJvdmlkZXMgZ3JhbnVsYXIgY29udHJvbCBvdmVyIHdoZW4gdXNlciBpbnRlcmZhY2UgdXBkYXRlcyBoYXBwZW4gZm9yIGNoYW5nZXMgb24gdGhpcyBjaGFubmVsLiBTZWUgYmVsb3cgZm9yIHBvc3NpYmxlIHZhbHVlcy5cbiAqICogYGNoYW5uZWwucnVuLnZhcmlhYmxlcy5hdXRvRmV0Y2hgIE9wdGlvbnMgZm9yIGZldGNoaW5nIHZhcmlhYmxlcyBmcm9tIHRoZSBBUEkgYXMgdGhleSdyZSBiZWluZyBzdWJzY3JpYmVkLiBTZWUgW1ZhcmlhYmxlcyBDaGFubmVsXSguLi9jaGFubmVscy92YXJpYWJsZXMtY2hhbm5lbC8pIGZvciBkZXRhaWxzLlxuICogKiBgY2hhbm5lbC5ydW4ub3BlcmF0aW9uc2AgQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgb3BlcmF0aW9ucyBiZWluZyBsaXN0ZW5lZCB0byBvbiB0aGlzIGNoYW5uZWwuIEN1cnJlbnRseSB0aGVyZSBpcyBvbmx5IG9uZSBjb25maWd1cmF0aW9uIG9wdGlvbjogYHNpbGVudGAuXG4gKiAqIGBjaGFubmVsLnJ1bi5vcGVyYXRpb25zLnNpbGVudGAgUHJvdmlkZXMgZ3JhbnVsYXIgY29udHJvbCBvdmVyIHdoZW4gdXNlciBpbnRlcmZhY2UgdXBkYXRlcyBoYXBwZW4gZm9yIGNoYW5nZXMgb24gdGhpcyBjaGFubmVsLiBTZWUgYmVsb3cgZm9yIHBvc3NpYmxlIHZhbHVlcy5cbiAqICogYGNoYW5uZWwucnVuLnNlcnZlcmAgT2JqZWN0IHdpdGggYWRkaXRpb25hbCBzZXJ2ZXIgY29uZmlndXJhdGlvbiwgZGVmYXVsdHMgdG8gYGhvc3Q6ICdhcGkuZm9yaW8uY29tJ2AuXG4gKiAqIGBjaGFubmVsLnJ1bi50cmFuc3BvcnRgIEFuIG9iamVjdCB3aGljaCB0YWtlcyBhbGwgb2YgdGhlIGpxdWVyeS5hamF4IG9wdGlvbnMgYXQgPGEgaHJlZj1cImh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS9qUXVlcnkuYWpheC9cIj5odHRwOi8vYXBpLmpxdWVyeS5jb20valF1ZXJ5LmFqYXgvPC9hPi5cbiAqICogYGRvbWAgQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgRE9NIHdoZXJlIHRoaXMgaW5zdGFuY2Ugb2YgRmxvdy5qcyBpcyBjcmVhdGVkLlxuICogKiBgZG9tLnJvb3RgIFRoZSByb290IEhUTUwgZWxlbWVudCBiZWluZyBtYW5hZ2VkIGJ5IHRoZSBGbG93LmpzIERPTSBNYW5hZ2VyLiBEZWZhdWx0cyB0byBgYm9keWAuXG4gKiAqIGBkb20uYXV0b0JpbmRgIElmIGB0cnVlYCAoZGVmYXVsdCksIGF1dG9tYXRpY2FsbHkgcGFyc2UgdmFyaWFibGVzIGFkZGVkIHRvIHRoZSBET00gYWZ0ZXIgdGhpcyBgRmxvdy5pbml0aWFsaXplKClgIGNhbGwuIE5vdGUsIHRoaXMgZG9lcyBub3Qgd29yayBpbiBJRSB2ZXJzaW9ucyA8IDExLlxuICpcbiAqIFRoZSBgc2lsZW50YCBjb25maWd1cmF0aW9uIG9wdGlvbiBmb3IgdGhlIGBydW4udmFyaWFibGVzYCBhbmQgYHJ1bi5vcGVyYXRpb25zYCBpcyBhIGZsYWcgZm9yIHByb3ZpZGluZyBtb3JlIGdyYW51bGFyIGNvbnRyb2wgb3ZlciB3aGVuIHVzZXIgaW50ZXJmYWNlIHVwZGF0ZXMgaGFwcGVuIGZvciBjaGFuZ2VzIG9uIHRoaXMgY2hhbm5lbC4gVmFsdWVzIGNhbiBiZTpcbiAqXG4gKiAqIGBmYWxzZWA6IEFsd2F5cyB1cGRhdGUgdGhlIFVJIGZvciBhbnkgY2hhbmdlcyAodmFyaWFibGVzIHVwZGF0ZWQsIG9wZXJhdGlvbnMgY2FsbGVkKSBvbiB0aGlzIGNoYW5uZWwuIFRoaXMgaXMgdGhlIGRlZmF1bHQgYmVoYXZpb3IuXG4gKiAqIGB0cnVlYDogTmV2ZXIgdXBkYXRlIHRoZSBVSSBmb3IgYW55IG9uIGNoYW5nZXMgKHZhcmlhYmxlcyB1cGRhdGVkLCBvcGVyYXRpb25zIGNhbGxlZCkgb24gdGhpcyBjaGFubmVsLlxuICogKiBBcnJheSBvZiB2YXJpYWJsZXMgb3Igb3BlcmF0aW9ucyBmb3Igd2hpY2ggdGhlIFVJICpzaG91bGQgbm90KiBiZSB1cGRhdGVkLiBGb3IgZXhhbXBsZSwgYHZhcmlhYmxlczogeyBzaWxlbnQ6IFsgJ3ByaWNlJywgJ3NhbGVzJyBdIH1gIG1lYW5zIHRoaXMgY2hhbm5lbCBpcyBzaWxlbnQgKG5vIHVwZGF0ZXMgZm9yIHRoZSBVSSkgd2hlbiB0aGUgdmFyaWFibGVzICdwcmljZScgb3IgJ3NhbGVzJyBjaGFuZ2UsIGFuZCB0aGUgVUkgaXMgYWx3YXlzIHVwZGF0ZWQgZm9yIGFueSBjaGFuZ2VzIHRvIG90aGVyIHZhcmlhYmxlcy4gVGhpcyBpcyB1c2VmdWwgaWYgeW91IGtub3cgdGhhdCBjaGFuZ2luZyAncHJpY2UnIG9yICdzYWxlcycgZG9lcyBub3QgaW1wYWN0IGFueXRoaW5nIGVsc2UgaW4gdGhlIFVJIGRpcmVjdGx5LCBmb3IgaW5zdGFuY2UuXG4gKiAqIGBleGNlcHRgOiBXaXRoIGFycmF5IG9mIHZhcmlhYmxlcyBvciBvcGVyYXRpb25zIGZvciB3aGljaCB0aGUgVUkgKnNob3VsZCogYmUgdXBkYXRlZC4gRm9yIGV4YW1wbGUsIGB2YXJpYWJsZXMgeyBzaWxlbnQ6IHsgZXhjZXB0OiBbICdwcmljZScsICdzYWxlcycgXSB9IH1gIGlzIHRoZSBjb252ZXJzZSBvZiB0aGUgYWJvdmUuIFRoZSBVSSBpcyBhbHdheXMgdXBkYXRlZCB3aGVuIGFueXRoaW5nIG9uIHRoaXMgY2hhbm5lbCBjaGFuZ2VzICpleGNlcHQqIHdoZW4gdGhlIHZhcmlhYmxlcyAncHJpY2UnIG9yICdzYWxlcycgYXJlIHVwZGF0ZWQuXG4gKlxuICogQWx0aG91Z2ggRmxvdy5qcyBwcm92aWRlcyBhIGJpLWRpcmVjdGlvbmFsIGJpbmRpbmcgYmV0d2VlbiB0aGUgbW9kZWwgYW5kIHRoZSB1c2VyIGludGVyZmFjZSwgdGhlIGBzaWxlbnRgIGNvbmZpZ3VyYXRpb24gb3B0aW9uIGFwcGxpZXMgb25seSBmb3IgdGhlIGJpbmRpbmcgZnJvbSB0aGUgbW9kZWwgdG8gdGhlIHVzZXIgaW50ZXJmYWNlOyB1cGRhdGVzIGluIHRoZSB1c2VyIGludGVyZmFjZSAoaW5jbHVkaW5nIGNhbGxzIHRvIG9wZXJhdGlvbnMpIGFyZSBzdGlsbCBzZW50IHRvIHRoZSBtb2RlbC5cbiAqXG4gKiBUaGUgYEZsb3cuaW5pdGlhbGl6ZSgpYCBjYWxsIGlzIGJhc2VkIG9uIHRoZSBFcGljZW50ZXIuanMgW1J1biBTZXJ2aWNlXSguLi8uLi8uLi9hcGlfYWRhcHRlcnMvZ2VuZXJhdGVkL3J1bi1hcGktc2VydmljZS8pIGZyb20gdGhlIFtBUEkgQWRhcHRlcnNdKC4uLy4uLy4uL2FwaV9hZGFwdGVycy8pLiBTZWUgdGhvc2UgcGFnZXMgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb24gb24gcGFyYW1ldGVycy5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICAgRmxvdy5pbml0aWFsaXplKHtcbiAqICAgICAgICAgIGNoYW5uZWw6IHtcbiAqICAgICAgICAgICAgICBzdHJhdGVneTogJ25ldy1pZi1wZXJzaXN0ZWQnLFxuICogICAgICAgICAgICAgIHJ1bjoge1xuICogICAgICAgICAgICAgICAgICBtb2RlbDogJ3N1cHBseS1jaGFpbi1nYW1lLnB5JyxcbiAqICAgICAgICAgICAgICAgICAgYWNjb3VudDogJ2FjbWUtc2ltdWxhdGlvbnMnLFxuICogICAgICAgICAgICAgICAgICBwcm9qZWN0OiAnc3VwcGx5LWNoYWluLWdhbWUnLFxuICogICAgICAgICAgICAgICAgICBzZXJ2ZXI6IHsgaG9zdDogJ2FwaS5mb3Jpby5jb20nIH0sXG4gKiAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczogeyBzaWxlbnQ6IFsncHJpY2UnLCAnc2FsZXMnXSB9LFxuICogICAgICAgICAgICAgICAgICBvcGVyYXRpb25zOiB7IHNpbGVudDogZmFsc2UgfSxcbiAqICAgICAgICAgICAgICAgICAgdHJhbnNwb3J0OiB7XG4gKiAgICAgICAgICAgICAgICAgICAgICBiZWZvcmVTZW5kOiBmdW5jdGlvbigpIHsgJCgnYm9keScpLmFkZENsYXNzKCdsb2FkaW5nJyk7IH0sXG4gKiAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24oKSB7ICQoJ2JvZHknKS5yZW1vdmVDbGFzcygnbG9hZGluZycpOyB9XG4gKiAgICAgICAgICAgICAgICAgIH1cbiAqICAgICAgICAgICAgICB9XG4gKiAgICAgICAgICB9XG4gKiAgICAgIH0pO1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGRvbU1hbmFnZXIgPSByZXF1aXJlKCcuL2RvbS9kb20tbWFuYWdlcicpO1xudmFyIENoYW5uZWwgPSByZXF1aXJlKCcuL2NoYW5uZWxzL3J1bi1jaGFubmVsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGRvbTogZG9tTWFuYWdlcixcblxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgdmFyIG1vZGVsID0gJCgnYm9keScpLmRhdGEoJ2YtbW9kZWwnKTtcblxuICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICBjaGFubmVsOiB7XG4gICAgICAgICAgICAgICAgcnVuOiB7XG4gICAgICAgICAgICAgICAgICAgIGFjY291bnQ6ICcnLFxuICAgICAgICAgICAgICAgICAgICBwcm9qZWN0OiAnJyxcbiAgICAgICAgICAgICAgICAgICAgbW9kZWw6IG1vZGVsLFxuXG4gICAgICAgICAgICAgICAgICAgIG9wZXJhdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdXRvRmV0Y2g6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkb206IHtcbiAgICAgICAgICAgICAgICByb290OiAnYm9keScsXG4gICAgICAgICAgICAgICAgYXV0b0JpbmQ6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgb3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgY29uZmlnKTtcbiAgICAgICAgdmFyICRyb290ID0gJChvcHRpb25zLmRvbS5yb290KTtcbiAgICAgICAgdmFyIGluaXRGbiA9ICRyb290LmRhdGEoJ2Ytb24taW5pdCcpO1xuICAgICAgICB2YXIgb3BuU2lsZW50ID0gb3B0aW9ucy5jaGFubmVsLnJ1bi5vcGVyYXRpb25zLnNpbGVudDtcbiAgICAgICAgdmFyIGlzSW5pdE9wZXJhdGlvblNpbGVudCA9IGluaXRGbiAmJiAob3BuU2lsZW50ID09PSB0cnVlIHx8IChfLmlzQXJyYXkob3BuU2lsZW50KSAmJiBfLmNvbnRhaW5zKG9wblNpbGVudCwgaW5pdEZuKSkpO1xuICAgICAgICB2YXIgcHJlRmV0Y2hWYXJpYWJsZXMgPSAhaW5pdEZuIHx8IGlzSW5pdE9wZXJhdGlvblNpbGVudDtcblxuICAgICAgICBpZiAocHJlRmV0Y2hWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuY2hhbm5lbC5ydW4udmFyaWFibGVzLmF1dG9GZXRjaC5zdGFydCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnICYmIGNvbmZpZy5jaGFubmVsICYmIChjb25maWcuY2hhbm5lbCBpbnN0YW5jZW9mIENoYW5uZWwpKSB7XG4gICAgICAgICAgICB0aGlzLmNoYW5uZWwgPSBjb25maWcuY2hhbm5lbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY2hhbm5lbCA9IG5ldyBDaGFubmVsKG9wdGlvbnMuY2hhbm5lbCk7XG4gICAgICAgIH1cblxuICAgICAgICBkb21NYW5hZ2VyLmluaXRpYWxpemUoJC5leHRlbmQodHJ1ZSwge1xuICAgICAgICAgICAgY2hhbm5lbDogdGhpcy5jaGFubmVsXG4gICAgICAgIH0sIG9wdGlvbnMuZG9tKSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBtYXRjaDogZnVuY3Rpb24gKG1hdGNoRXhwciwgbWF0Y2hWYWx1ZSwgY29udGV4dCkge1xuICAgICAgICBpZiAoXy5pc1N0cmluZyhtYXRjaEV4cHIpKSB7XG4gICAgICAgICAgICByZXR1cm4gKG1hdGNoRXhwciA9PT0gJyonIHx8IChtYXRjaEV4cHIudG9Mb3dlckNhc2UoKSA9PT0gbWF0Y2hWYWx1ZS50b0xvd2VyQ2FzZSgpKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKG1hdGNoRXhwcikpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaEV4cHIobWF0Y2hWYWx1ZSwgY29udGV4dCk7XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc1JlZ0V4cChtYXRjaEV4cHIpKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hWYWx1ZS5tYXRjaChtYXRjaEV4cHIpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGdldENvbnZlcnRlcnNMaXN0OiBmdW5jdGlvbiAoJGVsLCBwcm9wZXJ0eSkge1xuICAgICAgICB2YXIgYXR0ckNvbnZlcnRlcnMgPSAkZWwuZGF0YSgnZi1jb252ZXJ0LScgKyBwcm9wZXJ0eSk7XG5cbiAgICAgICAgaWYgKCFhdHRyQ29udmVydGVycyAmJiAocHJvcGVydHkgPT09ICdiaW5kJyB8fCBwcm9wZXJ0eSA9PT0gJ2ZvcmVhY2gnKSkge1xuICAgICAgICAgICAgLy9Pbmx5IGJpbmQgaW5oZXJpdHMgZnJvbSBwYXJlbnRzXG4gICAgICAgICAgICBhdHRyQ29udmVydGVycyA9ICRlbC5kYXRhKCdmLWNvbnZlcnQnKTtcbiAgICAgICAgICAgIGlmICghYXR0ckNvbnZlcnRlcnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgJHBhcmVudEVsID0gJGVsLmNsb3Nlc3QoJ1tkYXRhLWYtY29udmVydF0nKTtcbiAgICAgICAgICAgICAgICBpZiAoJHBhcmVudEVsKSB7XG4gICAgICAgICAgICAgICAgICAgIGF0dHJDb252ZXJ0ZXJzID0gJHBhcmVudEVsLmRhdGEoJ2YtY29udmVydCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGF0dHJDb252ZXJ0ZXJzKSB7XG4gICAgICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSBfLmludm9rZShhdHRyQ29udmVydGVycy5zcGxpdCgnfCcpLCAndHJpbScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGF0dHJDb252ZXJ0ZXJzO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdG9JbXBsaWNpdFR5cGU6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHZhciByYnJhY2UgPSAvXig/Olxcey4qXFx9fFxcWy4qXFxdKSQvO1xuICAgICAgICB2YXIgY29udmVydGVkID0gZGF0YTtcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZGF0YSA9IGRhdGEudHJpbSgpO1xuXG4gICAgICAgICAgICBpZiAoZGF0YSA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YSA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhID09PSAnbnVsbCcpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9ICcnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjb252ZXJ0ZWQuY2hhckF0KDApID09PSAnXFwnJyB8fCBjb252ZXJ0ZWQuY2hhckF0KDApID09PSAnXCInKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gZGF0YS5zdWJzdHJpbmcoMSwgZGF0YS5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJC5pc051bWVyaWMoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSArZGF0YTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmJyYWNlLnRlc3QoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAvL1RPRE86IFRoaXMgb25seSB3b3JrcyB3aXRoIGRvdWJsZSBxdW90ZXMsIGkuZS4sIFsxLFwiMlwiXSB3b3JrcyBidXQgbm90IFsxLCcyJ11cbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSAkLnBhcnNlSlNPTihkYXRhKSA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnZlcnRlZDtcbiAgICB9XG59O1xuIl19
