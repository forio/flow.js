var channelUtils = require('channels/channel-utils');
var mapWithPrefix = require('channels/middleware/utils').mapWithPrefix;

var Middleware = function (handlers) {
    var publicAPI = {
        subscribeHandler: function (topics) {
            var grouped = channelUtils.groupByHandlers(topics, handlers);
            grouped.forEach(function (handler) {
                if (handler.subscribeHandler) {
                    //TODO: Handle unprefix here? That'll take off some responsibility from channel-utils
                    //since we're mapping it on publish, may make sense to un-map on subscribe?
                    handler.subscribeHandler(handler.topics, handler.match);
                }
            });
        },
        unsubscribeHandler: function (remainingTopics) {
            var grouped = channelUtils.groupByHandlers(remainingTopics, handlers);
            grouped.forEach(function (handler) {
                if (handler && handler.unsubscribeHandler) {
                    handler.unsubscribeHandler(handler.topics);
                }
            });
        },

        publishHandler: function (publishData) {
            var grouped = channelUtils.groupSequentiallyByHandlers(publishData, handlers);
            var $initialProm = $.Deferred().resolve({}).promise();
            grouped.forEach(function (handler) {
                $initialProm = $initialProm.then(function (dataSoFar) {
                    return handler.publishHandler(handler.data, handler.match).then(function (published) {
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

module.exports = Middleware;
