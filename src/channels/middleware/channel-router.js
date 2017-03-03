import { groupByHandlers, groupSequentiallyByHandlers } from 'channels/channel-utils';
import { unprefix, mapWithPrefix } from 'channels/middleware/utils';

/**
 * Handle subscriptions
 * @param  {Array} handlers Array of the form [{ match: function (){}, }]
 * @param  {[type]} topics   [description]
 * @return {[type]}          [description]
 */
export function subscribeHandler(handlers, topics) {
    var grouped = groupByHandlers(topics, handlers);
    grouped.forEach(function (handler) {
        if (handler.subscribeHandler) {
            var unprefixed = unprefix(handler.data, handler.matched);
            handler.subscribeHandler(unprefixed, handler.matched);
        }
    });
}

export function unsubscribeHandler(handlers, recentlyUnsubscribedTopics, remainingTopics) {
    handlers = handlers.map(function (h, index) {
        h.unsubsKey = index;
        return h;
    });

    var unsubsGrouped = groupByHandlers(recentlyUnsubscribedTopics, handlers);
    var remainingGrouped = groupByHandlers(remainingTopics, handlers);

    unsubsGrouped.forEach(function (handler) {
        if (handler && handler.unsubscribeHandler) {
            var unprefixedUnsubs = unprefix(handler.data, handler.matched);
            var matchingRemainingHandler = _.find(remainingGrouped, function (remainingHandler) {
                remainingHandler.unsubsKey = handler.unsubsKey;
            });
            handler.unsubscribeHandler(unprefixedUnsubs, matchingRemainingHandler.data || []);
        }
    });
}

export function publishHandler(handlers, publishData) {
    var grouped = groupSequentiallyByHandlers(publishData, handlers);
    var $initialProm = $.Deferred().resolve({}).promise();
    grouped.forEach(function (handler) {
        $initialProm = $initialProm.then(function (dataSoFar) {
            var unprefixed = unprefix(handler.data, handler.matched);
            return handler.publishHandler(unprefixed, handler.matched).then(function (published) {
                var mapped = mapWithPrefix(published, handler.matched);
                return mapped;
            }).then(function (mapped) {
                return $.extend(dataSoFar, mapped);
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
        subscribeHandler: subscribeHandler.bind(handlers),
        unsubscribeHandler: unsubscribeHandler.bind(handlers),
        publishHandler: publishHandler.bind(handlers),
    };
}
