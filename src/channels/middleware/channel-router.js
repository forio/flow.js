import channelUtils from 'channels/channel-utils';
import { unprefix, mapWithPrefix } from 'channels/middleware/utils';

/**
 * Router
 * @param  {Array} handlers Array of the form [{ subscribeHandler, unsubscribeHandler, publishHandler }]
 * @return {Router}
 */
export default function Router(handlers) {
    var publicAPI = {
        /**
         * [subscribeHandler description]
         * @param  {Array} topics [<String>] of subscribed topics
         */
        subscribeHandler: function (topics) {
            var grouped = channelUtils.groupByHandlers(topics, handlers);
            grouped.forEach(function (handler) {
                if (handler.subscribeHandler) {
                    var unprefixed = unprefix(handler.data, handler.match);
                    handler.subscribeHandler(unprefixed, handler.match);
                }
            });
        },
        unsubscribeHandler: function (recentlyUnsubscribedTopics, remainingTopics) {
            handlers = handlers.map(function (h, index) {
                h.unsubsKey = index;
                return h;
            });

            var unsubsGrouped = channelUtils.groupByHandlers(recentlyUnsubscribedTopics, handlers);
            var remainingGrouped = channelUtils.groupByHandlers(remainingTopics, handlers);

            unsubsGrouped.forEach(function (handler) {
                if (handler && handler.unsubscribeHandler) {
                    var unprefixedUnsubs = unprefix(handler.data, handler.match);
                    var matchingRemainingHandler = _.find(remainingGrouped, function (remainingHandler) {
                        remainingHandler.unsubsKey = handler.unsubsKey;
                    });
                    handler.unsubscribeHandler(unprefixedUnsubs, matchingRemainingHandler.data || []);
                }
            });
        },

        publishHandler: function (publishData) {
            var grouped = channelUtils.groupSequentiallyByHandlers(publishData, handlers);
            var $initialProm = $.Deferred().resolve({}).promise();
            grouped.forEach(function (handler) {
                $initialProm = $initialProm.then(function (dataSoFar) {
                    var unprefixed = unprefix(handler.data, handler.match);
                    return handler.publishHandler(unprefixed, handler.match).then(function (published) {
                        var mapped = mapWithPrefix(published, handler.match);
                        return mapped;
                    }).then(function (mapped) {
                        return $.extend(dataSoFar, mapped);
                    });
                });
            });
            return $initialProm;
        }
    };

    return $.extend(this, publicAPI);
}; 
