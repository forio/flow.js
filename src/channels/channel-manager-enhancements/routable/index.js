import router from 'channels/channel-router';
import { normalizeParamOptions } from '../../channel-utils';
import { omit, isFunction } from 'lodash';

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
export default function withRouter(ChannelManager) {
    /**
     * @implements {ChannelManager}
     */
    return class ChannelWithRouter extends ChannelManager {
        constructor(options) {
            super(options);
            const defaults = {
                routes: []
            };
            const opts = $.extend(true, {}, defaults, options);
            const optsToPassOn = omit(opts, Object.keys(defaults));

            this.router = router(opts.routes, optsToPassOn, this.notify.bind(this));
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
            this.router.subscribeHandler([].concat(topics), options).then((topicsWithData)=> {
                if (topicsWithData.length) {
                    this.notify([].concat(topicsWithData));
                }
            }, (err)=> {
                console.error('subs err', err);
            });
            return subsid;
        }

        /**
         * Allow intercepting and handling/suppressing data to publish calls.
         * @param {string | Publishable } topic
         * @param {any} [value] item to publish
         * @param {Object} [options]
         * @return {Promise}
         */
        publish(topic, value, options) {
            const publishData = normalizeParamOptions(topic, value, options);
            return this.router.publishHandler(publishData.params, publishData.options).then((published)=> {
                return super.publish(published, publishData.options);
            });
        }
        

        /**
         * Calls unsubscribe middleware *after* unsubscription with a list of recently unsubscribed topics
         * @param  {string} token
         * @return {void}
         */
        unsubscribe(token) {
            const recentlyUnsubscribedTopics = getTopicsFromSubsList(this.subscriptions);
            super.unsubscribe(token);
            const remainingTopics = getTopicsFromSubsList(this.subscriptions);
            return this.router.unsubscribeHandler(recentlyUnsubscribedTopics, remainingTopics);
        }

        /**
         * Calls unsubscribe middleware after unsubscribeAll on the channel
         * @return {void}
         */
        unsubscribeAll() {
            const recentlyUnsubscribedTopics = getTopicsFromSubsList(this.subscriptions);
            super.unsubscribeAll();

            return this.router.unsubscribeHandler(recentlyUnsubscribedTopics, []);
        }
    };
}
