import $ from 'jquery';
import { normalizeParamOptions } from './channel-utils';
import { uniqueId, isFunction, intersection, includes, uniq, isEqual } from 'lodash';
/**
 * 
 * @param {String[]|String} topics 
 * @param {Function} callback 
 * @param {Object} options
 * @return {Subscription}
 */
function makeSubs(topics, callback, options) {
    var id = uniqueId('subs-');
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
    if (!callback || !isFunction(callback)) {
        throw new Error('subscribe callback should be a function');
    }
    return $.extend(true, {
        id: id,
        topics: [].concat(topics),
        callback: callback,
    }, opts);
}

var cacheBySubsId = {};
var sentDataBySubsId = {};

function copy(data) {
    if (Array.isArray(data)) {
        return data.map((d)=> copy(d));
    } else if ($.isPlainObject(data)) {
        return Object.keys(data).reduce((accum, key)=> {
            accum[key] = copy(data[key]);
            return accum;
        }, {});
    }
    return data;
}
/**
* @param {Subscription} subscription 
* @param {*} data
*/
function callbackIfChanged(subscription, data) {
    var id = subscription.id;
    if (!isEqual(sentDataBySubsId[id], data)) {
        sentDataBySubsId[id] = copy(data);
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
    }, $.extend({}, true, cached));
    var matchingTopics = intersection(Object.keys(merged), subscription.topics);
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
        if (includes(subscription.topics, topic.name) || includes(subscription.topics, '*')) {
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

/**
 * @implements {ChannelManager}
 */
class ChannelManager {
    constructor(options) {
        this.subscriptions = [];
    }

    /**
     * @param {String | Publishable } topic
     * @param {any} [value] item to publish
     * @param {Object} [options]
     * @return {Promise}
     */
    publish(topic, value, options) {
        var normalized = normalizeParamOptions(topic, value, options);
        var prom = $.Deferred().resolve(normalized.params).promise();
        prom = prom.then(this.notify.bind(this));
        return prom;
    }

    notify(topic, value, options) {
        var normalized = normalizeParamOptions(topic, value, options);
        // console.log('notify', normalized.params);
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
        return subs.id;
    }
        

    /**
     * @param {String} token
     */
    unsubscribe(token) {
        var olderLength = this.subscriptions.length;
        if (!olderLength) {
            throw new Error('No subscriptions found to unsubscribe from');
        }
    
        var remaining = this.subscriptions.filter(function (subs) {
            return subs.id !== token;
        });
        if (!remaining.length === olderLength) {
            throw new Error('No subscription found for token ' + token);
        }
        delete cacheBySubsId[token];
        delete sentDataBySubsId[token];
        this.subscriptions = remaining;
    }
    unsubscribeAll() {
        this.subscriptions = [];
    }

    /**
     * @return {String[]}
     */
    getSubscribedTopics() {
        var list = uniq(getTopicsFromSubsList(this.subscriptions));
        return list;
    }

    /**
     * @param {String} [topic] optional topic to filter by
     * @return {Subscription[]}
     */
    getSubscribers(topic) {
        if (topic) {
            return this.subscriptions.filter(function (subs) {
                return includes(subs.topics, topic);
            });
        }
        return this.subscriptions;
    }
}

export default ChannelManager;

