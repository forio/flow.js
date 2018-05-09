import router from 'channels/channel-router';
import { normalizeParamOptions } from '../../channel-utils';
import { omit, isFunction, difference } from 'lodash';
import { groupByHandlers, groupSequentiallyByHandlers } from 'channels/channel-utils';
import { unprefix, mapWithPrefix, silencable, excludeReadOnly } from 'channels/middleware/utils';

import _ from 'lodash';

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
            var defaults = {
                routes: []
            };
            var opts = $.extend(true, {}, defaults, options);

            var optsToPassOn = omit(opts, Object.keys(defaults));

            this.routeHandlers = opts.routes.map((Handler)=> {
                let handler = Handler;
                if (isFunction(Handler)) {
                    handler = new Handler(optsToPassOn, this.notify.bind(this), this);
                }
                if (typeof handler.match === 'string') {
                    const oldMatch = handler.match;
                    handler.match = (t)=> t === oldMatch ? t : false;
                }
                return handler;
            });

            this.router = router(this.routeHandlers);
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
            const returned = this.router.subscribeHandler([].concat(topics), options);
            if (returned) {
                setTimeout(()=> {
                    this.notify([].concat(returned));
                }, 0);
            }
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
            var publishData = normalizeParamOptions(topic, value, options);
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
            var currentTopics = getTopicsFromSubsList(this.subscriptions);
            super.unsubscribe(token);
            var remainingTopics = getTopicsFromSubsList(this.subscriptions);


            const handlers = this.routeHandlers.map(function (h, index) {
                h.unsubsKey = index;
                return h;
            });
            var recentlyUnsubscribedTopics = difference(currentTopics, remainingTopics);
        
            var unsubsGrouped = groupByHandlers(recentlyUnsubscribedTopics, handlers);
            var remainingGrouped = groupByHandlers(remainingTopics, handlers);
        
            unsubsGrouped.forEach(function (handler) {
                if (handler.unsubscribeHandler) {
                    var unprefixedUnsubs = unprefix(handler.data, handler.matched);
                    var matchingRemainingHandler = _.find(remainingGrouped, function (remainingHandler) {
                        return remainingHandler.unsubsKey === handler.unsubsKey;
                    });
                    var matchingTopicsRemaining = matchingRemainingHandler ? matchingRemainingHandler.data : [];
                    var unprefixedRemaining = unprefix(matchingTopicsRemaining || [], handler.matched);
                    handler.unsubscribeHandler(unprefixedUnsubs, unprefixedRemaining);
                }
            });
        }

        /**
         * Calls unsubscribe middleware after unsubscribeAll on the channel
         * @return {void}
         */
        unsubscribeAll() {
            var recentlyUnsubscribedTopics = getTopicsFromSubsList(this.subscriptions);
            super.unsubscribeAll();


            const handlers = this.routeHandlers.map(function (h, index) {
                h.unsubsKey = index;
                return h;
            });
        
            var unsubsGrouped = groupByHandlers(recentlyUnsubscribedTopics, handlers);
        
            unsubsGrouped.forEach(function (handler) {
                if (handler.unsubscribeHandler) {
                    var unprefixedUnsubs = unprefix(handler.data, handler.matched);
                    handler.unsubscribeHandler(unprefixedUnsubs, []);
                }
            });
        }
    };
}
