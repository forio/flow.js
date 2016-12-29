'use strict';

var createClass = require('utils/create-class');

var RunMiddleware = require('./middleware/run-manager-middleware');
var ScenarioMiddleware = require('./middleware/scenario-middleware');

var makeSubs = function makeSubs(topics, callback, options) {
    var id = _.uniqueId('subs-');
    var defaults = {
        batch: false,

        /**
         * Determines if the last published data should be cached for future notifications. For e.g.,
         *
         * channel.subscribe(['price', 'cost'], callback1, { batch: true, cache: false });
         * channel.subscribe(['price', 'cost'], callback2, { batch: true, cache: true });
         *
         * channel.publish({ price: 1 });
         * channel.publish({ cost: 1 });
         *
         * callback1 will have been called once, and callback2 will not have been called. i.e., the channel caches the first publish value and notifies after all dependent topics have data
         * If we'd done channel.publish({ price: 1, cost: 1 }) would have called both callback1 and callback2
         *
         * `cache: true` is useful if you know if your topics will can published individually, but you still want to handle them together.
         * `cache: false` is useful if you know if your topics will *always* be published together and they'll be called at the same time.
         *
         * Note this has no discernible effect if batch is false
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
};

function callbackIfChanged(subscription, data) {
    if (!_.isEqual(subscription.lastSent, data)) {
        subscription.lastSent = data;
        subscription.callback(data);
    }
}
function checkAndNotifyBatch(publishObj, subscription) {
    var merged = $.extend(true, {}, subscription.availableData, publishObj);
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

function checkAndNotify(publishObj, subscription) {
    var publishedTopics = Object.keys(publishObj);
    publishedTopics.forEach(function (topic) {
        var data = publishObj[topic];
        if (_.contains(subscription.topics, topic) || _.contains(subscription.topics, '*')) {
            var toSend = {};
            toSend[topic] = data;
            callbackIfChanged(subscription, toSend);
        }
    });
}

var availableMiddlewares = [
    { name: 'runManager', handler: RunMiddleware },
    { name: 'scenarioManager', handler: ScenarioMiddleware },
];
var SubscriptionManager = (function () {
    function SubscriptionManager(options) {
        var defaults = {
            subscriptions: [],

            subscribeMiddleWares: [],
            publishMiddlewares: [],
            unsubscribeMiddlewares: [],

            options: {},
        };
        var opts = $.extend(true, {}, defaults, options);

        var boundNotify = this.notify.bind(this);

        availableMiddlewares.forEach(function (middleware) {
            if (opts[middleware.name]) {
                var Handler = middleware.handler;
                var m = new Handler($.extend(true, {}, opts.options[middleware.name], {
                    serviceOptions: opts[middleware.name]
                }), boundNotify);
                if (m.unsubscribeHandler) {
                    opts.unsubscribeMiddlewares.push(m.unsubscribeHandler);
                }
                opts.publishMiddlewares.push(m.publishHandler);
                opts.subscribeMiddleWares.push(m.subscribeHandler);
            }
        });

        $.extend(this, { 
            subscriptions: opts.subscriptions, 
            publishMiddlewares: opts.publishMiddlewares,
            unsubscribeMiddlewares: opts.unsubscribeMiddlewares,
            subscribeMiddleWares: opts.subscribeMiddleWares,
        });
    }

    createClass(SubscriptionManager, {
        publish: function (topic, value, options) {
            // console.log('publish', arguments);
            var attrs;
            if ($.isPlainObject(topic)) {
                attrs = topic;
                options = value;
            } else {
                (attrs = {})[topic] = value;
            }
            
            var prom = $.Deferred().resolve(attrs).promise();
            this.publishMiddlewares.forEach(function (middleware) {
                prom = prom.then(middleware);
            });
            prom = prom.then(this.notify.bind(this));
            return prom;
        },

        notify: function (value) {
            return this.subscriptions.forEach(function (subs) {
                var fn = subs.batch ? checkAndNotifyBatch : checkAndNotify;
                fn(value, subs);
            });
        },

        //TODO: Allow subscribing to regex? Will solve problem of listening only to variables etc
        subscribe: function (topics, cb, options) {
            var subs = makeSubs(topics, cb, options);
            this.subscriptions = this.subscriptions.concat(subs);

            this.subscribeMiddleWares.forEach(function (middleware) {
                return middleware(subs.topics);
            });
            return subs.id;
        },
        unsubscribe: function (token) {
            var oldLength = this.subscriptions.length;
            this.subscriptions = _.reject(this.subscriptions, function (subs) {
                return subs.id === token;
            });

            //TODO: Make this call subscription middleware with _.partition(for matching subs) too?
            if (oldLength === this.subscriptions.length) {
                throw new Error('No subscription found for token ' + token);
            } else {
                var remainingTopics = this.getSubscribedTopics();
                this.unsubscribeMiddlewares.forEach(function (middleware) {
                    return middleware(remainingTopics);
                });
            }
        },
        unsubscribeAll: function () {
            this.subscriptions = [];
            this.unsubscribeMiddlewares.forEach(function (middleware) {
                return middleware([]);
            });
        },
        getSubscribedTopics: function () {
            var list = _.uniq(_.flatten(_.map(this.subscriptions, 'topics')));
            return list;
        },
        getSubscribers: function (topic) {
            if (topic) {
                return _.filter(this.subscriptions, function (subs) {
                    return _.contains(subs.topics, topic);
                });
            }
            return this.subscriptions;
        }
    });

    return SubscriptionManager;
}());

module.exports = SubscriptionManager;
