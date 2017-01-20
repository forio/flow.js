var createClass = require('utils/create-class');
var channelUtils = require('../channel-utils');
var mapWithPrefix = require('./middleware-utils').mapWithPrefix;

var Middleware = (function () {
    
    function Middleware(handlers, notifier) {
        this.handlers = handlers;
        this.notifyWithPrefix = function (prefix, data) {
            notifier(mapWithPrefix(data, prefix));
        };

        this.subscribeHandler = this.subscribeHandler.bind(this);
        this.unsubscribeHandler = this.unsubscribeHandler.bind(this);
        this.publishHandler = this.publishHandler.bind(this);
    }
    createClass(Middleware, {
        subscribeHandler: function (topics) {
            var grouped = channelUtils.groupByHandlers(topics, this.handlers);
            var me = this;
            grouped.forEach(function (handler) {
                if (handler.subscribeHandler) {
                    var returned = handler.subscribeHandler(handler.topics, handler.match);
                    if (returned && returned.then) {
                        returned.then(me.notifyWithPrefix.bind(null, handler.match));
                    }
                }
            });
        },
        unsubscribeHandler: function (remainingTopics) {
            var grouped = channelUtils.groupByHandlers(remainingTopics, this.handlers);
            grouped.forEach(function (handler) {
                if (handler && handler.unsubscribeHandler) {
                    handler.unsubscribeHandler(handler.topics);
                }
            });
        },

        publishHandler: function (publishData) {
            var grouped = channelUtils.groupSequentiallyByHandlers(publishData, this.handlers);
            var $initialProm = $.Deferred().resolve({}).promise();
            grouped.forEach(function (handler) {
                $initialProm = $initialProm.then(function (dataSoFar) {
                    return handler.publishHandler(handler.data, handler.match).then(function (unsilenced) {
                        var mapped = mapWithPrefix(unsilenced, handler.match);
                        return mapped;
                    }).then(function (mapped) {
                        return $.extend(dataSoFar, mapped);
                    });
                });
            });
            return $initialProm;
        }
    });

    return Middleware;
}()); 

module.exports = Middleware;
