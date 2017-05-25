/**
 * ## Channel Configuration Options and Methods
 *
 * Channels allow Flow.js to make requests of underlying APIs. In particular, every run accessed through a router includes three channels:
 *
 * * [Variables Channel](../../variables-channel/): For retrieving and updating model variables. Many of the Flow.js custom HTML attributes (e.g. `data-f-bind`) use this channel.
 * * [Operations Channel](../../operations-channel/): For calling model operations. Many of the Flow.js custom HTML attributes (e.g. `data-f-on-click`) use this channel.
 * * [Run Meta Channel](../../meta-channel/): For metadata about the run (including both default run record fields and additional any metadata you may add).
 *
 * The primary use cases for a channel are:
 *
 * * `publish`: Update a model variable or call a model operation. For example: 
 *
 *       // using channel explicitly
 *       Flow.channel.variables.publish('myVariable', newValue);
 *       Flow.channel.operations.publish('myOperation', myOperParam);
 *
 *       // equivalent call using Flow.js custom HTML attributes
 *       <input type="text" data-f-bind="myVariable" value="newValue"></input>
 *       <button data-f-on-click="myOperation(myOperParam)">Click me</button>
 *
 * * `subscribe`: Receive notifications when a model variable is updated or a model operation is called. For example:
 *
 *       // use subscribe and a callback function 
 *       // to listen and react when a model variable has been updated
 *       Flow.channel.variables.subscribe('myVariable',
 *          function() { console.log('updated!'); } );
 *
 *       // use subscribe and a callback function
 *       // to to listen and react when a model operation has been called
 *       Flow.channel.operations.subscribe('myOperation',
 *          function() { console.log('called!'); } );
 *
 */

'use strict';

import createClass from 'utils/create-class';
import { normalizeParamOptions } from './channel-utils';
import MiddlewareManager from './middleware/middleware-manager';

function makeSubs(topics, callback, options) {
    var id = _.uniqueId('subs-');
    var defaults = {
        /**
         * Determines if the callback function is called per item or per subscription.
         *
         * If `false`, the callback function is called once for each item to which you are subscribing. If `true`, the callback function is called only once, no matter how many items you have subscribed to. Defaults to `false`.
         * @type {Boolean}
         */
        batch: false,

        /**
         * Determines if the last published data should be cached for future notifications. For example:
         *
         *      channel.subscribe(['price', 'cost'], callback1, { batch: true, cache: false });
         *      channel.subscribe(['price', 'cost'], callback2, { batch: true, cache: true });
         *
         *      channel.publish({ price: 1 });
         *      channel.publish({ cost: 1 });
         *
         * Here, `callback2` is called once, and `callback1` is not called: The channel caches the first publish value and notifies after all dependent topics have data.
         *
         * If the `publish()` call was instead:
         *
         *      channel.publish({ price: 1, cost: 1 })
         *
         * Then both `callback1` and `callback2` are called.
         *
         * Setting `cache: true` is useful if you know if your topics will be published individually, but you still want to handle them together. As a concrete example, consider a slider with a chart: the input values, determined by the slider, should not cause the chart to redraw immediately. The chart could wait until all sliders have been updated a checkbox is checked, for example.
         * Setting `cache: false` is useful if you know if your topics will *always* be published together and they'll be called at the same time.
         *
         * Note this has no discernible effect if `batch` is `false`. Additionally, this has no discernible effect if `variables` are "noisy" (`silent: true`).
         * @type {Boolean}
         */
        cache: true,
    };
    var opts = $.extend({}, defaults, options);
    return $.extend(true, {
        id: id,
        topics: topics,
        callback: callback,
    }, opts);
}

function callbackIfChanged(subscription, data) {
    if (!_.isEqual(subscription.lastSent, data)) {
        subscription.lastSent = data;
        subscription.callback(data);
    }
}

//[{ name, value}]
function checkAndNotifyBatch(topics, subscription) {
    var merged = topics.reduce(function (accum, topic) {
        accum[topic.name] = topic.value;
        return accum;
    }, subscription.availableData || {});
    var matchingTopics = _.intersection(Object.keys(merged), subscription.topics);
    if (matchingTopics.length > 0) {
        var toSend = subscription.topics.reduce(function (accum, topic) {
            accum[topic] = merged[topic];
            return accum;
        }, {});

        if (subscription.cache) {
            subscription.availableData = toSend;
        }
        if (matchingTopics.length === subscription.topics.length) {
            callbackIfChanged(subscription, toSend);
        }
    }
}

//[{ name, value}]
function checkAndNotify(topics, subscription) {
    topics.forEach(function (topic) {
        if (_.includes(subscription.topics, topic.name) || _.includes(subscription.topics, '*')) {
            var toSend = {};
            toSend[topic.name] = topic.value;
            callbackIfChanged(subscription, toSend);
        }
    });
}

