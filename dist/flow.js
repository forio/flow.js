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
        silent: false
    };

    var channelOptions = $.extend(true, {}, defaults, options);
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

            var shouldSilence = silent === true;
            if (_.isArray(silent) && executedOpns) {
                shouldSilence = _.intersection(silent, executedOpns).length === silent.length;
            }
            if ($.isPlainObject(silent) && executedOpns) {
                shouldSilence = _.intersection(silent.except, executedOpns).length !== executedOpns.length;
            }

            if (!shouldSilence || force === true) {
                var me = this;
                _.each(executedOpns, function (opn) {
                    me.notify(opn, response);
                });
            }
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
                return fn.call(run, operation.operations)
                        .then(function (response) {
                            if (!params || !params.silent) {
                                me.refresh.call(me, _.pluck(operation.operations, 'name'), response);
                            }
                        });
            } else {
                //TODO: check if interpolated
                var opts = ($.isPlainObject(operation)) ? params : options;
                return run.do.apply(run, arguments)
                    .then(function (response) {
                        if (!opts || !opts.silent) {
                            me.refresh.call(me, [operation], response);
                        }
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

    var createAndThen = function (fn, context) {
        return _.wrap(fn, function (func) {
            var passedInParams = _.toArray(arguments).slice(1);
            return rs.currentPromise.then(function () {
                rs.currentPromise = func.apply(context, passedInParams);
                return rs.currentPromise;
            });
        });
    };

    //Make sure nothing happens before the run is created
    _.each(rs, function (value, name) {
        if (_.isFunction(value) && name !== 'variables'  && name !== 'create') {
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
        }
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

        fetch: function (variablesList) {
            // console.log('fetch called', variablesList);
            variablesList = [].concat(variablesList);
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
                return vs.query(innerVariables).then(function (innerVariables) {
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
            hasCommas = hasCommas || true;
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
        var valueToTemplate = value;
        if (!$.isPlainObject(value)) {
            var variableName = this.data('f-bind');//Hack because i don't have access to variable name here otherwise
            valueToTemplate = { value: value };
            valueToTemplate[variableName] = value;
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
                value += '';
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
            dataval = dataval + '';
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYXBwLmpzIiwic3JjL2NoYW5uZWxzL29wZXJhdGlvbnMtY2hhbm5lbC5qcyIsInNyYy9jaGFubmVscy9ydW4tY2hhbm5lbC5qcyIsInNyYy9jaGFubmVscy92YXJpYWJsZXMtY2hhbm5lbC5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvY29udmVydGVycy9hcnJheS1jb252ZXJ0ZXIuanMiLCJzcmMvY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlci5qcyIsInNyYy9jb252ZXJ0ZXJzL251bWJlci1jb252ZXJ0ZXIuanMiLCJzcmMvY29udmVydGVycy9udW1iZXJmb3JtYXQtY29udmVydGVyLmpzIiwic3JjL2NvbnZlcnRlcnMvc3RyaW5nLWNvbnZlcnRlci5qcyIsInNyYy9jb252ZXJ0ZXJzL3VuZGVyc2NvcmUtdXRpbHMtY29udmVydGVyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2F0dHJpYnV0ZS1tYW5hZ2VyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2NoZWNrYm94LXJhZGlvLWJpbmQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9kZWZhdWx0LWJpbmQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9pbnB1dC1iaW5kLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvY2xhc3MtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9kZWZhdWx0LWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvZXZlbnRzL2RlZmF1bHQtZXZlbnQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9ldmVudHMvaW5pdC1ldmVudC1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2ZvcmVhY2gvZGVmYXVsdC1mb3JlYWNoLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvbmVnYXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL25vLW9wLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvcG9zaXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwic3JjL2RvbS9kb20tbWFuYWdlci5qcyIsInNyYy9kb20vbm9kZXMvYmFzZS5qcyIsInNyYy9kb20vbm9kZXMvZGVmYXVsdC1pbnB1dC1ub2RlLmpzIiwic3JjL2RvbS9ub2Rlcy9kZWZhdWx0LW5vZGUuanMiLCJzcmMvZG9tL25vZGVzL2lucHV0LWNoZWNrYm94LW5vZGUuanMiLCJzcmMvZG9tL25vZGVzL25vZGUtbWFuYWdlci5qcyIsInNyYy9kb20vcGx1Z2lucy9hdXRvLXVwZGF0ZS1iaW5kaW5ncy5qcyIsInNyYy9mbG93LmpzIiwic3JjL3V0aWxzL2RvbS5qcyIsInNyYy91dGlscy9wYXJzZS11dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwid2luZG93LkZsb3cgPSByZXF1aXJlKCcuL2Zsb3cuanMnKTtcbndpbmRvdy5GbG93LnZlcnNpb24gPSAnPCU9IHZlcnNpb24gJT4nOyAvL3BvcHVsYXRlZCBieSBncnVudFxuIiwiLyoqXG4gKiAjIyBPcGVyYXRpb25zIENoYW5uZWxcbiAqXG4gKiBDaGFubmVscyBhcmUgd2F5cyBmb3IgRmxvdy5qcyB0byB0YWxrIHRvIGV4dGVybmFsIEFQSXMgLS0gcHJpbWFyaWx5IHRoZSBbdW5kZXJseWluZyBFcGljZW50ZXIgQVBJc10oLi4vLi4vLi4vLi4vY3JlYXRpbmdfeW91cl9pbnRlcmZhY2UvKS5cbiAqXG4gKiBUaGUgcHJpbWFyeSB1c2UgY2FzZXMgZm9yIHRoZSBPcGVyYXRpb25zIENoYW5uZWwgYXJlOlxuICpcbiAqICogYHB1Ymxpc2hgOiBDYWxsIGFuIG9wZXJhdGlvbi5cbiAqICogYHN1YnNjcmliZWA6IFJlY2VpdmUgbm90aWZpY2F0aW9ucyB3aGVuIGFuIG9wZXJhdGlvbiBpcyBjYWxsZWQuXG4gKlxuICogRm9yIGV4YW1wbGUsIHVzZSBgcHVibGlzaCgpYCB0byBjYWxsIGFuIG9wZXJhdGlvbiAobWV0aG9kKSBmcm9tIHlvdXIgbW9kZWw6XG4gKlxuICogICAgICBGbG93LmNoYW5uZWwub3BlcmF0aW9ucy5wdWJsaXNoKCdteU1ldGhvZCcsIG15TWV0aG9kUGFyYW0pO1xuICpcbiAqIEZvciByZWZlcmVuY2UsIGFuIGVxdWl2YWxlbnQgY2FsbCB1c2luZyBGbG93LmpzIGN1c3RvbSBIVE1MIGF0dHJpYnV0ZXMgaXM6XG4gKlxuICogICAgICA8YnV0dG9uIGRhdGEtZi1vbi1jbGljaz1cIm15TWV0aG9kKG15TWV0aG9kUGFyYW0pXCI+Q2xpY2sgbWU8L2J1dHRvbj5cbiAqXG4gKiBZb3UgY2FuIGFsc28gdXNlIGBzdWJzY3JpYmUoKWAgYW5kIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gbGlzdGVuIGFuZCByZWFjdCB3aGVuIHRoZSBvcGVyYXRpb24gaGFzIGJlZW4gY2FsbGVkOlxuICpcbiAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMuc3Vic2NyaWJlKCdteU1ldGhvZCcsXG4gKiAgICAgICAgICBmdW5jdGlvbigpIHsgY29uc29sZS5sb2coJ2NhbGxlZCEnKTsgfSApO1xuICpcbiAqIFVzZSBgc3Vic2NyaWJlKCopYCB0byBsaXN0ZW4gZm9yIG5vdGlmaWNhdGlvbnMgb24gYWxsIG9wZXJhdGlvbnMuXG4gKlxuICogVG8gdXNlIHRoZSBPcGVyYXRpb25zIENoYW5uZWwsIHNpbXBseSBbaW5pdGlhbGl6ZSBGbG93LmpzIGluIHlvdXIgcHJvamVjdF0oLi4vLi4vLi4vI2N1c3RvbS1pbml0aWFsaXplKS5cbiAqXG4qL1xuXG5cbid1c2Ugc3RyaWN0JztcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERldGVybWluZSB3aGVuIHRvIHVwZGF0ZSBzdGF0ZS4gRGVmYXVsdHMgdG8gYGZhbHNlYDogYWx3YXlzIHRyaWdnZXIgdXBkYXRlcy5cbiAgICAgICAgICpcbiAgICAgICAgICogUG9zc2libGUgb3B0aW9ucyBhcmU6XG4gICAgICAgICAqXG4gICAgICAgICAqICogYHRydWVgOiBOZXZlciB0cmlnZ2VyIGFueSB1cGRhdGVzLiBVc2UgdGhpcyBpZiB5b3Uga25vdyB5b3VyIG1vZGVsIHN0YXRlIHdvbid0IGNoYW5nZSBiYXNlZCBvbiBvcGVyYXRpb25zLlxuICAgICAgICAgKiAqIGBmYWxzZWA6IEFsd2F5cyB0cmlnZ2VyIHVwZGF0ZXMuXG4gICAgICAgICAqICogYFthcnJheSBvZiBvcGVyYXRpb24gbmFtZXNdYDogT3BlcmF0aW9ucyBpbiB0aGlzIGFycmF5ICp3aWxsIG5vdCogdHJpZ2dlciB1cGRhdGVzOyBldmVyeXRoaW5nIGVsc2Ugd2lsbC5cbiAgICAgICAgICogKiBgeyBleGNlcHQ6IFthcnJheSBvZiBvcGVyYXRpb24gbmFtZXNdIH1gOiBPcGVyYXRpb25zIGluIHRoaXMgYXJyYXkgKndpbGwqIHRyaWdnZXIgdXBkYXRlczsgbm90aGluZyBlbHNlIHdpbGwuXG4gICAgICAgICAqXG4gICAgICAgICAqIFRvIHNldCwgcGFzcyB0aGlzIGludG8gdGhlIGBGbG93LmluaXRpYWxpemUoKWAgY2FsbCBpbiB0aGUgYGNoYW5uZWwucnVuLm9wZXJhdGlvbnNgIGZpZWxkOlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuaW5pdGlhbGl6ZSh7XG4gICAgICAgICAqICAgICAgICAgIGNoYW5uZWw6IHtcbiAgICAgICAgICogICAgICAgICAgICAgIHJ1bjoge1xuICAgICAgICAgKiAgICAgICAgICAgICAgICAgIG1vZGVsOiAnbXlNb2RlbC5weScsXG4gICAgICAgICAqICAgICAgICAgICAgICAgICAgYWNjb3VudDogJ2FjbWUtc2ltdWxhdGlvbnMnLFxuICAgICAgICAgKiAgICAgICAgICAgICAgICAgIHByb2plY3Q6ICdzdXBwbHktY2hhaW4tZ2FtZScsXG4gICAgICAgICAqICAgICAgICAgICAgICAgICAgb3BlcmF0aW9uczogeyBzaWxlbnQ6IHRydWUgfVxuICAgICAgICAgKiAgICAgICAgICAgICAgfVxuICAgICAgICAgKiAgICAgICAgICB9XG4gICAgICAgICAqICAgICAgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIFRvIG92ZXJyaWRlIGZvciBhIHNwZWNpZmljIGNhbGwgdG8gdGhlIE9wZXJhdGlvbnMgQ2hhbm5lbCwgcGFzcyB0aGlzIGFzIHRoZSBmaW5hbCBgb3B0aW9uc2AgcGFyYW1ldGVyOlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgICBGbG93LmNoYW5uZWwub3BlcmF0aW9ucy5wdWJsaXNoKCdteU1ldGhvZCcsIG15TWV0aG9kUGFyYW0sIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7U3RyaW5nfEFycmF5fE9iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIHNpbGVudDogZmFsc2VcbiAgICB9O1xuXG4gICAgdmFyIGNoYW5uZWxPcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICB2YXIgcnVuID0gY2hhbm5lbE9wdGlvbnMucnVuO1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcbiAgICAgICAgLy9mb3IgdGVzdGluZ1xuICAgICAgICBwcml2YXRlOiB7XG4gICAgICAgICAgICBvcHRpb25zOiBjaGFubmVsT3B0aW9uc1xuICAgICAgICB9LFxuXG4gICAgICAgIGxpc3RlbmVyTWFwOiB7fSxcblxuICAgICAgICBnZXRTdWJzY3JpYmVyczogZnVuY3Rpb24gKHRvcGljKSB7XG4gICAgICAgICAgICB2YXIgdG9waWNTdWJzY3JpYmVycyA9IHRoaXMubGlzdGVuZXJNYXBbdG9waWNdIHx8IFtdO1xuICAgICAgICAgICAgdmFyIGdsb2JhbFN1YnNjcmliZXJzID0gdGhpcy5saXN0ZW5lck1hcFsnKiddIHx8IFtdO1xuICAgICAgICAgICAgcmV0dXJuIHRvcGljU3Vic2NyaWJlcnMuY29uY2F0KGdsb2JhbFN1YnNjcmliZXJzKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvL0NoZWNrIGZvciB1cGRhdGVzXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGb3JjZSBhIGNoZWNrIGZvciB1cGRhdGVzIG9uIHRoZSBjaGFubmVsLCBhbmQgbm90aWZ5IGFsbCBsaXN0ZW5lcnMuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSAgZXhlY3V0ZWRPcG5zIE9wZXJhdGlvbnMgd2hpY2gganVzdCBoYXBwZW5lZC5cbiAgICAgICAgICogQHBhcmFtIHtBbnl9IHJlc3BvbnNlICBSZXNwb25zZSBmcm9tIHRoZSBvcGVyYXRpb24uXG4gICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gZm9yY2UgIElnbm9yZSBhbGwgYHNpbGVudGAgb3B0aW9ucyBhbmQgZm9yY2UgcmVmcmVzaC5cbiAgICAgICAgICovXG4gICAgICAgIHJlZnJlc2g6IGZ1bmN0aW9uIChleGVjdXRlZE9wbnMsIHJlc3BvbnNlLCBmb3JjZSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ09wZXJhdGlvbnMgcmVmcmVzaCcsIGV4ZWN1dGVkT3Bucyk7XG4gICAgICAgICAgICB2YXIgc2lsZW50ID0gY2hhbm5lbE9wdGlvbnMuc2lsZW50O1xuXG4gICAgICAgICAgICB2YXIgc2hvdWxkU2lsZW5jZSA9IHNpbGVudCA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkoc2lsZW50KSAmJiBleGVjdXRlZE9wbnMpIHtcbiAgICAgICAgICAgICAgICBzaG91bGRTaWxlbmNlID0gXy5pbnRlcnNlY3Rpb24oc2lsZW50LCBleGVjdXRlZE9wbnMpLmxlbmd0aCA9PT0gc2lsZW50Lmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3Qoc2lsZW50KSAmJiBleGVjdXRlZE9wbnMpIHtcbiAgICAgICAgICAgICAgICBzaG91bGRTaWxlbmNlID0gXy5pbnRlcnNlY3Rpb24oc2lsZW50LmV4Y2VwdCwgZXhlY3V0ZWRPcG5zKS5sZW5ndGggIT09IGV4ZWN1dGVkT3Bucy5sZW5ndGg7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghc2hvdWxkU2lsZW5jZSB8fCBmb3JjZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICAgICAgXy5lYWNoKGV4ZWN1dGVkT3BucywgZnVuY3Rpb24gKG9wbikge1xuICAgICAgICAgICAgICAgICAgICBtZS5ub3RpZnkob3BuLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFsZXJ0IGVhY2ggc3Vic2NyaWJlciBhYm91dCB0aGUgb3BlcmF0aW9uIGFuZCBpdHMgcGFyYW1ldGVycy4gVGhpcyBjYW4gYmUgdXNlZCB0byBwcm92aWRlIGFuIHVwZGF0ZSB3aXRob3V0IGEgcm91bmQgdHJpcCB0byB0aGUgc2VydmVyLiBIb3dldmVyLCBpdCBpcyByYXJlbHkgdXNlZDogeW91IGFsbW9zdCBhbHdheXMgd2FudCB0byBgc3Vic2NyaWJlKClgIGluc3RlYWQgc28gdGhhdCB0aGUgb3BlcmF0aW9uIGlzIGFjdHVhbGx5IGNhbGxlZCBpbiB0aGUgbW9kZWwuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMubm90aWZ5KCdteU1ldGhvZCcsIG15TWV0aG9kUmVzcG9uc2UpO1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3BlcmF0aW9uIE5hbWUgb2Ygb3BlcmF0aW9uLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ8QXJyYXl8T2JqZWN0fSB2YWx1ZSBQYXJhbWV0ZXIgdmFsdWVzIGZvciB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICAgICovXG4gICAgICAgIG5vdGlmeTogZnVuY3Rpb24gKG9wZXJhdGlvbiwgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmdldFN1YnNjcmliZXJzKG9wZXJhdGlvbik7XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge307XG4gICAgICAgICAgICBwYXJhbXNbb3BlcmF0aW9uXSA9IHZhbHVlO1xuXG4gICAgICAgICAgICBfLmVhY2gobGlzdGVuZXJzLCBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gbGlzdGVuZXIudGFyZ2V0O1xuICAgICAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQuY2FsbChudWxsLCBwYXJhbXMsIHZhbHVlLCBvcGVyYXRpb24pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGFyZ2V0LnRyaWdnZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXIudGFyZ2V0LnRyaWdnZXIoY29uZmlnLmV2ZW50cy5yZWFjdCwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbGlzdGVuZXIgZm9ybWF0IGZvciAnICsgb3BlcmF0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2FsbCB0aGUgb3BlcmF0aW9uIHdpdGggcGFyYW1ldGVycywgYW5kIGFsZXJ0IHN1YnNjcmliZXJzLlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC5vcGVyYXRpb25zLnB1Ymxpc2goJ215TWV0aG9kJywgbXlNZXRob2RQYXJhbSk7XG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMucHVibGlzaCh7XG4gICAgICAgICAqICAgICAgICAgIG9wZXJhdGlvbnM6IFt7IG5hbWU6ICdteU1ldGhvZCcsIHBhcmFtczogW215TWV0aG9kUGFyYW1dIH1dXG4gICAgICAgICAqICAgICAgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSAge1N0cmluZ3xPYmplY3R9IG9wZXJhdGlvbiBGb3Igb25lIG9wZXJhdGlvbiwgcGFzcyB0aGUgbmFtZSBvZiBvcGVyYXRpb24gKHN0cmluZykuIEZvciBtdWx0aXBsZSBvcGVyYXRpb25zLCBwYXNzIGFuIG9iamVjdCB3aXRoIGZpZWxkIGBvcGVyYXRpb25zYCBhbmQgdmFsdWUgYXJyYXkgb2Ygb2JqZWN0cywgZWFjaCB3aXRoIGBuYW1lYCBhbmQgYHBhcmFtc2A6IGB7b3BlcmF0aW9uczogW3sgbmFtZTogb3BuLCBwYXJhbXM6W10gfV0gfWAuXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcnxBcnJheXxPYmplY3R9IHBhcmFtcyAoT3B0aW9uYWwpICBQYXJhbWV0ZXJzIHRvIHNlbmQgdG8gb3BlcmF0aW9uLiBVc2UgZm9yIG9uZSBvcGVyYXRpb247IGZvciBtdWx0aXBsZSBvcGVyYXRpb25zLCBwYXJhbWV0ZXJzIGFyZSBhbHJlYWR5IGluY2x1ZGVkIGluIHRoZSBvYmplY3QgZm9ybWF0LlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAoT3B0aW9uYWwpIE92ZXJyaWRlcyBmb3IgdGhlIGRlZmF1bHQgY2hhbm5lbCBvcHRpb25zLlxuICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuc2lsZW50IERldGVybWluZSB3aGVuIHRvIHVwZGF0ZSBzdGF0ZS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybiB7JHByb21pc2V9IFByb21pc2UgdG8gY29tcGxldGUgdGhlIGNhbGwuXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaXNoOiBmdW5jdGlvbiAob3BlcmF0aW9uLCBwYXJhbXMsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KG9wZXJhdGlvbikgJiYgb3BlcmF0aW9uLm9wZXJhdGlvbnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm4gPSAob3BlcmF0aW9uLnNlcmlhbCkgPyBydW4uc2VyaWFsIDogcnVuLnBhcmFsbGVsO1xuICAgICAgICAgICAgICAgIHJldHVybiBmbi5jYWxsKHJ1biwgb3BlcmF0aW9uLm9wZXJhdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXBhcmFtcyB8fCAhcGFyYW1zLnNpbGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUsIF8ucGx1Y2sob3BlcmF0aW9uLm9wZXJhdGlvbnMsICduYW1lJyksIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy9UT0RPOiBjaGVjayBpZiBpbnRlcnBvbGF0ZWRcbiAgICAgICAgICAgICAgICB2YXIgb3B0cyA9ICgkLmlzUGxhaW5PYmplY3Qob3BlcmF0aW9uKSkgPyBwYXJhbXMgOiBvcHRpb25zO1xuICAgICAgICAgICAgICAgIHJldHVybiBydW4uZG8uYXBwbHkocnVuLCBhcmd1bWVudHMpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvcHRzIHx8ICFvcHRzLnNpbGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lLnJlZnJlc2guY2FsbChtZSwgW29wZXJhdGlvbl0sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnb3BlcmF0aW9ucyBwdWJsaXNoJywgb3BlcmF0aW9uLCBwYXJhbXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdWJzY3JpYmUgdG8gY2hhbmdlcyBvbiBhIGNoYW5uZWw6IEFzayBmb3Igbm90aWZpY2F0aW9uIHdoZW4gb3BlcmF0aW9ucyBhcmUgY2FsbGVkLlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC5vcGVyYXRpb25zLnN1YnNjcmliZSgnbXlNZXRob2QnLFxuICAgICAgICAgKiAgICAgICAgICBmdW5jdGlvbigpIHsgY29uc29sZS5sb2coJ2NhbGxlZCEnKTsgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBvcGVyYXRpb25zIFRoZSBuYW1lcyBvZiB0aGUgb3BlcmF0aW9ucy4gVXNlIGAqYCB0byBsaXN0ZW4gZm9yIG5vdGlmaWNhdGlvbnMgb24gYWxsIG9wZXJhdGlvbnMuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fEZ1bmN0aW9ufSBzdWJzY3JpYmVyIFRoZSBvYmplY3Qgb3IgZnVuY3Rpb24gYmVpbmcgbm90aWZpZWQuIE9mdGVuIHRoaXMgaXMgYSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBBbiBpZGVudGlmeWluZyB0b2tlbiBmb3IgdGhpcyBzdWJzY3JpcHRpb24uIFJlcXVpcmVkIGFzIGEgcGFyYW1ldGVyIHdoZW4gdW5zdWJzY3JpYmluZy5cbiAgICAgICAgKi9cbiAgICAgICAgc3Vic2NyaWJlOiBmdW5jdGlvbiAob3BlcmF0aW9ucywgc3Vic2NyaWJlcikge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ29wZXJhdGlvbnMgc3Vic2NyaWJlJywgb3BlcmF0aW9ucywgc3Vic2NyaWJlcik7XG4gICAgICAgICAgICBvcGVyYXRpb25zID0gW10uY29uY2F0KG9wZXJhdGlvbnMpO1xuICAgICAgICAgICAgLy91c2UganF1ZXJ5IHRvIG1ha2UgZXZlbnQgc2lua1xuICAgICAgICAgICAgaWYgKCFzdWJzY3JpYmVyLm9uICYmICFfLmlzRnVuY3Rpb24oc3Vic2NyaWJlcikpIHtcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmVyID0gJChzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGlkICA9IF8udW5pcXVlSWQoJ2VwaWNoYW5uZWwub3BlcmF0aW9uJyk7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBzdWJzY3JpYmVyXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuXG4gICAgICAgICAgICAkLmVhY2gob3BlcmF0aW9ucywgZnVuY3Rpb24gKGluZGV4LCBvcG4pIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1lLmxpc3RlbmVyTWFwW29wbl0pIHtcbiAgICAgICAgICAgICAgICAgICAgbWUubGlzdGVuZXJNYXBbb3BuXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtZS5saXN0ZW5lck1hcFtvcG5dID0gbWUubGlzdGVuZXJNYXBbb3BuXS5jb25jYXQoZGF0YSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdG9wIHJlY2VpdmluZyBub3RpZmljYXRpb24gd2hlbiBhbiBvcGVyYXRpb24gaXMgY2FsbGVkLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gb3BlcmF0aW9uIFRoZSBuYW1lcyBvZiB0aGUgb3BlcmF0aW9ucy5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHRva2VuIFRoZSBpZGVudGlmeWluZyB0b2tlbiBmb3IgdGhpcyBzdWJzY3JpcHRpb24uIChDcmVhdGVkIGFuZCByZXR1cm5lZCBieSB0aGUgYHN1YnNjcmliZSgpYCBjYWxsLilcbiAgICAgICAgKi9cbiAgICAgICAgdW5zdWJzY3JpYmU6IGZ1bmN0aW9uIChvcGVyYXRpb24sIHRva2VuKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlbmVyTWFwW29wZXJhdGlvbl0gPSBfLnJlamVjdCh0aGlzLmxpc3RlbmVyTWFwW29wZXJhdGlvbl0sIGZ1bmN0aW9uIChzdWJzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1YnMuaWQgPT09IHRva2VuO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN0b3AgcmVjZWl2aW5nIG5vdGlmaWNhdGlvbnMgZm9yIGFsbCBvcGVyYXRpb25zLiBObyBwYXJhbWV0ZXJzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJuIHtOb25lfVxuICAgICAgICAqL1xuICAgICAgICB1bnN1YnNjcmliZUFsbDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5lck1hcCA9IHt9O1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gJC5leHRlbmQodGhpcywgcHVibGljQVBJKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBWYXJzQ2hhbm5lbCA9IHJlcXVpcmUoJy4vdmFyaWFibGVzLWNoYW5uZWwnKTtcbnZhciBPcGVyYXRpb25zQ2hhbm5lbCA9IHJlcXVpcmUoJy4vb3BlcmF0aW9ucy1jaGFubmVsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgIHJ1bjoge1xuICAgICAgICAgICAgdmFyaWFibGVzOiB7XG5cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvcGVyYXRpb25zOiB7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIGNvbmZpZyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICB2YXIgcm0gPSBuZXcgRi5tYW5hZ2VyLlJ1bk1hbmFnZXIoY29uZmlnKTtcbiAgICB2YXIgcnMgPSBybS5ydW47XG5cbiAgICB2YXIgJGNyZWF0aW9uUHJvbWlzZSA9IHJtLmdldFJ1bigpO1xuICAgIHJzLmN1cnJlbnRQcm9taXNlID0gJGNyZWF0aW9uUHJvbWlzZTtcblxuICAgIHZhciBjcmVhdGVBbmRUaGVuID0gZnVuY3Rpb24gKGZuLCBjb250ZXh0KSB7XG4gICAgICAgIHJldHVybiBfLndyYXAoZm4sIGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgICAgICAgICB2YXIgcGFzc2VkSW5QYXJhbXMgPSBfLnRvQXJyYXkoYXJndW1lbnRzKS5zbGljZSgxKTtcbiAgICAgICAgICAgIHJldHVybiBycy5jdXJyZW50UHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBycy5jdXJyZW50UHJvbWlzZSA9IGZ1bmMuYXBwbHkoY29udGV4dCwgcGFzc2VkSW5QYXJhbXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBycy5jdXJyZW50UHJvbWlzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy9NYWtlIHN1cmUgbm90aGluZyBoYXBwZW5zIGJlZm9yZSB0aGUgcnVuIGlzIGNyZWF0ZWRcbiAgICBfLmVhY2gocnMsIGZ1bmN0aW9uICh2YWx1ZSwgbmFtZSkge1xuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSAmJiBuYW1lICE9PSAndmFyaWFibGVzJyAgJiYgbmFtZSAhPT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICAgIHJzW25hbWVdID0gY3JlYXRlQW5kVGhlbih2YWx1ZSwgcnMpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgb3JpZ2luYWxWYXJpYWJsZXNGbiA9IHJzLnZhcmlhYmxlcztcbiAgICBycy52YXJpYWJsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB2cyA9IG9yaWdpbmFsVmFyaWFibGVzRm4uYXBwbHkocnMsIGFyZ3VtZW50cyk7XG4gICAgICAgIF8uZWFjaCh2cywgZnVuY3Rpb24gKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHZzW25hbWVdID0gY3JlYXRlQW5kVGhlbih2YWx1ZSwgdnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHZzO1xuICAgIH07XG5cbiAgICB0aGlzLnJ1biA9IHJzO1xuICAgIHZhciB2YXJPcHRpb25zID0gY29uZmlnLnJ1bi52YXJpYWJsZXM7XG4gICAgdGhpcy52YXJpYWJsZXMgPSBuZXcgVmFyc0NoYW5uZWwoJC5leHRlbmQodHJ1ZSwge30sIHZhck9wdGlvbnMsIHsgcnVuOiBycyB9KSk7XG4gICAgdGhpcy5vcGVyYXRpb25zID0gbmV3IE9wZXJhdGlvbnNDaGFubmVsKCQuZXh0ZW5kKHRydWUsIHt9LCBjb25maWcucnVuLm9wZXJhdGlvbnMsIHsgcnVuOiBycyB9KSk7XG5cbiAgICB2YXIgbWUgPSB0aGlzO1xuICAgIHZhciBkZWJvdW5jZWRSZWZyZXNoID0gXy5kZWJvdW5jZShmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBtZS52YXJpYWJsZXMucmVmcmVzaC5jYWxsKG1lLnZhcmlhYmxlcywgbnVsbCwgdHJ1ZSk7XG4gICAgICAgIGlmIChtZS52YXJpYWJsZXMub3B0aW9ucy5hdXRvRmV0Y2guZW5hYmxlKSB7XG4gICAgICAgICAgICBtZS52YXJpYWJsZXMuc3RhcnRBdXRvRmV0Y2goKTtcbiAgICAgICAgfVxuICAgIH0sIDIwMCwgeyBsZWFkaW5nOiB0cnVlIH0pO1xuXG4gICAgdGhpcy5vcGVyYXRpb25zLnN1YnNjcmliZSgnKicsIGRlYm91bmNlZFJlZnJlc2gpO1xufTtcbiIsIi8qKlxuICogIyMgVmFyaWFibGVzIENoYW5uZWxcbiAqXG4gKiBDaGFubmVscyBhcmUgd2F5cyBmb3IgRmxvdy5qcyB0byB0YWxrIHRvIGV4dGVybmFsIEFQSXMgLS0gcHJpbWFyaWx5IHRoZSBbdW5kZXJseWluZyBFcGljZW50ZXIgQVBJc10oLi4vLi4vLi4vLi4vY3JlYXRpbmdfeW91cl9pbnRlcmZhY2UvKS5cbiAqXG4gKiBUaGUgcHJpbWFyeSB1c2UgY2FzZXMgZm9yIHRoZSBWYXJpYWJsZXMgQ2hhbm5lbCBhcmU6XG4gKlxuICogKiBgcHVibGlzaGA6IFVwZGF0ZSBhIG1vZGVsIHZhcmlhYmxlLlxuICogKiBgc3Vic2NyaWJlYDogUmVjZWl2ZSBub3RpZmljYXRpb25zIHdoZW4gYSBtb2RlbCB2YXJpYWJsZSBpcyB1cGRhdGVkLlxuICpcbiAqIEZvciBleGFtcGxlLCB1c2UgYHB1Ymxpc2goKWAgdG8gdXBkYXRlIGEgbW9kZWwgdmFyaWFibGU6XG4gKlxuICogICAgICBGbG93LmNoYW5uZWwub3BlcmF0aW9ucy5wdWJsaXNoKCdteVZhcmlhYmxlJywgbmV3VmFsdWUpO1xuICpcbiAqIEZvciByZWZlcmVuY2UsIGFuIGVxdWl2YWxlbnQgY2FsbCB1c2luZyBGbG93LmpzIGN1c3RvbSBIVE1MIGF0dHJpYnV0ZXMgaXM6XG4gKlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cIm15VmFyaWFibGVcIiB2YWx1ZT1cIm5ld1ZhbHVlXCI+PC9pbnB1dD5cbiAqXG4gKiB3aGVyZSB0aGUgbmV3IHZhbHVlIGlzIGlucHV0IGJ5IHRoZSB1c2VyLlxuICpcbiAqIFlvdSBjYW4gYWxzbyB1c2UgYHN1YnNjcmliZSgpYCBhbmQgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBsaXN0ZW4gYW5kIHJlYWN0IHdoZW4gdGhlIG1vZGVsIHZhcmlhYmxlIGhhcyBiZWVuIHVwZGF0ZWQ6XG4gKlxuICogICAgICBGbG93LmNoYW5uZWwub3BlcmF0aW9ucy5zdWJzY3JpYmUoJ215VmFyaWFibGUnLFxuICogICAgICAgICAgZnVuY3Rpb24oKSB7IGNvbnNvbGUubG9nKCdjYWxsZWQhJyk7IH0gKTtcbiAqXG4gKiBUbyB1c2UgdGhlIFZhcmlhYmxlcyBDaGFubmVsLCBzaW1wbHkgW2luaXRpYWxpemUgRmxvdy5qcyBpbiB5b3VyIHByb2plY3RdKC4uLy4uLy4uLyNjdXN0b20taW5pdGlhbGl6ZSkuXG4gKlxuKi9cblxuJ3VzZSBzdHJpY3QnO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRGV0ZXJtaW5lIHdoZW4gdG8gdXBkYXRlIHN0YXRlLiBEZWZhdWx0cyB0byBgZmFsc2VgOiBhbHdheXMgdHJpZ2dlciB1cGRhdGVzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBQb3NzaWJsZSBvcHRpb25zIGFyZTpcbiAgICAgICAgICpcbiAgICAgICAgICogKiBgdHJ1ZWA6IE5ldmVyIHRyaWdnZXIgYW55IHVwZGF0ZXMuIFVzZSB0aGlzIGlmIHlvdSBrbm93IHlvdXIgbW9kZWwgc3RhdGUgd29uJ3QgY2hhbmdlIGJhc2VkIG9uIG90aGVyIHZhcmlhYmxlcy5cbiAgICAgICAgICogKiBgZmFsc2VgOiBBbHdheXMgdHJpZ2dlciB1cGRhdGVzLlxuICAgICAgICAgKiAqIGBbYXJyYXkgb2YgdmFyaWFibGUgbmFtZXNdYDogVmFyaWFibGVzIGluIHRoaXMgYXJyYXkgKndpbGwgbm90KiB0cmlnZ2VyIHVwZGF0ZXM7IGV2ZXJ5dGhpbmcgZWxzZSB3aWxsLlxuICAgICAgICAgKiAqIGB7IGV4Y2VwdDogW2FycmF5IG9mIHZhcmlhYmxlIG5hbWVzXSB9YDogVmFyaWFibGVzIGluIHRoaXMgYXJyYXkgKndpbGwqIHRyaWdnZXIgdXBkYXRlczsgbm90aGluZyBlbHNlIHdpbGwuXG4gICAgICAgICAqXG4gICAgICAgICAqIFRvIHNldCwgcGFzcyB0aGlzIGludG8gdGhlIGBGbG93LmluaXRpYWxpemUoKWAgY2FsbCBpbiB0aGUgYGNoYW5uZWwucnVuLnZhcmlhYmxlc2AgZmllbGQ6XG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5pbml0aWFsaXplKHtcbiAgICAgICAgICogICAgICAgICAgY2hhbm5lbDoge1xuICAgICAgICAgKiAgICAgICAgICAgICAgcnVuOiB7XG4gICAgICAgICAqICAgICAgICAgICAgICAgICAgbW9kZWw6ICdteU1vZGVsLnB5JyxcbiAgICAgICAgICogICAgICAgICAgICAgICAgICBhY2NvdW50OiAnYWNtZS1zaW11bGF0aW9ucycsXG4gICAgICAgICAqICAgICAgICAgICAgICAgICAgcHJvamVjdDogJ3N1cHBseS1jaGFpbi1nYW1lJyxcbiAgICAgICAgICogICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6IHsgc2lsZW50OiB0cnVlIH1cbiAgICAgICAgICogICAgICAgICAgICAgIH1cbiAgICAgICAgICogICAgICAgICAgfVxuICAgICAgICAgKiAgICAgIH0pO1xuICAgICAgICAgKlxuICAgICAgICAgKiBUbyBvdmVycmlkZSBmb3IgYSBzcGVjaWZpYyBjYWxsIHRvIHRoZSBWYXJpYWJsZXMgQ2hhbm5lbCwgcGFzcyB0aGlzIGFzIHRoZSBmaW5hbCBgb3B0aW9uc2AgcGFyYW1ldGVyOlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgICBGbG93LmNoYW5uZWwudmFyaWFibGVzLnB1Ymxpc2goJ215VmFyaWFibGUnLCBuZXdWYWx1ZSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtTdHJpbmd8QXJyYXl8T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgc2lsZW50OiBmYWxzZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWxsb3dzIHlvdSB0byBhdXRvbWF0aWNhbGx5IGZldGNoIHZhcmlhYmxlcyBmcm9tIHRoZSBBUEkgYXMgdGhleSdyZSBiZWluZyBzdWJzY3JpYmVkLiBJZiB0aGlzIGlzIHNldCB0byBgZW5hYmxlOiBmYWxzZWAgeW91J2xsIG5lZWQgdG8gZXhwbGljaXRseSBjYWxsIGByZWZyZXNoKClgIHRvIGdldCBkYXRhIGFuZCBub3RpZnkgeW91ciBsaXN0ZW5lcnMuXG4gICAgICAgICAqXG4gICAgICAgICAqIFRoZSBwcm9wZXJ0aWVzIG9mIHRoaXMgb2JqZWN0IGluY2x1ZGU6XG4gICAgICAgICAqXG4gICAgICAgICAqICogYGF1dG9GZXRjaC5lbmFibGVgICpCb29sZWFuKiBFbmFibGUgYXV0by1mZXRjaCBiZWhhdmlvci4gSWYgc2V0IHRvIGBmYWxzZWAgZHVyaW5nIGluc3RhbnRpYXRpb24gdGhlcmUncyBubyB3YXkgdG8gZW5hYmxlIHRoaXMgYWdhaW4uIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgICAgICAgICogKiBgYXV0b0ZldGNoLnN0YXJ0YCAqQm9vbGVhbiogSWYgYXV0by1mZXRjaCBpcyBlbmFibGVkLCBjb250cm9sIHdoZW4gdG8gc3RhcnQgZmV0Y2hpbmcuIFR5cGljYWxseSB5b3UnZCB3YW50IHRvIHN0YXJ0IHJpZ2h0IGF3YXksIGJ1dCBpZiB5b3Ugd2FudCB0byB3YWl0IHRpbGwgc29tZXRoaW5nIGVsc2UgaGFwcGVucyAobGlrZSBhbiBvcGVyYXRpb24gb3IgdXNlciBhY3Rpb24pIHNldCB0byBgZmFsc2VgIGFuZCBjb250cm9sIHVzaW5nIHRoZSBgc3RhcnRBdXRvRmV0Y2goKWAgZnVuY3Rpb24uIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgICAgICAgICogKiBgYXV0b0ZldGNoLmRlYm91bmNlYCAqTnVtYmVyKiBNaWxsaXNlY29uZHMgdG8gd2FpdCBiZXR3ZWVuIGNhbGxzIHRvIGBzdWJzY3JpYmUoKWAgYmVmb3JlIGNhbGxpbmcgYGZldGNoKClgLiBTZWUgW2h0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbl0oaHR0cDovL2RydXBhbG1vdGlvbi5jb20vYXJ0aWNsZS9kZWJvdW5jZS1hbmQtdGhyb3R0bGUtdmlzdWFsLWV4cGxhbmF0aW9uKSBmb3IgYW4gZXhwbGFuYXRpb24gb2YgaG93IGRlYm91bmNpbmcgd29ya3MuIERlZmF1bHRzIHRvIGAyMDBgLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgYXV0b0ZldGNoOiB7XG5cbiAgICAgICAgICAgICAvLyBFbmFibGUgYXV0by1mZXRjaCBiZWhhdmlvci4gSWYgc2V0IHRvIGBmYWxzZWAgZHVyaW5nIGluc3RhbnRpYXRpb24gdGhlcmUncyBubyB3YXkgdG8gZW5hYmxlIHRoaXMgYWdhaW5cbiAgICAgICAgICAgICAvLyBAdHlwZSB7Qm9vbGVhbn1cbiAgICAgICAgICAgIGVuYWJsZTogdHJ1ZSxcblxuICAgICAgICAgICAgIC8vIElmIGF1dG8tZmV0Y2ggaXMgZW5hYmxlZCwgY29udHJvbCB3aGVuIHRvIHN0YXJ0IGZldGNoaW5nLiBUeXBpY2FsbHkgeW91J2Qgd2FudCB0byBzdGFydCByaWdodCBhd2F5LCBidXQgaWYgeW91IHdhbnQgdG8gd2FpdCB0aWxsIHNvbWV0aGluZyBlbHNlIGhhcHBlbnMgKGxpa2UgYW4gb3BlcmF0aW9uIG9yIHVzZXIgYWN0aW9uKSBzZXQgdG8gYGZhbHNlYCBhbmQgY29udHJvbCB1c2luZyB0aGUgYHN0YXJ0QXV0b0ZldGNoKClgIGZ1bmN0aW9uLlxuICAgICAgICAgICAgIC8vIEB0eXBlIHtCb29sZWFufVxuICAgICAgICAgICAgc3RhcnQ6IHRydWUsXG5cbiAgICAgICAgICAgICAvLyBDb250cm9sIHRpbWUgdG8gd2FpdCBiZXR3ZWVuIGNhbGxzIHRvIGBzdWJzY3JpYmUoKWAgYmVmb3JlIGNhbGxpbmcgYGZldGNoKClgLiBTZWUgW2h0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbl0oaHR0cDovL2RydXBhbG1vdGlvbi5jb20vYXJ0aWNsZS9kZWJvdW5jZS1hbmQtdGhyb3R0bGUtdmlzdWFsLWV4cGxhbmF0aW9uKSBmb3IgYW4gZXhwbGFuYXRpb24gb2YgaG93IGRlYm91bmNpbmcgd29ya3MuXG4gICAgICAgICAgICAgLy8gQHR5cGUge051bWJlcn0gTWlsbGlzZWNvbmRzIHRvIHdhaXRcbiAgICAgICAgICAgIGRlYm91bmNlOiAyMDBcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgY2hhbm5lbE9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuICAgIHRoaXMub3B0aW9ucyA9IGNoYW5uZWxPcHRpb25zO1xuXG4gICAgdmFyIHZzID0gY2hhbm5lbE9wdGlvbnMucnVuLnZhcmlhYmxlcygpO1xuXG4gICAgdmFyIGN1cnJlbnREYXRhID0ge307XG5cbiAgICAvL1RPRE86IGFjdHVhbGx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgc28gb25cbiAgICB2YXIgaXNFcXVhbCA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgdmFyIGdldElubmVyVmFyaWFibGVzID0gZnVuY3Rpb24gKHN0cikge1xuICAgICAgICB2YXIgaW5uZXIgPSBzdHIubWF0Y2goLzwoLio/KT4vZyk7XG4gICAgICAgIGlubmVyID0gXy5tYXAoaW5uZXIsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWwuc3Vic3RyaW5nKDEsIHZhbC5sZW5ndGggLSAxKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBpbm5lcjtcbiAgICB9O1xuXG4gICAgLy9SZXBsYWNlcyBzdHViYmVkIG91dCBrZXluYW1lcyBpbiB2YXJpYWJsZXN0b2ludGVycG9sYXRlIHdpdGggdGhlaXIgY29ycmVzcG9uZGluZyB2YWx1ZXNcbiAgICB2YXIgaW50ZXJwb2xhdGUgPSBmdW5jdGlvbiAodmFyaWFibGVzVG9JbnRlcnBvbGF0ZSwgdmFsdWVzKSB7XG4gICAgICAgIC8ve3ByaWNlWzFdOiBwcmljZVs8dGltZT5dfVxuICAgICAgICB2YXIgaW50ZXJwb2xhdGlvbk1hcCA9IHt9O1xuICAgICAgICAvL3twcmljZVsxXTogMX1cbiAgICAgICAgdmFyIGludGVycG9sYXRlZCA9IHt9O1xuXG4gICAgICAgIF8uZWFjaCh2YXJpYWJsZXNUb0ludGVycG9sYXRlLCBmdW5jdGlvbiAob3V0ZXJWYXJpYWJsZSkge1xuICAgICAgICAgICAgdmFyIGlubmVyID0gZ2V0SW5uZXJWYXJpYWJsZXMob3V0ZXJWYXJpYWJsZSk7XG4gICAgICAgICAgICB2YXIgb3JpZ2luYWxPdXRlciA9IG91dGVyVmFyaWFibGU7XG4gICAgICAgICAgICBpZiAoaW5uZXIgJiYgaW5uZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJC5lYWNoKGlubmVyLCBmdW5jdGlvbiAoaW5kZXgsIGlubmVyVmFyaWFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRoaXN2YWwgPSB2YWx1ZXNbaW5uZXJWYXJpYWJsZV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzdmFsICE9PSBudWxsICYmIHRoaXN2YWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh0aGlzdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vRm9yIGFycmF5ZWQgdGhpbmdzIGdldCB0aGUgbGFzdCBvbmUgZm9yIGludGVycG9sYXRpb24gcHVycG9zZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzdmFsID0gdGhpc3ZhbFt0aGlzdmFsLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBSZWdleCB0byBtYXRjaCBzcGFjZXMgYW5kIHNvIG9uXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRlclZhcmlhYmxlID0gb3V0ZXJWYXJpYWJsZS5yZXBsYWNlKCc8JyArIGlubmVyVmFyaWFibGUgKyAnPicsIHRoaXN2YWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaW50ZXJwb2xhdGlvbk1hcFtvdXRlclZhcmlhYmxlXSA9IChpbnRlcnBvbGF0aW9uTWFwW291dGVyVmFyaWFibGVdKSA/IFtvcmlnaW5hbE91dGVyXS5jb25jYXQoaW50ZXJwb2xhdGlvbk1hcFtvdXRlclZhcmlhYmxlXSkgOiBvcmlnaW5hbE91dGVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW50ZXJwb2xhdGVkW29yaWdpbmFsT3V0ZXJdID0gb3V0ZXJWYXJpYWJsZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIG9wID0ge1xuICAgICAgICAgICAgaW50ZXJwb2xhdGVkOiBpbnRlcnBvbGF0ZWQsXG4gICAgICAgICAgICBpbnRlcnBvbGF0aW9uTWFwOiBpbnRlcnBvbGF0aW9uTWFwXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBvcDtcbiAgICB9O1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcbiAgICAgICAgLy9mb3IgdGVzdGluZ1xuICAgICAgICBwcml2YXRlOiB7XG4gICAgICAgICAgICBnZXRJbm5lclZhcmlhYmxlczogZ2V0SW5uZXJWYXJpYWJsZXMsXG4gICAgICAgICAgICBpbnRlcnBvbGF0ZTogaW50ZXJwb2xhdGUsXG4gICAgICAgICAgICBjdXJyZW50RGF0YTogY3VycmVudERhdGEsXG4gICAgICAgICAgICBvcHRpb25zOiBjaGFubmVsT3B0aW9uc1xuICAgICAgICB9LFxuXG4gICAgICAgIHN1YnNjcmlwdGlvbnM6IFtdLFxuXG4gICAgICAgIHVuZmV0Y2hlZDogW10sXG5cbiAgICAgICAgZ2V0U3Vic2NyaWJlcnM6IGZ1bmN0aW9uICh0b3BpYykge1xuICAgICAgICAgICAgaWYgKHRvcGljKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF8uZmlsdGVyKHRoaXMuc3Vic2NyaXB0aW9ucywgZnVuY3Rpb24gKHN1YnMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF8uY29udGFpbnMoc3Vicy50b3BpY3MsIHRvcGljKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3Vic2NyaXB0aW9ucztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0QWxsVG9waWNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gXyh0aGlzLnN1YnNjcmlwdGlvbnMpLnBsdWNrKCd0b3BpY3MnKS5mbGF0dGVuKCkudW5pcSgpLnZhbHVlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFRvcGljRGVwZW5kZW5jaWVzOiBmdW5jdGlvbiAobGlzdCkge1xuICAgICAgICAgICAgaWYgKCFsaXN0KSB7XG4gICAgICAgICAgICAgICAgbGlzdCA9IHRoaXMuZ2V0QWxsVG9waWNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaW5uZXJMaXN0ID0gW107XG4gICAgICAgICAgICBfLmVhY2gobGlzdCwgZnVuY3Rpb24gKHZuYW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlubmVyID0gZ2V0SW5uZXJWYXJpYWJsZXModm5hbWUpO1xuICAgICAgICAgICAgICAgIGlmIChpbm5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5uZXJMaXN0ID0gXy51bmlxKGlubmVyTGlzdC5jb25jYXQoaW5uZXIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBpbm5lckxpc3Q7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlQW5kQ2hlY2tGb3JSZWZyZXNoOiBmdW5jdGlvbiAodG9waWNzLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAodG9waWNzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51bmZldGNoZWQgPSBfLnVuaXEodGhpcy51bmZldGNoZWQuY29uY2F0KHRvcGljcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFjaGFubmVsT3B0aW9ucy5hdXRvRmV0Y2guZW5hYmxlIHx8ICFjaGFubmVsT3B0aW9ucy5hdXRvRmV0Y2guc3RhcnQgfHwgIXRoaXMudW5mZXRjaGVkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpcy5kZWJvdW5jZWRGZXRjaCkge1xuICAgICAgICAgICAgICAgIHZhciBkZWJvdW5jZU9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7fSwge1xuICAgICAgICAgICAgICAgICAgICBtYXhXYWl0OiBjaGFubmVsT3B0aW9ucy5hdXRvRmV0Y2guZGVib3VuY2UgKiA0LFxuICAgICAgICAgICAgICAgICAgICBsZWFkaW5nOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sIG9wdGlvbnMpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5kZWJvdW5jZWRGZXRjaCA9IF8uZGVib3VuY2UoZnVuY3Rpb24gKHRvcGljcykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZldGNoKHRoaXMudW5mZXRjaGVkKS50aGVuKGZ1bmN0aW9uIChjaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkLmV4dGVuZChjdXJyZW50RGF0YSwgY2hhbmdlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVuZmV0Y2hlZCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3RpZnkoY2hhbmdlZCk7XG4gICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgfSwgY2hhbm5lbE9wdGlvbnMuYXV0b0ZldGNoLmRlYm91bmNlLCBkZWJvdW5jZU9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmRlYm91bmNlZEZldGNoKHRvcGljcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZmV0Y2g6IGZ1bmN0aW9uICh2YXJpYWJsZXNMaXN0KSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnZmV0Y2ggY2FsbGVkJywgdmFyaWFibGVzTGlzdCk7XG4gICAgICAgICAgICB2YXJpYWJsZXNMaXN0ID0gW10uY29uY2F0KHZhcmlhYmxlc0xpc3QpO1xuICAgICAgICAgICAgdmFyIGlubmVyVmFyaWFibGVzID0gdGhpcy5nZXRUb3BpY0RlcGVuZGVuY2llcyh2YXJpYWJsZXNMaXN0KTtcbiAgICAgICAgICAgIHZhciBnZXRWYXJpYWJsZXMgPSBmdW5jdGlvbiAodmFycywgaW50ZXJwb2xhdGlvbk1hcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2cy5xdWVyeSh2YXJzKS50aGVuKGZ1bmN0aW9uICh2YXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ0dvdCB2YXJpYWJsZXMnLCB2YXJpYWJsZXMpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2hhbmdlU2V0ID0ge307XG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaCh2YXJpYWJsZXMsIGZ1bmN0aW9uICh2YWx1ZSwgdm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbGRWYWx1ZSA9IGN1cnJlbnREYXRhW3ZuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNFcXVhbCh2YWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlU2V0W3ZuYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnRlcnBvbGF0aW9uTWFwICYmIGludGVycG9sYXRpb25NYXBbdm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXAgPSBbXS5jb25jYXQoaW50ZXJwb2xhdGlvbk1hcFt2bmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmVhY2gobWFwLCBmdW5jdGlvbiAoaW50ZXJwb2xhdGVkTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlU2V0W2ludGVycG9sYXRlZE5hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjaGFuZ2VTZXQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKGlubmVyVmFyaWFibGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2cy5xdWVyeShpbm5lclZhcmlhYmxlcykudGhlbihmdW5jdGlvbiAoaW5uZXJWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnaW5uZXInLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgICQuZXh0ZW5kKGN1cnJlbnREYXRhLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpcCA9ICBpbnRlcnBvbGF0ZSh2YXJpYWJsZXNMaXN0LCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRWYXJpYWJsZXMoXy52YWx1ZXMoaXAuaW50ZXJwb2xhdGVkKSwgaXAuaW50ZXJwb2xhdGlvbk1hcCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBnZXRWYXJpYWJsZXModmFyaWFibGVzTGlzdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3RhcnRBdXRvRmV0Y2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNoYW5uZWxPcHRpb25zLmF1dG9GZXRjaC5zdGFydCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUFuZENoZWNrRm9yUmVmcmVzaCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN0b3BBdXRvRmV0Y2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNoYW5uZWxPcHRpb25zLmF1dG9GZXRjaC5zdGFydCA9IGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGb3JjZSBhIGNoZWNrIGZvciB1cGRhdGVzIG9uIHRoZSBjaGFubmVsLCBhbmQgbm90aWZ5IGFsbCBsaXN0ZW5lcnMuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBjaGFuZ2VMaXN0IEtleS12YWx1ZSBwYWlycyBvZiBjaGFuZ2VkIHZhcmlhYmxlcy5cbiAgICAgICAgICogQHBhcmFtIHtCb29sZWFufSBmb3JjZSAgSWdub3JlIGFsbCBgc2lsZW50YCBvcHRpb25zIGFuZCBmb3JjZSByZWZyZXNoLlxuICAgICAgICAgKi9cbiAgICAgICAgcmVmcmVzaDogZnVuY3Rpb24gKGNoYW5nZUxpc3QsIGZvcmNlKSB7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIHNpbGVudCA9IGNoYW5uZWxPcHRpb25zLnNpbGVudDtcbiAgICAgICAgICAgIHZhciBjaGFuZ2VkVmFyaWFibGVzID0gXy5pc0FycmF5KGNoYW5nZUxpc3QpID8gIGNoYW5nZUxpc3QgOiBfLmtleXMoY2hhbmdlTGlzdCk7XG5cbiAgICAgICAgICAgIHZhciBzaG91bGRTaWxlbmNlID0gc2lsZW50ID09PSB0cnVlO1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheShzaWxlbnQpICYmIGNoYW5nZWRWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBzaG91bGRTaWxlbmNlID0gXy5pbnRlcnNlY3Rpb24oc2lsZW50LCBjaGFuZ2VkVmFyaWFibGVzKS5sZW5ndGggPj0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3Qoc2lsZW50KSAmJiBjaGFuZ2VkVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgc2hvdWxkU2lsZW5jZSA9IF8uaW50ZXJzZWN0aW9uKHNpbGVudC5leGNlcHQsIGNoYW5nZWRWYXJpYWJsZXMpLmxlbmd0aCAhPT0gY2hhbmdlZFZhcmlhYmxlcy5sZW5ndGg7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzaG91bGRTaWxlbmNlICYmIGZvcmNlICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICQuRGVmZXJyZWQoKS5yZXNvbHZlKCkucHJvbWlzZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgdmFyaWFibGVzID0gdGhpcy5nZXRBbGxUb3BpY3MoKTtcbiAgICAgICAgICAgIG1lLnVuZmV0Y2hlZCA9IFtdO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mZXRjaCh2YXJpYWJsZXMpLnRoZW4oZnVuY3Rpb24gKGNoYW5nZVNldCkge1xuICAgICAgICAgICAgICAgICQuZXh0ZW5kKGN1cnJlbnREYXRhLCBjaGFuZ2VTZXQpO1xuICAgICAgICAgICAgICAgIG1lLm5vdGlmeShjaGFuZ2VTZXQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFsZXJ0IGVhY2ggc3Vic2NyaWJlciBhYm91dCB0aGUgdmFyaWFibGUgYW5kIGl0cyBuZXcgdmFsdWUuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLm9wZXJhdGlvbnMubm90aWZ5KCdteVZhcmlhYmxlJywgbmV3VmFsdWUpO1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gdG9waWNzIE5hbWVzIG9mIHZhcmlhYmxlcy5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfEFycmF5fE9iamVjdH0gdmFsdWUgTmV3IHZhbHVlcyBmb3IgdGhlIHZhcmlhYmxlcy5cbiAgICAgICAgKi9cbiAgICAgICAgbm90aWZ5OiBmdW5jdGlvbiAodG9waWNzLCB2YWx1ZSkge1xuICAgICAgICAgICAgdmFyIGNhbGxUYXJnZXQgPSBmdW5jdGlvbiAodGFyZ2V0LCBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNhbGwobnVsbCwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQudHJpZ2dlcihjb25maWcuZXZlbnRzLnJlYWN0LCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICghJC5pc1BsYWluT2JqZWN0KHRvcGljcykpIHtcbiAgICAgICAgICAgICAgICB0b3BpY3MgPSBfLm9iamVjdChbdG9waWNzXSwgW3ZhbHVlXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfLmVhY2godGhpcy5zdWJzY3JpcHRpb25zLCBmdW5jdGlvbiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9IHN1YnNjcmlwdGlvbi50YXJnZXQ7XG4gICAgICAgICAgICAgICAgaWYgKHN1YnNjcmlwdGlvbi5iYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWF0Y2hpbmdUb3BpY3MgPSBfLnBpY2sodG9waWNzLCBzdWJzY3JpcHRpb24udG9waWNzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uc2l6ZShtYXRjaGluZ1RvcGljcykgPT09IF8uc2l6ZShzdWJzY3JpcHRpb24udG9waWNzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFRhcmdldCh0YXJnZXQsIG1hdGNoaW5nVG9waWNzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaChzdWJzY3JpcHRpb24udG9waWNzLCBmdW5jdGlvbiAodG9waWMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXRjaGluZ1RvcGljcyA9IF8ucGljayh0b3BpY3MsIHRvcGljKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfLnNpemUobWF0Y2hpbmdUb3BpY3MpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFRhcmdldCh0YXJnZXQsIG1hdGNoaW5nVG9waWNzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFVwZGF0ZSB0aGUgdmFyaWFibGVzIHdpdGggbmV3IHZhbHVlcywgYW5kIGFsZXJ0IHN1YnNjcmliZXJzLlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC52YXJpYWJsZXMucHVibGlzaCgnbXlWYXJpYWJsZScsIG5ld1ZhbHVlKTtcbiAgICAgICAgICogICAgICBGbG93LmNoYW5uZWwudmFyaWFibGVzLnB1Ymxpc2goeyBteVZhcjE6IG5ld1ZhbDEsIG15VmFyMjogbmV3VmFsMiB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtICB7U3RyaW5nfE9iamVjdH0gdmFyaWFibGUgU3RyaW5nIHdpdGggbmFtZSBvZiB2YXJpYWJsZS4gQWx0ZXJuYXRpdmVseSwgb2JqZWN0IGluIGZvcm0gYHsgdmFyaWFibGVOYW1lOiB2YWx1ZSB9YC5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfEFycmF5fE9iamVjdH0gdmFsdWUgKE9wdGlvbmFsKSAgVmFsdWUgb2YgdGhlIHZhcmlhYmxlLCBpZiBwcmV2aW91cyBhcmd1bWVudCB3YXMgYSBzdHJpbmcuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIChPcHRpb25hbCkgT3ZlcnJpZGVzIGZvciB0aGUgZGVmYXVsdCBjaGFubmVsIG9wdGlvbnMuIFN1cHBvcnRlZCBvcHRpb25zOiBgeyBzaWxlbnQ6IEJvb2xlYW4gfWAgYW5kIGB7IGJhdGNoOiBCb29sZWFuIH1gLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJuIHskcHJvbWlzZX0gUHJvbWlzZSB0byBjb21wbGV0ZSB0aGUgdXBkYXRlLlxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGlzaDogZnVuY3Rpb24gKHZhcmlhYmxlLCB2YWx1ZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3B1Ymxpc2gnLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIGF0dHJzO1xuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdCh2YXJpYWJsZSkpIHtcbiAgICAgICAgICAgICAgICBhdHRycyA9IHZhcmlhYmxlO1xuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgKGF0dHJzID0ge30pW3ZhcmlhYmxlXSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGl0ID0gaW50ZXJwb2xhdGUoXy5rZXlzKGF0dHJzKSwgY3VycmVudERhdGEpO1xuXG4gICAgICAgICAgICB2YXIgdG9TYXZlID0ge307XG4gICAgICAgICAgICBfLmVhY2goYXR0cnMsIGZ1bmN0aW9uICh2YWwsIGF0dHIpIHtcbiAgICAgICAgICAgICAgIHZhciBrZXkgPSAoaXQuaW50ZXJwb2xhdGVkW2F0dHJdKSA/IGl0LmludGVycG9sYXRlZFthdHRyXSA6IGF0dHI7XG4gICAgICAgICAgICAgICB0b1NhdmVba2V5XSA9IHZhbDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIHJldHVybiB2cy5zYXZlLmNhbGwodnMsIHRvU2F2ZSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghb3B0aW9ucyB8fCAhb3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lLnJlZnJlc2guY2FsbChtZSwgYXR0cnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN1YnNjcmliZSB0byBjaGFuZ2VzIG9uIGEgY2hhbm5lbDogQXNrIGZvciBub3RpZmljYXRpb24gd2hlbiB2YXJpYWJsZXMgYXJlIHVwZGF0ZWQuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLnZhcmlhYmxlcy5zdWJzY3JpYmUoJ215VmFyaWFibGUnLFxuICAgICAgICAgKiAgICAgICAgICBmdW5jdGlvbigpIHsgY29uc29sZS5sb2coJ2NhbGxlZCEnKTsgfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgRmxvdy5jaGFubmVsLnZhcmlhYmxlcy5zdWJzY3JpYmUoWydwcmljZScsICdjb3N0J10sXG4gICAgICAgICAqICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgKiAgICAgICAgICAgICAgLy8gdGhpcyBmdW5jdGlvbiBjYWxsZWQgb25seSBvbmNlLCB3aXRoIHsgcHJpY2U6IFgsIGNvc3Q6IFkgfVxuICAgICAgICAgKiAgICAgICAgICB9LFxuICAgICAgICAgKiAgICAgICAgICB7IGJhdGNoOiB0cnVlIH0pO1xuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIEZsb3cuY2hhbm5lbC52YXJpYWJsZXMuc3Vic2NyaWJlKFsncHJpY2UnLCAnY29zdCddLFxuICAgICAgICAgKiAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICogICAgICAgICAgICAgIC8vIHRoaXMgZnVuY3Rpb24gY2FsbGVkIHR3aWNlLCBvbmNlIHdpdGggeyBwcmljZTogWCB9XG4gICAgICAgICAqICAgICAgICAgICAgICAvLyBhbmQgYWdhaW4gd2l0aCB7IGNvc3Q6IFkgfVxuICAgICAgICAgKiAgICAgICAgICB9LFxuICAgICAgICAgKiAgICAgICAgICB7IGJhdGNoOiBmYWxzZSB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IHRvcGljcyBUaGUgbmFtZXMgb2YgdGhlIHZhcmlhYmxlcy5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R8RnVuY3Rpb259IHN1YnNjcmliZXIgVGhlIG9iamVjdCBvciBmdW5jdGlvbiBiZWluZyBub3RpZmllZC4gT2Z0ZW4gdGhpcyBpcyBhIGNhbGxiYWNrIGZ1bmN0aW9uLiBJZiB0aGlzIGlzIG5vdCBhIGZ1bmN0aW9uLCBhIGB0cmlnZ2VyYCBtZXRob2QgaXMgY2FsbGVkIGlmIGF2YWlsYWJsZTsgaWYgbm90LCBldmVudCBpcyB0cmlnZ2VyZWQgb24gJChvYmplY3QpLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAoT3B0aW9uYWwpIE92ZXJyaWRlcyBmb3IgdGhlIGRlZmF1bHQgY2hhbm5lbCBvcHRpb25zLlxuICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuc2lsZW50IERldGVybWluZSB3aGVuIHRvIHVwZGF0ZSBzdGF0ZS5cbiAgICAgICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLmJhdGNoIElmIHlvdSBhcmUgc3Vic2NyaWJpbmcgdG8gbXVsdGlwbGUgdmFyaWFibGVzLCBieSBkZWZhdWx0IHRoZSBjYWxsYmFjayBmdW5jdGlvbiBpcyBjYWxsZWQgb25jZSBmb3IgZWFjaCBpdGVtIHRvIHdoaWNoIHlvdSBzdWJzY3JpYmU6IGBiYXRjaDogZmFsc2VgLiBXaGVuIGBiYXRjaGAgaXMgc2V0IHRvIGB0cnVlYCwgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGlzIG9ubHkgY2FsbGVkIG9uY2UsIG5vIG1hdHRlciBob3cgbWFueSBpdGVtcyB5b3UgYXJlIHN1YnNjcmliaW5nIHRvLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IEFuIGlkZW50aWZ5aW5nIHRva2VuIGZvciB0aGlzIHN1YnNjcmlwdGlvbi4gUmVxdWlyZWQgYXMgYSBwYXJhbWV0ZXIgd2hlbiB1bnN1YnNjcmliaW5nLlxuICAgICAgICAqL1xuICAgICAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uICh0b3BpY3MsIHN1YnNjcmliZXIsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdzdWJzY3JpYmluZycsIHRvcGljcywgc3Vic2NyaWJlcik7XG4gICAgICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICAgICAgYmF0Y2g6IGZhbHNlXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0b3BpY3MgPSBbXS5jb25jYXQodG9waWNzKTtcbiAgICAgICAgICAgIC8vdXNlIGpxdWVyeSB0byBtYWtlIGV2ZW50IHNpbmtcbiAgICAgICAgICAgIGlmICghc3Vic2NyaWJlci5vbiAmJiAhXy5pc0Z1bmN0aW9uKHN1YnNjcmliZXIpKSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlciA9ICQoc3Vic2NyaWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpZCAgPSBfLnVuaXF1ZUlkKCdlcGljaGFubmVsLnZhcmlhYmxlJyk7XG4gICAgICAgICAgICB2YXIgZGF0YSA9ICQuZXh0ZW5kKHtcbiAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgdG9waWNzOiB0b3BpY3MsXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBzdWJzY3JpYmVyXG4gICAgICAgICAgICB9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKGRhdGEpO1xuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUFuZENoZWNrRm9yUmVmcmVzaCh0b3BpY3MpO1xuICAgICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdG9wIHJlY2VpdmluZyBub3RpZmljYXRpb25zIGZvciBhbGwgc3Vic2NyaXB0aW9ucyByZWZlcmVuY2VkIGJ5IHRoaXMgdG9rZW4uXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSB0b2tlbiBUaGUgaWRlbnRpZnlpbmcgdG9rZW4gZm9yIHRoaXMgc3Vic2NyaXB0aW9uLiAoQ3JlYXRlZCBhbmQgcmV0dXJuZWQgYnkgdGhlIGBzdWJzY3JpYmUoKWAgY2FsbC4pXG4gICAgICAgICovXG4gICAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbiAodG9rZW4pIHtcbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucyA9IF8ucmVqZWN0KHRoaXMuc3Vic2NyaXB0aW9ucywgZnVuY3Rpb24gKHN1YnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3Vicy5pZCA9PT0gdG9rZW47XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3RvcCByZWNlaXZpbmcgbm90aWZpY2F0aW9ucyBmb3IgYWxsIHN1YnNjcmlwdGlvbnMuIE5vIHBhcmFtZXRlcnMuXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm4ge05vbmV9XG4gICAgICAgICovXG4gICAgICAgIHVuc3Vic2NyaWJlQWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnN1YnNjcmlwdGlvbnMgPSBbXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkLmV4dGVuZCh0aGlzLCBwdWJsaWNBUEkpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHByZWZpeDogJ2YnLFxuICAgIGRlZmF1bHRBdHRyOiAnYmluZCcsXG5cbiAgICBiaW5kZXJBdHRyOiAnZi1iaW5kJyxcblxuICAgIGV2ZW50czoge1xuICAgICAgICB0cmlnZ2VyOiAndXBkYXRlLmYudWknLFxuICAgICAgICByZWFjdDogJ3VwZGF0ZS5mLm1vZGVsJ1xuICAgIH1cblxufTtcbiIsIi8qKlxuICogIyMgQXJyYXkgQ29udmVydGVyc1xuICpcbiAqIENvbnZlcnRlcnMgYWxsb3cgeW91IHRvIGNvbnZlcnQgZGF0YSAtLSBpbiBwYXJ0aWN1bGFyLCBtb2RlbCB2YXJpYWJsZXMgdGhhdCB5b3UgZGlzcGxheSBpbiB5b3VyIHByb2plY3QncyB1c2VyIGludGVyZmFjZSAtLSBmcm9tIG9uZSBmb3JtIHRvIGFub3RoZXIuXG4gKlxuICogVGhlcmUgYXJlIHR3byB3YXlzIHRvIHNwZWNpZnkgY29udmVyc2lvbiBvciBmb3JtYXR0aW5nIGZvciB0aGUgZGlzcGxheSBvdXRwdXQgb2YgYSBwYXJ0aWN1bGFyIG1vZGVsIHZhcmlhYmxlOlxuICpcbiAqICogQWRkIHRoZSBhdHRyaWJ1dGUgYGRhdGEtZi1jb252ZXJ0YCB0byBhbnkgZWxlbWVudCB0aGF0IGFsc28gaGFzIHRoZSBgZGF0YS1mLWJpbmRgIG9yIGBkYXRhLWYtZm9yZWFjaGAuXG4gKiAqIFVzZSB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIgd2l0aGluIHRoZSB2YWx1ZSBvZiBhbnkgYGRhdGEtZi1gIGF0dHJpYnV0ZSAobm90IGp1c3QgYGRhdGEtZi1iaW5kYCBvciBgZGF0YS1mLWZvcmVhY2hgKS5cbiAqXG4gKiBJbiBnZW5lcmFsLCBpZiB0aGUgbW9kZWwgdmFyaWFibGUgaXMgYW4gYXJyYXksIHRoZSBjb252ZXJ0ZXIgaXMgYXBwbGllZCB0byBlYWNoIGVsZW1lbnQgb2YgdGhlIGFycmF5LiBUaGVyZSBhcmUgYSBmZXcgYnVpbHQgaW4gYXJyYXkgY29udmVydGVycyB3aGljaCwgcmF0aGVyIHRoYW4gY29udmVydGluZyBhbGwgZWxlbWVudHMgb2YgYW4gYXJyYXksIHNlbGVjdCBwYXJ0aWN1bGFyIGVsZW1lbnRzIGZyb20gd2l0aGluIHRoZSBhcnJheSBvciBvdGhlcndpc2UgdHJlYXQgYXJyYXkgdmFyaWFibGVzIHNwZWNpYWxseS5cbiAqXG4gKi9cblxuXG4ndXNlIHN0cmljdCc7XG52YXIgbGlzdCA9IFtcbiAgICB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb252ZXJ0IHRoZSBpbnB1dCBpbnRvIGFuIGFycmF5LiBDb25jYXRlbmF0ZXMgYWxsIGVsZW1lbnRzIG9mIHRoZSBpbnB1dC5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtBcnJheX0gdmFsIFRoZSBhcnJheSBtb2RlbCB2YXJpYWJsZS5cbiAgICAgICAgICovXG4gICAgICAgIGFsaWFzOiAnbGlzdCcsXG4gICAgICAgIGFjY2VwdExpc3Q6IHRydWUsXG4gICAgICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICAvKipcbiAgICAgICAgICogU2VsZWN0IG9ubHkgdGhlIGxhc3QgZWxlbWVudCBvZiB0aGUgYXJyYXkuXG4gICAgICAgICAqXG4gICAgICAgICAqICoqRXhhbXBsZSoqXG4gICAgICAgICAqXG4gICAgICAgICAqICAgICAgPGRpdj5cbiAgICAgICAgICogICAgICAgICAgSW4gdGhlIGN1cnJlbnQgeWVhciwgd2UgaGF2ZSA8c3BhbiBkYXRhLWYtYmluZD1cIlNhbGVzIHwgbGFzdFwiPjwvc3Bhbj4gaW4gc2FsZXMuXG4gICAgICAgICAqICAgICAgPC9kaXY+XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgYXJyYXkgbW9kZWwgdmFyaWFibGUuXG4gICAgICAgICAqL1xuICAgICAgICBhbGlhczogJ2xhc3QnLFxuICAgICAgICBhY2NlcHRMaXN0OiB0cnVlLFxuICAgICAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICB2YWwgPSBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgICAgIHJldHVybiB2YWxbdmFsLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldmVyc2UgdGhlIGFycmF5LlxuICAgICAgICAgKlxuICAgICAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgIDxwPlNob3cgdGhlIGhpc3Rvcnkgb2Ygb3VyIHNhbGVzLCBzdGFydGluZyB3aXRoIHRoZSBsYXN0IChtb3N0IHJlY2VudCk6PC9wPlxuICAgICAgICAgKiAgICAgIDx1bCBkYXRhLWYtZm9yZWFjaD1cIlNhbGVzIHwgcmV2ZXJzZVwiPlxuICAgICAgICAgKiAgICAgICAgICA8bGk+PC9saT5cbiAgICAgICAgICogICAgICA8L3VsPlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWwgVGhlIGFycmF5IG1vZGVsIHZhcmlhYmxlLlxuICAgICAgICAgKi9cbiAgICB7XG4gICAgICAgIGFsaWFzOiAncmV2ZXJzZScsXG4gICAgICAgIGFjY2VwdExpc3Q6IHRydWUsXG4gICAgICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHZhbCA9IFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbC5yZXZlcnNlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNlbGVjdCBvbmx5IHRoZSBmaXJzdCBlbGVtZW50IG9mIHRoZSBhcnJheS5cbiAgICAgICAgICpcbiAgICAgICAgICogKipFeGFtcGxlKipcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICA8ZGl2PlxuICAgICAgICAgKiAgICAgICAgICBPdXIgaW5pdGlhbCBpbnZlc3RtZW50IHdhcyA8c3BhbiBkYXRhLWYtYmluZD1cIkNhcGl0YWwgfCBmaXJzdFwiPjwvc3Bhbj4uXG4gICAgICAgICAqICAgICAgPC9kaXY+XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgYXJyYXkgbW9kZWwgdmFyaWFibGUuXG4gICAgICAgICAqL1xuICAgICAgICBhbGlhczogJ2ZpcnN0JyxcbiAgICAgICAgYWNjZXB0TGlzdDogdHJ1ZSxcbiAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgdmFsID0gW10uY29uY2F0KHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gdmFsWzBdO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZWxlY3Qgb25seSB0aGUgcHJldmlvdXMgKHNlY29uZCB0byBsYXN0KSBlbGVtZW50IG9mIHRoZSBhcnJheS5cbiAgICAgICAgICpcbiAgICAgICAgICogKipFeGFtcGxlKipcbiAgICAgICAgICpcbiAgICAgICAgICogICAgICA8ZGl2PlxuICAgICAgICAgKiAgICAgICAgICBMYXN0IHllYXIgd2UgaGFkIDxzcGFuIGRhdGEtZi1iaW5kPVwiU2FsZXMgfCBwcmV2aW91c1wiPjwvc3Bhbj4gaW4gc2FsZXMuXG4gICAgICAgICAqICAgICAgPC9kaXY+XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgYXJyYXkgbW9kZWwgdmFyaWFibGUuXG4gICAgICAgICAqL1xuICAgICAgICBhbGlhczogJ3ByZXZpb3VzJyxcbiAgICAgICAgYWNjZXB0TGlzdDogdHJ1ZSxcbiAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgdmFsID0gW10uY29uY2F0KHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gKHZhbC5sZW5ndGggPD0gMSkgPyB2YWxbMF0gOiB2YWxbdmFsLmxlbmd0aCAtIDJdO1xuICAgICAgICB9XG4gICAgfVxuXTtcblxuXy5lYWNoKGxpc3QsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICB2YXIgb2xkZm4gPSBpdGVtLmNvbnZlcnQ7XG4gICB2YXIgbmV3Zm4gPSBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdCh2YWwpKSB7XG4gICAgICAgICAgICByZXR1cm4gXy5tYXBWYWx1ZXModmFsLCBvbGRmbik7XG4gICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBvbGRmbih2YWwpO1xuICAgICAgIH1cbiAgIH07XG4gICBpdGVtLmNvbnZlcnQgPSBuZXdmbjtcbn0pO1xubW9kdWxlLmV4cG9ydHMgPSBsaXN0O1xuIiwiLyoqXG4gKiAjIyBDb252ZXJ0ZXIgTWFuYWdlcjogTWFrZSB5b3VyIG93biBDb252ZXJ0ZXJzXG4gKlxuICogQ29udmVydGVycyBhbGxvdyB5b3UgdG8gY29udmVydCBkYXRhIC0tIGluIHBhcnRpY3VsYXIsIG1vZGVsIHZhcmlhYmxlcyB0aGF0IHlvdSBkaXNwbGF5IGluIHlvdXIgcHJvamVjdCdzIHVzZXIgaW50ZXJmYWNlIC0tIGZyb20gb25lIGZvcm0gdG8gYW5vdGhlci5cbiAqXG4gKiBCYXNpYyBjb252ZXJ0aW5nIGFuZCBmb3JtYXR0aW5nIG9wdGlvbnMgYXJlIGJ1aWx0IGluIHRvIEZsb3cuanMuXG4gKlxuICogWW91IGNhbiBhbHNvIGNyZWF0ZSB5b3VyIG93biBjb252ZXJ0ZXJzLiBFYWNoIGNvbnZlcnRlciBzaG91bGQgYmUgYSBmdW5jdGlvbiB0aGF0IHRha2VzIGluIGEgdmFsdWUgb3IgdmFsdWVzIHRvIGNvbnZlcnQuIFRvIHVzZSB5b3VyIGNvbnZlcnRlciwgYHJlZ2lzdGVyKClgIGl0IGluIHlvdXIgaW5zdGFuY2Ugb2YgRmxvdy5qcy5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vL1RPRE86IE1ha2UgYWxsIHVuZGVyc2NvcmUgZmlsdGVycyBhdmFpbGFibGVcblxudmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uIChhbGlhcywgY29udmVydGVyLCBhY2NlcHRMaXN0KSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIC8vbm9tYWxpemUoJ2ZsaXAnLCBmbilcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGNvbnZlcnRlcikpIHtcbiAgICAgICAgcmV0LnB1c2goe1xuICAgICAgICAgICAgYWxpYXM6IGFsaWFzLFxuICAgICAgICAgICAgY29udmVydDogY29udmVydGVyLFxuICAgICAgICAgICAgYWNjZXB0TGlzdDogYWNjZXB0TGlzdFxuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKCQuaXNQbGFpbk9iamVjdChjb252ZXJ0ZXIpICYmIGNvbnZlcnRlci5jb252ZXJ0KSB7XG4gICAgICAgIGNvbnZlcnRlci5hbGlhcyA9IGFsaWFzO1xuICAgICAgICBjb252ZXJ0ZXIuYWNjZXB0TGlzdCA9IGFjY2VwdExpc3Q7XG4gICAgICAgIHJldC5wdXNoKGNvbnZlcnRlcik7XG4gICAgfSBlbHNlIGlmICgkLmlzUGxhaW5PYmplY3QoYWxpYXMpKSB7XG4gICAgICAgIC8vbm9ybWFsaXplKHthbGlhczogJ2ZsaXAnLCBjb252ZXJ0OiBmdW5jdGlvbn0pXG4gICAgICAgIGlmIChhbGlhcy5jb252ZXJ0KSB7XG4gICAgICAgICAgICByZXQucHVzaChhbGlhcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBub3JtYWxpemUoe2ZsaXA6IGZ1bn0pXG4gICAgICAgICAgICAkLmVhY2goYWxpYXMsIGZ1bmN0aW9uIChrZXksIHZhbCkge1xuICAgICAgICAgICAgICAgIHJldC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgYWxpYXM6IGtleSxcbiAgICAgICAgICAgICAgICAgICAgY29udmVydDogdmFsLFxuICAgICAgICAgICAgICAgICAgICBhY2NlcHRMaXN0OiBhY2NlcHRMaXN0XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufTtcblxudmFyIG1hdGNoQ29udmVydGVyID0gZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIpIHtcbiAgICBpZiAoXy5pc1N0cmluZyhjb252ZXJ0ZXIuYWxpYXMpKSB7XG4gICAgICAgIHJldHVybiBhbGlhcyA9PT0gY29udmVydGVyLmFsaWFzO1xuICAgIH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKGNvbnZlcnRlci5hbGlhcykpIHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRlci5hbGlhcyhhbGlhcyk7XG4gICAgfSBlbHNlIGlmIChfLmlzUmVnZXgoY29udmVydGVyLmFsaWFzKSkge1xuICAgICAgICByZXR1cm4gY29udmVydGVyLmFsaWFzLm1hdGNoKGFsaWFzKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxudmFyIGNvbnZlcnRlck1hbmFnZXIgPSB7XG4gICAgcHJpdmF0ZToge1xuICAgICAgICBtYXRjaENvbnZlcnRlcjogbWF0Y2hDb252ZXJ0ZXJcbiAgICB9LFxuXG4gICAgbGlzdDogW10sXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IGF0dHJpYnV0ZSBjb252ZXJ0ZXIgdG8gdGhpcyBpbnN0YW5jZSBvZiBGbG93LmpzLlxuICAgICAqXG4gICAgICogKipFeGFtcGxlKipcbiAgICAgKlxuICAgICAqICAgICAgRmxvdy5kb20uY29udmVydGVycy5yZWdpc3RlcignbWF4JywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICogICAgICAgICAgcmV0dXJuIF8ubWF4KHZhbHVlKTtcbiAgICAgKiAgICAgIH0sIHRydWUpO1xuICAgICAqXG4gICAgICogICAgICBGbG93LmRvbS5jb252ZXJ0ZXJzLnJlZ2lzdGVyKHtcbiAgICAgKiAgICAgICAgICBhbGlhczogJ3NpZycsXG4gICAgICogICAgICAgICAgcGFyc2U6ICQubm9vcCxcbiAgICAgKiAgICAgICAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgKiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLmZpcnN0TmFtZSArICcgJyArIHZhbHVlLmxhc3ROYW1lICsgJywgJyArIHZhbHVlLmpvYlRpdGxlO1xuICAgICAqICAgICAgfSwgZmFsc2UpO1xuICAgICAqXG4gICAgICogICAgICA8ZGl2PlxuICAgICAqICAgICAgICAgIFRoZSBsYXJnZXN0IHNhbGVzIHlvdSBoYWQgd2FzIDxzcGFuIGRhdGEtZi1iaW5kPVwic2FsZXNCeVllYXIgfCBtYXggfCAkIywjIyNcIj48L3NwYW4+LlxuICAgICAqICAgICAgICAgIFRoZSBjdXJyZW50IHNhbGVzIG1hbmFnZXIgaXMgPHNwYW4gZGF0YS1mLWJpbmQ9XCJzYWxlc01nciB8IHNpZ1wiPjwvc3Bhbj4uXG4gICAgICogICAgICA8L2Rpdj5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge1N0cmluZ3xGdW5jdGlvbnxSZWdleH0gYWxpYXMgRm9ybWF0dGVyIG5hbWUuXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb258T2JqZWN0fSBjb252ZXJ0ZXIgSWYgYSBmdW5jdGlvbiwgYGNvbnZlcnRlcmAgaXMgY2FsbGVkIHdpdGggdGhlIHZhbHVlLiBJZiBhbiBvYmplY3QsIHNob3VsZCBpbmNsdWRlIGZpZWxkcyBmb3IgYGFsaWFzYCAobmFtZSksIGBwYXJzZWAgKGZ1bmN0aW9uKSwgYW5kIGBjb252ZXJ0YCAoZnVuY3Rpb24pLlxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gYWNjZXB0TGlzdCBEZXRlcm1pbmVzIGlmIHRoZSBjb252ZXJ0ZXIgaXMgYSAnbGlzdCcgY29udmVydGVyIG9yIG5vdC4gTGlzdCBjb252ZXJ0ZXJzIHRha2UgaW4gYXJyYXlzIGFzIGlucHV0cywgb3RoZXJzIGV4cGVjdCBzaW5nbGUgdmFsdWVzLlxuICAgICAqL1xuICAgIHJlZ2lzdGVyOiBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlciwgYWNjZXB0TGlzdCkge1xuICAgICAgICB2YXIgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZShhbGlhcywgY29udmVydGVyLCBhY2NlcHRMaXN0KTtcbiAgICAgICAgdGhpcy5saXN0ID0gbm9ybWFsaXplZC5jb25jYXQodGhpcy5saXN0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVwbGFjZSBhbiBhbHJlYWR5IHJlZ2lzdGVyZWQgY29udmVydGVyIHdpdGggYSBuZXcgb25lIG9mIHRoZSBzYW1lIG5hbWUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYWxpYXMgRm9ybWF0dGVyIG5hbWUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R9IGNvbnZlcnRlciBJZiBhIGZ1bmN0aW9uLCBgY29udmVydGVyYCBpcyBjYWxsZWQgd2l0aCB0aGUgdmFsdWUuIElmIGFuIG9iamVjdCwgc2hvdWxkIGluY2x1ZGUgZmllbGRzIGZvciBgYWxpYXNgIChuYW1lKSwgYHBhcnNlYCAoZnVuY3Rpb24pLCBhbmQgYGNvbnZlcnRgIChmdW5jdGlvbikuXG4gICAgICovXG4gICAgcmVwbGFjZTogZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIpIHtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBfLmVhY2godGhpcy5saXN0LCBmdW5jdGlvbiAoY3VycmVudENvbnZlcnRlciwgaSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoQ29udmVydGVyKGFsaWFzLCBjdXJyZW50Q29udmVydGVyKSkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoYWxpYXMsIGNvbnZlcnRlcilbMF0pO1xuICAgIH0sXG5cbiAgICBnZXRDb252ZXJ0ZXI6IGZ1bmN0aW9uIChhbGlhcykge1xuICAgICAgICByZXR1cm4gXy5maW5kKHRoaXMubGlzdCwgZnVuY3Rpb24gKGNvbnZlcnRlcikge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoQ29udmVydGVyKGFsaWFzLCBjb252ZXJ0ZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUGlwZXMgdGhlIHZhbHVlIHNlcXVlbnRpYWxseSB0aHJvdWdoIGEgbGlzdCBvZiBwcm92aWRlZCBjb252ZXJ0ZXJzLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7QW55fSB2YWx1ZSBJbnB1dCBmb3IgdGhlIGNvbnZlcnRlciB0byB0YWcuXG4gICAgICogQHBhcmFtICB7QXJyYXl8T2JqZWN0fSBsaXN0IExpc3Qgb2YgY29udmVydGVycyAobWFwcyB0byBjb252ZXJ0ZXIgYWxpYXMpLlxuICAgICAqXG4gICAgICogQHJldHVybiB7QW55fSBDb252ZXJ0ZWQgdmFsdWUuXG4gICAgICovXG4gICAgY29udmVydDogZnVuY3Rpb24gKHZhbHVlLCBsaXN0KSB7XG4gICAgICAgIGlmICghbGlzdCB8fCAhbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBsaXN0ID0gW10uY29uY2F0KGxpc3QpO1xuICAgICAgICBsaXN0ID0gXy5pbnZva2UobGlzdCwgJ3RyaW0nKTtcblxuICAgICAgICB2YXIgY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG5cbiAgICAgICAgdmFyIGNvbnZlcnRBcnJheSA9IGZ1bmN0aW9uIChjb252ZXJ0ZXIsIHZhbCwgY29udmVydGVyTmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIF8ubWFwKHZhbCwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udmVydGVyLmNvbnZlcnQodiwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGNvbnZlcnRPYmplY3QgPSBmdW5jdGlvbiAoY29udmVydGVyLCB2YWx1ZSwgY29udmVydGVyTmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIF8ubWFwVmFsdWVzKHZhbHVlLCBmdW5jdGlvbiAodmFsLCBrZXkpIHtcbiAgICAgICAgICAgICAgIHJldHVybiBjb252ZXJ0KGNvbnZlcnRlciwgdmFsLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBjb252ZXJ0ID0gZnVuY3Rpb24gKGNvbnZlcnRlciwgdmFsdWUsIGNvbnZlcnRlck5hbWUpIHtcbiAgICAgICAgICAgIHZhciBjb252ZXJ0ZWQ7XG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSAmJiBjb252ZXJ0ZXIuYWNjZXB0TGlzdCAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRBcnJheShjb252ZXJ0ZXIsIHZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gY29udmVydGVyLmNvbnZlcnQodmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNvbnZlcnRlZDtcbiAgICAgICAgfTtcbiAgICAgICAgXy5lYWNoKGxpc3QsIGZ1bmN0aW9uIChjb252ZXJ0ZXJOYW1lKSB7XG4gICAgICAgICAgICB2YXIgY29udmVydGVyID0gbWUuZ2V0Q29udmVydGVyKGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgaWYgKCFjb252ZXJ0ZXIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIGNvbnZlcnRlciBmb3IgJyArIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChjdXJyZW50VmFsdWUpICYmIGNvbnZlcnRlci5hY2NlcHRMaXN0ICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFZhbHVlID0gY29udmVydE9iamVjdChjb252ZXJ0ZXIsIGN1cnJlbnRWYWx1ZSwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9IGNvbnZlcnQoY29udmVydGVyLCBjdXJyZW50VmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ291bnRlci1wYXJ0IHRvIGBjb252ZXJ0KClgLiBUcmFuc2xhdGVzIGNvbnZlcnRlZCB2YWx1ZXMgYmFjayB0byB0aGVpciBvcmlnaW5hbCBmb3JtLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSB2YWx1ZSBWYWx1ZSB0byBwYXJzZS5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd8QXJyYXl9IGxpc3QgIExpc3Qgb2YgcGFyc2VycyB0byBydW4gdGhlIHZhbHVlIHRocm91Z2guIE91dGVybW9zdCBpcyBpbnZva2VkIGZpcnN0LlxuICAgICAqIEByZXR1cm4ge0FueX0gT3JpZ2luYWwgdmFsdWUuXG4gICAgICovXG4gICAgcGFyc2U6IGZ1bmN0aW9uICh2YWx1ZSwgbGlzdCkge1xuICAgICAgICBpZiAoIWxpc3QgfHwgIWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgbGlzdCA9IFtdLmNvbmNhdChsaXN0KS5yZXZlcnNlKCk7XG4gICAgICAgIGxpc3QgPSBfLmludm9rZShsaXN0LCAndHJpbScpO1xuXG4gICAgICAgIHZhciBjdXJyZW50VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgXy5lYWNoKGxpc3QsIGZ1bmN0aW9uIChjb252ZXJ0ZXJOYW1lKSB7XG4gICAgICAgICAgICB2YXIgY29udmVydGVyID0gbWUuZ2V0Q29udmVydGVyKGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgaWYgKGNvbnZlcnRlci5wYXJzZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9IGNvbnZlcnRlci5wYXJzZShjdXJyZW50VmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICB9XG59O1xuXG5cbi8vQm9vdHN0cmFwXG52YXIgZGVmYXVsdGNvbnZlcnRlcnMgPSBbXG4gICAgcmVxdWlyZSgnLi9udW1iZXItY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi9zdHJpbmctY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi9hcnJheS1jb252ZXJ0ZXInKSxcbiAgICByZXF1aXJlKCcuL3VuZGVyc2NvcmUtdXRpbHMtY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi9udW1iZXJmb3JtYXQtY29udmVydGVyJyksXG5dO1xuXG4kLmVhY2goZGVmYXVsdGNvbnZlcnRlcnMucmV2ZXJzZSgpLCBmdW5jdGlvbiAoaW5kZXgsIGNvbnZlcnRlcikge1xuICAgIGlmIChfLmlzQXJyYXkoY29udmVydGVyKSkge1xuICAgICAgICBfLmVhY2goY29udmVydGVyLCBmdW5jdGlvbiAoYykge1xuICAgICAgICAgICBjb252ZXJ0ZXJNYW5hZ2VyLnJlZ2lzdGVyKGMpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb252ZXJ0ZXJNYW5hZ2VyLnJlZ2lzdGVyKGNvbnZlcnRlcik7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gY29udmVydGVyTWFuYWdlcjtcbiIsIi8qKlxuICogIyMgTnVtYmVyIENvbnZlcnRlcnNcbiAqXG4gKiBDb252ZXJ0ZXJzIGFsbG93IHlvdSB0byBjb252ZXJ0IGRhdGEgLS0gaW4gcGFydGljdWxhciwgbW9kZWwgdmFyaWFibGVzIHRoYXQgeW91IGRpc3BsYXkgaW4geW91ciBwcm9qZWN0J3MgdXNlciBpbnRlcmZhY2UgLS0gZnJvbSBvbmUgZm9ybSB0byBhbm90aGVyLlxuICpcbiAqIFRoZXJlIGFyZSB0d28gd2F5cyB0byBzcGVjaWZ5IGNvbnZlcnNpb24gb3IgZm9ybWF0dGluZyBmb3IgdGhlIGRpc3BsYXkgb3V0cHV0IG9mIGEgcGFydGljdWxhciBtb2RlbCB2YXJpYWJsZTpcbiAqXG4gKiAqIEFkZCB0aGUgYXR0cmlidXRlIGBkYXRhLWYtY29udmVydGAgdG8gYW55IGVsZW1lbnQgdGhhdCBhbHNvIGhhcyB0aGUgYGRhdGEtZi1iaW5kYCBvciBgZGF0YS1mLWZvcmVhY2hgLlxuICogKiBVc2UgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyIHdpdGhpbiB0aGUgdmFsdWUgb2YgYW55IGBkYXRhLWYtYCBhdHRyaWJ1dGUgKG5vdCBqdXN0IGBkYXRhLWYtYmluZGAgb3IgYGRhdGEtZi1mb3JlYWNoYCkuXG4gKlxuICovXG5cbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIC8qKlxuICAgICAqIENvbnZlcnQgdGhlIG1vZGVsIHZhcmlhYmxlIHRvIGFuIGludGVnZXIuIE9mdGVuIHVzZWQgZm9yIGNoYWluaW5nIHRvIGFub3RoZXIgY29udmVydGVyLlxuICAgICAqXG4gICAgICogKipFeGFtcGxlKipcbiAgICAgKlxuICAgICAqICAgICAgPGRpdj5cbiAgICAgKiAgICAgICAgICBZb3VyIGNhciBoYXMgZHJpdmVuXG4gICAgICogICAgICAgICAgPHNwYW4gZGF0YS1mLWJpbmQ9XCJPZG9tZXRlciB8IGkgfCBzMC4wXCI+PC9zcGFuPiBtaWxlcy5cbiAgICAgKiAgICAgIDwvZGl2PlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gdmFsdWUgVGhlIG1vZGVsIHZhcmlhYmxlLlxuICAgICAqL1xuICAgIGFsaWFzOiAnaScsXG4gICAgY29udmVydDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KHZhbHVlLCAxMCk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgTnVtYmVyIEZvcm1hdCBDb252ZXJ0ZXJzXG4gKlxuICogQ29udmVydGVycyBhbGxvdyB5b3UgdG8gY29udmVydCBkYXRhIC0tIGluIHBhcnRpY3VsYXIsIG1vZGVsIHZhcmlhYmxlcyB0aGF0IHlvdSBkaXNwbGF5IGluIHlvdXIgcHJvamVjdCdzIHVzZXIgaW50ZXJmYWNlIC0tIGZyb20gb25lIGZvcm0gdG8gYW5vdGhlci5cbiAqXG4gKiBUaGVyZSBhcmUgdHdvIHdheXMgdG8gc3BlY2lmeSBjb252ZXJzaW9uIG9yIGZvcm1hdHRpbmcgZm9yIHRoZSBkaXNwbGF5IG91dHB1dCBvZiBhIHBhcnRpY3VsYXIgbW9kZWwgdmFyaWFibGU6XG4gKlxuICogKiBBZGQgdGhlIGF0dHJpYnV0ZSBgZGF0YS1mLWNvbnZlcnRgIHRvIGFueSBlbGVtZW50IHRoYXQgYWxzbyBoYXMgdGhlIGBkYXRhLWYtYmluZGAgb3IgYGRhdGEtZi1mb3JlYWNoYC5cbiAqICogVXNlIHRoZSBgfGAgKHBpcGUpIGNoYXJhY3RlciB3aXRoaW4gdGhlIHZhbHVlIG9mIGFueSBgZGF0YS1mLWAgYXR0cmlidXRlIChub3QganVzdCBgZGF0YS1mLWJpbmRgIG9yIGBkYXRhLWYtZm9yZWFjaGApLlxuICpcbiAqIEZvciBtb2RlbCB2YXJpYWJsZXMgdGhhdCBhcmUgbnVtYmVycyAob3IgdGhhdCBoYXZlIGJlZW4gW2NvbnZlcnRlZCB0byBudW1iZXJzXSguLi9udW1iZXItY29udmVydGVyLykpLCB0aGVyZSBhcmUgc2V2ZXJhbCBzcGVjaWFsIG51bWJlciBmb3JtYXRzIHlvdSBjYW4gYXBwbHkuXG4gKlxuICogIyMjI0N1cnJlbmN5IE51bWJlciBGb3JtYXRcbiAqXG4gKiBBZnRlciB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIsIHVzZSBgJGAgKGRvbGxhciBzaWduKSwgYDBgLCBhbmQgYC5gIChkZWNpbWFsIHBvaW50KSBpbiB5b3VyIGNvbnZlcnRlciB0byBkZXNjcmliZSBob3cgY3VycmVuY3kgc2hvdWxkIGFwcGVhci4gVGhlIHNwZWNpZmljYXRpb25zIGZvbGxvdyB0aGUgRXhjZWwgY3VycmVuY3kgZm9ybWF0dGluZyBjb252ZW50aW9ucy5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPCEtLSBjb252ZXJ0IHRvIGRvbGxhcnMgKGluY2x1ZGUgY2VudHMpIC0tPlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInByaWNlW2Nhcl1cIiBkYXRhLWYtY29udmVydD1cIiQwLjAwXCIgLz5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJwcmljZVtjYXJdIHwgJDAuMDBcIiAvPlxuICpcbiAqICAgICAgPCEtLSBjb252ZXJ0IHRvIGRvbGxhcnMgKHRydW5jYXRlIGNlbnRzKSAtLT5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJwcmljZVtjYXJdXCIgZGF0YS1mLWNvbnZlcnQ9XCIkMC5cIiAvPlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInByaWNlW2Nhcl0gfCAkMC5cIiAvPlxuICpcbiAqXG4gKiAjIyMjU3BlY2lmaWMgRGlnaXRzIE51bWJlciBGb3JtYXRcbiAqXG4gKiBBZnRlciB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIsIHVzZSBgI2AgKHBvdW5kKSBhbmQgYCxgIChjb21tYSkgaW4geW91ciBjb252ZXJ0ZXIgdG8gZGVzY3JpYmUgaG93IHRoZSBudW1iZXIgc2hvdWxkIGFwcGVhci4gVGhlIHNwZWNpZmljYXRpb25zIGZvbGxvdyB0aGUgRXhjZWwgbnVtYmVyIGZvcm1hdHRpbmcgY29udmVudGlvbnMuXG4gKlxuICogKipFeGFtcGxlKipcbiAqXG4gKiAgICAgIDwhLS0gY29udmVydCB0byB0aG91c2FuZHMgLS0+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwic2FsZXNbY2FyXVwiIGRhdGEtZi1jb252ZXJ0PVwiIywjIyNcIiAvPlxuICogICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBkYXRhLWYtYmluZD1cInNhbGVzW2Nhcl0gfCAjLCMjI1wiIC8+XG4gKlxuICpcbiAqICMjIyNQZXJjZW50YWdlIE51bWJlciBGb3JtYXRcbiAqXG4gKiBBZnRlciB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIsIHVzZSBgJWAgKHBlcmNlbnQpIGFuZCBgMGAgaW4geW91ciBjb252ZXJ0ZXIgdG8gZGlzcGxheSB0aGUgbnVtYmVyIGFzIGEgcGVyY2VudC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPCEtLSBjb252ZXJ0IHRvIHBlcmNlbnRhZ2UgLS0+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwicHJvZml0TWFyZ2luW2Nhcl1cIiBkYXRhLWYtY29udmVydD1cIjAlXCIgLz5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgZGF0YS1mLWJpbmQ9XCJwcm9maXRNYXJnaW5bY2FyXSB8IDAlXCIgLz5cbiAqXG4gKlxuICogIyMjI1Nob3J0IE51bWJlciBGb3JtYXRcbiAqXG4gKiBBZnRlciB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIsIHVzZSBgc2AgYW5kIGAwYCBpbiB5b3VyIGNvbnZlcnRlciB0byBkZXNjcmliZSBob3cgdGhlIG51bWJlciBzaG91bGQgYXBwZWFyLlxuICpcbiAqIFRoZSBgMGBzIGRlc2NyaWJlIHRoZSBzaWduaWZpY2FudCBkaWdpdHMuXG4gKlxuICogVGhlIGBzYCBkZXNjcmliZXMgdGhlIFwic2hvcnQgZm9ybWF0LFwiIHdoaWNoIHVzZXMgJ0snIGZvciB0aG91c2FuZHMsICdNJyBmb3IgbWlsbGlvbnMsICdCJyBmb3IgYmlsbGlvbnMuIEZvciBleGFtcGxlLCBgMjQ2OGAgY29udmVydGVkIHdpdGggYHMwLjBgIGRpc3BsYXlzIGFzIGAyLjVLYC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPCEtLSBjb252ZXJ0IHRvIHRob3VzYW5kcyAoc2hvdyAxMiw0NjggYXMgMTIuNUspIC0tPlxuICogICAgICA8c3BhbiB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwicHJpY2VbY2FyXSB8IHMwLjBcIj48L3NwYW4+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGFsaWFzOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAvL1RPRE86IEZhbmN5IHJlZ2V4IHRvIG1hdGNoIG51bWJlciBmb3JtYXRzIGhlcmVcbiAgICAgICAgcmV0dXJuIChuYW1lLmluZGV4T2YoJyMnKSAhPT0gLTEgfHwgbmFtZS5pbmRleE9mKCcwJykgIT09IC0xKTtcbiAgICB9LFxuXG4gICAgcGFyc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFsKz0gJyc7XG4gICAgICAgIHZhciBpc05lZ2F0aXZlID0gdmFsLmNoYXJBdCgwKSA9PT0gJy0nO1xuXG4gICAgICAgIHZhbCAgPSB2YWwucmVwbGFjZSgvLC9nLCAnJyk7XG4gICAgICAgIHZhciBmbG9hdE1hdGNoZXIgPSAvKFstK10/WzAtOV0qXFwuP1swLTldKykoSz9NP0I/JT8pL2k7XG4gICAgICAgIHZhciByZXN1bHRzID0gZmxvYXRNYXRjaGVyLmV4ZWModmFsKTtcbiAgICAgICAgdmFyIG51bWJlciwgc3VmZml4ID0gJyc7XG4gICAgICAgIGlmIChyZXN1bHRzICYmIHJlc3VsdHNbMV0pIHtcbiAgICAgICAgICAgIG51bWJlciA9IHJlc3VsdHNbMV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdHMgJiYgcmVzdWx0c1syXSkge1xuICAgICAgICAgICAgc3VmZml4ID0gcmVzdWx0c1syXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoIChzdWZmaXgpIHtcbiAgICAgICAgICAgIGNhc2UgJyUnOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAvIDEwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2snOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIDEwMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdtJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAxMDAwMDAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYic6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogMTAwMDAwMDAwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBudW1iZXIgPSBwYXJzZUZsb2F0KG51bWJlcik7XG4gICAgICAgIGlmIChpc05lZ2F0aXZlICYmIG51bWJlciA+IDApIHtcbiAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIC0xO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudW1iZXI7XG4gICAgfSxcblxuICAgIGNvbnZlcnQ6IChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIHNjYWxlcyA9IFsnJywgJ0snLCAnTScsICdCJywgJ1QnXTtcblxuICAgICAgICBmdW5jdGlvbiBnZXREaWdpdHModmFsdWUsIGRpZ2l0cykge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSA9PT0gMCA/IDAgOiByb3VuZFRvKHZhbHVlLCBNYXRoLm1heCgwLCBkaWdpdHMgLSBNYXRoLmNlaWwoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjEwKSkpO1xuXG4gICAgICAgICAgICB2YXIgVFhUID0gJyc7XG4gICAgICAgICAgICB2YXIgbnVtYmVyVFhUID0gdmFsdWUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIHZhciBkZWNpbWFsU2V0ID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGlUWFQgPSAwOyBpVFhUIDwgbnVtYmVyVFhULmxlbmd0aDsgaVRYVCsrKSB7XG4gICAgICAgICAgICAgICAgVFhUICs9IG51bWJlclRYVC5jaGFyQXQoaVRYVCk7XG4gICAgICAgICAgICAgICAgaWYgKG51bWJlclRYVC5jaGFyQXQoaVRYVCkgPT09ICcuJykge1xuICAgICAgICAgICAgICAgICAgICBkZWNpbWFsU2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkaWdpdHMtLTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoZGlnaXRzIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFRYVDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZGVjaW1hbFNldCkge1xuICAgICAgICAgICAgICAgIFRYVCArPSAnLic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoZGlnaXRzID4gMCkge1xuICAgICAgICAgICAgICAgIFRYVCArPSAnMCc7XG4gICAgICAgICAgICAgICAgZGlnaXRzLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gVFhUO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkRGVjaW1hbHModmFsdWUsIGRlY2ltYWxzLCBtaW5EZWNpbWFscywgaGFzQ29tbWFzKSB7XG4gICAgICAgICAgICBoYXNDb21tYXMgPSBoYXNDb21tYXMgfHwgdHJ1ZTtcbiAgICAgICAgICAgIHZhciBudW1iZXJUWFQgPSB2YWx1ZS50b1N0cmluZygpO1xuICAgICAgICAgICAgdmFyIGhhc0RlY2ltYWxzID0gKG51bWJlclRYVC5zcGxpdCgnLicpLmxlbmd0aCA+IDEpO1xuICAgICAgICAgICAgdmFyIGlEZWMgPSAwO1xuXG4gICAgICAgICAgICBpZiAoaGFzQ29tbWFzKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaUNoYXIgPSBudW1iZXJUWFQubGVuZ3RoIC0gMTsgaUNoYXIgPiAwOyBpQ2hhci0tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNEZWNpbWFscykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFzRGVjaW1hbHMgPSAobnVtYmVyVFhULmNoYXJBdChpQ2hhcikgIT09ICcuJyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpRGVjID0gKGlEZWMgKyAxKSAlIDM7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaURlYyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlclRYVCA9IG51bWJlclRYVC5zdWJzdHIoMCwgaUNoYXIpICsgJywnICsgbnVtYmVyVFhULnN1YnN0cihpQ2hhcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkZWNpbWFscyA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgdG9BREQ7XG4gICAgICAgICAgICAgICAgaWYgKG51bWJlclRYVC5zcGxpdCgnLicpLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvQUREID0gbWluRGVjaW1hbHM7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b0FERCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlclRYVCArPSAnLic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0b0FERCA9IG1pbkRlY2ltYWxzIC0gbnVtYmVyVFhULnNwbGl0KCcuJylbMV0ubGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHdoaWxlICh0b0FERCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyVFhUICs9ICcwJztcbiAgICAgICAgICAgICAgICAgICAgdG9BREQtLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVtYmVyVFhUO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcm91bmRUbyh2YWx1ZSwgZGlnaXRzKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5yb3VuZCh2YWx1ZSAqIE1hdGgucG93KDEwLCBkaWdpdHMpKSAvIE1hdGgucG93KDEwLCBkaWdpdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0U3VmZml4KGZvcm1hdFRYVCkge1xuICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnJlcGxhY2UoJy4nLCAnJyk7XG4gICAgICAgICAgICB2YXIgZml4ZXNUWFQgPSBmb3JtYXRUWFQuc3BsaXQobmV3IFJlZ0V4cCgnWzB8LHwjXSsnLCAnZycpKTtcbiAgICAgICAgICAgIHJldHVybiAoZml4ZXNUWFQubGVuZ3RoID4gMSkgPyBmaXhlc1RYVFsxXS50b1N0cmluZygpIDogJyc7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBpc0N1cnJlbmN5KHN0cmluZykge1xuICAgICAgICAgICAgdmFyIHMgPSAkLnRyaW0oc3RyaW5nKTtcblxuICAgICAgICAgICAgaWYgKHMgPT09ICckJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKsJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDgsKlJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDgsKjJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKhJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKxJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICdLw4Q/JyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICdrcicgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4LCoicgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCqicgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4bigJknIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqknIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqsnKSB7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZm9ybWF0KG51bWJlciwgZm9ybWF0VFhUKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KG51bWJlcikpIHtcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXJbbnVtYmVyLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFfLmlzU3RyaW5nKG51bWJlcikgJiYgIV8uaXNOdW1iZXIobnVtYmVyKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudW1iZXI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZm9ybWF0VFhUIHx8IGZvcm1hdFRYVC50b0xvd2VyQ2FzZSgpID09PSAnZGVmYXVsdCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVtYmVyLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpc05hTihudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICc/JztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy92YXIgZm9ybWF0VFhUO1xuICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnJlcGxhY2UoJyZldXJvOycsICfDouKAmsKsJyk7XG5cbiAgICAgICAgICAgIC8vIERpdmlkZSArLy0gTnVtYmVyIEZvcm1hdFxuICAgICAgICAgICAgdmFyIGZvcm1hdHMgPSBmb3JtYXRUWFQuc3BsaXQoJzsnKTtcbiAgICAgICAgICAgIGlmIChmb3JtYXRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0KE1hdGguYWJzKG51bWJlciksIGZvcm1hdHNbKChudW1iZXIgPj0gMCkgPyAwIDogMSldKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2F2ZSBTaWduXG4gICAgICAgICAgICB2YXIgc2lnbiA9IChudW1iZXIgPj0gMCkgPyAnJyA6ICctJztcbiAgICAgICAgICAgIG51bWJlciA9IE1hdGguYWJzKG51bWJlcik7XG5cblxuICAgICAgICAgICAgdmFyIGxlZnRPZkRlY2ltYWwgPSBmb3JtYXRUWFQ7XG4gICAgICAgICAgICB2YXIgZCA9IGxlZnRPZkRlY2ltYWwuaW5kZXhPZignLicpO1xuICAgICAgICAgICAgaWYgKGQgPiAtMSkge1xuICAgICAgICAgICAgICAgIGxlZnRPZkRlY2ltYWwgPSBsZWZ0T2ZEZWNpbWFsLnN1YnN0cmluZygwLCBkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG5vcm1hbGl6ZWQgPSBsZWZ0T2ZEZWNpbWFsLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBub3JtYWxpemVkLmxhc3RJbmRleE9mKCdzJyk7XG4gICAgICAgICAgICB2YXIgaXNTaG9ydEZvcm1hdCA9IGluZGV4ID4gLTE7XG5cbiAgICAgICAgICAgIGlmIChpc1Nob3J0Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIG5leHRDaGFyID0gbGVmdE9mRGVjaW1hbC5jaGFyQXQoaW5kZXggKyAxKTtcbiAgICAgICAgICAgICAgICBpZiAobmV4dENoYXIgPT09ICcgJykge1xuICAgICAgICAgICAgICAgICAgICBpc1Nob3J0Rm9ybWF0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbGVhZGluZ1RleHQgPSBpc1Nob3J0Rm9ybWF0ID8gZm9ybWF0VFhULnN1YnN0cmluZygwLCBpbmRleCkgOiAnJztcbiAgICAgICAgICAgIHZhciByaWdodE9mUHJlZml4ID0gaXNTaG9ydEZvcm1hdCA/IGZvcm1hdFRYVC5zdWJzdHIoaW5kZXggKyAxKSA6IGZvcm1hdFRYVC5zdWJzdHIoaW5kZXgpO1xuXG4gICAgICAgICAgICAvL2ZpcnN0IGNoZWNrIHRvIG1ha2Ugc3VyZSAncycgaXMgYWN0dWFsbHkgc2hvcnQgZm9ybWF0IGFuZCBub3QgcGFydCBvZiBzb21lIGxlYWRpbmcgdGV4dFxuICAgICAgICAgICAgaWYgKGlzU2hvcnRGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2hvcnRGb3JtYXRUZXN0ID0gL1swLTkjKl0vO1xuICAgICAgICAgICAgICAgIHZhciBzaG9ydEZvcm1hdFRlc3RSZXN1bHQgPSByaWdodE9mUHJlZml4Lm1hdGNoKHNob3J0Rm9ybWF0VGVzdCk7XG4gICAgICAgICAgICAgICAgaWYgKCFzaG9ydEZvcm1hdFRlc3RSZXN1bHQgfHwgc2hvcnRGb3JtYXRUZXN0UmVzdWx0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvL25vIHNob3J0IGZvcm1hdCBjaGFyYWN0ZXJzIHNvIHRoaXMgbXVzdCBiZSBsZWFkaW5nIHRleHQgaWUuICd3ZWVrcyAnXG4gICAgICAgICAgICAgICAgICAgIGlzU2hvcnRGb3JtYXQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgbGVhZGluZ1RleHQgPSAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vaWYgKGZvcm1hdFRYVC5jaGFyQXQoMCkgPT0gJ3MnKVxuICAgICAgICAgICAgaWYgKGlzU2hvcnRGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsU2NhbGUgPSBudW1iZXIgPT09IDAgPyAwIDogTWF0aC5mbG9vcihNYXRoLmxvZyhNYXRoLmFicyhudW1iZXIpKSAvICgzICogTWF0aC5MTjEwKSk7XG4gICAgICAgICAgICAgICAgdmFsU2NhbGUgPSAoKG51bWJlciAvIE1hdGgucG93KDEwLCAzICogdmFsU2NhbGUpKSA8IDEwMDApID8gdmFsU2NhbGUgOiAodmFsU2NhbGUgKyAxKTtcbiAgICAgICAgICAgICAgICB2YWxTY2FsZSA9IE1hdGgubWF4KHZhbFNjYWxlLCAwKTtcbiAgICAgICAgICAgICAgICB2YWxTY2FsZSA9IE1hdGgubWluKHZhbFNjYWxlLCA0KTtcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgLyBNYXRoLnBvdygxMCwgMyAqIHZhbFNjYWxlKTtcbiAgICAgICAgICAgICAgICAvL2lmICghaXNOYU4oTnVtYmVyKGZvcm1hdFRYVC5zdWJzdHIoMSkgKSApIClcblxuICAgICAgICAgICAgICAgIGlmICghaXNOYU4oTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpKSAmJiByaWdodE9mUHJlZml4LmluZGV4T2YoJy4nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxpbWl0RGlnaXRzID0gTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobnVtYmVyIDwgTWF0aC5wb3coMTAsIGxpbWl0RGlnaXRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ3VycmVuY3kobGVhZGluZ1RleHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWFkaW5nVGV4dCArIGdldERpZ2l0cyhudW1iZXIsIE51bWJlcihyaWdodE9mUHJlZml4KSkgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ1RleHQgKyBzaWduICsgZ2V0RGlnaXRzKG51bWJlciwgTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDdXJyZW5jeShsZWFkaW5nVGV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiArIGxlYWRpbmdUZXh0ICsgTWF0aC5yb3VuZChudW1iZXIpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxlYWRpbmdUZXh0ICsgc2lnbiArIE1hdGgucm91bmQobnVtYmVyKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL2Zvcm1hdFRYVCA9IGZvcm1hdFRYVC5zdWJzdHIoMSk7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5zdWJzdHIoaW5kZXggKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIFNVRkZJWCA9IGdldFN1ZmZpeChmb3JtYXRUWFQpO1xuICAgICAgICAgICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQuc3Vic3RyKDAsIGZvcm1hdFRYVC5sZW5ndGggLSBTVUZGSVgubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsV2l0aG91dExlYWRpbmcgPSBmb3JtYXQoKChzaWduID09PSAnJykgPyAxIDogLTEpICogbnVtYmVyLCBmb3JtYXRUWFQpICsgc2NhbGVzW3ZhbFNjYWxlXSArIFNVRkZJWDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ3VycmVuY3kobGVhZGluZ1RleHQpICYmIHNpZ24gIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxXaXRob3V0TGVhZGluZyA9IHZhbFdpdGhvdXRMZWFkaW5nLnN1YnN0cihzaWduLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiArIGxlYWRpbmdUZXh0ICsgdmFsV2l0aG91dExlYWRpbmc7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ1RleHQgKyB2YWxXaXRob3V0TGVhZGluZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzdWJGb3JtYXRzID0gZm9ybWF0VFhULnNwbGl0KCcuJyk7XG4gICAgICAgICAgICB2YXIgZGVjaW1hbHM7XG4gICAgICAgICAgICB2YXIgbWluRGVjaW1hbHM7XG4gICAgICAgICAgICBpZiAoc3ViRm9ybWF0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgZGVjaW1hbHMgPSBzdWJGb3JtYXRzWzFdLmxlbmd0aCAtIHN1YkZvcm1hdHNbMV0ucmVwbGFjZShuZXcgUmVnRXhwKCdbMHwjXSsnLCAnZycpLCAnJykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIG1pbkRlY2ltYWxzID0gc3ViRm9ybWF0c1sxXS5sZW5ndGggLSBzdWJGb3JtYXRzWzFdLnJlcGxhY2UobmV3IFJlZ0V4cCgnMCsnLCAnZycpLCAnJykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGZvcm1hdFRYVCA9IHN1YkZvcm1hdHNbMF0gKyBzdWJGb3JtYXRzWzFdLnJlcGxhY2UobmV3IFJlZ0V4cCgnWzB8I10rJywgJ2cnKSwgJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWNpbWFscyA9IDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBmaXhlc1RYVCA9IGZvcm1hdFRYVC5zcGxpdChuZXcgUmVnRXhwKCdbMHwsfCNdKycsICdnJykpO1xuICAgICAgICAgICAgdmFyIHByZWZmaXggPSBmaXhlc1RYVFswXS50b1N0cmluZygpO1xuICAgICAgICAgICAgdmFyIHN1ZmZpeCA9IChmaXhlc1RYVC5sZW5ndGggPiAxKSA/IGZpeGVzVFhUWzFdLnRvU3RyaW5nKCkgOiAnJztcblxuICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogKChmb3JtYXRUWFQuc3BsaXQoJyUnKS5sZW5ndGggPiAxKSA/IDEwMCA6IDEpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICBpZiAoZm9ybWF0VFhULmluZGV4T2YoJyUnKSAhPT0gLTEpIG51bWJlciA9IG51bWJlciAqIDEwMDtcbiAgICAgICAgICAgIG51bWJlciA9IHJvdW5kVG8obnVtYmVyLCBkZWNpbWFscyk7XG5cbiAgICAgICAgICAgIHNpZ24gPSAobnVtYmVyID09PSAwKSA/ICcnIDogc2lnbjtcblxuICAgICAgICAgICAgdmFyIGhhc0NvbW1hcyA9IChmb3JtYXRUWFQuc3Vic3RyKGZvcm1hdFRYVC5sZW5ndGggLSA0IC0gc3VmZml4Lmxlbmd0aCwgMSkgPT09ICcsJyk7XG4gICAgICAgICAgICB2YXIgZm9ybWF0dGVkID0gc2lnbiArIHByZWZmaXggKyBhZGREZWNpbWFscyhudW1iZXIsIGRlY2ltYWxzLCBtaW5EZWNpbWFscywgaGFzQ29tbWFzKSArIHN1ZmZpeDtcblxuICAgICAgICAgICAgLy8gIGNvbnNvbGUubG9nKG9yaWdpbmFsTnVtYmVyLCBvcmlnaW5hbEZvcm1hdCwgZm9ybWF0dGVkKVxuICAgICAgICAgICAgcmV0dXJuIGZvcm1hdHRlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXQ7XG4gICAgfSgpKVxufTtcbiIsIi8qKlxuICogIyMgU3RyaW5nIENvbnZlcnRlcnNcbiAqXG4gKiBDb252ZXJ0ZXJzIGFsbG93IHlvdSB0byBjb252ZXJ0IGRhdGEgLS0gaW4gcGFydGljdWxhciwgbW9kZWwgdmFyaWFibGVzIHRoYXQgeW91IGRpc3BsYXkgaW4geW91ciBwcm9qZWN0J3MgdXNlciBpbnRlcmZhY2UgLS0gZnJvbSBvbmUgZm9ybSB0byBhbm90aGVyLlxuICpcbiAqIFRoZXJlIGFyZSB0d28gd2F5cyB0byBzcGVjaWZ5IGNvbnZlcnNpb24gb3IgZm9ybWF0dGluZyBmb3IgdGhlIGRpc3BsYXkgb3V0cHV0IG9mIGEgcGFydGljdWxhciBtb2RlbCB2YXJpYWJsZTpcbiAqXG4gKiAqIEFkZCB0aGUgYXR0cmlidXRlIGBkYXRhLWYtY29udmVydGAgdG8gYW55IGVsZW1lbnQgdGhhdCBhbHNvIGhhcyB0aGUgYGRhdGEtZi1iaW5kYCBvciBgZGF0YS1mLWZvcmVhY2hgLlxuICogKiBVc2UgdGhlIGB8YCAocGlwZSkgY2hhcmFjdGVyIHdpdGhpbiB0aGUgdmFsdWUgb2YgYW55IGBkYXRhLWYtYCBhdHRyaWJ1dGUgKG5vdCBqdXN0IGBkYXRhLWYtYmluZGAgb3IgYGRhdGEtZi1mb3JlYWNoYCkuXG4gKlxuICogRm9yIG1vZGVsIHZhcmlhYmxlcyB0aGF0IGFyZSBzdHJpbmdzIChvciB0aGF0IGhhdmUgYmVlbiBjb252ZXJ0ZWQgdG8gc3RyaW5ncyksIHRoZXJlIGFyZSBzZXZlcmFsIHNwZWNpYWwgc3RyaW5nIGZvcm1hdHMgeW91IGNhbiBhcHBseS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgdGhlIG1vZGVsIHZhcmlhYmxlIHRvIGEgc3RyaW5nLiBPZnRlbiB1c2VkIGZvciBjaGFpbmluZyB0byBhbm90aGVyIGNvbnZlcnRlci5cbiAgICAgKlxuICAgICAqICoqRXhhbXBsZSoqXG4gICAgICpcbiAgICAgKiAgICAgIDxkaXY+XG4gICAgICogICAgICAgICAgVGhpcyB5ZWFyIHlvdSBhcmUgaW4gY2hhcmdlIG9mIHNhbGVzIGZvclxuICAgICAqICAgICAgICAgIDxzcGFuIGRhdGEtZi1iaW5kPVwic2FsZXNNZ3IucmVnaW9uIHwgcyB8IHVwcGVyQ2FzZVwiPjwvc3Bhbj4uXG4gICAgICogICAgICA8L2Rpdj5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbCBUaGUgbW9kZWwgdmFyaWFibGUuXG4gICAgICovXG4gICAgczogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gdmFsICsgJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgdGhlIG1vZGVsIHZhcmlhYmxlIHRvIFVQUEVSIENBU0UuXG4gICAgICpcbiAgICAgKiAqKkV4YW1wbGUqKlxuICAgICAqXG4gICAgICogICAgICA8ZGl2PlxuICAgICAqICAgICAgICAgIFRoaXMgeWVhciB5b3UgYXJlIGluIGNoYXJnZSBvZiBzYWxlcyBmb3JcbiAgICAgKiAgICAgICAgICA8c3BhbiBkYXRhLWYtYmluZD1cInNhbGVzTWdyLnJlZ2lvbiB8IHMgfCB1cHBlckNhc2VcIj48L3NwYW4+LlxuICAgICAqICAgICAgPC9kaXY+XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWwgVGhlIG1vZGVsIHZhcmlhYmxlLlxuICAgICAqL1xuICAgIHVwcGVyQ2FzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gKHZhbCArICcnKS50b1VwcGVyQ2FzZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHRoZSBtb2RlbCB2YXJpYWJsZSB0byBsb3dlciBjYXNlLlxuICAgICAqXG4gICAgICogKipFeGFtcGxlKipcbiAgICAgKlxuICAgICAqICAgICAgPGRpdj5cbiAgICAgKiAgICAgICAgICBFbnRlciB5b3VyIHVzZXIgbmFtZTpcbiAgICAgKiAgICAgICAgICA8aW5wdXQgZGF0YS1mLWJpbmQ9XCJ1c2VyTmFtZSB8IGxvd2VyQ2FzZVwiPjwvaW5wdXQ+LlxuICAgICAqICAgICAgPC9kaXY+XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWwgVGhlIG1vZGVsIHZhcmlhYmxlLlxuICAgICAqL1xuICAgIGxvd2VyQ2FzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gKHZhbCArICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHRoZSBtb2RlbCB2YXJpYWJsZSB0byBUaXRsZSBDYXNlLlxuICAgICAqXG4gICAgICogKipFeGFtcGxlKipcbiAgICAgKlxuICAgICAqICAgICAgPGRpdj5cbiAgICAgKiAgICAgICAgICBDb25ncmF0dWxhdGlvbnMgb24geW91ciBwcm9tb3Rpb24hXG4gICAgICogICAgICAgICAgWW91ciBuZXcgdGl0bGUgaXM6IDxzcGFuIGRhdGEtZi1iaW5kPVwiY3VycmVudFJvbGUgfCB0aXRsZUNhc2VcIj48L3NwYW4+LlxuICAgICAqICAgICAgPC9kaXY+XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWwgVGhlIG1vZGVsIHZhcmlhYmxlLlxuICAgICAqL1xuICAgIHRpdGxlQ2FzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICB2YWwgPSB2YWwgKyAnJztcbiAgICAgICAgcmV0dXJuIHZhbC5yZXBsYWNlKC9cXHdcXFMqL2csIGZ1bmN0aW9uICh0eHQpIHtyZXR1cm4gdHh0LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdHh0LnN1YnN0cigxKS50b0xvd2VyQ2FzZSgpO30pO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG52YXIgbGlzdCA9IFtdO1xuXG52YXIgc3VwcG9ydGVkID0gW1xuICAgICd2YWx1ZXMnLCAna2V5cycsICdjb21wYWN0JywgJ2RpZmZlcmVuY2UnLFxuICAgICdmbGF0dGVuJywgJ3Jlc3QnLFxuICAgICd1bmlvbicsXG4gICAgJ3VuaXEnLCAnemlwJywgJ3dpdGhvdXQnLFxuICAgICd4b3InLCAnemlwJ1xuXTtcbl8uZWFjaChzdXBwb3J0ZWQsIGZ1bmN0aW9uIChmbikge1xuICAgIHZhciBpdGVtID0ge1xuICAgICAgICBhbGlhczogZm4sXG4gICAgICAgIGFjY2VwdExpc3Q6IHRydWUsXG4gICAgICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QodmFsKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBfLm1hcFZhbHVlcyh2YWwsIF9bZm5dKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9bZm5dKHZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGxpc3QucHVzaChpdGVtKTtcbn0pO1xubW9kdWxlLmV4cG9ydHMgPSBsaXN0O1xuIiwiLyoqXG4gKiAjIyBBdHRyaWJ1dGUgTWFuYWdlclxuICpcbiAqIEZsb3cuanMgcHJvdmlkZXMgYSBzZXQgb2YgY3VzdG9tIERPTSBhdHRyaWJ1dGVzIHRoYXQgc2VydmUgYXMgYSBkYXRhIGJpbmRpbmcgYmV0d2VlbiB2YXJpYWJsZXMgYW5kIG9wZXJhdGlvbnMgaW4geW91ciBwcm9qZWN0J3MgbW9kZWwgYW5kIEhUTUwgZWxlbWVudHMgaW4geW91ciBwcm9qZWN0J3MgdXNlciBpbnRlcmZhY2UuIFVuZGVyIHRoZSBob29kLCBGbG93LmpzIGlzIGRvaW5nIGF1dG9tYXRpYyBjb252ZXJzaW9uIG9mIHRoZXNlIGN1c3RvbSBhdHRyaWJ1dGVzLCBsaWtlIGBkYXRhLWYtYmluZGAsIGludG8gSFRNTCBzcGVjaWZpYyB0byB0aGUgYXR0cmlidXRlJ3MgYXNzaWduZWQgdmFsdWUsIGxpa2UgdGhlIGN1cnJlbnQgdmFsdWUgb2YgYG15TW9kZWxWYXJgLlxuICpcbiAqIElmIHlvdSBhcmUgbG9va2luZyBmb3IgZXhhbXBsZXMgb2YgdXNpbmcgcGFydGljdWxhciBhdHRyaWJ1dGVzLCBzZWUgdGhlIFtzcGVjaWZpYyBhdHRyaWJ1dGVzIHN1YnBhZ2VzXSguLi8uLi8uLi8uLi9hdHRyaWJ1dGVzLW92ZXJ2aWV3LykuXG4gKlxuICogSWYgeW91IHdvdWxkIGxpa2UgdG8gZXh0ZW5kIEZsb3cuanMgd2l0aCB5b3VyIG93biBjdXN0b20gYXR0cmlidXRlcywgeW91IGNhbiBhZGQgdGhlbSB0byBGbG93LmpzIHVzaW5nIHRoZSBBdHRyaWJ1dGUgTWFuYWdlci5cbiAqXG4gKiBUaGUgQXR0cmlidXRlIE1hbmFnZXIgaXMgc3BlY2lmaWMgdG8gYWRkaW5nIGN1c3RvbSBhdHRyaWJ1dGVzIGFuZCBkZXNjcmliaW5nIHRoZWlyIGltcGxlbWVudGF0aW9uIChoYW5kbGVycykuIChUaGUgW0RvbSBNYW5hZ2VyXSguLi8uLi8pIGNvbnRhaW5zIHRoZSBnZW5lcmFsIGltcGxlbWVudGF0aW9uLilcbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVmYXVsdEhhbmRsZXJzID0gW1xuICAgIHJlcXVpcmUoJy4vbm8tb3AtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZXZlbnRzL2luaXQtZXZlbnQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZXZlbnRzL2RlZmF1bHQtZXZlbnQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZm9yZWFjaC9kZWZhdWx0LWZvcmVhY2gtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vYmluZHMvY2hlY2tib3gtcmFkaW8tYmluZC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9iaW5kcy9pbnB1dC1iaW5kLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2NsYXNzLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL3Bvc2l0aXZlLWJvb2xlYW4tYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vbmVnYXRpdmUtYm9vbGVhbi1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9iaW5kcy9kZWZhdWx0LWJpbmQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZGVmYXVsdC1hdHRyJylcbl07XG5cbnZhciBoYW5kbGVyc0xpc3QgPSBbXTtcblxudmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uIChhdHRyaWJ1dGVNYXRjaGVyLCBub2RlTWF0Y2hlciwgaGFuZGxlcikge1xuICAgIGlmICghbm9kZU1hdGNoZXIpIHtcbiAgICAgICAgbm9kZU1hdGNoZXIgPSAnKic7XG4gICAgfVxuICAgIGlmIChfLmlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICAgICAgaGFuZGxlciA9IHtcbiAgICAgICAgICAgIGhhbmRsZTogaGFuZGxlclxuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gJC5leHRlbmQoaGFuZGxlciwgeyB0ZXN0OiBhdHRyaWJ1dGVNYXRjaGVyLCB0YXJnZXQ6IG5vZGVNYXRjaGVyIH0pO1xufTtcblxuJC5lYWNoKGRlZmF1bHRIYW5kbGVycywgZnVuY3Rpb24gKGluZGV4LCBoYW5kbGVyKSB7XG4gICAgaGFuZGxlcnNMaXN0LnB1c2gobm9ybWFsaXplKGhhbmRsZXIudGVzdCwgaGFuZGxlci50YXJnZXQsIGhhbmRsZXIpKTtcbn0pO1xuXG5cbnZhciBtYXRjaEF0dHIgPSBmdW5jdGlvbiAobWF0Y2hFeHByLCBhdHRyLCAkZWwpIHtcbiAgICB2YXIgYXR0ck1hdGNoO1xuXG4gICAgaWYgKF8uaXNTdHJpbmcobWF0Y2hFeHByKSkge1xuICAgICAgICBhdHRyTWF0Y2ggPSAobWF0Y2hFeHByID09PSAnKicgfHwgKG1hdGNoRXhwci50b0xvd2VyQ2FzZSgpID09PSBhdHRyLnRvTG93ZXJDYXNlKCkpKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbihtYXRjaEV4cHIpKSB7XG4gICAgICAgIC8vVE9ETzogcmVtb3ZlIGVsZW1lbnQgc2VsZWN0b3JzIGZyb20gYXR0cmlidXRlc1xuICAgICAgICBhdHRyTWF0Y2ggPSBtYXRjaEV4cHIoYXR0ciwgJGVsKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNSZWdFeHAobWF0Y2hFeHByKSkge1xuICAgICAgICBhdHRyTWF0Y2ggPSBhdHRyLm1hdGNoKG1hdGNoRXhwcik7XG4gICAgfVxuICAgIHJldHVybiBhdHRyTWF0Y2g7XG59O1xuXG52YXIgbWF0Y2hOb2RlID0gZnVuY3Rpb24gKHRhcmdldCwgbm9kZUZpbHRlcikge1xuICAgIHJldHVybiAoXy5pc1N0cmluZyhub2RlRmlsdGVyKSkgPyAobm9kZUZpbHRlciA9PT0gdGFyZ2V0KSA6IG5vZGVGaWx0ZXIuaXModGFyZ2V0KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxpc3Q6IGhhbmRsZXJzTGlzdCxcbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgYXR0cmlidXRlIGhhbmRsZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd8RnVuY3Rpb258UmVnZXh9IGF0dHJpYnV0ZU1hdGNoZXIgRGVzY3JpcHRpb24gb2Ygd2hpY2ggYXR0cmlidXRlcyB0byBtYXRjaC5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IG5vZGVNYXRjaGVyIFdoaWNoIG5vZGVzIHRvIGFkZCBhdHRyaWJ1dGVzIHRvLiBVc2UgW2pxdWVyeSBTZWxlY3RvciBzeW50YXhdKGh0dHBzOi8vYXBpLmpxdWVyeS5jb20vY2F0ZWdvcnkvc2VsZWN0b3JzLykuXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb258T2JqZWN0fSBoYW5kbGVyIElmIGBoYW5kbGVyYCBpcyBhIGZ1bmN0aW9uLCB0aGUgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggYCRlbGVtZW50YCBhcyBjb250ZXh0LCBhbmQgYXR0cmlidXRlIHZhbHVlICsgbmFtZS4gSWYgYGhhbmRsZXJgIGlzIGFuIG9iamVjdCwgaXQgc2hvdWxkIGluY2x1ZGUgdHdvIGZ1bmN0aW9ucywgYW5kIGhhdmUgdGhlIGZvcm06IGB7IGluaXQ6IGZuLCAgaGFuZGxlOiBmbiB9YC4gVGhlIGBpbml0YCBmdW5jdGlvbiBpcyBjYWxsZWQgd2hlbiB0aGUgcGFnZSBsb2FkczsgdXNlIHRoaXMgdG8gZGVmaW5lIGV2ZW50IGhhbmRsZXJzLiBUaGUgYGhhbmRsZWAgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggYCRlbGVtZW50YCBhcyBjb250ZXh0LCBhbmQgYXR0cmlidXRlIHZhbHVlICsgbmFtZS5cbiAgICAgKi9cbiAgICByZWdpc3RlcjogZnVuY3Rpb24gKGF0dHJpYnV0ZU1hdGNoZXIsIG5vZGVNYXRjaGVyLCBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXJzTGlzdC51bnNoaWZ0KG5vcm1hbGl6ZS5hcHBseShudWxsLCBhcmd1bWVudHMpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmluZCBhbiBhdHRyaWJ1dGUgbWF0Y2hlciBtYXRjaGluZyBzb21lIGNyaXRlcmlhLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBhdHRyRmlsdGVyIEF0dHJpYnV0ZSB0byBtYXRjaC5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd8JGVsfSBub2RlRmlsdGVyIE5vZGUgdG8gbWF0Y2guXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtBcnJheXxOdWxsfSBBbiBhcnJheSBvZiBtYXRjaGluZyBhdHRyaWJ1dGUgaGFuZGxlcnMsIG9yIG51bGwgaWYgbm8gbWF0Y2hlcyBmb3VuZC5cbiAgICAgKi9cbiAgICBmaWx0ZXI6IGZ1bmN0aW9uIChhdHRyRmlsdGVyLCBub2RlRmlsdGVyKSB7XG4gICAgICAgIHZhciBmaWx0ZXJlZCA9IF8uc2VsZWN0KGhhbmRsZXJzTGlzdCwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaEF0dHIoaGFuZGxlci50ZXN0LCBhdHRyRmlsdGVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChub2RlRmlsdGVyKSB7XG4gICAgICAgICAgICBmaWx0ZXJlZCA9IF8uc2VsZWN0KGZpbHRlcmVkLCBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaE5vZGUoaGFuZGxlci50YXJnZXQsIG5vZGVGaWx0ZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZpbHRlcmVkO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXBsYWNlIGFuIGV4aXN0aW5nIGF0dHJpYnV0ZSBoYW5kbGVyLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBhdHRyRmlsdGVyIEF0dHJpYnV0ZSB0byBtYXRjaC5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmcgfCAkZWx9IG5vZGVGaWx0ZXIgTm9kZSB0byBtYXRjaC5cbiAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbnxPYmplY3R9IGhhbmRsZXIgVGhlIHVwZGF0ZWQgYXR0cmlidXRlIGhhbmRsZXIuIElmIGBoYW5kbGVyYCBpcyBhIGZ1bmN0aW9uLCB0aGUgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggYCRlbGVtZW50YCBhcyBjb250ZXh0LCBhbmQgYXR0cmlidXRlIHZhbHVlICsgbmFtZS4gSWYgYGhhbmRsZXJgIGlzIGFuIG9iamVjdCwgaXQgc2hvdWxkIGluY2x1ZGUgdHdvIGZ1bmN0aW9ucywgYW5kIGhhdmUgdGhlIGZvcm06IGB7IGluaXQ6IGZuLCAgaGFuZGxlOiBmbiB9YC4gVGhlIGBpbml0YCBmdW5jdGlvbiBpcyBjYWxsZWQgd2hlbiB0aGUgcGFnZSBsb2FkczsgdXNlIHRoaXMgdG8gZGVmaW5lIGV2ZW50IGhhbmRsZXJzLiBUaGUgYGhhbmRsZWAgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggYCRlbGVtZW50YCBhcyBjb250ZXh0LCBhbmQgYXR0cmlidXRlIHZhbHVlICsgbmFtZS5cbiAgICAgKi9cbiAgICByZXBsYWNlOiBmdW5jdGlvbiAoYXR0ckZpbHRlciwgbm9kZUZpbHRlciwgaGFuZGxlcikge1xuICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgIF8uZWFjaChoYW5kbGVyc0xpc3QsIGZ1bmN0aW9uIChjdXJyZW50SGFuZGxlciwgaSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoQXR0cihjdXJyZW50SGFuZGxlci50ZXN0LCBhdHRyRmlsdGVyKSAmJiBtYXRjaE5vZGUoY3VycmVudEhhbmRsZXIudGFyZ2V0LCBub2RlRmlsdGVyKSkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBoYW5kbGVyc0xpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoYXR0ckZpbHRlciwgbm9kZUZpbHRlciwgaGFuZGxlcikpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgUmV0cmlldmUgdGhlIGFwcHJvcHJpYXRlIGhhbmRsZXIgZm9yIGEgcGFydGljdWxhciBhdHRyaWJ1dGUuIFRoZXJlIG1heSBiZSBtdWx0aXBsZSBtYXRjaGluZyBoYW5kbGVycywgYnV0IHRoZSBmaXJzdCAobW9zdCBleGFjdCkgbWF0Y2ggaXMgYWx3YXlzIHVzZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHkgVGhlIGF0dHJpYnV0ZS5cbiAgICAgKiBAcGFyYW0geyRlbH0gJGVsIFRoZSBET00gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIGF0dHJpYnV0ZSBoYW5kbGVyLlxuICAgICAqL1xuICAgIGdldEhhbmRsZXI6IGZ1bmN0aW9uIChwcm9wZXJ0eSwgJGVsKSB7XG4gICAgICAgIHZhciBmaWx0ZXJlZCA9IHRoaXMuZmlsdGVyKHByb3BlcnR5LCAkZWwpO1xuICAgICAgICAvL1RoZXJlIGNvdWxkIGJlIG11bHRpcGxlIG1hdGNoZXMsIGJ1dCB0aGUgdG9wIGZpcnN0IGhhcyB0aGUgbW9zdCBwcmlvcml0eVxuICAgICAgICByZXR1cm4gZmlsdGVyZWRbMF07XG4gICAgfVxufTtcblxuIiwiLyoqXG4gKiAjIyBDaGVja2JveGVzIGFuZCBSYWRpbyBCdXR0b25zXG4gKlxuICogSW4gdGhlIFtkZWZhdWx0IGNhc2VdKC4uL2RlZmF1bHQtYmluZC1hdHRyLyksIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZSBjcmVhdGVzIGEgYmktZGlyZWN0aW9uYWwgYmluZGluZyBiZXR3ZWVuIHRoZSBET00gZWxlbWVudCBhbmQgdGhlIG1vZGVsIHZhcmlhYmxlLiBUaGlzIGJpbmRpbmcgaXMgKipiaS1kaXJlY3Rpb25hbCoqLCBtZWFuaW5nIHRoYXQgYXMgdGhlIG1vZGVsIGNoYW5nZXMsIHRoZSBpbnRlcmZhY2UgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkOyBhbmQgd2hlbiBlbmQgdXNlcnMgY2hhbmdlIHZhbHVlcyBpbiB0aGUgaW50ZXJmYWNlLCB0aGUgbW9kZWwgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkLlxuICpcbiAqIEZsb3cuanMgcHJvdmlkZXMgc3BlY2lhbCBoYW5kbGluZyBmb3IgRE9NIGVsZW1lbnRzIHdpdGggYHR5cGU9XCJjaGVja2JveFwiYCBhbmQgYHR5cGU9XCJyYWRpb1wiYC5cbiAqXG4gKiBJbiBwYXJ0aWN1bGFyLCBpZiB5b3UgYWRkIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZSB0byBhbiBgaW5wdXRgIHdpdGggYHR5cGU9XCJjaGVja2JveFwiYCBhbmQgYHR5cGU9XCJyYWRpb1wiYCwgdGhlIGNoZWNrYm94IG9yIHJhZGlvIGJ1dHRvbiBpcyBhdXRvbWF0aWNhbGx5IHNlbGVjdGVkIGlmIHRoZSBgdmFsdWVgIG1hdGNoZXMgdGhlIHZhbHVlIG9mIHRoZSBtb2RlbCB2YXJpYWJsZSByZWZlcmVuY2VkLCBvciBpZiB0aGUgbW9kZWwgdmFyaWFibGUgaXMgYHRydWVgLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8IS0tIHJhZGlvIGJ1dHRvbiwgc2VsZWN0ZWQgaWYgc2FtcGxlSW50IGlzIDggLS0+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwicmFkaW9cIiBkYXRhLWYtYmluZD1cInNhbXBsZUludFwiIHZhbHVlPVwiOFwiIC8+XG4gKlxuICogICAgICA8IS0tIGNoZWNrYm94LCBjaGVja2VkIGlmIHNhbXBsZUJvb2wgaXMgdHJ1ZSAtLT5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGRhdGEtZi1iaW5kPVwic2FtcGxlQm9vbFwiIC8+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICc6Y2hlY2tib3gsOnJhZGlvJyxcblxuICAgIHRlc3Q6ICdiaW5kJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzZXR0YWJsZVZhbHVlID0gdGhpcy5hdHRyKCd2YWx1ZScpOyAvL2luaXRpYWwgdmFsdWVcbiAgICAgICAgLypqc2xpbnQgZXFlcTogdHJ1ZSovXG4gICAgICAgIHZhciBpc0NoZWNrZWQgPSAoc2V0dGFibGVWYWx1ZSAhPT0gdW5kZWZpbmVkKSA/IChzZXR0YWJsZVZhbHVlID09IHZhbHVlKSA6ICEhdmFsdWU7XG4gICAgICAgIHRoaXMucHJvcCgnY2hlY2tlZCcsIGlzQ2hlY2tlZCk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgRGVmYXVsdCBCaS1kaXJlY3Rpb25hbCBCaW5kaW5nOiBkYXRhLWYtYmluZFxuICpcbiAqIFRoZSBtb3N0IGNvbW1vbmx5IHVzZWQgYXR0cmlidXRlIHByb3ZpZGVkIGJ5IEZsb3cuanMgaXMgdGhlIGBkYXRhLWYtYmluZGAgYXR0cmlidXRlLlxuICpcbiAqICMjIyNkYXRhLWYtYmluZCB3aXRoIGEgc2luZ2xlIHZhbHVlXG4gKlxuICogWW91IGNhbiBiaW5kIHZhcmlhYmxlcyBmcm9tIHRoZSBtb2RlbCBpbiB5b3VyIGludGVyZmFjZSBieSBzZXR0aW5nIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZS4gVGhpcyBhdHRyaWJ1dGUgYmluZGluZyBpcyBiaS1kaXJlY3Rpb25hbCwgbWVhbmluZyB0aGF0IGFzIHRoZSBtb2RlbCBjaGFuZ2VzLCB0aGUgaW50ZXJmYWNlIGlzIGF1dG9tYXRpY2FsbHkgdXBkYXRlZDsgYW5kIHdoZW4gdXNlcnMgY2hhbmdlIHZhbHVlcyBpbiB0aGUgaW50ZXJmYWNlLCB0aGUgbW9kZWwgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkLiBTcGVjaWZpY2FsbHk6XG4gKlxuICogKiBUaGUgYmluZGluZyBmcm9tIHRoZSBtb2RlbCB0byB0aGUgaW50ZXJmYWNlIGVuc3VyZXMgdGhhdCB0aGUgY3VycmVudCB2YWx1ZSBvZiB0aGUgdmFyaWFibGUgaXMgZGlzcGxheWVkIGluIHRoZSBIVE1MIGVsZW1lbnQuIFRoaXMgaW5jbHVkZXMgYXV0b21hdGljIHVwZGF0ZXMgdG8gdGhlIGRpc3BsYXllZCB2YWx1ZSBpZiBzb21ldGhpbmcgZWxzZSBjaGFuZ2VzIGluIHRoZSBtb2RlbC5cbiAqXG4gKiAqIFRoZSBiaW5kaW5nIGZyb20gdGhlIGludGVyZmFjZSB0byB0aGUgbW9kZWwgZW5zdXJlcyB0aGF0IGlmIHRoZSBIVE1MIGVsZW1lbnQgaXMgZWRpdGFibGUsIGNoYW5nZXMgYXJlIHNlbnQgdG8gdGhlIG1vZGVsLlxuICpcbiAqIE9uY2UgeW91IHNldCBgZGF0YS1mLWJpbmRgLCBGbG93LmpzIGZpZ3VyZXMgb3V0IHRoZSBhcHByb3ByaWF0ZSBhY3Rpb24gdG8gdGFrZSBiYXNlZCBvbiB0aGUgZWxlbWVudCB0eXBlIGFuZCB0aGUgZGF0YSByZXNwb25zZSBmcm9tIHlvdXIgbW9kZWwuXG4gKlxuICogKipUbyBkaXNwbGF5IGFuZCBhdXRvbWF0aWNhbGx5IHVwZGF0ZSBhIHZhcmlhYmxlIGluIHRoZSBpbnRlcmZhY2U6KipcbiAqXG4gKiAxLiBBZGQgdGhlIGBkYXRhLWYtYmluZGAgYXR0cmlidXRlIHRvIGFueSBIVE1MIGVsZW1lbnQgdGhhdCBub3JtYWxseSB0YWtlcyBhIHZhbHVlLlxuICogMi4gU2V0IHRoZSB2YWx1ZSBvZiB0aGUgYGRhdGEtZi1iaW5kYCBhdHRyaWJ1dGUgdG8gdGhlIG5hbWUgb2YgdGhlIHZhcmlhYmxlLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8c3BhbiBkYXRhLWYtYmluZD1cInNhbGVzTWFuYWdlci5uYW1lXCIgLz5cbiAqXG4gKiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGRhdGEtZi1iaW5kPVwic2FtcGxlU3RyaW5nXCIgLz5cbiAqXG4gKiAqKk5vdGVzOioqXG4gKlxuICogKiBVc2Ugc3F1YXJlIGJyYWNrZXRzLCBgW11gLCB0byByZWZlcmVuY2UgYXJyYXllZCB2YXJpYWJsZXM6IGBzYWxlc1tXZXN0XWAuXG4gKiAqIFVzZSBhbmdsZSBicmFja2V0cywgYDw+YCwgdG8gcmVmZXJlbmNlIG90aGVyIHZhcmlhYmxlcyBpbiB5b3VyIGFycmF5IGluZGV4OiBgc2FsZXNbPGN1cnJlbnRSZWdpb24+XWAuXG4gKiAqIFJlbWVtYmVyIHRoYXQgaWYgeW91ciBtb2RlbCBpcyBpbiBWZW5zaW0sIHRoZSB0aW1lIHN0ZXAgY2FuIGJlIHRoZSBmaXJzdCBhcnJheSBpbmRleCBvciB0aGUgbGFzdCBhcnJheSBpbmRleCwgZGVwZW5kaW5nIG9uIHlvdXIgW21vZGVsLmNmZ10oLi4vLi4vLi4vLi4vLi4vLi4vbW9kZWxfY29kZS92ZW5zaW0vI2NyZWF0aW5nLWNmZykgZmlsZS5cbiAqICogQnkgZGVmYXVsdCwgYWxsIEhUTUwgZWxlbWVudHMgdXBkYXRlIGZvciBhbnkgY2hhbmdlIGZvciBlYWNoIHZhcmlhYmxlLiBIb3dldmVyLCB5b3UgY2FuIHByZXZlbnQgdGhlIHVzZXIgaW50ZXJmYWNlIGZyb20gdXBkYXRpbmcgJm1kYXNoOyBlaXRoZXIgZm9yIGFsbCB2YXJpYWJsZXMgb3IgZm9yIHBhcnRpY3VsYXIgdmFyaWFibGVzICZtZGFzaDsgYnkgc2V0dGluZyB0aGUgYHNpbGVudGAgcHJvcGVydHkgd2hlbiB5b3UgaW5pdGlhbGl6ZSBGbG93LmpzLiBTZWUgbW9yZSBvbiBbYWRkaXRpb25hbCBvcHRpb25zIGZvciB0aGUgRmxvdy5pbml0aWFsaXplKCkgbWV0aG9kXSguLi8uLi8uLi8uLi8uLi8jY3VzdG9tLWluaXRpYWxpemUpLlxuICpcbiAqICMjIyNkYXRhLWYtYmluZCB3aXRoIG11bHRpcGxlIHZhbHVlcyBhbmQgdGVtcGxhdGVzXG4gKlxuICogSWYgeW91IGhhdmUgbXVsdGlwbGUgdmFyaWFibGVzLCB5b3UgY2FuIHVzZSB0aGUgc2hvcnRjdXQgb2YgbGlzdGluZyBtdWx0aXBsZSB2YXJpYWJsZXMgaW4gYW4gZW5jbG9zaW5nIEhUTUwgZWxlbWVudCBhbmQgdGhlbiByZWZlcmVuY2luZyBlYWNoIHZhcmlhYmxlIHVzaW5nIHRlbXBsYXRlcy4gKFRlbXBsYXRlcyBhcmUgYXZhaWxhYmxlIGFzIHBhcnQgb2YgRmxvdy5qcydzIGxvZGFzaCBkZXBlbmRlbmN5LiBTZWUgbW9yZSBiYWNrZ3JvdW5kIG9uIFt3b3JraW5nIHdpdGggdGVtcGxhdGVzXSguLi8uLi8uLi8uLi8uLi8jdGVtcGxhdGVzKS4pXG4gKlxuICogKipUbyBkaXNwbGF5IGFuZCBhdXRvbWF0aWNhbGx5IHVwZGF0ZSBtdWx0aXBsZSB2YXJpYWJsZXMgaW4gdGhlIGludGVyZmFjZToqKlxuICpcbiAqIDEuIEFkZCB0aGUgYGRhdGEtZi1iaW5kYCBhdHRyaWJ1dGUgdG8gYW55IEhUTUwgZWxlbWVudCBmcm9tIHdoaWNoIHlvdSB3YW50IHRvIHJlZmVyZW5jZSBtb2RlbCB2YXJpYWJsZXMsIHN1Y2ggYXMgYSBgZGl2YCBvciBgdGFibGVgLlxuICogMi4gU2V0IHRoZSB2YWx1ZSBvZiB0aGUgYGRhdGEtZi1iaW5kYCBhdHRyaWJ1dGUgaW4geW91ciB0b3AtbGV2ZWwgSFRNTCBlbGVtZW50IHRvIGEgY29tbWEtc2VwYXJhdGVkIGxpc3Qgb2YgdGhlIHZhcmlhYmxlcy4gKFRoZSB2YXJpYWJsZXMgbWF5IG9yIG1heSBub3QgYmUgY2FzZS1zZW5zaXRpdmUsIGRlcGVuZGluZyBvbiB5b3VyIG1vZGVsaW5nIGxhbmd1YWdlLilcbiAqXG4gKiAzLiBJbnNpZGUgdGhlIEhUTUwgZWxlbWVudCwgdXNlIHRlbXBsYXRlcyAoYDwlPSAlPmApIHRvIHJlZmVyZW5jZSB0aGUgc3BlY2lmaWMgdmFyaWFibGUgbmFtZXMuIFRoZXNlIHZhcmlhYmxlIG5hbWVzIGFyZSBjYXNlLXNlbnNpdGl2ZTogdGhleSBzaG91bGQgbWF0Y2ggdGhlIGNhc2UgeW91IHVzZWQgaW4gdGhlIGBkYXRhLWYtYmluZGAgaW4gc3RlcCAyLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8IS0tIG1ha2UgdGhlc2UgdGhyZWUgbW9kZWwgdmFyaWFibGVzIGF2YWlsYWJsZSB0aHJvdWdob3V0IGRpdiAtLT5cbiAqXG4gKiAgICAgIDxkaXYgZGF0YS1mLWJpbmQ9XCJDdXJyZW50WWVhciwgUmV2ZW51ZSwgUHJvZml0XCI+XG4gKiAgICAgICAgICBJbiA8JT0gQ3VycmVudFllYXIgJT4sXG4gKiAgICAgICAgICBvdXIgY29tcGFueSBlYXJuZWQgPCU9IFJldmVudWUgJT4sXG4gKiAgICAgICAgICByZXN1bHRpbmcgaW4gPCU9IFByb2ZpdCAlPiBwcm9maXQuXG4gKiAgICAgIDwvZGl2PlxuICpcbiAqIFRoaXMgZXhhbXBsZSBpcyBzaG9ydGhhbmQgZm9yIHJlcGVhdGVkbHkgdXNpbmcgZGF0YS1mLWJpbmQuIEZvciBpbnN0YW5jZSwgdGhpcyBjb2RlIGFsc28gZ2VuZXJhdGVzIHRoZSBzYW1lIG91dHB1dDpcbiAqXG4gKiAgICAgIDxkaXY+XG4gKiAgICAgICAgICBJbiA8c3BhbiBkYXRhLWYtYmluZD1cIkN1cnJlbnRZZWFyXCI+PC9zcGFuPixcbiAqICAgICAgICAgIG91ciBjb21wYW55IGVhcm5lZCA8c3BhbiBkYXRhLWYtYmluZD1cIlJldmVudWVcIj48L3NwYW4+LFxuICogICAgICAgICAgcmVzdWx0aW5nIGluIDxzcGFuIGRhdGEtZi1iaW5kPVwiUHJvZml0XCI+IHByb2ZpdDwvc3Bhbj4uXG4gKiAgICAgIDwvZGl2PlxuICpcbiAqICoqTm90ZXM6KipcbiAqXG4gKiAqIEFkZGluZyBgZGF0YS1mLWJpbmRgIHRvIHRoZSBlbmNsb3NpbmcgSFRNTCBlbGVtZW50IHJhdGhlciB0aGFuIHJlcGVhdGVkbHkgdXNpbmcgaXQgd2l0aGluIHRoZSBlbGVtZW50IGlzIGEgY29kZSBzdHlsZSBwcmVmZXJlbmNlLiBJbiBtYW55IGNhc2VzLCBhZGRpbmcgYGRhdGEtZi1iaW5kYCBhdCB0aGUgdG9wIGxldmVsLCBhcyBpbiB0aGUgZmlyc3QgZXhhbXBsZSwgY2FuIG1ha2UgeW91ciBjb2RlIGVhc2llciB0byByZWFkIGFuZCBtYWludGFpbi5cbiAqICogSG93ZXZlciwgeW91IG1pZ2h0IGNob29zZSB0byByZXBlYXRlZGx5IHVzZSBgZGF0YS1mLWJpbmRgIGluIHNvbWUgY2FzZXMsIGZvciBleGFtcGxlIGlmIHlvdSB3YW50IGRpZmZlcmVudCBbZm9ybWF0dGluZ10oLi4vLi4vLi4vLi4vLi4vY29udmVydGVyLW92ZXJ2aWV3LykgZm9yIGRpZmZlcmVudCB2YXJpYWJsZXM6XG4gKlxuICogICAgICA8ZGl2PlxuICogICAgICAgICAgSW4gPHNwYW4gZGF0YS1mLWJpbmQ9XCJDdXJyZW50WWVhciB8ICNcIj48L3NwYW4+LFxuICogICAgICAgICAgb3VyIGNvbXBhbnkgZWFybmVkIDxzcGFuIGRhdGEtZi1iaW5kPVwiUmV2ZW51ZSB8ICQjLCMjI1wiPjwvc3Bhbj5cbiAqICAgICAgPC9kaXY+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6ICdiaW5kJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciB0ZW1wbGF0ZWQ7XG4gICAgICAgIHZhciB2YWx1ZVRvVGVtcGxhdGUgPSB2YWx1ZTtcbiAgICAgICAgaWYgKCEkLmlzUGxhaW5PYmplY3QodmFsdWUpKSB7XG4gICAgICAgICAgICB2YXIgdmFyaWFibGVOYW1lID0gdGhpcy5kYXRhKCdmLWJpbmQnKTsvL0hhY2sgYmVjYXVzZSBpIGRvbid0IGhhdmUgYWNjZXNzIHRvIHZhcmlhYmxlIG5hbWUgaGVyZSBvdGhlcndpc2VcbiAgICAgICAgICAgIHZhbHVlVG9UZW1wbGF0ZSA9IHsgdmFsdWU6IHZhbHVlIH07XG4gICAgICAgICAgICB2YWx1ZVRvVGVtcGxhdGVbdmFyaWFibGVOYW1lXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBiaW5kVGVtcGxhdGUgPSB0aGlzLmRhdGEoJ2JpbmQtdGVtcGxhdGUnKTtcbiAgICAgICAgaWYgKGJpbmRUZW1wbGF0ZSkge1xuICAgICAgICAgICAgdGVtcGxhdGVkID0gXy50ZW1wbGF0ZShiaW5kVGVtcGxhdGUsIHZhbHVlVG9UZW1wbGF0ZSk7XG4gICAgICAgICAgICB0aGlzLmh0bWwodGVtcGxhdGVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBvbGRIVE1MID0gdGhpcy5odG1sKCk7XG4gICAgICAgICAgICB2YXIgY2xlYW5lZEhUTUwgPSBvbGRIVE1MLnJlcGxhY2UoLyZsdDsvZywgJzwnKS5yZXBsYWNlKC8mZ3Q7L2csICc+Jyk7XG4gICAgICAgICAgICB0ZW1wbGF0ZWQgPSBfLnRlbXBsYXRlKGNsZWFuZWRIVE1MLCB2YWx1ZVRvVGVtcGxhdGUpO1xuICAgICAgICAgICAgaWYgKGNsZWFuZWRIVE1MID09PSB0ZW1wbGF0ZWQpIHsgLy90ZW1wbGF0aW5nIGRpZCBub3RoaW5nXG4gICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFsdWUgKz0gJyc7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sKHZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhKCdiaW5kLXRlbXBsYXRlJywgY2xlYW5lZEhUTUwpO1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbCh0ZW1wbGF0ZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgSW5wdXRzIGFuZCBTZWxlY3RzXG4gKlxuICogSW4gdGhlIFtkZWZhdWx0IGNhc2VdKC4uL2RlZmF1bHQtYmluZC1hdHRyLyksIHRoZSBgZGF0YS1mLWJpbmRgIGF0dHJpYnV0ZSBjcmVhdGVzIGEgYmktZGlyZWN0aW9uYWwgYmluZGluZyBiZXR3ZWVuIHRoZSBET00gZWxlbWVudCBhbmQgdGhlIG1vZGVsIHZhcmlhYmxlLiBUaGlzIGJpbmRpbmcgaXMgKipiaS1kaXJlY3Rpb25hbCoqLCBtZWFuaW5nIHRoYXQgYXMgdGhlIG1vZGVsIGNoYW5nZXMsIHRoZSBpbnRlcmZhY2UgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkOyBhbmQgd2hlbiBlbmQgdXNlcnMgY2hhbmdlIHZhbHVlcyBpbiB0aGUgaW50ZXJmYWNlLCB0aGUgbW9kZWwgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkLlxuICpcbiAqIEZsb3cuanMgcHJvdmlkZXMgc3BlY2lhbCBoYW5kbGluZyBmb3IgRE9NIGVsZW1lbnRzIGBpbnB1dGAgYW5kIGBzZWxlY3RgLlxuICpcbiAqIEluIHBhcnRpY3VsYXIsIGlmIHlvdSBhZGQgdGhlIGBkYXRhLWYtYmluZGAgYXR0cmlidXRlIHRvIGEgYHNlbGVjdGAgb3IgYGlucHV0YCBlbGVtZW50LCB0aGUgb3B0aW9uIG1hdGNoaW5nIHRoZSB2YWx1ZSBvZiB0aGUgbW9kZWwgdmFyaWFibGUgaXMgYXV0b21hdGljYWxseSBzZWxlY3RlZC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqIFx0XHQ8IS0tIG9wdGlvbiBzZWxlY3RlZCBpZiBzYW1wbGVfaW50IGlzIDgsIDEwLCBvciAxMiAtLT5cbiAqIFx0XHQ8c2VsZWN0IGRhdGEtZi1iaW5kPVwic2FtcGxlX2ludFwiPlxuICogXHRcdFx0PG9wdGlvbiB2YWx1ZT1cIjhcIj4gOCA8L29wdGlvbj5cbiAqIFx0XHRcdDxvcHRpb24gdmFsdWU9XCIxMFwiPiAxMCA8L29wdGlvbj5cbiAqIFx0XHRcdDxvcHRpb24gdmFsdWU9XCIxMlwiPiAxMiA8L29wdGlvbj5cbiAqIFx0XHQ8L3NlbGVjdD5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICB0YXJnZXQ6ICdpbnB1dCwgc2VsZWN0JyxcblxuICAgIHRlc3Q6ICdiaW5kJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudmFsKHZhbHVlKTtcbiAgICB9XG59O1xuIiwiLyoqXG4gKiAjIyBDbGFzcyBBdHRyaWJ1dGU6IGRhdGEtZi1jbGFzc1xuICpcbiAqIFlvdSBjYW4gYmluZCBtb2RlbCB2YXJpYWJsZXMgdG8gbmFtZXMgb2YgQ1NTIGNsYXNzZXMsIHNvIHRoYXQgeW91IGNhbiBlYXNpbHkgY2hhbmdlIHRoZSBzdHlsaW5nIG9mIEhUTUwgZWxlbWVudHMgYmFzZWQgb24gdGhlIHZhbHVlcyBvZiBtb2RlbCB2YXJpYWJsZXMuXG4gKlxuICogKipUbyBiaW5kIG1vZGVsIHZhcmlhYmxlcyB0byBDU1MgY2xhc3NlczoqKlxuICpcbiAqIDEuIEFkZCB0aGUgYGRhdGEtZi1jbGFzc2AgYXR0cmlidXRlIHRvIGFuIEhUTUwgZWxlbWVudC5cbiAqIDIuIFNldCB0aGUgdmFsdWUgdG8gdGhlIG5hbWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlLlxuICogMy4gT3B0aW9uYWxseSwgYWRkIGFuIGFkZGl0aW9uYWwgYGNsYXNzYCBhdHRyaWJ1dGUgdG8gdGhlIEhUTUwgZWxlbWVudC5cbiAqICAgICAgKiBJZiB5b3Ugb25seSB1c2UgdGhlIGBkYXRhLWYtY2xhc3NgIGF0dHJpYnV0ZSwgdGhlIHZhbHVlIG9mIGBkYXRhLWYtY2xhc3NgIGlzIHRoZSBjbGFzcyBuYW1lLlxuICogICAgICAqIElmIHlvdSAqYWxzbyogYWRkIGEgYGNsYXNzYCBhdHRyaWJ1dGUsIHRoZSB2YWx1ZSBvZiBgZGF0YS1mLWNsYXNzYCBpcyAqYXBwZW5kZWQqIHRvIHRoZSBjbGFzcyBuYW1lLlxuICogNC4gQWRkIGNsYXNzZXMgdG8geW91ciBDU1MgY29kZSB3aG9zZSBuYW1lcyBpbmNsdWRlIHBvc3NpYmxlIHZhbHVlcyBvZiB0aGF0IG1vZGVsIHZhcmlhYmxlLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8c3R5bGUgdHlwZT1cInRleHQvY3NzXCI+XG4gKiAgICAgICAgICAuTm9ydGggeyBjb2xvcjogZ3JleSB9XG4gKiAgICAgICAgICAuU291dGggeyBjb2xvcjogcHVycGxlIH1cbiAqICAgICAgICAgIC5FYXN0IHsgY29sb3I6IGJsdWUgfVxuICogICAgICAgICAgLldlc3QgeyBjb2xvcjogb3JhbmdlIH1cbiAqICAgICAgICAgIC5zYWxlcy5nb29kIHsgY29sb3I6IGdyZWVuIH1cbiAqICAgICAgICAgIC5zYWxlcy5iYWQgeyBjb2xvcjogcmVkIH1cbiAqICAgICAgICAgIC5zYWxlcy52YWx1ZS0xMDAgeyBjb2xvcjogeWVsbG93IH1cbiAqICAgICAgIDwvc3R5bGU+XG4gKlxuICogICAgICAgPGRpdiBkYXRhLWYtY2xhc3M9XCJzYWxlc01nci5yZWdpb25cIj5cbiAqICAgICAgICAgICBDb250ZW50IGNvbG9yZWQgYnkgcmVnaW9uXG4gKiAgICAgICA8L2Rpdj5cbiAqXG4gKiAgICAgICA8ZGl2IGRhdGEtZi1jbGFzcz1cInNhbGVzTWdyLnBlcmZvcm1hbmNlXCIgY2xhc3M9XCJzYWxlc1wiPlxuICogICAgICAgICAgIENvbnRlbnQgZ3JlZW4gaWYgc2FsZXNNZ3IucGVyZm9ybWFuY2UgaXMgZ29vZCwgcmVkIGlmIGJhZFxuICogICAgICAgPC9kaXY+XG4gKlxuICogICAgICAgPGRpdiBkYXRhLWYtY2xhc3M9XCJzYWxlc01nci5udW1SZWdpb25zXCIgY2xhc3M9XCJzYWxlc1wiPlxuICogICAgICAgICAgIENvbnRlbnQgeWVsbG93IGlmIHNhbGVzTWdyLm51bVJlZ2lvbnMgaXMgMTAwXG4gKiAgICAgICA8L2Rpdj5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRlc3Q6ICdjbGFzcycsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFkZGVkQ2xhc3NlcyA9IHRoaXMuZGF0YSgnYWRkZWQtY2xhc3NlcycpO1xuICAgICAgICBpZiAoIWFkZGVkQ2xhc3Nlcykge1xuICAgICAgICAgICAgYWRkZWRDbGFzc2VzID0ge307XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFkZGVkQ2xhc3Nlc1twcm9wXSkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVDbGFzcyhhZGRlZENsYXNzZXNbcHJvcF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8uaXNOdW1iZXIodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9ICd2YWx1ZS0nICsgdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgYWRkZWRDbGFzc2VzW3Byb3BdID0gdmFsdWU7XG4gICAgICAgIC8vRml4bWU6IHByb3AgaXMgYWx3YXlzIFwiY2xhc3NcIlxuICAgICAgICB0aGlzLmFkZENsYXNzKHZhbHVlKTtcbiAgICAgICAgdGhpcy5kYXRhKCdhZGRlZC1jbGFzc2VzJywgYWRkZWRDbGFzc2VzKTtcbiAgICB9XG59O1xuIiwiLyoqXG4gKiAjIyBEZWZhdWx0IEF0dHJpYnV0ZSBIYW5kbGluZzogUmVhZC1vbmx5IEJpbmRpbmdcbiAqXG4gKiBGbG93LmpzIHVzZXMgdGhlIEhUTUw1IGNvbnZlbnRpb24gb2YgcHJlcGVuZGluZyBkYXRhLSB0byBhbnkgY3VzdG9tIEhUTUwgYXR0cmlidXRlLiBGbG93LmpzIGFsc28gYWRkcyBgZmAgZm9yIGVhc3kgaWRlbnRpZmljYXRpb24gb2YgRmxvdy5qcy4gRm9yIGV4YW1wbGUsIEZsb3cuanMgcHJvdmlkZXMgc2V2ZXJhbCBjdXN0b20gYXR0cmlidXRlcyBhbmQgYXR0cmlidXRlIGhhbmRsZXJzIC0tIGluY2x1ZGluZyBbZGF0YS1mLWJpbmRdKC4uL2JpbmRzL2RlZmF1bHQtYmluZC1hdHRyKSwgW2RhdGEtZi1mb3JlYWNoXSguLi9mb3JlYWNoL2RlZmF1bHQtZm9yZWFjaC1hdHRyLyksIFtkYXRhLWYtb24taW5pdF0oLi4vZXZlbnRzL2luaXQtZXZlbnQtYXR0ci8pLCBldGMuIFlvdSBjYW4gYWxzbyBbYWRkIHlvdXIgb3duIGF0dHJpYnV0ZSBoYW5kbGVyc10oLi4vYXR0cmlidXRlLW1hbmFnZXIvKS5cbiAqXG4gKiBUaGUgZGVmYXVsdCBiZWhhdmlvciBmb3IgaGFuZGxpbmcgYSBrbm93biBhdHRyaWJ1dGUgaXMgdG8gdXNlIHRoZSB2YWx1ZSBvZiB0aGUgbW9kZWwgdmFyaWFibGUgYXMgdGhlIHZhbHVlIG9mIHRoZSBhdHRyaWJ1dGUuIChUaGVyZSBhcmUgZXhjZXB0aW9ucyBmb3Igc29tZSBbYm9vbGVhbiBhdHRyaWJ1dGVzXSguLi9ib29sZWFuLWF0dHIvKS4pXG4gKlxuICogVGhpcyBtZWFucyB5b3UgY2FuIGJpbmQgdmFyaWFibGVzIGZyb20gdGhlIG1vZGVsIGluIHlvdXIgaW50ZXJmYWNlIGJ5IGFkZGluZyB0aGUgYGRhdGEtZi1gIHByZWZpeCB0byBhbnkgc3RhbmRhcmQgRE9NIGF0dHJpYnV0ZS4gVGhpcyBhdHRyaWJ1dGUgYmluZGluZyBpcyAqKnJlYWQtb25seSoqLCBzbyBhcyB0aGUgbW9kZWwgY2hhbmdlcywgdGhlIGludGVyZmFjZSBpcyBhdXRvbWF0aWNhbGx5IHVwZGF0ZWQ7IGJ1dCB3aGVuIHVzZXJzIGNoYW5nZSB2YWx1ZXMgaW4gdGhlIGludGVyZmFjZSwgbm8gYWN0aW9uIG9jY3Vycy5cbiAqXG4gKiAqKlRvIGRpc3BsYXkgYSBET00gZWxlbWVudCBiYXNlZCBvbiBhIHZhcmlhYmxlIGZyb20gdGhlIG1vZGVsOioqXG4gKlxuICogMS4gQWRkIHRoZSBwcmVmaXggYGRhdGEtZi1gIHRvIGFueSBhdHRyaWJ1dGUgaW4gYW55IEhUTUwgZWxlbWVudCB0aGF0IG5vcm1hbGx5IHRha2VzIGEgdmFsdWUuXG4gKiAyLiBTZXQgdGhlIHZhbHVlIG9mIHRoZSBhdHRyaWJ1dGUgdG8gdGhlIG5hbWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogXHRcdDwhLS0gaW5wdXQgZWxlbWVudCBkaXNwbGF5cyB2YWx1ZSBvZiBzYW1wbGVfaW50LCBob3dldmVyLFxuICogXHRcdFx0bm8gY2FsbCB0byB0aGUgbW9kZWwgaXMgbWFkZSBpZiB1c2VyIGNoYW5nZXMgc2FtcGxlX2ludFxuICpcbiAqXHRcdFx0aWYgc2FtcGxlX2ludCBpcyA4LCB0aGlzIGlzIHRoZSBlcXVpdmFsZW50IG9mIDxpbnB1dCB2YWx1ZT1cIjhcIj48L2lucHV0PiAtLT5cbiAqXG4gKlx0XHQ8aW5wdXQgZGF0YS1mLXZhbHVlPVwic2FtcGxlX2ludFwiPjwvaW5wdXQ+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0ZXN0OiAnKicsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCB2YWx1ZSk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyNDYWxsIE9wZXJhdGlvbiBpbiBSZXNwb25zZSB0byBVc2VyIEFjdGlvblxuICpcbiAqIE1hbnkgbW9kZWxzIGNhbGwgcGFydGljdWxhciBvcGVyYXRpb25zIGluIHJlc3BvbnNlIHRvIGVuZCB1c2VyIGFjdGlvbnMsIHN1Y2ggYXMgY2xpY2tpbmcgYSBidXR0b24gb3Igc3VibWl0dGluZyBhIGZvcm0uXG4gKlxuICogIyMjI2RhdGEtZi1vbi1ldmVudFxuICpcbiAqIEZvciBhbnkgSFRNTCBhdHRyaWJ1dGUgdXNpbmcgYG9uYCAtLSB0eXBpY2FsbHkgb24gY2xpY2sgb3Igb24gc3VibWl0IC0tIHlvdSBjYW4gYWRkIHRoZSBhdHRyaWJ1dGUgYGRhdGEtZi1vbi1YWFhgLCBhbmQgc2V0IHRoZSB2YWx1ZSB0byB0aGUgbmFtZSBvZiB0aGUgb3BlcmF0aW9uLiBUbyBjYWxsIG11bHRpcGxlIG9wZXJhdGlvbnMsIHVzZSB0aGUgYHxgIChwaXBlKSBjaGFyYWN0ZXIgdG8gY2hhaW4gb3BlcmF0aW9ucy4gT3BlcmF0aW9ucyBhcmUgY2FsbGVkIHNlcmlhbGx5LCBpbiB0aGUgb3JkZXIgbGlzdGVkLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8YnV0dG9uIGRhdGEtZi1vbi1jbGljaz1cInJlc2V0XCI+UmVzZXQ8L2J1dHRvbj5cbiAqXG4gKiAgICAgIDxidXR0b24gZGF0YS1mLW9uLWNsaWNrPVwic3RlcCgxKVwiPkFkdmFuY2UgT25lIFN0ZXA8L2J1dHRvbj5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogZnVuY3Rpb24gKGF0dHIsICRub2RlKSB7XG4gICAgICAgIHJldHVybiAoYXR0ci5pbmRleE9mKCdvbi0nKSA9PT0gMCk7XG4gICAgfSxcblxuICAgIHN0b3BMaXN0ZW5pbmc6IGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICAgIGF0dHIgPSBhdHRyLnJlcGxhY2UoJ29uLScsICcnKTtcbiAgICAgICAgdGhpcy5vZmYoYXR0cik7XG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChhdHRyLCB2YWx1ZSkge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi0nLCAnJyk7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIHRoaXMub2ZmKGF0dHIpLm9uKGF0dHIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBsaXN0T2ZPcGVyYXRpb25zID0gXy5pbnZva2UodmFsdWUuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgIGxpc3RPZk9wZXJhdGlvbnMgPSBsaXN0T2ZPcGVyYXRpb25zLm1hcChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm5OYW1lID0gdmFsdWUuc3BsaXQoJygnKVswXTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gdmFsdWUuc3Vic3RyaW5nKHZhbHVlLmluZGV4T2YoJygnKSArIDEsIHZhbHVlLmluZGV4T2YoJyknKSk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSAoJC50cmltKHBhcmFtcykgIT09ICcnKSA/IHBhcmFtcy5zcGxpdCgnLCcpIDogW107XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogZm5OYW1lLCBwYXJhbXM6IGFyZ3MgfTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtZS50cmlnZ2VyKCdmLnVpLm9wZXJhdGUnLCB7IG9wZXJhdGlvbnM6IGxpc3RPZk9wZXJhdGlvbnMsIHNlcmlhbDogdHJ1ZSB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy9Eb24ndCBib3RoZXIgYmluZGluZyBvbiB0aGlzIGF0dHIuIE5PVEU6IERvIHJlYWRvbmx5LCB0cnVlIGluc3RlYWQ/O1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjQ2FsbCBPcGVyYXRpb24gd2hlbiBFbGVtZW50IEFkZGVkIHRvIERPTVxuICpcbiAqIE1hbnkgbW9kZWxzIGNhbGwgYW4gaW5pdGlhbGl6YXRpb24gb3BlcmF0aW9uIHdoZW4gdGhlIFtydW5dKC4uLy4uLy4uLy4uLy4uLy4uL2dsb3NzYXJ5LyNydW4pIGlzIGZpcnN0IGNyZWF0ZWQuIFRoaXMgaXMgcGFydGljdWxhcmx5IGNvbW1vbiB3aXRoIFtWZW5zaW1dKC4uLy4uLy4uLy4uLy4uLy4uL21vZGVsX2NvZGUvdmVuc2ltLykgbW9kZWxzLCB3aGljaCBuZWVkIHRvIGluaXRpYWxpemUgdmFyaWFibGVzICgnc3RhcnRHYW1lJykgYmVmb3JlIHN0ZXBwaW5nLiBZb3UgY2FuIHVzZSB0aGUgYGRhdGEtZi1vbi1pbml0YCBhdHRyaWJ1dGUgdG8gY2FsbCBhbiBvcGVyYXRpb24gZnJvbSB0aGUgbW9kZWwgd2hlbiBhIHBhcnRpY3VsYXIgZWxlbWVudCBpcyBhZGRlZCB0byB0aGUgRE9NLlxuICpcbiAqICMjIyNkYXRhLWYtb24taW5pdFxuICpcbiAqIEFkZCB0aGUgYXR0cmlidXRlIGBkYXRhLWYtb24taW5pdGAsIGFuZCBzZXQgdGhlIHZhbHVlIHRvIHRoZSBuYW1lIG9mIHRoZSBvcGVyYXRpb24uIFRvIGNhbGwgbXVsdGlwbGUgb3BlcmF0aW9ucywgdXNlIHRoZSBgfGAgKHBpcGUpIGNoYXJhY3RlciB0byBjaGFpbiBvcGVyYXRpb25zLiBPcGVyYXRpb25zIGFyZSBjYWxsZWQgc2VyaWFsbHksIGluIHRoZSBvcmRlciBsaXN0ZWQuIFR5cGljYWxseSB5b3UgYWRkIHRoaXMgYXR0cmlidXRlIHRvIHRoZSBgPGJvZHk+YCBlbGVtZW50LlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8Ym9keSBkYXRhLWYtb24taW5pdD1cInN0YXJ0R2FtZVwiPlxuICpcbiAqICAgICAgPGJvZHkgZGF0YS1mLW9uLWluaXQ9XCJzdGFydEdhbWUgfCBzdGVwKDMpXCI+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IGZ1bmN0aW9uIChhdHRyLCAkbm9kZSkge1xuICAgICAgICByZXR1cm4gKGF0dHIuaW5kZXhPZignb24taW5pdCcpID09PSAwKTtcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24gKGF0dHIsIHZhbHVlKSB7XG4gICAgICAgIGF0dHIgPSBhdHRyLnJlcGxhY2UoJ29uLWluaXQnLCAnJyk7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGxpc3RPZk9wZXJhdGlvbnMgPSBfLmludm9rZSh2YWx1ZS5zcGxpdCgnfCcpLCAndHJpbScpO1xuICAgICAgICAgICAgbGlzdE9mT3BlcmF0aW9ucyA9IGxpc3RPZk9wZXJhdGlvbnMubWFwKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHZhciBmbk5hbWUgPSB2YWx1ZS5zcGxpdCgnKCcpWzBdO1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB2YWx1ZS5zdWJzdHJpbmcodmFsdWUuaW5kZXhPZignKCcpICsgMSwgdmFsdWUuaW5kZXhPZignKScpKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9ICgkLnRyaW0ocGFyYW1zKSAhPT0gJycpID8gcGFyYW1zLnNwbGl0KCcsJykgOiBbXTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBmbk5hbWUsIHBhcmFtczogYXJncyB9O1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIG1lLnRyaWdnZXIoJ2YudWkub3BlcmF0ZScsIHsgb3BlcmF0aW9uczogbGlzdE9mT3BlcmF0aW9ucywgc2VyaWFsOiB0cnVlIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvL0Rvbid0IGJvdGhlciBiaW5kaW5nIG9uIHRoaXMgYXR0ci4gTk9URTogRG8gcmVhZG9ubHksIHRydWUgaW5zdGVhZD87XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgRGlzcGxheSBBcnJheSBhbmQgT2JqZWN0IFZhcmlhYmxlczogZGF0YS1mLWZvcmVhY2hcbiAqXG4gKiBJZiB5b3VyIG1vZGVsIHZhcmlhYmxlIGlzIGFuIGFycmF5LCB5b3UgY2FuIHJlZmVyZW5jZSBzcGVjaWZpYyBlbGVtZW50cyBvZiB0aGUgYXJyYXkgdXNpbmcgYGRhdGEtZi1iaW5kYDogYGRhdGEtZi1iaW5kPVwic2FsZXNbM11cImAgb3IgYGRhdGEtZi1iaW5kPVwic2FsZXNbPGN1cnJlbnRSZWdpb24+XVwiYCwgYXMgZGVzY3JpYmVkIHVuZGVyIFtkYXRhLWYtYmluZF0oLi4vLi4vYmluZHMvZGVmYXVsdC1iaW5kLWF0dHIvKS5cbiAqXG4gKiBIb3dldmVyLCB0aGF0J3Mgbm90IHRoZSBvbmx5IG9wdGlvbi4gSWYgeW91IHdhbnQgdG8gYXV0b21hdGljYWxseSBsb29wIG92ZXIgYWxsIGVsZW1lbnRzIG9mIHRoZSBhcnJheSwgb3IgYWxsIHRoZSBmaWVsZHMgb2YgYW4gb2JqZWN0LCB5b3UgY2FuIHVzZSB0aGUgYGRhdGEtZi1mb3JlYWNoYCBhdHRyaWJ1dGUgdG8gbmFtZSB0aGUgdmFyaWFibGUsIHRoZW4gdXNlIHRlbXBsYXRlcyB0byBhY2Nlc3MgaXRzIGluZGV4IGFuZCB2YWx1ZSBmb3IgZGlzcGxheS4gKFRlbXBsYXRlcyBhcmUgYXZhaWxhYmxlIGFzIHBhcnQgb2YgRmxvdy5qcydzIGxvZGFzaCBkZXBlbmRlbmN5LiBTZWUgbW9yZSBiYWNrZ3JvdW5kIG9uIFt3b3JraW5nIHdpdGggdGVtcGxhdGVzXSguLi8uLi8uLi8uLi8uLi8jdGVtcGxhdGVzKS4pXG4gKlxuICogKipUbyBkaXNwbGF5IGEgRE9NIGVsZW1lbnQgYmFzZWQgb24gYW4gYXJyYXkgdmFyaWFibGUgZnJvbSB0aGUgbW9kZWw6KipcbiAqXG4gKiAxLiBBZGQgdGhlIGBkYXRhLWYtZm9yZWFjaGAgYXR0cmlidXRlIHRvIGFueSBIVE1MIGVsZW1lbnQgdGhhdCBoYXMgcmVwZWF0ZWQgc3ViLWVsZW1lbnRzLiBUaGUgdHdvIG1vc3QgY29tbW9uIGV4YW1wbGVzIGFyZSBsaXN0cyBhbmQgdGFibGVzLlxuICogMi4gU2V0IHRoZSB2YWx1ZSBvZiB0aGUgYGRhdGEtZi1mb3JlYWNoYCBhdHRyaWJ1dGUgaW4geW91ciB0b3AtbGV2ZWwgSFRNTCBlbGVtZW50IHRvIHRoZSBuYW1lIG9mIHRoZSBhcnJheSB2YXJpYWJsZS5cbiAqIDMuIEFkZCB0aGUgSFRNTCBpbiB3aGljaCB0aGUgdmFsdWUgb2YgeW91ciBhcnJheSB2YXJpYWJsZSBzaG91bGQgYXBwZWFyLlxuICogNC4gT3B0aW9uYWxseSwgaW5zaWRlIHRoZSBpbm5lciBIVE1MIGVsZW1lbnQsIHVzZSB0ZW1wbGF0ZXMgKGA8JT0gJT5gKSB0byByZWZlcmVuY2UgdGhlIGBpbmRleGAgKGZvciBhcnJheXMpIG9yIGBrZXlgIChmb3Igb2JqZWN0cykgYW5kIGB2YWx1ZWAgdG8gZGlzcGxheS4gVGhlIGBpbmRleGAsIGBrZXlgLCBhbmQgYHZhbHVlYCBhcmUgc3BlY2lhbCB2YXJpYWJsZXMgdGhhdCBGbG93LmpzIHBvcHVsYXRlcyBmb3IgeW91LlxuICpcbiAqXG4gKiAqKkV4YW1wbGVzOioqXG4gKlxuICogQnkgZGVmYXVsdCAmbWRhc2g7IHRoYXQgaXMsIGlmIHlvdSBkbyBub3QgaW5jbHVkZSB0ZW1wbGF0ZXMgaW4geW91ciBIVE1MICZtZGFzaDsgdGhlIGB2YWx1ZWAgb2YgdGhlIGFycmF5IGVsZW1lbnQgb3Igb2JqZWN0IGZpZWxkIGFwcGVhcnM6XG4gKlxuICogICAgICA8IS0tIHRoZSBtb2RlbCB2YXJpYWJsZSBUaW1lIGlzIGFuIGFycmF5IG9mIHllYXJzXG4gKiAgICAgICAgICBjcmVhdGUgYSBsaXN0IHRoYXQgc2hvd3Mgd2hpY2ggeWVhciAtLT5cbiAqXG4gKiAgICAgIDx1bCBkYXRhLWYtZm9yZWFjaD1cIlRpbWVcIj5cbiAqICAgICAgICAgIDxsaT48L2xpPlxuICogICAgICA8L3VsPlxuICpcbiAqIEluIHRoZSB0aGlyZCBzdGVwIG9mIHRoZSBtb2RlbCwgdGhpcyBleGFtcGxlIGdlbmVyYXRlczpcbiAqXG4gKiAgICAgICogMjAxNVxuICogICAgICAqIDIwMTZcbiAqICAgICAgKiAyMDE3XG4gKlxuICogT3B0aW9uYWxseSwgeW91IGNhbiB1c2UgdGVtcGxhdGVzIChgPCU9ICU+YCkgdG8gcmVmZXJlbmNlIHRoZSBgaW5kZXhgIGFuZCBgdmFsdWVgIG9mIHRoZSBhcnJheSBlbGVtZW50IHRvIGRpc3BsYXkuXG4gKlxuICpcbiAqICAgICAgPCEtLSB0aGUgbW9kZWwgdmFyaWFibGUgVGltZSBpcyBhbiBhcnJheSBvZiB5ZWFyc1xuICogICAgICAgICAgY3JlYXRlIGEgbGlzdCB0aGF0IHNob3dzIHdoaWNoIHllYXIgLS0+XG4gKlxuICogICAgICA8dWwgZGF0YS1mLWZvcmVhY2g9XCJUaW1lXCI+XG4gKiAgICAgICAgICA8bGk+IFllYXIgPCU9IGluZGV4ICU+OiA8JT0gdmFsdWUgJT4gPC9saT5cbiAqICAgICAgPC91bD5cbiAqXG4gKiBJbiB0aGUgdGhpcmQgc3RlcCBvZiB0aGUgbW9kZWwsIHRoaXMgZXhhbXBsZSBnZW5lcmF0ZXM6XG4gKlxuICogICAgICAqIFllYXIgMTogMjAxNVxuICogICAgICAqIFllYXIgMjogMjAxNlxuICogICAgICAqIFllYXIgMzogMjAxN1xuICpcbiAqIEFzIHdpdGggb3RoZXIgYGRhdGEtZi1gIGF0dHJpYnV0ZXMsIHlvdSBjYW4gc3BlY2lmeSBbY29udmVydGVyc10oLi4vLi4vLi4vLi4vLi4vY29udmVydGVyLW92ZXJ2aWV3KSB0byBjb252ZXJ0IGRhdGEgZnJvbSBvbmUgZm9ybSB0byBhbm90aGVyOlxuICpcbiAqICAgICAgPHVsIGRhdGEtZi1mb3JlYWNoPVwiU2FsZXMgfCAkeCx4eHhcIj5cbiAqICAgICAgICAgIDxsaT4gWWVhciA8JT0gaW5kZXggJT46IFNhbGVzIG9mIDwlPSB2YWx1ZSAlPiA8L2xpPlxuICogICAgICA8L3VsPlxuICpcbiAqXG4gKiAqKk5vdGVzOioqXG4gKlxuICogKiBZb3UgY2FuIHVzZSB0aGUgYGRhdGEtZi1mb3JlYWNoYCBhdHRyaWJ1dGUgd2l0aCBib3RoIGFycmF5cyBhbmQgb2JqZWN0cy4gSWYgdGhlIG1vZGVsIHZhcmlhYmxlIGlzIGFuIG9iamVjdCwgcmVmZXJlbmNlIHRoZSBga2V5YCBpbnN0ZWFkIG9mIHRoZSBgaW5kZXhgIGluIHlvdXIgdGVtcGxhdGVzLlxuICogKiBUaGUgYGtleWAsIGBpbmRleGAsIGFuZCBgdmFsdWVgIGFyZSBzcGVjaWFsIHZhcmlhYmxlcyB0aGF0IEZsb3cuanMgcG9wdWxhdGVzIGZvciB5b3UuXG4gKiAqIFRoZSB0ZW1wbGF0ZSBzeW50YXggaXMgdG8gZW5jbG9zZSBlYWNoIGtleXdvcmQgKGBpbmRleGAsIGBrZXlgLCBgdmFyaWFibGVgKSBpbiBgPCU9YCBhbmQgYCU+YC4gVGVtcGxhdGVzIGFyZSBhdmFpbGFibGUgYXMgcGFydCBvZiBGbG93LmpzJ3MgbG9kYXNoIGRlcGVuZGVuY3kuIFNlZSBtb3JlIGJhY2tncm91bmQgb24gW3dvcmtpbmcgd2l0aCB0ZW1wbGF0ZXNdKC4uLy4uLy4uLy4uLy4uLyN0ZW1wbGF0ZXMpLlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG52YXIgcGFyc2VVdGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uL3V0aWxzL3BhcnNlLXV0aWxzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRlc3Q6ICdmb3JlYWNoJyxcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgdmFsdWUgPSAoJC5pc1BsYWluT2JqZWN0KHZhbHVlKSA/IHZhbHVlIDogW10uY29uY2F0KHZhbHVlKSk7XG4gICAgICAgIHZhciAkbG9vcFRlbXBsYXRlID0gdGhpcy5kYXRhKCdmb3JlYWNoLXRlbXBsYXRlJyk7XG4gICAgICAgIGlmICghJGxvb3BUZW1wbGF0ZSkge1xuICAgICAgICAgICAgJGxvb3BUZW1wbGF0ZSA9IHRoaXMuY2hpbGRyZW4oKTtcbiAgICAgICAgICAgIHRoaXMuZGF0YSgnZm9yZWFjaC10ZW1wbGF0ZScsICRsb29wVGVtcGxhdGUpO1xuICAgICAgICB9XG4gICAgICAgIHZhciAkbWUgPSB0aGlzLmVtcHR5KCk7XG4gICAgICAgIF8uZWFjaCh2YWx1ZSwgZnVuY3Rpb24gKGRhdGF2YWwsIGRhdGFrZXkpIHtcbiAgICAgICAgICAgIGRhdGF2YWwgPSBkYXRhdmFsICsgJyc7XG4gICAgICAgICAgICB2YXIgbm9kZXMgPSAkbG9vcFRlbXBsYXRlLmNsb25lKCk7XG4gICAgICAgICAgICBub2Rlcy5lYWNoKGZ1bmN0aW9uIChpLCBuZXdOb2RlKSB7XG4gICAgICAgICAgICAgICAgbmV3Tm9kZSA9ICQobmV3Tm9kZSk7XG4gICAgICAgICAgICAgICAgXy5lYWNoKG5ld05vZGUuZGF0YSgpLCBmdW5jdGlvbiAodmFsLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBsYXRlZCA9ICBfLnRlbXBsYXRlKHZhbCwgeyB2YWx1ZTogZGF0YXZhbCwgaW5kZXg6IGRhdGFrZXksIGtleTogZGF0YWtleSB9KTtcbiAgICAgICAgICAgICAgICAgICAgbmV3Tm9kZS5kYXRhKGtleSwgcGFyc2VVdGlscy50b0ltcGxpY2l0VHlwZSh0ZW1wbGF0ZWQpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB2YXIgb2xkSFRNTCA9IG5ld05vZGUuaHRtbCgpO1xuICAgICAgICAgICAgICAgIHZhciBjbGVhbmVkSFRNTCA9IG9sZEhUTUwucmVwbGFjZSgvJmx0Oy9nLCAnPCcpLnJlcGxhY2UoLyZndDsvZywgJz4nKTtcbiAgICAgICAgICAgICAgICB2YXIgdGVtcGxhdGVkID0gXy50ZW1wbGF0ZShjbGVhbmVkSFRNTCwgeyB2YWx1ZTogZGF0YXZhbCwga2V5OiBkYXRha2V5LCBpbmRleDogZGF0YWtleSB9KTtcbiAgICAgICAgICAgICAgICBpZiAoY2xlYW5lZEhUTUwgPT09IHRlbXBsYXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBuZXdOb2RlLmh0bWwoZGF0YXZhbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3Tm9kZS5odG1sKHRlbXBsYXRlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRtZS5hcHBlbmQobmV3Tm9kZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgQmluZGluZyBmb3IgZGF0YS1mLVtib29sZWFuXVxuICpcbiAqIEZsb3cuanMgcHJvdmlkZXMgc3BlY2lhbCBoYW5kbGluZyBmb3IgSFRNTCBhdHRyaWJ1dGVzIHRoYXQgdGFrZSBCb29sZWFuIHZhbHVlcy5cbiAqXG4gKiBJbiBwYXJ0aWN1bGFyLCBmb3IgbW9zdCBIVE1MIGF0dHJpYnV0ZXMgdGhhdCBleHBlY3QgQm9vbGVhbiB2YWx1ZXMsIHRoZSBhdHRyaWJ1dGUgaXMgZGlyZWN0bHkgc2V0IHRvIHRoZSB2YWx1ZSBvZiB0aGUgbW9kZWwgdmFyaWFibGUuIFRoaXMgaXMgdHJ1ZSBmb3IgYGNoZWNrZWRgLCBgc2VsZWN0ZWRgLCBgYXN5bmNgLCBgYXV0b2ZvY3VzYCwgYGF1dG9wbGF5YCwgYGNvbnRyb2xzYCwgYGRlZmVyYCwgYGlzbWFwYCwgYGxvb3BgLCBgbXVsdGlwbGVgLCBgb3BlbmAsIGByZXF1aXJlZGAsIGFuZCBgc2NvcGVkYC5cbiAqXG4gKiBIb3dldmVyLCB0aGVyZSBhcmUgYSBmZXcgbm90YWJsZSBleGNlcHRpb25zLiBGb3IgdGhlIEhUTUwgYXR0cmlidXRlcyBgZGlzYWJsZWRgLCBgaGlkZGVuYCwgYW5kIGByZWFkb25seWAsIHRoZSBhdHRyaWJ1dGUgaXMgc2V0IHRvIHRoZSAqb3Bwb3NpdGUqIG9mIHRoZSB2YWx1ZSBvZiB0aGUgbW9kZWwgdmFyaWFibGUuIFRoaXMgbWFrZXMgdGhlIHJlc3VsdGluZyBIVE1MIGVhc2llciB0byByZWFkLlxuICpcbiAqICoqRXhhbXBsZSoqXG4gKlxuICogICAgICA8IS0tIHRoaXMgY2hlY2tib3ggaXMgQ0hFQ0tFRCB3aGVuIHNhbXBsZUJvb2wgaXMgVFJVRSxcbiAqICAgICAgICAgICBhbmQgVU5DSEVDS0VEIHdoZW4gc2FtcGxlQm9vbCBpcyBGQUxTRSAtLT5cbiAqICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGRhdGEtZi1jaGVja2VkPVwic2FtcGxlQm9vbFwiIC8+XG4gKlxuICogICAgICA8IS0tIHRoaXMgYnV0dG9uIGlzIEVOQUJMRUQgd2hlbiBzYW1wbGVCb29sIGlzIFRSVUUsXG4gKiAgICAgICAgICAgYW5kIERJU0FCTEVEIHdoZW4gc2FtcGxlQm9vbCBpcyBGQUxTRSAtLT5cbiAqICAgICAgPGJ1dHRvbiBkYXRhLWYtZGlzYWJsZWQ9XCJzYW1wbGVCb29sXCI+Q2xpY2sgTWU8L2J1dHRvbj5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogL14oPzpkaXNhYmxlZHxoaWRkZW58cmVhZG9ubHkpJC9pLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcm9wKHByb3AsICF2YWx1ZSk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgTm8tb3AgQXR0cmlidXRlc1xuICpcbiAqIEZsb3cuanMgcHJvdmlkZXMgc3BlY2lhbCBoYW5kbGluZyBmb3IgYm90aCBgZGF0YS1mLW1vZGVsYCAoZGVzY3JpYmVkIFtoZXJlXSguLi8uLi8uLi8uLi8jdXNpbmdfaW5fcHJvamVjdCkpIGFuZCBgZGF0YS1mLWNvbnZlcnRgIChkZXNjcmliZWQgW2hlcmVdKC4uLy4uLy4uLy4uL2NvbnZlcnRlci1vdmVydmlldy8pKS4gRm9yIHRoZXNlIGF0dHJpYnV0ZXMsIHRoZSBkZWZhdWx0IGJlaGF2aW9yIGlzIHRvIGRvIG5vdGhpbmcsIHNvIHRoYXQgdGhpcyBhZGRpdGlvbmFsIHNwZWNpYWwgaGFuZGxpbmcgY2FuIHRha2UgcHJlY2VuZGVuY2UuXG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLy8gQXR0cmlidXRlcyB3aGljaCBhcmUganVzdCBwYXJhbWV0ZXJzIHRvIG90aGVycyBhbmQgY2FuIGp1c3QgYmUgaWdub3JlZFxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IC9eKD86bW9kZWx8Y29udmVydCkkL2ksXG5cbiAgICBoYW5kbGU6ICQubm9vcCxcblxuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG4iLCIvKipcbiAqICMjIEJpbmRpbmcgZm9yIGRhdGEtZi1bYm9vbGVhbl1cbiAqXG4gKiBGbG93LmpzIHByb3ZpZGVzIHNwZWNpYWwgaGFuZGxpbmcgZm9yIEhUTUwgYXR0cmlidXRlcyB0aGF0IHRha2UgQm9vbGVhbiB2YWx1ZXMuXG4gKlxuICogSW4gcGFydGljdWxhciwgZm9yIG1vc3QgSFRNTCBhdHRyaWJ1dGVzIHRoYXQgZXhwZWN0IEJvb2xlYW4gdmFsdWVzLCB0aGUgYXR0cmlidXRlIGlzIGRpcmVjdGx5IHNldCB0byB0aGUgdmFsdWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlLiBUaGlzIGlzIHRydWUgZm9yIGBjaGVja2VkYCwgYHNlbGVjdGVkYCwgYGFzeW5jYCwgYGF1dG9mb2N1c2AsIGBhdXRvcGxheWAsIGBjb250cm9sc2AsIGBkZWZlcmAsIGBpc21hcGAsIGBsb29wYCwgYG11bHRpcGxlYCwgYG9wZW5gLCBgcmVxdWlyZWRgLCBhbmQgYHNjb3BlZGAuXG4gKlxuICogSG93ZXZlciwgdGhlcmUgYXJlIGEgZmV3IG5vdGFibGUgZXhjZXB0aW9ucy4gRm9yIHRoZSBIVE1MIGF0dHJpYnV0ZXMgYGRpc2FibGVkYCwgYGhpZGRlbmAsIGFuZCBgcmVhZG9ubHlgLCB0aGUgYXR0cmlidXRlIGlzIHNldCB0byB0aGUgKm9wcG9zaXRlKiBvZiB0aGUgdmFsdWUgb2YgdGhlIG1vZGVsIHZhcmlhYmxlLiBUaGlzIG1ha2VzIHRoZSByZXN1bHRpbmcgSFRNTCBlYXNpZXIgdG8gcmVhZC5cbiAqXG4gKiAqKkV4YW1wbGUqKlxuICpcbiAqICAgICAgPCEtLSB0aGlzIGNoZWNrYm94IGlzIENIRUNLRUQgd2hlbiBzYW1wbGVCb29sIGlzIFRSVUUsXG4gKiAgICAgICAgICAgYW5kIFVOQ0hFQ0tFRCB3aGVuIHNhbXBsZUJvb2wgaXMgRkFMU0UgLS0+XG4gKiAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBkYXRhLWYtY2hlY2tlZD1cInNhbXBsZUJvb2xcIiAvPlxuICpcbiAqICAgICAgPCEtLSB0aGlzIGJ1dHRvbiBpcyBFTkFCTEVEIHdoZW4gc2FtcGxlQm9vbCBpcyBUUlVFLFxuICogICAgICAgICAgIGFuZCBESVNBQkxFRCB3aGVuIHNhbXBsZUJvb2wgaXMgRkFMU0UgLS0+XG4gKiAgICAgIDxidXR0b24gZGF0YS1mLWRpc2FibGVkPVwic2FtcGxlQm9vbFwiPkNsaWNrIE1lPC9idXR0b24+XG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/OmNoZWNrZWR8c2VsZWN0ZWR8YXN5bmN8YXV0b2ZvY3VzfGF1dG9wbGF5fGNvbnRyb2xzfGRlZmVyfGlzbWFwfGxvb3B8bXVsdGlwbGV8b3BlbnxyZXF1aXJlZHxzY29wZWQpJC9pLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgLypqc2xpbnQgZXFlcTogdHJ1ZSovXG4gICAgICAgIHZhciB2YWwgPSAodGhpcy5hdHRyKCd2YWx1ZScpKSA/ICh2YWx1ZSA9PSB0aGlzLnByb3AoJ3ZhbHVlJykpIDogISF2YWx1ZTtcbiAgICAgICAgdGhpcy5wcm9wKHByb3AsIHZhbCk7XG4gICAgfVxufTtcbiIsIi8qKlxuICogIyMgRE9NIE1hbmFnZXJcbiAqXG4gKiBUaGUgRmxvdy5qcyBET00gTWFuYWdlciBwcm92aWRlcyB0d28td2F5IGRhdGEgYmluZGluZ3MgZnJvbSB5b3VyIHByb2plY3QncyB1c2VyIGludGVyZmFjZSB0byB0aGUgY2hhbm5lbC4gVGhlIERPTSBNYW5hZ2VyIGlzIHRoZSAnZ2x1ZScgdGhyb3VnaCB3aGljaCBIVE1MIERPTSBlbGVtZW50cyAtLSBpbmNsdWRpbmcgdGhlIGF0dHJpYnV0ZXMgYW5kIGF0dHJpYnV0ZSBoYW5kbGVycyBwcm92aWRlZCBieSBGbG93LmpzIGZvciBbdmFyaWFibGVzXSguLi8uLi9hdHRyaWJ1dGVzLW92ZXJ2aWV3LyksIFtvcGVyYXRpb25zXSguLi8uLi9vcGVyYXRpb25zLW92ZXJ2aWV3LykgYW5kIFtjb252ZXJzaW9uXSguLi8uLi9jb252ZXJ0ZXItb3ZlcnZpZXcvKSwgYW5kIHRob3NlIFt5b3UgY3JlYXRlXSguL2F0dHJpYnV0ZXMvYXR0cmlidXRlLW1hbmFnZXIvKSAtLSBhcmUgYm91bmQgdG8gdGhlIHZhcmlhYmxlIGFuZCBvcGVyYXRpb25zIFtjaGFubmVsc10oLi4vLi4vY2hhbm5lbC1vdmVydmlldy8pIHRvIGxpbmsgdGhlbSB3aXRoIHlvdXIgcHJvamVjdCdzIG1vZGVsLiBTZWUgdGhlIFtFcGljZW50ZXIgYXJjaGl0ZWN0dXJlIGRldGFpbHNdKC4uLy4uLy4uL2NyZWF0aW5nX3lvdXJfaW50ZXJmYWNlL2FyY2hfZGV0YWlscy8pIGZvciBhIHZpc3VhbCBkZXNjcmlwdGlvbiBvZiBob3cgdGhlIERPTSBNYW5hZ2VyIHJlbGF0ZXMgdG8gdGhlIFtyZXN0IG9mIHRoZSBFcGljZW50ZXIgc3RhY2tdKC4uLy4uLy4uL2NyZWF0aW5nX3lvdXJfaW50ZXJmYWNlLykuXG4gKlxuICogVGhlIERPTSBNYW5hZ2VyIGlzIGFuIGludGVncmFsIHBhcnQgb2YgdGhlIEZsb3cuanMgYXJjaGl0ZWN0dXJlIGJ1dCwgaW4ga2VlcGluZyB3aXRoIG91ciBnZW5lcmFsIHBoaWxvc29waHkgb2YgZXh0ZW5zaWJpbGl0eSBhbmQgY29uZmlndXJhYmlsaXR5LCBpdCBpcyBhbHNvIHJlcGxhY2VhYmxlLiBGb3IgaW5zdGFuY2UsIGlmIHlvdSB3YW50IHRvIG1hbmFnZSB5b3VyIERPTSBzdGF0ZSB3aXRoIFtCYWNrYm9uZSBWaWV3c10oaHR0cDovL2JhY2tib25lanMub3JnKSBvciBbQW5ndWxhci5qc10oaHR0cHM6Ly9hbmd1bGFyanMub3JnKSwgd2hpbGUgc3RpbGwgdXNpbmcgdGhlIGNoYW5uZWxzIHRvIGhhbmRsZSB0aGUgY29tbXVuaWNhdGlvbiB3aXRoIHlvdXIgbW9kZWwsIHRoaXMgaXMgdGhlIHBpZWNlIHlvdSdkIHJlcGxhY2UuIFtDb250YWN0IHVzXShodHRwOi8vZm9yaW8uY29tL2Fib3V0L2NvbnRhY3QvKSBpZiB5b3UgYXJlIGludGVyZXN0ZWQgaW4gZXh0ZW5kaW5nIEZsb3cuanMgaW4gdGhpcyB3YXkgLS0gd2UnbGwgYmUgaGFwcHkgdG8gdGFsayBhYm91dCBpdCBpbiBtb3JlIGRldGFpbC5cbiAqXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbiAgICB2YXIgbm9kZU1hbmFnZXIgPSByZXF1aXJlKCcuL25vZGVzL25vZGUtbWFuYWdlcicpO1xuICAgIHZhciBhdHRyTWFuYWdlciA9IHJlcXVpcmUoJy4vYXR0cmlidXRlcy9hdHRyaWJ1dGUtbWFuYWdlcicpO1xuICAgIHZhciBjb252ZXJ0ZXJNYW5hZ2VyID0gcmVxdWlyZSgnLi4vY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlcicpO1xuXG4gICAgdmFyIHBhcnNlVXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy9wYXJzZS11dGlscycpO1xuICAgIHZhciBkb21VdGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzL2RvbScpO1xuXG4gICAgdmFyIGF1dG9VcGRhdGVQbHVnaW4gPSByZXF1aXJlKCcuL3BsdWdpbnMvYXV0by11cGRhdGUtYmluZGluZ3MnKTtcblxuICAgIC8vSnF1ZXJ5IHNlbGVjdG9yIHRvIHJldHVybiBldmVyeXRoaW5nIHdoaWNoIGhhcyBhIGYtIHByb3BlcnR5IHNldFxuICAgICQuZXhwclsnOiddW2NvbmZpZy5wcmVmaXhdID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICB2YXIgJHRoaXMgPSAkKG9iaik7XG4gICAgICAgIHZhciBkYXRhcHJvcHMgPSBfLmtleXMoJHRoaXMuZGF0YSgpKTtcblxuICAgICAgICB2YXIgbWF0Y2ggPSBfLmZpbmQoZGF0YXByb3BzLCBmdW5jdGlvbiAoYXR0cikge1xuICAgICAgICAgICAgcmV0dXJuIChhdHRyLmluZGV4T2YoY29uZmlnLnByZWZpeCkgPT09IDApO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gISEobWF0Y2gpO1xuICAgIH07XG5cbiAgICAkLmV4cHJbJzonXS53ZWJjb21wb25lbnQgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmoubm9kZU5hbWUuaW5kZXhPZignLScpICE9PSAtMTtcbiAgICB9O1xuXG4gICAgdmFyIGdldE1hdGNoaW5nRWxlbWVudHMgPSBmdW5jdGlvbiAocm9vdCkge1xuICAgICAgICB2YXIgJHJvb3QgPSAkKHJvb3QpO1xuICAgICAgICB2YXIgbWF0Y2hlZEVsZW1lbnRzID0gJHJvb3QuZmluZCgnOicgKyBjb25maWcucHJlZml4KTtcbiAgICAgICAgaWYgKCRyb290LmlzKCc6JyArIGNvbmZpZy5wcmVmaXgpKSB7XG4gICAgICAgICAgICBtYXRjaGVkRWxlbWVudHMgPSBtYXRjaGVkRWxlbWVudHMuYWRkKCRyb290KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWF0Y2hlZEVsZW1lbnRzO1xuICAgIH07XG5cbiAgICB2YXIgZ2V0RWxlbWVudE9yRXJyb3IgPSBmdW5jdGlvbiAoZWxlbWVudCwgY29udGV4dCkge1xuICAgICAgICBpZiAoZWxlbWVudCBpbnN0YW5jZW9mICQpIHtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50LmdldCgwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWVsZW1lbnQgfHwgIWVsZW1lbnQubm9kZU5hbWUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoY29udGV4dCwgJ0V4cGVjdGVkIHRvIGdldCBET00gRWxlbWVudCwgZ290ICcsIGVsZW1lbnQpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGNvbnRleHQgKyAnOiBFeHBlY3RlZCB0byBnZXQgRE9NIEVsZW1lbnQsIGdvdCcgKyAodHlwZW9mIGVsZW1lbnQpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9O1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcblxuICAgICAgICBub2Rlczogbm9kZU1hbmFnZXIsXG4gICAgICAgIGF0dHJpYnV0ZXM6IGF0dHJNYW5hZ2VyLFxuICAgICAgICBjb252ZXJ0ZXJzOiBjb252ZXJ0ZXJNYW5hZ2VyLFxuICAgICAgICAvL3V0aWxzIGZvciB0ZXN0aW5nXG4gICAgICAgIHByaXZhdGU6IHtcbiAgICAgICAgICAgIG1hdGNoZWRFbGVtZW50czogW11cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogVW5iaW5kIHRoZSBlbGVtZW50OiB1bnN1YnNjcmliZSBmcm9tIGFsbCB1cGRhdGVzIG9uIHRoZSByZWxldmFudCBjaGFubmVscy5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtEb21FbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRvIHJlbW92ZSBmcm9tIHRoZSBkYXRhIGJpbmRpbmcuXG4gICAgICAgICAqIEBwYXJhbSB7Q2hhbm5lbEluc3RhbmNlfSBjaGFubmVsIChPcHRpb25hbCkgVGhlIGNoYW5uZWwgZnJvbSB3aGljaCB0byB1bnN1YnNjcmliZS4gRGVmYXVsdHMgdG8gdGhlIFt2YXJpYWJsZXMgY2hhbm5lbF0oLi4vY2hhbm5lbHMvdmFyaWFibGVzLWNoYW5uZWwvKS5cbiAgICAgICAgICovXG4gICAgICAgIHVuYmluZEVsZW1lbnQ6IGZ1bmN0aW9uIChlbGVtZW50LCBjaGFubmVsKSB7XG4gICAgICAgICAgICBpZiAoIWNoYW5uZWwpIHtcbiAgICAgICAgICAgICAgICBjaGFubmVsID0gdGhpcy5vcHRpb25zLmNoYW5uZWwudmFyaWFibGVzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxlbWVudCA9IGdldEVsZW1lbnRPckVycm9yKGVsZW1lbnQpO1xuICAgICAgICAgICAgdmFyICRlbCA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoISRlbC5pcygnOicgKyBjb25maWcucHJlZml4KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucHJpdmF0ZS5tYXRjaGVkRWxlbWVudHMgPSBfLndpdGhvdXQodGhpcy5wcml2YXRlLm1hdGNoZWRFbGVtZW50cywgZWxlbWVudCk7XG5cbiAgICAgICAgICAgIC8vRklYTUU6IGhhdmUgdG8gcmVhZGQgZXZlbnRzIHRvIGJlIGFibGUgdG8gcmVtb3ZlIHRoZW0uIFVnbHlcbiAgICAgICAgICAgIHZhciBIYW5kbGVyID0gbm9kZU1hbmFnZXIuZ2V0SGFuZGxlcigkZWwpO1xuICAgICAgICAgICAgdmFyIGggPSBuZXcgSGFuZGxlci5oYW5kbGUoe1xuICAgICAgICAgICAgICAgIGVsOiBlbGVtZW50XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChoLnJlbW92ZUV2ZW50cykge1xuICAgICAgICAgICAgICAgIGgucmVtb3ZlRXZlbnRzKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICQoZWxlbWVudC5hdHRyaWJ1dGVzKS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgbm9kZU1hcCkge1xuICAgICAgICAgICAgICAgIHZhciBhdHRyID0gbm9kZU1hcC5ub2RlTmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgd2FudGVkUHJlZml4ID0gJ2RhdGEtZi0nO1xuICAgICAgICAgICAgICAgIGlmIChhdHRyLmluZGV4T2Yod2FudGVkUHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKHdhbnRlZFByZWZpeCwgJycpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGVyID0gYXR0ck1hbmFnZXIuZ2V0SGFuZGxlcihhdHRyLCAkZWwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFuZGxlci5zdG9wTGlzdGVuaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyLnN0b3BMaXN0ZW5pbmcuY2FsbCgkZWwsIGF0dHIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBzdWJzaWQgPSAkZWwuZGF0YSgnZi1zdWJzY3JpcHRpb24taWQnKSB8fCBbXTtcbiAgICAgICAgICAgIF8uZWFjaChzdWJzaWQsIGZ1bmN0aW9uIChzdWJzKSB7XG4gICAgICAgICAgICAgICAgY2hhbm5lbC51bnN1YnNjcmliZShzdWJzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBCaW5kIHRoZSBlbGVtZW50OiBzdWJzY3JpYmUgZnJvbSB1cGRhdGVzIG9uIHRoZSByZWxldmFudCBjaGFubmVscy5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtEb21FbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRvIGFkZCB0byB0aGUgZGF0YSBiaW5kaW5nLlxuICAgICAgICAgKiBAcGFyYW0ge0NoYW5uZWxJbnN0YW5jZX0gY2hhbm5lbCAoT3B0aW9uYWwpIFRoZSBjaGFubmVsIHRvIHN1YnNjcmliZSB0by4gRGVmYXVsdHMgdG8gdGhlIFt2YXJpYWJsZXMgY2hhbm5lbF0oLi4vY2hhbm5lbHMvdmFyaWFibGVzLWNoYW5uZWwvKS5cbiAgICAgICAgICovXG4gICAgICAgIGJpbmRFbGVtZW50OiBmdW5jdGlvbiAoZWxlbWVudCwgY2hhbm5lbCkge1xuICAgICAgICAgICAgaWYgKCFjaGFubmVsKSB7XG4gICAgICAgICAgICAgICAgY2hhbm5lbCA9IHRoaXMub3B0aW9ucy5jaGFubmVsLnZhcmlhYmxlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsZW1lbnQgPSBnZXRFbGVtZW50T3JFcnJvcihlbGVtZW50KTtcbiAgICAgICAgICAgIHZhciAkZWwgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKCEkZWwuaXMoJzonICsgY29uZmlnLnByZWZpeCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIV8uY29udGFpbnModGhpcy5wcml2YXRlLm1hdGNoZWRFbGVtZW50cywgZWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzLnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vU2VuZCB0byBub2RlIG1hbmFnZXIgdG8gaGFuZGxlIHVpIGNoYW5nZXNcbiAgICAgICAgICAgIHZhciBIYW5kbGVyID0gbm9kZU1hbmFnZXIuZ2V0SGFuZGxlcigkZWwpO1xuICAgICAgICAgICAgbmV3IEhhbmRsZXIuaGFuZGxlKHtcbiAgICAgICAgICAgICAgICBlbDogZWxlbWVudFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBzdWJzY3JpYmUgPSBmdW5jdGlvbiAoY2hhbm5lbCwgdmFyc1RvQmluZCwgJGVsLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF2YXJzVG9CaW5kIHx8ICF2YXJzVG9CaW5kLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBzdWJzaWQgPSBjaGFubmVsLnN1YnNjcmliZSh2YXJzVG9CaW5kLCAkZWwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIHZhciBuZXdzdWJzID0gKCRlbC5kYXRhKCdmLXN1YnNjcmlwdGlvbi1pZCcpIHx8IFtdKS5jb25jYXQoc3Vic2lkKTtcbiAgICAgICAgICAgICAgICAkZWwuZGF0YSgnZi1zdWJzY3JpcHRpb24taWQnLCBuZXdzdWJzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBhdHRyQmluZGluZ3MgPSBbXTtcbiAgICAgICAgICAgIHZhciBub25CYXRjaGFibGVWYXJpYWJsZXMgPSBbXTtcbiAgICAgICAgICAgIC8vTk9URTogbG9vcGluZyB0aHJvdWdoIGF0dHJpYnV0ZXMgaW5zdGVhZCBvZiAuZGF0YSBiZWNhdXNlIC5kYXRhIGF1dG9tYXRpY2FsbHkgY2FtZWxjYXNlcyBwcm9wZXJ0aWVzIGFuZCBtYWtlIGl0IGhhcmQgdG8gcmV0cnZpZXZlXG4gICAgICAgICAgICAkKGVsZW1lbnQuYXR0cmlidXRlcykuZWFjaChmdW5jdGlvbiAoaW5kZXgsIG5vZGVNYXApIHtcbiAgICAgICAgICAgICAgICB2YXIgYXR0ciA9IG5vZGVNYXAubm9kZU5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGF0dHJWYWwgPSBub2RlTWFwLnZhbHVlO1xuXG4gICAgICAgICAgICAgICAgdmFyIHdhbnRlZFByZWZpeCA9ICdkYXRhLWYtJztcbiAgICAgICAgICAgICAgICBpZiAoYXR0ci5pbmRleE9mKHdhbnRlZFByZWZpeCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSh3YW50ZWRQcmVmaXgsICcnKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlciA9IGF0dHJNYW5hZ2VyLmdldEhhbmRsZXIoYXR0ciwgJGVsKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlzQmluZGFibGVBdHRyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhbmRsZXIgJiYgaGFuZGxlci5pbml0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc0JpbmRhYmxlQXR0ciA9IGhhbmRsZXIuaW5pdC5jYWxsKCRlbCwgYXR0ciwgYXR0clZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNCaW5kYWJsZUF0dHIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vQ29udmVydCBwaXBlcyB0byBjb252ZXJ0ZXIgYXR0cnNcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB3aXRoQ29udiA9IF8uaW52b2tlKGF0dHJWYWwuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3aXRoQ29udi5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0clZhbCA9IHdpdGhDb252LnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGVsLmRhdGEoJ2YtY29udmVydC0nICsgYXR0ciwgd2l0aENvbnYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYmluZGluZyA9IHsgYXR0cjogYXR0ciB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbW1hUmVnZXggPSAvLCg/IVteXFxbXSpcXF0pLztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRyVmFsLmluZGV4T2YoJzwlJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9Bc3N1bWUgaXQncyB0ZW1wbGF0ZWQgZm9yIGxhdGVyIHVzZVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGF0dHJWYWwuc3BsaXQoY29tbWFSZWdleCkubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YXJzVG9CaW5kID0gXy5pbnZva2UoYXR0clZhbC5zcGxpdChjb21tYVJlZ2V4KSwgJ3RyaW0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJzY3JpYmUoY2hhbm5lbCwgdmFyc1RvQmluZCwgJGVsLCB7IGJhdGNoOiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJpbmRpbmcudG9waWNzID0gdmFyc1RvQmluZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmluZGluZy50b3BpY3MgPSBbYXR0clZhbF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9uQmF0Y2hhYmxlVmFyaWFibGVzLnB1c2goYXR0clZhbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRyQmluZGluZ3MucHVzaChiaW5kaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJGVsLmRhdGEoJ2F0dHItYmluZGluZ3MnLCBhdHRyQmluZGluZ3MpO1xuICAgICAgICAgICAgaWYgKG5vbkJhdGNoYWJsZVZhcmlhYmxlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnc3Vic2NyaWJlJywgbm9uQmF0Y2hhYmxlVmFyaWFibGVzLCAkZWwuZ2V0KDApKVxuICAgICAgICAgICAgICAgIHN1YnNjcmliZShjaGFubmVsLCBub25CYXRjaGFibGVWYXJpYWJsZXMsICRlbCwgeyBiYXRjaDogZmFsc2UgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEJpbmQgYWxsIHByb3ZpZGVkIGVsZW1lbnRzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gIHtBcnJheXxqUXVlcnlTZWxlY3Rvcn0gZWxlbWVudHNUb0JpbmQgKE9wdGlvbmFsKSBJZiBub3QgcHJvdmlkZWQsIGJpbmRzIGFsbCBtYXRjaGluZyBlbGVtZW50cyB3aXRoaW4gZGVmYXVsdCByb290IHByb3ZpZGVkIGF0IGluaXRpYWxpemF0aW9uLlxuICAgICAgICAgKi9cbiAgICAgICAgYmluZEFsbDogZnVuY3Rpb24gKGVsZW1lbnRzVG9CaW5kKSB7XG4gICAgICAgICAgICBpZiAoIWVsZW1lbnRzVG9CaW5kKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudHNUb0JpbmQgPSBnZXRNYXRjaGluZ0VsZW1lbnRzKHRoaXMub3B0aW9ucy5yb290KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIV8uaXNBcnJheShlbGVtZW50c1RvQmluZCkpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50c1RvQmluZCA9IGdldE1hdGNoaW5nRWxlbWVudHMoZWxlbWVudHNUb0JpbmQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgLy9wYXJzZSB0aHJvdWdoIGRvbSBhbmQgZmluZCBldmVyeXRoaW5nIHdpdGggbWF0Y2hpbmcgYXR0cmlidXRlc1xuICAgICAgICAgICAgJC5lYWNoKGVsZW1lbnRzVG9CaW5kLCBmdW5jdGlvbiAoaW5kZXgsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBtZS5iaW5kRWxlbWVudC5jYWxsKG1lLCBlbGVtZW50LCBtZS5vcHRpb25zLmNoYW5uZWwudmFyaWFibGVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogVW5iaW5kIHByb3ZpZGVkIGVsZW1lbnRzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gIHtBcnJheX0gZWxlbWVudHNUb1VuYmluZCAoT3B0aW9uYWwpIElmIG5vdCBwcm92aWRlZCwgdW5iaW5kcyBldmVyeXRoaW5nLlxuICAgICAgICAgKi9cbiAgICAgICAgdW5iaW5kQWxsOiBmdW5jdGlvbiAoZWxlbWVudHNUb1VuYmluZCkge1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIGlmICghZWxlbWVudHNUb1VuYmluZCkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzVG9VbmJpbmQgPSB0aGlzLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJC5lYWNoKGVsZW1lbnRzVG9VbmJpbmQsIGZ1bmN0aW9uIChpbmRleCwgZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIG1lLnVuYmluZEVsZW1lbnQuY2FsbChtZSwgZWxlbWVudCwgbWUub3B0aW9ucy5jaGFubmVsLnZhcmlhYmxlcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogSW5pdGlhbGl6ZSB0aGUgRE9NIE1hbmFnZXIgdG8gd29yayB3aXRoIGEgcGFydGljdWxhciBIVE1MIGVsZW1lbnQgYW5kIGFsbCBlbGVtZW50cyB3aXRoaW4gdGhhdCByb290LiBEYXRhIGJpbmRpbmdzIGJldHdlZW4gaW5kaXZpZHVhbCBIVE1MIGVsZW1lbnRzIGFuZCB0aGUgbW9kZWwgdmFyaWFibGVzIHNwZWNpZmllZCBpbiB0aGUgYXR0cmlidXRlcyB3aWxsIGhhcHBlbiB2aWEgdGhlIGNoYW5uZWwuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIChPcHRpb25hbCkgT3ZlcnJpZGVzIGZvciB0aGUgZGVmYXVsdCBvcHRpb25zLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0aW9ucy5yb290IFRoZSByb290IEhUTUwgZWxlbWVudCBiZWluZyBtYW5hZ2VkIGJ5IHRoaXMgaW5zdGFuY2Ugb2YgdGhlIERPTSBNYW5hZ2VyLiBEZWZhdWx0cyB0byBgYm9keWAuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zLmNoYW5uZWwgVGhlIGNoYW5uZWwgdG8gY29tbXVuaWNhdGUgd2l0aC4gRGVmYXVsdHMgdG8gdGhlIENoYW5uZWwgTWFuYWdlciBmcm9tIFtFcGljZW50ZXIuanNdKC4uLy4uLy4uL2FwaV9hZGFwdGVycy8pLlxuICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuYXV0b0JpbmQgSWYgYHRydWVgIChkZWZhdWx0KSwgYW55IHZhcmlhYmxlcyBhZGRlZCB0byB0aGUgRE9NIGFmdGVyIGBGbG93LmluaXRpYWxpemUoKWAgaGFzIGJlZW4gY2FsbGVkIHdpbGwgYmUgYXV0b21hdGljYWxseSBwYXJzZWQsIGFuZCBzdWJzY3JpcHRpb25zIGFkZGVkIHRvIGNoYW5uZWxzLiBOb3RlLCB0aGlzIGRvZXMgbm90IHdvcmsgaW4gSUUgdmVyc2lvbnMgPCAxMS5cbiAgICAgICAgICovXG4gICAgICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUm9vdCBvZiB0aGUgZWxlbWVudCBmb3IgZmxvdy5qcyB0byBtYW5hZ2UgZnJvbS5cbiAgICAgICAgICAgICAgICAgKiBAdHlwZSB7U3RyaW5nfSBqUXVlcnkgc2VsZWN0b3JcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICByb290OiAnYm9keScsXG4gICAgICAgICAgICAgICAgY2hhbm5lbDogbnVsbCxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEFueSB2YXJpYWJsZXMgYWRkZWQgdG8gdGhlIERPTSBhZnRlciBgRmxvdy5pbml0aWFsaXplKClgIGhhcyBiZWVuIGNhbGxlZCB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgcGFyc2VkLCBhbmQgc3Vic2NyaXB0aW9ucyBhZGRlZCB0byBjaGFubmVscy4gTm90ZSwgdGhpcyBkb2VzIG5vdCB3b3JrIGluIElFIHZlcnNpb25zIDwgMTEuXG4gICAgICAgICAgICAgICAgICogQHR5cGUge0Jvb2xlYW59XG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgYXV0b0JpbmQ6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAkLmV4dGVuZChkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgICAgIHZhciBjaGFubmVsID0gZGVmYXVsdHMuY2hhbm5lbDtcblxuICAgICAgICAgICAgdGhpcy5vcHRpb25zID0gZGVmYXVsdHM7XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgJHJvb3QgPSAkKGRlZmF1bHRzLnJvb3QpO1xuICAgICAgICAgICAgJChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbWUuYmluZEFsbCgpO1xuICAgICAgICAgICAgICAgICRyb290LnRyaWdnZXIoJ2YuZG9tcmVhZHknKTtcblxuICAgICAgICAgICAgICAgIC8vQXR0YWNoIGxpc3RlbmVyc1xuICAgICAgICAgICAgICAgIC8vIExpc3RlbiBmb3IgY2hhbmdlcyB0byB1aSBhbmQgcHVibGlzaCB0byBhcGlcbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoY29uZmlnLmV2ZW50cy50cmlnZ2VyKS5vbihjb25maWcuZXZlbnRzLnRyaWdnZXIsIGZ1bmN0aW9uIChldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnNlZERhdGEgPSB7fTsgLy9pZiBub3QgYWxsIHN1YnNlcXVlbnQgbGlzdGVuZXJzIHdpbGwgZ2V0IHRoZSBtb2RpZmllZCBkYXRhXG5cbiAgICAgICAgICAgICAgICAgICAgdmFyICRlbCA9ICQoZXZ0LnRhcmdldCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhdHRyQ29udmVydGVycyA9ICBkb21VdGlscy5nZXRDb252ZXJ0ZXJzTGlzdCgkZWwsICdiaW5kJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGRhdGEsIGZ1bmN0aW9uICh2YWwsIGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5ID0ga2V5LnNwbGl0KCd8JylbMF0udHJpbSgpOyAvL2luIGNhc2UgdGhlIHBpcGUgZm9ybWF0dGluZyBzeW50YXggd2FzIHVzZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IGNvbnZlcnRlck1hbmFnZXIucGFyc2UodmFsLCBhdHRyQ29udmVydGVycyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZWREYXRhW2tleV0gPSBwYXJzZVV0aWxzLnRvSW1wbGljaXRUeXBlKHZhbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICRlbC50cmlnZ2VyKCdmLmNvbnZlcnQnLCB7IGJpbmQ6IHZhbCB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgY2hhbm5lbC52YXJpYWJsZXMucHVibGlzaChwYXJzZWREYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIExpc3RlbiBmb3IgY2hhbmdlcyBmcm9tIGFwaSBhbmQgdXBkYXRlIHVpXG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKGNvbmZpZy5ldmVudHMucmVhY3QpLm9uKGNvbmZpZy5ldmVudHMucmVhY3QsIGZ1bmN0aW9uIChldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZXZ0LnRhcmdldCwgZGF0YSwgXCJyb290IG9uXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgJGVsID0gJChldnQudGFyZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gJGVsLmRhdGEoJ2F0dHItYmluZGluZ3MnKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdG9jb252ZXJ0ID0ge307XG4gICAgICAgICAgICAgICAgICAgICQuZWFjaChkYXRhLCBmdW5jdGlvbiAodmFyaWFibGVOYW1lLCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGJpbmRpbmdzLCBmdW5jdGlvbiAoYmluZGluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfLmNvbnRhaW5zKGJpbmRpbmcudG9waWNzLCB2YXJpYWJsZU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChiaW5kaW5nLnRvcGljcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2NvbnZlcnRbYmluZGluZy5hdHRyXSA9IF8ucGljayhkYXRhLCBiaW5kaW5nLnRvcGljcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2NvbnZlcnRbYmluZGluZy5hdHRyXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAkZWwudHJpZ2dlcignZi5jb252ZXJ0JywgdG9jb252ZXJ0KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIGRhdGEgPSB7cHJvcHRvdXBkYXRlOiB2YWx1ZX0gfHwganVzdCBhIHZhbHVlIChhc3N1bWVzICdiaW5kJyBpZiBzbylcbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoJ2YuY29udmVydCcpLm9uKCdmLmNvbnZlcnQnLCBmdW5jdGlvbiAoZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkZWwgPSAkKGV2dC50YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29udmVydCA9IGZ1bmN0aW9uICh2YWwsIHByb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3AgPSBwcm9wLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXR0ckNvbnZlcnRlcnMgPSAgZG9tVXRpbHMuZ2V0Q29udmVydGVyc0xpc3QoJGVsLCBwcm9wKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGVyID0gYXR0ck1hbmFnZXIuZ2V0SGFuZGxlcihwcm9wLCAkZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnZlcnRlZFZhbHVlID0gY29udmVydGVyTWFuYWdlci5jb252ZXJ0KHZhbCwgYXR0ckNvbnZlcnRlcnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlci5oYW5kbGUuY2FsbCgkZWwsIGNvbnZlcnRlZFZhbHVlLCBwcm9wKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLmVhY2goZGF0YSwgY29udmVydCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb252ZXJ0KGRhdGEsICdiaW5kJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICRyb290Lm9mZignZi51aS5vcGVyYXRlJykub24oJ2YudWkub3BlcmF0ZScsIGZ1bmN0aW9uIChldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YSA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkYXRhKTsgLy9pZiBub3QgYWxsIHN1YnNlcXVlbnQgbGlzdGVuZXJzIHdpbGwgZ2V0IHRoZSBtb2RpZmllZCBkYXRhXG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaChkYXRhLm9wZXJhdGlvbnMsIGZ1bmN0aW9uIChvcG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgb3BuLnBhcmFtcyA9IF8ubWFwKG9wbi5wYXJhbXMsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVV0aWxzLnRvSW1wbGljaXRUeXBlKCQudHJpbSh2YWwpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjaGFubmVsLm9wZXJhdGlvbnMucHVibGlzaChkYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmIChtZS5vcHRpb25zLmF1dG9CaW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIGF1dG9VcGRhdGVQbHVnaW4oJHJvb3QuZ2V0KDApLCBtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuICQuZXh0ZW5kKHRoaXMsIHB1YmxpY0FQSSk7XG59KCkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZXh0ZW5kID0gZnVuY3Rpb24gKHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7XG4gICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgdmFyIGNoaWxkO1xuXG4gICAgLy8gVGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciB0aGUgbmV3IHN1YmNsYXNzIGlzIGVpdGhlciBkZWZpbmVkIGJ5IHlvdVxuICAgIC8vICh0aGUgXCJjb25zdHJ1Y3RvclwiIHByb3BlcnR5IGluIHlvdXIgYGV4dGVuZGAgZGVmaW5pdGlvbiksIG9yIGRlZmF1bHRlZFxuICAgIC8vIGJ5IHVzIHRvIHNpbXBseSBjYWxsIHRoZSBwYXJlbnQncyBjb25zdHJ1Y3Rvci5cbiAgICBpZiAocHJvdG9Qcm9wcyAmJiBfLmhhcyhwcm90b1Byb3BzLCAnY29uc3RydWN0b3InKSkge1xuICAgICAgICBjaGlsZCA9IHByb3RvUHJvcHMuY29uc3RydWN0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2hpbGQgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBwYXJlbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTsgfTtcbiAgICB9XG5cbiAgICAvLyBBZGQgc3RhdGljIHByb3BlcnRpZXMgdG8gdGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLCBpZiBzdXBwbGllZC5cbiAgICBfLmV4dGVuZChjaGlsZCwgcGFyZW50LCBzdGF0aWNQcm9wcyk7XG5cbiAgICAvLyBTZXQgdGhlIHByb3RvdHlwZSBjaGFpbiB0byBpbmhlcml0IGZyb20gYHBhcmVudGAsIHdpdGhvdXQgY2FsbGluZ1xuICAgIC8vIGBwYXJlbnRgJ3MgY29uc3RydWN0b3IgZnVuY3Rpb24uXG4gICAgdmFyIFN1cnJvZ2F0ZSA9IGZ1bmN0aW9uICgpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGNoaWxkOyB9O1xuICAgIFN1cnJvZ2F0ZS5wcm90b3R5cGUgPSBwYXJlbnQucHJvdG90eXBlO1xuICAgIGNoaWxkLnByb3RvdHlwZSA9IG5ldyBTdXJyb2dhdGUoKTtcblxuICAgIC8vIEFkZCBwcm90b3R5cGUgcHJvcGVydGllcyAoaW5zdGFuY2UgcHJvcGVydGllcykgdG8gdGhlIHN1YmNsYXNzLFxuICAgIC8vIGlmIHN1cHBsaWVkLlxuICAgIGlmIChwcm90b1Byb3BzKSB7XG4gICAgICAgIF8uZXh0ZW5kKGNoaWxkLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7XG4gICAgfVxuXG4gICAgLy8gU2V0IGEgY29udmVuaWVuY2UgcHJvcGVydHkgaW4gY2FzZSB0aGUgcGFyZW50J3MgcHJvdG90eXBlIGlzIG5lZWRlZFxuICAgIC8vIGxhdGVyLlxuICAgIGNoaWxkLl9fc3VwZXJfXyA9IHBhcmVudC5wcm90b3R5cGU7XG5cbiAgICByZXR1cm4gY2hpbGQ7XG59O1xuXG52YXIgVmlldyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdGhpcy4kZWwgPSAob3B0aW9ucy4kZWwpIHx8ICQob3B0aW9ucy5lbCk7XG4gICAgdGhpcy5lbCA9IG9wdGlvbnMuZWw7XG4gICAgdGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbn07XG5cbl8uZXh0ZW5kKFZpZXcucHJvdG90eXBlLCB7XG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge30sXG59KTtcblxuVmlldy5leHRlbmQgPSBleHRlbmQ7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldztcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi8uLi9jb25maWcnKTtcbnZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vZGVmYXVsdC1ub2RlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBwcm9wZXJ0eUhhbmRsZXJzOiBbXSxcblxuICAgIHVpQ2hhbmdlRXZlbnQ6ICdjaGFuZ2UnLFxuICAgIGdldFVJVmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsLnZhbCgpO1xuICAgIH0sXG5cbiAgICByZW1vdmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy4kZWwub2ZmKHRoaXMudWlDaGFuZ2VFdmVudCk7XG4gICAgfSxcblxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgdmFyIHByb3BOYW1lID0gdGhpcy4kZWwuZGF0YShjb25maWcuYmluZGVyQXR0cik7XG5cbiAgICAgICAgaWYgKHByb3BOYW1lKSB7XG4gICAgICAgICAgICB0aGlzLiRlbC5vZmYodGhpcy51aUNoYW5nZUV2ZW50KS5vbih0aGlzLnVpQ2hhbmdlRXZlbnQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsID0gbWUuZ2V0VUlWYWx1ZSgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgICAgIHBhcmFtc1twcm9wTmFtZV0gPSB2YWw7XG5cbiAgICAgICAgICAgICAgICBtZS4kZWwudHJpZ2dlcihjb25maWcuZXZlbnRzLnRyaWdnZXIsIHBhcmFtcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBCYXNlVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbn0sIHsgc2VsZWN0b3I6ICdpbnB1dCwgc2VsZWN0JyB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9iYXNlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBwcm9wZXJ0eUhhbmRsZXJzOiBbXG5cbiAgICBdLFxuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgIH1cbn0sIHsgc2VsZWN0b3I6ICcqJyB9KTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vZGVmYXVsdC1pbnB1dC1ub2RlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZVZpZXcuZXh0ZW5kKHtcblxuICAgIHByb3BlcnR5SGFuZGxlcnM6IFtcblxuICAgIF0sXG5cbiAgICBnZXRVSVZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciAkZWwgPSB0aGlzLiRlbDtcbiAgICAgICAgLy9UT0RPOiBmaWxlIGEgaXNzdWUgZm9yIHRoZSB2ZW5zaW0gbWFuYWdlciB0byBjb252ZXJ0IHRydWVzIHRvIDFzIGFuZCBzZXQgdGhpcyB0byB0cnVlIGFuZCBmYWxzZVxuXG4gICAgICAgIHZhciBvZmZWYWwgPSAgKCRlbC5kYXRhKCdmLW9mZicpICE9PSB1bmRlZmluZWQpID8gJGVsLmRhdGEoJ2Ytb2ZmJykgOiAwO1xuICAgICAgICAvL2F0dHIgPSBpbml0aWFsIHZhbHVlLCBwcm9wID0gY3VycmVudCB2YWx1ZVxuICAgICAgICB2YXIgb25WYWwgPSAoJGVsLmF0dHIoJ3ZhbHVlJykgIT09IHVuZGVmaW5lZCkgPyAkZWwucHJvcCgndmFsdWUnKTogMTtcblxuICAgICAgICB2YXIgdmFsID0gKCRlbC5pcygnOmNoZWNrZWQnKSkgPyBvblZhbCA6IG9mZlZhbDtcbiAgICAgICAgcmV0dXJuIHZhbDtcbiAgICB9LFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgQmFzZVZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG59LCB7IHNlbGVjdG9yOiAnOmNoZWNrYm94LDpyYWRpbycgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAoc2VsZWN0b3IsIGhhbmRsZXIpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgICAgIGhhbmRsZXIgPSB7XG4gICAgICAgICAgICBoYW5kbGU6IGhhbmRsZXJcbiAgICAgICAgfTtcbiAgICB9XG4gICAgaWYgKCFzZWxlY3Rvcikge1xuICAgICAgICBzZWxlY3RvciA9ICcqJztcbiAgICB9XG4gICAgaGFuZGxlci5zZWxlY3RvciA9IHNlbGVjdG9yO1xuICAgIHJldHVybiBoYW5kbGVyO1xufTtcblxudmFyIG1hdGNoID0gZnVuY3Rpb24gKHRvTWF0Y2gsIG5vZGUpIHtcbiAgICBpZiAoXy5pc1N0cmluZyh0b01hdGNoKSkge1xuICAgICAgICByZXR1cm4gdG9NYXRjaCA9PT0gbm9kZS5zZWxlY3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJCh0b01hdGNoKS5pcyhub2RlLnNlbGVjdG9yKTtcbiAgICB9XG59O1xuXG52YXIgbm9kZU1hbmFnZXIgPSB7XG4gICAgbGlzdDogW10sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgbm9kZSBoYW5kbGVyXG4gICAgICogQHBhcmFtICB7c3RyaW5nfSBzZWxlY3RvciBqUXVlcnktY29tcGF0aWJsZSBzZWxlY3RvciB0byB1c2UgdG8gbWF0Y2ggbm9kZXNcbiAgICAgKiBAcGFyYW0gIHtmdW5jdGlvbn0gaGFuZGxlciAgSGFuZGxlcnMgYXJlIG5ldy1hYmxlIGZ1bmN0aW9ucy4gVGhleSB3aWxsIGJlIGNhbGxlZCB3aXRoICRlbCBhcyBjb250ZXh0Lj8gVE9ETzogVGhpbmsgdGhpcyB0aHJvdWdoXG4gICAgICovXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChzZWxlY3RvciwgaGFuZGxlcikge1xuICAgICAgICB0aGlzLmxpc3QudW5zaGlmdChub3JtYWxpemUoc2VsZWN0b3IsIGhhbmRsZXIpKTtcbiAgICB9LFxuXG4gICAgZ2V0SGFuZGxlcjogZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICAgIHJldHVybiBfLmZpbmQodGhpcy5saXN0LCBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoKHNlbGVjdG9yLCBub2RlKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHJlcGxhY2U6IGZ1bmN0aW9uIChzZWxlY3RvciwgaGFuZGxlcikge1xuICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgIF8uZWFjaCh0aGlzLmxpc3QsIGZ1bmN0aW9uIChjdXJyZW50SGFuZGxlciwgaSkge1xuICAgICAgICAgICAgaWYgKHNlbGVjdG9yID09PSBjdXJyZW50SGFuZGxlci5zZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoc2VsZWN0b3IsIGhhbmRsZXIpKTtcbiAgICB9XG59O1xuXG4vL2Jvb3RzdHJhcHNcbnZhciBkZWZhdWx0SGFuZGxlcnMgPSBbXG4gICAgcmVxdWlyZSgnLi9pbnB1dC1jaGVja2JveC1ub2RlJyksXG4gICAgcmVxdWlyZSgnLi9kZWZhdWx0LWlucHV0LW5vZGUnKSxcbiAgICByZXF1aXJlKCcuL2RlZmF1bHQtbm9kZScpXG5dO1xuXy5lYWNoKGRlZmF1bHRIYW5kbGVycy5yZXZlcnNlKCksIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgbm9kZU1hbmFnZXIucmVnaXN0ZXIoaGFuZGxlci5zZWxlY3RvciwgaGFuZGxlcik7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBub2RlTWFuYWdlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodGFyZ2V0LCBkb21NYW5hZ2VyKSB7XG4gICAgaWYgKCF3aW5kb3cuTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGFuIG9ic2VydmVyIGluc3RhbmNlXG4gICAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKG11dGF0aW9ucykge1xuICAgICAgbXV0YXRpb25zLmZvckVhY2goZnVuY3Rpb24gKG11dGF0aW9uKSB7XG4gICAgICAgIHZhciBhZGRlZCA9ICQobXV0YXRpb24uYWRkZWROb2RlcykuZmluZCgnOmYnKTtcbiAgICAgICAgYWRkZWQgPSBhZGRlZC5hZGQoJChtdXRhdGlvbi5hZGRlZE5vZGVzKS5maWx0ZXIoJzpmJykpO1xuXG4gICAgICAgIHZhciByZW1vdmVkID0gJChtdXRhdGlvbi5yZW1vdmVkTm9kZXMpLmZpbmQoJzpmJyk7XG4gICAgICAgIHJlbW92ZWQgPSByZW1vdmVkLmFkZCgkKG11dGF0aW9uLnJlbW92ZWROb2RlcykuZmlsdGVyKCc6ZicpKTtcblxuICAgICAgICBpZiAoYWRkZWQgJiYgYWRkZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnbXV0YXRpb24gb2JzZXJ2ZXIgYWRkZWQnLCBhZGRlZC5nZXQoKSwgbXV0YXRpb24uYWRkZWROb2Rlcyk7XG4gICAgICAgICAgICBkb21NYW5hZ2VyLmJpbmRBbGwoYWRkZWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZW1vdmVkICYmIHJlbW92ZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnbXV0YXRpb24gb2JzZXJ2ZXIgcmVtb3ZlZCcsIHJlbW92ZWQpO1xuICAgICAgICAgICAgZG9tTWFuYWdlci51bmJpbmRBbGwocmVtb3ZlZCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdmFyIG11dGNvbmZpZyA9IHtcbiAgICAgICAgYXR0cmlidXRlczogZmFsc2UsXG4gICAgICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICAgICAgc3VidHJlZTogdHJ1ZSxcbiAgICAgICAgY2hhcmFjdGVyRGF0YTogZmFsc2VcbiAgICB9O1xuICAgIG9ic2VydmVyLm9ic2VydmUodGFyZ2V0LCBtdXRjb25maWcpO1xuICAgIC8vIExhdGVyLCB5b3UgY2FuIHN0b3Agb2JzZXJ2aW5nXG4gICAgLy8gb2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xufTtcbiIsIi8qKlxuICogIyMgRmxvdy5qcyBJbml0aWFsaXphdGlvblxuICpcbiAqIFRvIHVzZSBGbG93LmpzIGluIHlvdXIgcHJvamVjdCwgc2ltcGx5IGNhbGwgYEZsb3cuaW5pdGlhbGl6ZSgpYCBpbiB5b3VyIHVzZXIgaW50ZXJmYWNlLiBJbiB0aGUgYmFzaWMgY2FzZSwgYEZsb3cuaW5pdGlhbGl6ZSgpYCBjYW4gYmUgY2FsbGVkIHdpdGhvdXQgYW55IGFyZ3VtZW50cy4gV2hpbGUgRmxvdy5qcyBuZWVkcyB0byBrbm93IHRoZSBhY2NvdW50LCBwcm9qZWN0LCBhbmQgbW9kZWwgeW91IGFyZSB1c2luZywgYnkgZGVmYXVsdCB0aGVzZSB2YWx1ZXMgYXJlIGV4dHJhY3RlZCBmcm9tIHRoZSBVUkwgb2YgRXBpY2VudGVyIHByb2plY3QgYW5kIGJ5IHRoZSB1c2Ugb2YgYGRhdGEtZi1tb2RlbGAgaW4geW91ciBgPGJvZHk+YCB0YWcuIFNlZSBtb3JlIG9uIHRoZSBbYmFzaWNzIG9mIHVzaW5nIEZsb3cuanMgaW4geW91ciBwcm9qZWN0Ll0oLi4vLi4vI3VzaW5nX2luX3Byb2plY3QpLlxuICpcbiAqIEhvd2V2ZXIsIHNvbWV0aW1lcyB5b3Ugd2FudCB0byBiZSBleHBsaWNpdCBpbiB5b3VyIGluaXRpYWxpemF0aW9uIGNhbGwsIGFuZCB0aGVyZSBhcmUgYWxzbyBzb21lIGFkZGl0aW9uYWwgcGFyYW1ldGVycyB0aGF0IGxldCB5b3UgY3VzdG9taXplIHlvdXIgdXNlIG9mIEZsb3cuanMuXG4gKlxuICogIyMjI1BhcmFtZXRlcnNcbiAqXG4gKiBUaGUgcGFyYW1ldGVycyBmb3IgaW5pdGlhbGl6aW5nIEZsb3cuanMgaW5jbHVkZTpcbiAqXG4gKiAqIGBjaGFubmVsYCBDb25maWd1cmF0aW9uIGRldGFpbHMgZm9yIHRoZSBjaGFubmVsIEZsb3cuanMgdXNlcyBpbiBjb25uZWN0aW5nIHdpdGggdW5kZXJseWluZyBBUElzLlxuICogKiBgY2hhbm5lbC5zdHJhdGVneWAgVGhlIHJ1biBjcmVhdGlvbiBzdHJhdGVneSBkZXNjcmliZXMgd2hlbiB0byBjcmVhdGUgbmV3IHJ1bnMgd2hlbiBhbiBlbmQgdXNlciB2aXNpdHMgdGhpcyBwYWdlLiBUaGUgZGVmYXVsdCBpcyBgbmV3LWlmLXBlcnNpc3RlZGAsIHdoaWNoIGNyZWF0ZXMgYSBuZXcgcnVuIHdoZW4gdGhlIGVuZCB1c2VyIGlzIGlkbGUgZm9yIGxvbmdlciB0aGFuIHlvdXIgcHJvamVjdCdzICoqTW9kZWwgU2Vzc2lvbiBUaW1lb3V0KiogKGNvbmZpZ3VyZWQgaW4geW91ciBwcm9qZWN0J3MgW1NldHRpbmdzXSguLi8uLi8uLi91cGRhdGluZ195b3VyX3NldHRpbmdzLykpLCBidXQgb3RoZXJ3aXNlIHVzZXMgdGhlIGN1cnJlbnQgcnVuLi4gU2VlIG1vcmUgb24gW1J1biBTdHJhdGVnaWVzXSguLi8uLi8uLi9hcGlfYWRhcHRlcnMvc3RyYXRlZ3kvKS5cbiAqICogYGNoYW5uZWwucnVuYCBDb25maWd1cmF0aW9uIGRldGFpbHMgZm9yIGVhY2ggcnVuIGNyZWF0ZWQuXG4gKiAqIGBjaGFubmVsLnJ1bi5hY2NvdW50YCBUaGUgKipVc2VyIElEKiogb3IgKipUZWFtIElEKiogZm9yIHRoaXMgcHJvamVjdC4gQnkgZGVmYXVsdCwgdGFrZW4gZnJvbSB0aGUgVVJMIHdoZXJlIHRoZSB1c2VyIGludGVyZmFjZSBpcyBob3N0ZWQsIHNvIHlvdSBvbmx5IG5lZWQgdG8gc3VwcGx5IHRoaXMgaXMgeW91IGFyZSBydW5uaW5nIHlvdXIgcHJvamVjdCdzIHVzZXIgaW50ZXJmYWNlIFtvbiB5b3VyIG93biBzZXJ2ZXJdKC4uLy4uLy4uL2hvd190by9zZWxmX2hvc3RpbmcvKS5cbiAqICogYGNoYW5uZWwucnVuLnByb2plY3RgIFRoZSAqKlByb2plY3QgSUQqKiBmb3IgdGhpcyBwcm9qZWN0LlxuICogKiBgY2hhbm5lbC5ydW4ubW9kZWxgIE5hbWUgb2YgdGhlIHByaW1hcnkgbW9kZWwgZmlsZSBmb3IgdGhpcyBwcm9qZWN0LiBCeSBkZWZhdWx0LCB0YWtlbiBmcm9tIGBkYXRhLWYtbW9kZWxgIGluIHlvdXIgSFRNTCBgPGJvZHk+YCB0YWcuXG4gKiAqIGBjaGFubmVsLnJ1bi52YXJpYWJsZXNgIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIHZhcmlhYmxlcyBiZWluZyBsaXN0ZW5lZCB0byBvbiB0aGlzIGNoYW5uZWwuXG4gKiAqIGBjaGFubmVsLnJ1bi52YXJpYWJsZXMuc2lsZW50YCBQcm92aWRlcyBncmFudWxhciBjb250cm9sIG92ZXIgd2hlbiB1c2VyIGludGVyZmFjZSB1cGRhdGVzIGhhcHBlbiBmb3IgY2hhbmdlcyBvbiB0aGlzIGNoYW5uZWwuIFNlZSBiZWxvdyBmb3IgcG9zc2libGUgdmFsdWVzLlxuICogKiBgY2hhbm5lbC5ydW4udmFyaWFibGVzLmF1dG9GZXRjaGAgT3B0aW9ucyBmb3IgZmV0Y2hpbmcgdmFyaWFibGVzIGZyb20gdGhlIEFQSSBhcyB0aGV5J3JlIGJlaW5nIHN1YnNjcmliZWQuIFNlZSBbVmFyaWFibGVzIENoYW5uZWxdKC4uL2NoYW5uZWxzL3ZhcmlhYmxlcy1jaGFubmVsLykgZm9yIGRldGFpbHMuXG4gKiAqIGBjaGFubmVsLnJ1bi5vcGVyYXRpb25zYCBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBvcGVyYXRpb25zIGJlaW5nIGxpc3RlbmVkIHRvIG9uIHRoaXMgY2hhbm5lbC4gQ3VycmVudGx5IHRoZXJlIGlzIG9ubHkgb25lIGNvbmZpZ3VyYXRpb24gb3B0aW9uOiBgc2lsZW50YC5cbiAqICogYGNoYW5uZWwucnVuLm9wZXJhdGlvbnMuc2lsZW50YCBQcm92aWRlcyBncmFudWxhciBjb250cm9sIG92ZXIgd2hlbiB1c2VyIGludGVyZmFjZSB1cGRhdGVzIGhhcHBlbiBmb3IgY2hhbmdlcyBvbiB0aGlzIGNoYW5uZWwuIFNlZSBiZWxvdyBmb3IgcG9zc2libGUgdmFsdWVzLlxuICogKiBgY2hhbm5lbC5ydW4uc2VydmVyYCBPYmplY3Qgd2l0aCBhZGRpdGlvbmFsIHNlcnZlciBjb25maWd1cmF0aW9uLCBkZWZhdWx0cyB0byBgaG9zdDogJ2FwaS5mb3Jpby5jb20nYC5cbiAqICogYGNoYW5uZWwucnVuLnRyYW5zcG9ydGAgQW4gb2JqZWN0IHdoaWNoIHRha2VzIGFsbCBvZiB0aGUganF1ZXJ5LmFqYXggb3B0aW9ucyBhdCA8YSBocmVmPVwiaHR0cDovL2FwaS5qcXVlcnkuY29tL2pRdWVyeS5hamF4L1wiPmh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS9qUXVlcnkuYWpheC88L2E+LlxuICogKiBgZG9tYCBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBET00gd2hlcmUgdGhpcyBpbnN0YW5jZSBvZiBGbG93LmpzIGlzIGNyZWF0ZWQuXG4gKiAqIGBkb20ucm9vdGAgVGhlIHJvb3QgSFRNTCBlbGVtZW50IGJlaW5nIG1hbmFnZWQgYnkgdGhlIEZsb3cuanMgRE9NIE1hbmFnZXIuIERlZmF1bHRzIHRvIGBib2R5YC5cbiAqICogYGRvbS5hdXRvQmluZGAgSWYgYHRydWVgIChkZWZhdWx0KSwgYXV0b21hdGljYWxseSBwYXJzZSB2YXJpYWJsZXMgYWRkZWQgdG8gdGhlIERPTSBhZnRlciB0aGlzIGBGbG93LmluaXRpYWxpemUoKWAgY2FsbC4gTm90ZSwgdGhpcyBkb2VzIG5vdCB3b3JrIGluIElFIHZlcnNpb25zIDwgMTEuXG4gKlxuICogVGhlIGBzaWxlbnRgIGNvbmZpZ3VyYXRpb24gb3B0aW9uIGZvciB0aGUgYHJ1bi52YXJpYWJsZXNgIGFuZCBgcnVuLm9wZXJhdGlvbnNgIGlzIGEgZmxhZyBmb3IgcHJvdmlkaW5nIG1vcmUgZ3JhbnVsYXIgY29udHJvbCBvdmVyIHdoZW4gdXNlciBpbnRlcmZhY2UgdXBkYXRlcyBoYXBwZW4gZm9yIGNoYW5nZXMgb24gdGhpcyBjaGFubmVsLiBWYWx1ZXMgY2FuIGJlOlxuICpcbiAqICogYGZhbHNlYDogQWx3YXlzIHVwZGF0ZSB0aGUgVUkgZm9yIGFueSBjaGFuZ2VzICh2YXJpYWJsZXMgdXBkYXRlZCwgb3BlcmF0aW9ucyBjYWxsZWQpIG9uIHRoaXMgY2hhbm5lbC4gVGhpcyBpcyB0aGUgZGVmYXVsdCBiZWhhdmlvci5cbiAqICogYHRydWVgOiBOZXZlciB1cGRhdGUgdGhlIFVJIGZvciBhbnkgb24gY2hhbmdlcyAodmFyaWFibGVzIHVwZGF0ZWQsIG9wZXJhdGlvbnMgY2FsbGVkKSBvbiB0aGlzIGNoYW5uZWwuXG4gKiAqIEFycmF5IG9mIHZhcmlhYmxlcyBvciBvcGVyYXRpb25zIGZvciB3aGljaCB0aGUgVUkgKnNob3VsZCBub3QqIGJlIHVwZGF0ZWQuIEZvciBleGFtcGxlLCBgdmFyaWFibGVzOiB7IHNpbGVudDogWyAncHJpY2UnLCAnc2FsZXMnIF0gfWAgbWVhbnMgdGhpcyBjaGFubmVsIGlzIHNpbGVudCAobm8gdXBkYXRlcyBmb3IgdGhlIFVJKSB3aGVuIHRoZSB2YXJpYWJsZXMgJ3ByaWNlJyBvciAnc2FsZXMnIGNoYW5nZSwgYW5kIHRoZSBVSSBpcyBhbHdheXMgdXBkYXRlZCBmb3IgYW55IGNoYW5nZXMgdG8gb3RoZXIgdmFyaWFibGVzLiBUaGlzIGlzIHVzZWZ1bCBpZiB5b3Uga25vdyB0aGF0IGNoYW5naW5nICdwcmljZScgb3IgJ3NhbGVzJyBkb2VzIG5vdCBpbXBhY3QgYW55dGhpbmcgZWxzZSBpbiB0aGUgVUkgZGlyZWN0bHksIGZvciBpbnN0YW5jZS5cbiAqICogYGV4Y2VwdGA6IFdpdGggYXJyYXkgb2YgdmFyaWFibGVzIG9yIG9wZXJhdGlvbnMgZm9yIHdoaWNoIHRoZSBVSSAqc2hvdWxkKiBiZSB1cGRhdGVkLiBGb3IgZXhhbXBsZSwgYHZhcmlhYmxlcyB7IHNpbGVudDogeyBleGNlcHQ6IFsgJ3ByaWNlJywgJ3NhbGVzJyBdIH0gfWAgaXMgdGhlIGNvbnZlcnNlIG9mIHRoZSBhYm92ZS4gVGhlIFVJIGlzIGFsd2F5cyB1cGRhdGVkIHdoZW4gYW55dGhpbmcgb24gdGhpcyBjaGFubmVsIGNoYW5nZXMgKmV4Y2VwdCogd2hlbiB0aGUgdmFyaWFibGVzICdwcmljZScgb3IgJ3NhbGVzJyBhcmUgdXBkYXRlZC5cbiAqXG4gKiBBbHRob3VnaCBGbG93LmpzIHByb3ZpZGVzIGEgYmktZGlyZWN0aW9uYWwgYmluZGluZyBiZXR3ZWVuIHRoZSBtb2RlbCBhbmQgdGhlIHVzZXIgaW50ZXJmYWNlLCB0aGUgYHNpbGVudGAgY29uZmlndXJhdGlvbiBvcHRpb24gYXBwbGllcyBvbmx5IGZvciB0aGUgYmluZGluZyBmcm9tIHRoZSBtb2RlbCB0byB0aGUgdXNlciBpbnRlcmZhY2U7IHVwZGF0ZXMgaW4gdGhlIHVzZXIgaW50ZXJmYWNlIChpbmNsdWRpbmcgY2FsbHMgdG8gb3BlcmF0aW9ucykgYXJlIHN0aWxsIHNlbnQgdG8gdGhlIG1vZGVsLlxuICpcbiAqIFRoZSBgRmxvdy5pbml0aWFsaXplKClgIGNhbGwgaXMgYmFzZWQgb24gdGhlIEVwaWNlbnRlci5qcyBbUnVuIFNlcnZpY2VdKC4uLy4uLy4uL2FwaV9hZGFwdGVycy9nZW5lcmF0ZWQvcnVuLWFwaS1zZXJ2aWNlLykgZnJvbSB0aGUgW0FQSSBBZGFwdGVyc10oLi4vLi4vLi4vYXBpX2FkYXB0ZXJzLykuIFNlZSB0aG9zZSBwYWdlcyBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiBvbiBwYXJhbWV0ZXJzLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgICBGbG93LmluaXRpYWxpemUoe1xuICogICAgICAgICAgY2hhbm5lbDoge1xuICogICAgICAgICAgICAgIHN0cmF0ZWd5OiAnbmV3LWlmLXBlcnNpc3RlZCcsXG4gKiAgICAgICAgICAgICAgcnVuOiB7XG4gKiAgICAgICAgICAgICAgICAgIG1vZGVsOiAnc3VwcGx5LWNoYWluLWdhbWUucHknLFxuICogICAgICAgICAgICAgICAgICBhY2NvdW50OiAnYWNtZS1zaW11bGF0aW9ucycsXG4gKiAgICAgICAgICAgICAgICAgIHByb2plY3Q6ICdzdXBwbHktY2hhaW4tZ2FtZScsXG4gKiAgICAgICAgICAgICAgICAgIHNlcnZlcjogeyBob3N0OiAnYXBpLmZvcmlvLmNvbScgfSxcbiAqICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOiB7IHNpbGVudDogWydwcmljZScsICdzYWxlcyddIH0sXG4gKiAgICAgICAgICAgICAgICAgIG9wZXJhdGlvbnM6IHsgc2lsZW50OiBmYWxzZSB9LFxuICogICAgICAgICAgICAgICAgICB0cmFuc3BvcnQ6IHtcbiAqICAgICAgICAgICAgICAgICAgICAgIGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCkgeyAkKCdib2R5JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTsgfSxcbiAqICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbigpIHsgJCgnYm9keScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7IH1cbiAqICAgICAgICAgICAgICAgICAgfVxuICogICAgICAgICAgICAgIH1cbiAqICAgICAgICAgIH1cbiAqICAgICAgfSk7XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZG9tTWFuYWdlciA9IHJlcXVpcmUoJy4vZG9tL2RvbS1tYW5hZ2VyJyk7XG52YXIgQ2hhbm5lbCA9IHJlcXVpcmUoJy4vY2hhbm5lbHMvcnVuLWNoYW5uZWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZG9tOiBkb21NYW5hZ2VyLFxuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICB2YXIgbW9kZWwgPSAkKCdib2R5JykuZGF0YSgnZi1tb2RlbCcpO1xuXG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIGNoYW5uZWw6IHtcbiAgICAgICAgICAgICAgICBydW46IHtcbiAgICAgICAgICAgICAgICAgICAgYWNjb3VudDogJycsXG4gICAgICAgICAgICAgICAgICAgIHByb2plY3Q6ICcnLFxuICAgICAgICAgICAgICAgICAgICBtb2RlbDogbW9kZWwsXG5cbiAgICAgICAgICAgICAgICAgICAgb3BlcmF0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9GZXRjaDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRvbToge1xuICAgICAgICAgICAgICAgIHJvb3Q6ICdib2R5JyxcbiAgICAgICAgICAgICAgICBhdXRvQmluZDogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBvcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBjb25maWcpO1xuICAgICAgICB2YXIgJHJvb3QgPSAkKG9wdGlvbnMuZG9tLnJvb3QpO1xuICAgICAgICB2YXIgaW5pdEZuID0gJHJvb3QuZGF0YSgnZi1vbi1pbml0Jyk7XG4gICAgICAgIHZhciBvcG5TaWxlbnQgPSBvcHRpb25zLmNoYW5uZWwucnVuLm9wZXJhdGlvbnMuc2lsZW50O1xuICAgICAgICB2YXIgaXNJbml0T3BlcmF0aW9uU2lsZW50ID0gaW5pdEZuICYmIChvcG5TaWxlbnQgPT09IHRydWUgfHwgKF8uaXNBcnJheShvcG5TaWxlbnQpICYmIF8uY29udGFpbnMob3BuU2lsZW50LCBpbml0Rm4pKSk7XG4gICAgICAgIHZhciBwcmVGZXRjaFZhcmlhYmxlcyA9ICFpbml0Rm4gfHwgaXNJbml0T3BlcmF0aW9uU2lsZW50O1xuXG4gICAgICAgIGlmIChwcmVGZXRjaFZhcmlhYmxlcykge1xuICAgICAgICAgICAgb3B0aW9ucy5jaGFubmVsLnJ1bi52YXJpYWJsZXMuYXV0b0ZldGNoLnN0YXJ0ID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcgJiYgY29uZmlnLmNoYW5uZWwgJiYgKGNvbmZpZy5jaGFubmVsIGluc3RhbmNlb2YgQ2hhbm5lbCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2hhbm5lbCA9IGNvbmZpZy5jaGFubmVsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jaGFubmVsID0gbmV3IENoYW5uZWwob3B0aW9ucy5jaGFubmVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvbU1hbmFnZXIuaW5pdGlhbGl6ZSgkLmV4dGVuZCh0cnVlLCB7XG4gICAgICAgICAgICBjaGFubmVsOiB0aGlzLmNoYW5uZWxcbiAgICAgICAgfSwgb3B0aW9ucy5kb20pKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIG1hdGNoOiBmdW5jdGlvbiAobWF0Y2hFeHByLCBtYXRjaFZhbHVlLCBjb250ZXh0KSB7XG4gICAgICAgIGlmIChfLmlzU3RyaW5nKG1hdGNoRXhwcikpIHtcbiAgICAgICAgICAgIHJldHVybiAobWF0Y2hFeHByID09PSAnKicgfHwgKG1hdGNoRXhwci50b0xvd2VyQ2FzZSgpID09PSBtYXRjaFZhbHVlLnRvTG93ZXJDYXNlKCkpKTtcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24obWF0Y2hFeHByKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoRXhwcihtYXRjaFZhbHVlLCBjb250ZXh0KTtcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzUmVnRXhwKG1hdGNoRXhwcikpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaFZhbHVlLm1hdGNoKG1hdGNoRXhwcik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZ2V0Q29udmVydGVyc0xpc3Q6IGZ1bmN0aW9uICgkZWwsIHByb3BlcnR5KSB7XG4gICAgICAgIHZhciBhdHRyQ29udmVydGVycyA9ICRlbC5kYXRhKCdmLWNvbnZlcnQtJyArIHByb3BlcnR5KTtcblxuICAgICAgICBpZiAoIWF0dHJDb252ZXJ0ZXJzICYmIChwcm9wZXJ0eSA9PT0gJ2JpbmQnIHx8IHByb3BlcnR5ID09PSAnZm9yZWFjaCcpKSB7XG4gICAgICAgICAgICAvL09ubHkgYmluZCBpbmhlcml0cyBmcm9tIHBhcmVudHNcbiAgICAgICAgICAgIGF0dHJDb252ZXJ0ZXJzID0gJGVsLmRhdGEoJ2YtY29udmVydCcpO1xuICAgICAgICAgICAgaWYgKCFhdHRyQ29udmVydGVycykge1xuICAgICAgICAgICAgICAgIHZhciAkcGFyZW50RWwgPSAkZWwuY2xvc2VzdCgnW2RhdGEtZi1jb252ZXJ0XScpO1xuICAgICAgICAgICAgICAgIGlmICgkcGFyZW50RWwpIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSAkcGFyZW50RWwuZGF0YSgnZi1jb252ZXJ0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYXR0ckNvbnZlcnRlcnMpIHtcbiAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9IF8uaW52b2tlKGF0dHJDb252ZXJ0ZXJzLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXR0ckNvbnZlcnRlcnM7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0b0ltcGxpY2l0VHlwZTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIHJicmFjZSA9IC9eKD86XFx7LipcXH18XFxbLipcXF0pJC87XG4gICAgICAgIHZhciBjb252ZXJ0ZWQgPSBkYXRhO1xuICAgICAgICBpZiAodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBkYXRhID0gZGF0YS50cmltKCk7XG5cbiAgICAgICAgICAgIGlmIChkYXRhID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEgPT09ICdudWxsJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gJyc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnZlcnRlZC5jaGFyQXQoMCkgPT09ICdcXCcnIHx8IGNvbnZlcnRlZC5jaGFyQXQoMCkgPT09ICdcIicpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBkYXRhLnN1YnN0cmluZygxLCBkYXRhLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkLmlzTnVtZXJpYyhkYXRhKSkge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9ICtkYXRhO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyYnJhY2UudGVzdChkYXRhKSkge1xuICAgICAgICAgICAgICAgIC8vVE9ETzogVGhpcyBvbmx5IHdvcmtzIHdpdGggZG91YmxlIHF1b3RlcywgaS5lLiwgWzEsXCIyXCJdIHdvcmtzIGJ1dCBub3QgWzEsJzInXVxuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9ICQucGFyc2VKU09OKGRhdGEpIDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29udmVydGVkO1xuICAgIH1cbn07XG4iXX0=
