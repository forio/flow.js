import MiddlewareManager from './middleware-manager';
import { normalizeParamOptions } from '../../channel-utils';
import { difference } from 'lodash';

function getTopicsFromSubsList(subcriptionList) {
    return subcriptionList.reduce(function (accum, subs) {
        accum = accum.concat(subs.topics);
        return accum;
    }, []);
}

/**
 * Decorates passed channel manager with middleware functionality
 * @param  {ChannelManager} ChannelManager
 * @return {ChannelManager}                wrapped channel manager
 */
export default function withMiddleware(ChannelManager) {
    /**
     * @implements {ChannelManager}
     */
    return class ChannelWithMiddleware extends ChannelManager {
        constructor(options) {
            super(options);
            var defaults = {
                middlewares: []
            };
            var opts = $.extend(true, {}, defaults, options);
            this.middlewares = new MiddlewareManager(opts, this.notify.bind(this), this);
        }

        /**
         * Allow intercepting and handling/suppressing data to publish calls.
         * @param {string | Publishable } topic
         * @param {any} [value] item to publish
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
            prom = prom.then((published)=> {
                return super.publish(published, normalized.options);
            });
            return prom;
        }
        /**
         * Allow intercepting and excluding topics from by subsequent middlewares
         * @param  {string | string[]}   topics
         * @param  {Function} cb
         * @param  {Object}   options
         * @return {string}           subscription id
         */
        subscribe(topics, cb, options) {
            const subsid = super.subscribe(topics, cb, options);
            const subscribeMiddlewares = this.middlewares.filter('subscribe');
            //Subscription needs to happen first, or if you skip topics they'll never be subscribed, so you can't notify
            let newTopics = [].concat(topics);
            subscribeMiddlewares.forEach(function (middleware) {
                newTopics = middleware(newTopics, options) || newTopics;
            });
            return subsid;
        }

        /**
         * Calls unsubscribe middleware *after* unsubscription with a list of recently unsubscribed topics
         * @param  {string} token
         * @return {void}
         */
        unsubscribe(token) {
            var currentTopics = getTopicsFromSubsList(this.subscriptions);
            super.unsubscribe(token);
            var remainingTopics = getTopicsFromSubsList(this.subscriptions);

            var unsubscribedTopics = difference(currentTopics, remainingTopics);
            var middlewares = this.middlewares.filter('unsubscribe');
            middlewares.forEach(function (middleware) {
                return middleware(unsubscribedTopics, remainingTopics);
            });
        }

        /**
         * Calls unsubscribe middleware after unsubscribeAll on the channel
         * @return {void}
         */
        unsubscribeAll() {
            var currentlySubscribed = this.getSubscribedTopics();
            super.unsubscribeAll();
            var middlewares = this.middlewares.filter('unsubscribe');
            middlewares.forEach((middleware)=> middleware(currentlySubscribed, []));
        }
    };
}
