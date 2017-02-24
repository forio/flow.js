'use strict';

var createClass = require('utils/create-class');

var EpicenterMiddleware = require('./middleware/epicenter-middleware');
var normalizeParamOptions = require('./channel-utils').normalizeParamOptions;

function makeSubs(topics, callback, options) {
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

var availableMiddlewares = [];
var ChannelManager = (function () {
    function ChannelManager(options) {
        var defaults = {
            middlewares: {
                publish: [],
                subscribe: [],
                unsubscribe: [],
            }
        };
        var opts = $.extend(true, {}, defaults, options);
        var channelOptions = _.omit(opts, Object.keys(defaults));

        var boundNotify = this.notify.bind(this);

        // opts.middlewares.forEach(function (Middleware) {
        //     var m = new Middleware(channelOptions, boundNotify);
        //     if (m.unsubscribeHandler) {
        //         middlewares.unsubscribe.push(m.unsubscribeHandler);
        //     }
        //     middlewares.unsubscribe.push(m.publishHandler);
        //     middlewares.subscribe.push(m.subscribeHandler);
        // });

        this.middlewares = opts.middlewares;
    }

    createClass(ChannelManager, {
        subscriptions: [],

        publish: function (topic, value, options) {
            var normalized = normalizeParamOptions(topic, value, options);
            var prom = $.Deferred().resolve(normalized.params).promise();
            var lastAvailableData = normalized.params;
            this.middlewares.publish.forEach(function (middleware) {
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

        notify: function (topic, value, options) {
            var normalized = normalizeParamOptions(topic, value, options);
            return this.subscriptions.forEach(function (subs) {
                var fn = subs.batch ? checkAndNotifyBatch : checkAndNotify;
                fn(normalized.params, subs);
            });
        },

        //TODO: Allow subscribing to regex? Will solve problem of listening only to variables etc
        subscribe: function (topics, cb, options) {
            var subs = makeSubs(topics, cb, options);
            this.subscriptions = this.subscriptions.concat(subs);

            this.middlewares.subscribe.forEach(function (middleware) {
                return middleware(subs.topics);
            });
            return subs.id;
        },
        unsubscribe: function (token) {
            var oldLength = this.subscriptions.length;
            this.subscriptions = _.reject(this.subscriptions, function (subs) {
                return subs.id === token;
            });

            if (oldLength === this.subscriptions.length) {
                throw new Error('No subscription found for token ' + token);
            } else {
                var remainingTopics = this.getSubscribedTopics();
                this.middlewares.unsubscribe.forEach(function (middleware) {
                    return middleware(remainingTopics);
                });
            }
        },
        unsubscribeAll: function () {
            this.subscriptions = [];
            this.middlewares.unsubscribe.forEach(function (middleware) {
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
                    return _.includes(subs.topics, topic);
                });
            }
            return this.subscriptions;
        }
    });

    return ChannelManager;
}());

module.exports = ChannelManager;
