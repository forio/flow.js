import $ from 'jquery';
import { normalizeParamOptions, publishableToObject } from './channel-utils';
import { uniqueId, isFunction, intersection, uniq } from 'lodash';
/**
 * 
 * @param {Array<string>|string} topics 
 * @param {Function} callback 
 * @param {Object} options
 * @returns {Subscription}
 */
function makeSubs(topics, callback, options) {
    const id = uniqueId('subs-');
    const defaults = {
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
         *      channel.publish({ 'price': 1 });
         *      channel.publish({ 'cost': 1 });
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
    const knownDataForSubs = $.extend({}, cachedDataForSubs, relevantDataFromPublish);//jQ Deep clone here will also concat arrays.

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
* @returns {Array<string>}
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
     * Perform the action (for example, update the variables or call the operation), and alert subscribers.
     *
     * **Examples**
     *
     *      Flow.channel.publish('operations:myOperation', myOperParam);
     *      Flow.channel.publish({ name: 'operations:operName', value: [operParam1, operParam2] });
     *
     *      Flow.channel.publish('variables:myVariable', newValue);
     *      Flow.channel.publish({ myVar1: newVal1, myVar2: newVal2 });
     *
     * @param {string|Publishable} topic
     * @param {any} [value] item to publish
     * @param {PublishOptions} [options]
     * @returns {Promise}
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

    /**
     * Alert each subscriber about the operation and its parameters. This can be used to provide an update without a round trip to the server. However, it is rarely used: you almost always want to `subscribe()` instead so that the model is actually changed (has a variable update or an operation called).
     *
     * **Example**
     *
     *      Flow.channel.notify('variables:myVariable', newValue);
     *      Flow.channel.notify('operations:myOperation', myOperParam);
     *
     * @param {string|Publishable} topic
     * @param {any} [value] item to publish
     * @param {PublishOptions} [options]
     * @returns {void}
     */
    notify(topic, value, options) {
        const normalized = normalizeParamOptions(topic, value, options);
        // console.log('notify', normalized.params);
        this.subscriptions.forEach(function (subs) {
            const fn = subs.batch ? checkAndNotifyBatch : checkAndNotify;
            fn(normalized.params, subs);
        });
    }

    /**
     * Subscribe to changes on a channel: Ask for notification when variables are updated, or when operations are called.
     *
     * **Examples**
     *       Flow.channel.subscribe('variables:myVariable',
     *          function() { console.log('updated!'); } );
     *
     *       Flow.channel.subscribe('operations:myOperation',
     *          function() { console.log('called!'); } );
     *
     * @param {Array<string>|string} topics
     * @param {Function} cb
     * @param {Object} [options]
     * @returns {string}
     */
    subscribe(topics, cb, options) {
        const subs = makeSubs(topics, cb, options);
        delete cacheBySubsId[subs.id]; //Just in case subsid is being reused
        delete sentDataBySubsId[subs.id];
        this.subscriptions = this.subscriptions.concat(subs);
        return subs.id;
    }
        

    /**
     * Stop receiving notification when a variable is updated or an operation is called.
     *
     * @param {string} token The identifying token for this subscription. (Created and returned by the `subscribe()` call.)
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

    /**
     * Stop receiving notifications for all operations. No parameters.
     *
     * @returns {void} No return value.
     */ 
    unsubscribeAll() {
        cacheBySubsId = {};
        sentDataBySubsId = {};
        this.subscriptions = [];
    }

    /**
     * View all topics currently subscribed to for this channel.
     * @returns {Array<string>} List of topics. 
     */
    getSubscribedTopics() {
        const list = uniq(getTopicsFromSubsList(this.subscriptions));
        return list;
    }

    /**
     *  View everything currently subscribed to this topic.
     * 
     * @param {string} [topic] topic to filter by
     * @returns {Subscription[]}
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

