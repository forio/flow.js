import { groupByHandlers, groupSequentiallyByHandlers } from 'channels/channel-utils';
import { unprefix, mapWithPrefix, silencable, excludeReadOnly } from 'channels/middleware/utils';
import _ from 'lodash';

/**
 * Handle subscriptions
 * @param  {Handler[]} handlers Array of the form [{ match: function (){}, }]
 * @param  {String[]} topics   Array of strings
 * @param  {SubscribeOptions} [options]
 * @return {String[]} Returns the original topics array
 */
export function notifySubscribeHandlers(handlers, topics, options) {
    var grouped = groupByHandlers(topics, handlers);
    grouped.forEach(function (handler) {
        if (handler.subscribeHandler) {
            var mergedOptions = $.extend(true, {}, handler.options, options);
            var unprefixed = unprefix(handler.data, handler.matched);
            handler.subscribeHandler(unprefixed, mergedOptions, handler.matched);
        }
    });
    return topics;
}

/**
 * 
 * @param {Handler[]} handlers 
 * @param {String[]} recentlyUnsubscribedTopics
 * @param {String[]} remainingTopics 
 */
export function notifyUnsubscribeHandlers(handlers, recentlyUnsubscribedTopics, remainingTopics) {
    handlers = handlers.map(function (h, index) {
        h.unsubsKey = index;
        return h;
    });

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
 * 
 * @param {Handler[]} handlers 
 * @param {Publishable[]} publishData 
 * @param {PublishOptions} [options]
 * @return {Promise}
 */
export function passthroughPublishInterceptors(handlers, publishData, options) {
    var grouped = groupSequentiallyByHandlers(publishData, handlers);
    var $initialProm = $.Deferred().resolve([]).promise();
    grouped.forEach(function (handler) {
        $initialProm = $initialProm.then(function (dataSoFar) {
            var mergedOptions = $.extend(true, {}, handler.options, options);
            var unprefixed = unprefix(handler.data, handler.matched);

            var publishableData = excludeReadOnly(unprefixed, mergedOptions.readOnly);
            if (!publishableData.length) {
                return dataSoFar;
            }

            var result = handler.publishHandler ? handler.publishHandler(publishableData, mergedOptions, handler.matched) : publishableData;
            var publishProm = $.Deferred().resolve(result).promise();
            return publishProm.then(function (published) {
                return silencable(published, mergedOptions.silent);
            }).then(function (published) {
                var mapped = mapWithPrefix(published, handler.matched);
                if (handler.isDefault && handler.matched) {
                    mapped = mapped.concat(published);
                }
                return mapped;
            }).then(function (mapped) {
                return [].concat(dataSoFar, mapped);
            });
        });
    });
    return $initialProm;
}

/**
 * Router
 * @param  {Handler[]} myHandlers
 * @return {Router}
 */
export default function router(handlers) {
    let myHandlers = handlers || [];
    return {
        /**
         * @param {String[]} topics
         * @param {SubscribeOptions} [options]
         * @return {String[]} Returns the original topics array
         */
        subscribeHandler: function (topics, options) {
            return notifySubscribeHandlers(myHandlers, topics, options);
        },
        /**
         * @param {String[]} recentlyUnsubscribedTopics
         * @param {String[]} remainingTopics
         * @return {void}
         */
        unsubscribeHandler: function (recentlyUnsubscribedTopics, remainingTopics) {
            return notifyUnsubscribeHandlers(myHandlers, recentlyUnsubscribedTopics, remainingTopics);
        },

        /**
         * @param {Publishable[]} data
         * @param {PublishOptions} [options]
         * @return {Promise}
         */
        publishHandler: function (data, options) {
            return passthroughPublishInterceptors(myHandlers, data, options);
        },

        addRoute: function (handler) {
            if (!handler || !handler.match) {
                throw Error('Handler does not have a valid `match` property');
            }
            handler.id = _.uniqueId('routehandler-');
            myHandlers.unshift(handler);
            return handler.id;
        },
        removeRoute: function (routeid) {
            myHandlers = myHandlers.filter((handler)=> {
                return handler.id !== routeid;
            });
        }
    };
}
