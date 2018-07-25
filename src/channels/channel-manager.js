import $ from 'jquery';
import { normalizeParamOptions, publishableToObject } from './channel-utils';
import { uniqueId, isFunction, intersection, uniq } from 'lodash';
/**
 * 
 * @param {String[]|String} topics 
 * @param {Function} callback 
 * @param {Object} options
 * @return {Subscription}
 */
function makeSubs(topics, callback, options) {
    const id = uniqueId('subs-');
    const defaults = {
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
    const opts = $.extend({}, defaults, options);
    if (!callback || !isFunction(callback)) {
        throw new Error('subscribe callback should be a function');
    }
    return $.extend(true, {
        id: id,
        topics: [].concat(topics),
        callback: callback,
    }, opts);
}

let cacheBySubsId = {};
let sentDataBySubsId = {};

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
function callbackSubscriber(subscription, data) {
    const id = subscription.id;
    subscription.callback(data, { id: id, previousData: sentDataBySubsId[id] });
    sentDataBySubsId[id] = copy(data);
}

/**
* @param {Publishable[]} topics
* @param {Subscription} subscription 
*/
function checkAndNotifyBatch(topics, subscription) {
    const publishData = publishableToObject(topics);
    const matchingTopics = intersection(Object.keys(publishData), subscription.topics);
    if (!matchingTopics.length) {
        return;
    }

    const relevantDataFromPublish = matchingTopics.reduce((accum, topic)=> {
        accum[topic] = publishData[topic];
        return accum;
    }, {});
    const cachedDataForSubs = cacheBySubsId[subscription.id] || {};
    const knownDataForSubs = $.extend(true, {}, cachedDataForSubs, relevantDataFromPublish);

    if (subscription.cache) {
        cacheBySubsId[subscription.id] = knownDataForSubs;
    }
    const hasDataForAllTopics = intersection(Object.keys(knownDataForSubs), subscription.topics).length === subscription.topics.length;
    if (hasDataForAllTopics) {
        callbackSubscriber(subscription, knownDataForSubs);
    }
}


/**
 * @param {Publishable[]} topics
 * @param {Subscription} subscription 
 */
function checkAndNotify(topics, subscription) {
    topics.forEach(function (topic) {
        const needsThisTopic = subscription.topics.indexOf(topic.name) !== -1;
        const isWildCard = subscription.topics.indexOf('*') !== -1;
        if (needsThisTopic || isWildCard) {
            callbackSubscriber(subscription, { [topic.name]: topic.value });
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
 * @class ChannelManager
 */
class ChannelManager {
    constructor(options) {
        this.subscriptions = [];
    }

    /**
     * @param {String | Publishable } topic
     * @param {any} [value] item to publish
     * @param {PublishOptions} [options]
     * @return {Promise}
     */
    publish(topic, value, options) {
        const normalized = normalizeParamOptions(topic, value, options);
        let prom = $.Deferred().resolve(normalized.params).promise();
        prom = prom.then((publishResponses)=> {
            this.notify(publishResponses, options);
            return publishResponses;
        });
        return prom;
    }

    notify(topic, value, options) {
        const normalized = normalizeParamOptions(topic, value, options);
        // console.log('notify', normalized.params);
        return this.subscriptions.forEach(function (subs) {
            const fn = subs.batch ? checkAndNotifyBatch : checkAndNotify;
            fn(normalized.params, subs);
        });
    }

    /**
     * @param {String[] | String} topics
     * @param {Function} cb
     * @param {Object} [options]
     * @return {String}
     */
    subscribe(topics, cb, options) {
        const subs = makeSubs(topics, cb, options);
        delete cacheBySubsId[subs.id]; //Just in case subsid is being reused
        delete sentDataBySubsId[subs.id];
        this.subscriptions = this.subscriptions.concat(subs);
        return subs.id;
    }
        

    /**
     * @param {String} token
     */
    unsubscribe(token) {
        const olderLength = this.subscriptions.length;
        const remaining = this.subscriptions.filter(function (subs) {
            return subs.id !== token;
        });
        if (remaining.length === olderLength) {
            throw new Error('No subscription found for token ' + token);
        }
        delete cacheBySubsId[token];
        delete sentDataBySubsId[token];
        this.subscriptions = remaining;
    }
    unsubscribeAll() {
        cacheBySubsId = {};
        sentDataBySubsId = {};
        this.subscriptions = [];
    }

    /**
     * @return {String[]}
     */
    getSubscribedTopics() {
        const list = uniq(getTopicsFromSubsList(this.subscriptions));
        return list;
    }

    /**
     * @param {String} [topic] optional topic to filter by
     * @return {Subscription[]}
     */
    getSubscribers(topic) {
        if (!topic) {
            return this.subscriptions;
        }
        return this.subscriptions.filter(function (subs) {
            return subs.topics.indexOf(topic) !== -1;
        });
    }
}

export default ChannelManager;

