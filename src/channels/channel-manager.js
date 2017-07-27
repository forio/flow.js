'use strict';

import { normalizeParamOptions } from './channel-utils';
import MiddlewareManager from './middleware/middleware-manager';

/**
 * 
 * @param {String[]|String} topics 
 * @param {Function} callback 
 * @param {Object} options
 * @return {Subscription}
 */
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
    if (!callback || !_.isFunction(callback)) {
        throw new Error('subscribe callback should be a function, got', callback);
    }
    return $.extend(true, {
        id: id,
        topics: [].concat(topics),
        callback: callback,
    }, opts);
}

var cacheBySubsId = {};
var sentDataBySubsId = {};

/**
* @param {Subscription} subscription 
* @param {*} data
*/
function callbackIfChanged(subscription, data) {
    var id = subscription.id;
    if (!_.isEqual(sentDataBySubsId[id], data)) {
        sentDataBySubsId[id] = data;
        subscription.callback(data, { id: id });
    }
}

/**
* @param {Publishable[]} topics
* @param {Subscription} subscription 
*/
function checkAndNotifyBatch(topics, subscription) {
    var cached = cacheBySubsId[subscription.id] || {};
    var merged = topics.reduce(function (accum, topic) {
        accum[topic.name] = topic.value;
        return accum;
    }, cached);
    var matchingTopics = _.intersection(Object.keys(merged), subscription.topics);
    if (matchingTopics.length > 0) {
        var toSend = subscription.topics.reduce(function (accum, topic) {
            accum[topic] = merged[topic];
            return accum;
        }, {});

        if (subscription.cache) {
            cacheBySubsId[subscription.id] = toSend;
        }
        if (matchingTopics.length === subscription.topics.length) {
            callbackIfChanged(subscription, toSend);
        }
    }
}


/**
 * @param {Publishable[]} topics
 * @param {Subscription} subscription 
 */
function checkAndNotify(topics, subscription) {
    topics.forEach(function (topic) {
        if (_.includes(subscription.topics, topic.name) || _.includes(subscription.topics, '*')) {
            var toSend = {};
            toSend[topic.name] = topic.value;
            callbackIfChanged(subscription, toSend);
        }
    });
}

/**
* @param {Subscription[]} subcriptionList
* @return {String[]}
*/
function getTopicsFromSubsList(subcriptionList) {
    return subcriptionList.reduce(function (accum, subs) {
        accum = accum.concat(subs.topics);
        return accum;
    }, []);
}

export default class ChannelManager {
    constructor(options) {
        var defaults = {
            middlewares: []
        };
        var opts = $.extend(true, {}, defaults, options);
        this.middlewares = new MiddlewareManager(opts, this.notify.bind(this), this);
        this.subscriptions = [];
    }

    /**
     * @param {String | Publishable } topic
     * @param {Any} [value] item to publish
     * @param {Object} [options]
     * @return {Promise}
     */
    publish(topic, value, options) {
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
    }

    notify(topic, value, options) {
        var normalized = normalizeParamOptions(topic, value, options);
        // console.log('notify', normalized);
        return this.subscriptions.forEach(function (subs) {
            var fn = subs.batch ? checkAndNotifyBatch : checkAndNotify;
            fn(normalized.params, subs);
        });
    }

    //TODO: Allow subscribing to regex? Will solve problem of listening only to variables etc
    /**
     * @param {String[] | String} topics
     * @param {Function} cb
     * @param {Object} [options]
     * @return {String}
     */
    subscribe(topics, cb, options) {
        var subs = makeSubs(topics, cb, options);
        this.subscriptions = this.subscriptions.concat(subs);
        var subscribeMiddlewares = this.middlewares.filter('subscribe');

        var toSend = subs.topics;
        subscribeMiddlewares.forEach(function (middleware) {
            toSend = middleware(toSend, options) || toSend;
        });
        return subs.id;
    }
        

    /**
     * @param {String} token
     */
    unsubscribe(token) {
        delete cacheBySubsId[token];
        delete sentDataBySubsId[token];
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
    }
    unsubscribeAll() {
        var currentlySubscribed = this.getSubscribedTopics();
        this.subscriptions = [];
        var middlewares = this.middlewares.filter('unsubscribe');
        middlewares.forEach((middleware)=> middleware(currentlySubscribed, []));
    }

    /**
     * @return {String[]}
     */
    getSubscribedTopics() {
        var list = _.uniq(getTopicsFromSubsList(this.subscriptions));
        return list;
    }

    /**
     * @param {String} [topic] optional topic to filter by
     * @return {Subscription[]}
     */
    getSubscribers(topic) {
        if (topic) {
            return this.subscriptions.filter(function (subs) {
                return _.includes(subs.topics, topic);
            });
        }
        return this.subscriptions;
    }
}

