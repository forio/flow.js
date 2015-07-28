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

        interpolate: function (params) {
            var ip = this.options.interpolate;
            if ($.isArray(params)) {
                return _.map(params, function (p) {
                    return (ip[p]) ? ip[p] : p;
                }, this);
            } else {
                return (ip[params]) ? ip[params] : params
            }
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
                //TODO: check if interpolated
                var opts = ($.isPlainObject(operation)) ? params : options;
                if (!$.isPlainObject(operation) && params) {
                    params = this.interpolate(params);
                }
                return run.do.call(run, operation, params)
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
