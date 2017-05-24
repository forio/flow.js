import { groupByHandlers, groupSequentiallyByHandlers } from 'channels/channel-utils';
import { unprefix, mapWithPrefix, silencable } from 'channels/middleware/utils';

var { uniqueId } = _;

/**
 * Handle subscriptions
 * @param  {Array} handlers Array of the form [{ match: function (){}, }]
 * @param  {Array} topics   Array of strings
 */
export function notifySubscribeHandlers(handlers, topics) {
    var grouped = groupByHandlers(topics, handlers);
    grouped.forEach(function (handler) {
        if (handler.subscribeHandler) {
            var unprefixed = unprefix(handler.data, handler.matched);
            handler.subscribeHandler(unprefixed, handler.matched);
        }
    });
}

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

export function passthroughPublishInterceptors(handlers, publishData, options) {
    var grouped = groupSequentiallyByHandlers(publishData, handlers);
    var $initialProm = $.Deferred().resolve([]).promise();
    grouped.forEach(function (handler) {
        $initialProm = $initialProm.then(function (dataSoFar) {
            var mergedOptions = $.extend(true, {}, handler.options, options);
            if (mergedOptions.readOnly) {
                console.warn('Tried to publish to a readonly channel', handler);
                return dataSoFar;
            }
            var unprefixed = unprefix(handler.data, handler.matched);
            var result = handler.publishHandler ? handler.publishHandler(unprefixed, handler.matched) : unprefixed;
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
 * @param  {Array} handlers Array of the form [{ subscribeHandler, unsubscribeHandler, publishHandler }]
 * @return {Router}
 */
export default function Router(handlers) {
    return {
        subscribeHandler: function (topics) {
            return notifySubscribeHandlers(handlers, topics);
        },
        unsubscribeHandler: function (recentlyUnsubscribedTopics, remainingTopics) {
            return notifyUnsubscribeHandlers(handlers, recentlyUnsubscribedTopics, remainingTopics);
        },
        publishHandler: function (data, options) {
            return passthroughPublishInterceptors(handlers, data, options);
        },

        // Ignoring till ready to implement
        // addRoute: function (handler) {
        //     if (!handler || !handler.match) {
        //         throw Error('Handler does not have a valid `match` property');
        //     }
        //     handler.id = uniqueId('routehandler-');
        //     handlers.push(handler);
        //     return handler.id;
        // },
        // removeRoute: function (routeid) {
        //     handlers = handlers.reduce(function (accum, handler) {
        //         if (handler.id !== routeid) {
        //             accum.push(handler);
        //         }
        //         return accum;
        //     }, []);
        // }
    };
}