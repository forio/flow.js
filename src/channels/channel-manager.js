'use strict';

import createClass from 'utils/create-class';
import { normalizeParamOptions } from './channel-utils';
import MiddlewareManager from './middleware/middleware-manager';

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
        topics: [].concat(topics),
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

        notify: function (topic, value, options) {
            var normalized = normalizeParamOptions(topic, value, options);
            // console.log('notify', normalized);
            return this.subscriptions.forEach(function (subs) {
                var fn = subs.batch ? checkAndNotifyBatch : checkAndNotify;
                fn(normalized.params, subs);
            });
        },

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
        unsubscribeAll: function () {
            var currentlySubscribed = this.getSubscribedTopics();
            this.subscriptions = [];
            var middlewares = this.middlewares.filter('unsubscribe');
            middlewares.forEach((middleware)=> middleware(currentlySubscribed, []));
        },
        getSubscribedTopics: function () {
            var list = _.uniq(getTopicsFromSubsList(this.subscriptions));
            return list;
        },
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
