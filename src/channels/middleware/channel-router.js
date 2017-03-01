var channelUtils = require('channels/channel-utils');
var mapWithPrefix = require('channels/middleware/utils').mapWithPrefix;
var unprefix = require('channels/middleware/utils').unprefix;

module.exports = function Router(handlers) {
    var publicAPI = {
        subscribeHandler: function (topics) {
            var grouped = channelUtils.groupByHandlers(topics, handlers);
            grouped.forEach(function (handler) {
                if (handler.subscribeHandler) {
                    //TODO: Handle unprefix here? That'll take off some responsibility from channel-utils
                    //since we're mapping it on publish, may make sense to un-map on subscribe?
                    var unprefixed = unprefix(handler.topics, handler.match);
                    handler.subscribeHandler(unprefixed);
                }
            });
        },
        unsubscribeHandler: function (remainingTopics) {
            var grouped = channelUtils.groupByHandlers(remainingTopics, handlers);

            grouped.forEach(function (handler) {
                if (handler && handler.unsubscribeHandler) {
                    var unprefixed = unprefix(handler.topics, handler.match);
                    handler.unsubscribeHandler(unprefixed);
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