function getTopicsFromSubsList(subcriptionList) {
    return subcriptionList.reduce(function (accum, subs) {
        accum = accum.concat(subs.topics);
        return accum;
    }, []);
}
var ChannelManager = (function () {
    function ChannelManager(options) {
        var defaults = {
            middlewares: []
        };
        var opts = $.extend(true, {}, defaults, options);
        this.middlewares = new MiddlewareManager(opts, this.notify.bind(this), this);
    }

    createClass(ChannelManager, {
        subscriptions: [],

        /**
         * Perform the action (for example, update the variables or call the operation), and alert subscribers.
         *
         * **Examples**
         *
         *      Flow.channel.operations.publish('myOperation', myOperParam);
         *      Flow.channel.operations.publish({
         *          operations: [{ name: 'myOperation', params: [myOperParam] }]
         *      });
         *
         *      Flow.channel.variables.publish('myVariable', newValue);
         *      Flow.channel.variables.publish({ myVar1: newVal1, myVar2: newVal2 });
         *
         * @param {String} topic Name of variable or operation. Alternatively, object of the form `{ variableName: value }` or `{ operations: [ { name: operName, params: [operParams] } ] }`.
         * @param {Object} value Value for the updated variable or the argument to the operation.
         * @param {Object} options (Optional) Overrides for the default options.
         * @returns {promise}
         */
        publish: function (topic, value, options) {
            var normalized = normalizeParamOptions(topic, value, options);
            var prom = $.Deferred().resolve(normalized.params).promise();
            var lastAvailableData = normalized.params;
            var middlewares = this.middlewares.filter('publish');
            middlewares.forEach(function (middleware) {
                prom = prom.then(function (publishResponse) {
                    return middleware(publishResponse, normalized.options);
                }).then(function (response) {
                    lastAvailableData = response || lastAvailableData;
                    return lastAvailableData;
                });
            });
            prom = prom.then(this.notify.bind(this));
            return prom;
        },

        /**
         * Alert each subscriber about the operation and its parameters. This can be used to provide an update without a round trip to the server. However, it is rarely used: you almost always want to `subscribe()` instead so that the model is actually changed (has a variable update or an operation called).
         *
         * **Example**
         *
         *      Flow.channel.variables.notify('myVariable', newValue);
         *      Flow.channel.operations.notify('myOperation', myOperParam);
         *
         * @param {String} topic The name of the variable or operation.
         * @param {Object} value Value for the updated variable or the argument to the operation.
         * @param {Object} options (Optional) Overrides for the default options. 
         * @returns {List} List of subscriptions
         */
        notify: function (topic, value, options) {
            var normalized = normalizeParamOptions(topic, value, options);
            console.log('notify', normalized);
            return this.subscriptions.forEach(function (subs) {
                var fn = subs.batch ? checkAndNotifyBatch : checkAndNotify;
                fn(normalized.params, subs);
            });
        },

        /**
         * Subscribe to changes on a channel: Ask for notification when variables are updated, or when operations are called.
         *
         * **Examples**
         *
         *       Flow.channel.variables.subscribe('myVariable',
         *          function() { console.log('updated!'); } );
         *
         *       Flow.channel.operations.subscribe('myOperation',
         *          function() { console.log('called!'); } );
         *
         * @param {String|Array} topics The names of the variables or operations. Use * to listen for notifications on all topics.
         * @param {Object|Function} cb The object or function being notified. Often this is a callback function.
         * @param {Object} options (Optional) Overrides for the default options.
         * @return {String} An identifying token for this subscription. Required as a parameter when unsubscribing.
         */
        //TODO: Allow subscribing to regex? Will solve problem of listening only to variables etc
        subscribe: function (topics, cb, options) {
            var subs = makeSubs(topics, cb, options);
            this.subscriptions = this.subscriptions.concat(subs);
            var middlewares = this.middlewares.filter('subscribe');

            var toSend = subs.topics;
            middlewares.forEach(function (middleware) {
                toSend = middleware(toSend) || toSend;
            });
            return subs.id;
        },
        /**
         * Stop receiving notification when a variable is updated or an operation is called.
         *
         * @param {String} token The identifying token for this subscription. (Created and returned by the `subscribe()` call.)
         */
        unsubscribe: function (token) {
            var data = this.subscriptions.reduce(function (accum, subs) {
                if (subs.id === token) {
                    accum.unsubscribed.push(subs);
                } else {
                    accum.remaining.push(subs);
                }
                return accum;
            }, { remaining: [], unsubscribed: [] });

            if (!data.unsubscribed.length) {
                throw new Error('No subscription found for token ' + token);
            }
            this.subscriptions = data.remaining;

            var remainingTopics = getTopicsFromSubsList(data.remaining);
            var unsubscribedTopics = getTopicsFromSubsList(data.unsubscribed);

            var middlewares = this.middlewares.filter('unsubscribe');
            middlewares.forEach(function (middleware) {
                return middleware(unsubscribedTopics, remainingTopics);
            });
        },
        /**
         * Stop receiving notifications for all operations. No parameters.
         */ 
        unsubscribeAll: function () {
            var currentlySubscribed = this.getSubscribedTopics();
            this.subscriptions = [];
            var middlewares = this.middlewares.filter('unsubscribe');
            middlewares.forEach((middleware)=> middleware(currentlySubscribed, []));
        },
        /**
         * View all topics currently subscribed to for this channel.
         *
         * @return {Array} List of topics. 
         */
        getSubscribedTopics: function () {
            var list = _.uniq(getTopicsFromSubsList(this.subscriptions));
            return list;
        },
        /**
         * View everything currently subscribed to this topic.
         *
         * @param {String} topic The topic of interest.
         * @return {Array} List of subscriptions.
         */
        getSubscribers: function (topic) {
            if (topic) {
                return this.subscriptions.filter(function (subs) {
                    return _.includes(subs.topics, topic);
                });
            }
            return this.subscriptions;
        }
    });

    return ChannelManager;
}());

export default ChannelManager;
